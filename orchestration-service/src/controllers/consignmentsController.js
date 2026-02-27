const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const db = require('../../config/database');
const { notifyShipmentArrival } = require('../services/notificationService');
const { notifyExternalShipmentArrival } = require('../services/externalApiService');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const SRI_LANKA_PROVINCES = ['WP', 'CP', 'SP', 'NP', 'EP', 'NWP', 'NCP', 'UP', 'SGP'];

const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const isoCountryRegex = /^[A-Z]{2}$/;

const packageSchema = Joi.object({
  packageId: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().max(100).allow(null, ''),
  weight: Joi.number().positive().precision(3).max(100000).required(),
  height: Joi.number().positive().precision(3).max(100000).required(),
  width: Joi.number().positive().precision(3).max(100000).required(),
  length: Joi.number().positive().precision(3).max(100000).required(),
  isPrimary: Joi.boolean().required()
});

const consignmentSchema = Joi.object({
  messageId: Joi.string().trim().min(3).max(100).required(),
  timestamp: Joi.number().integer().min(0).required(),
  isSingle: Joi.boolean().required(),
  shipmentType: Joi.string().trim().min(3).max(30).required(),
  shipmentId: Joi.string().trim().min(3).max(50).required(),
  deliveryDate: Joi.string().trim().isoDate().required(),
  serviceType: Joi.string().trim().min(1).max(50).required(),
  serviceIndicator: Joi.string().trim().min(1).max(10).required(),
  packages: Joi.array().min(1).max(50).items(packageSchema).required(),
  receiver: Joi.object({
    accountNumber: Joi.string().trim().min(3).max(120).required(),
    contactName: Joi.string().trim().min(2).max(100).required(),
    mobileNumber: Joi.string().trim().pattern(phoneRegex).required(),
    emailAddress: Joi.string().trim().email().max(100).required(),
    address: Joi.object({
      addressLine1: Joi.string().trim().min(3).max(100).required(),
      addressLine2: Joi.string().trim().max(100).allow(null, ''),
      postalCode: Joi.string().trim().min(2).max(10).required(),
      city: Joi.string().trim().min(2).max(50).required(),
      suburb: Joi.string().trim().min(2).max(50).required(),
      state: Joi.string().trim().min(2).max(30).required(),
      country: Joi.string().trim().pattern(isoCountryRegex).required()
    }).required()
  }).required(),
  sender: Joi.object({
    contactName: Joi.string().trim().min(2).max(100).required(),
    mobileNumber: Joi.string().trim().pattern(phoneRegex).required(),
    emailAddress: Joi.string().trim().email().max(100).required()
  }).required()
});

const validateRequest = (body, packageCount) => {
  const { error, value } = consignmentSchema.validate(body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    return {
      ok: false,
      error: {
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    };
  }

  const packagesLength = value.packages.length;

  if (Number.isFinite(packageCount) && packageCount !== packagesLength) {
    return {
      ok: false,
      error: {
        message: 'Validation failed',
        details: [
          {
            field: 'packageCount',
            message: `packageCount (${packageCount}) does not match packages length (${packagesLength})`
          }
        ]
      }
    };
  }

  if (value.isSingle && packagesLength !== 1) {
    return {
      ok: false,
      error: {
        message: 'Validation failed',
        details: [
          {
            field: 'packages',
            message: 'When isSingle is true, exactly one package is required'
          }
        ]
      }
    };
  }

  if (value.shipmentId !== value.packages[0].packageId) {
    return {
      ok: false,
      error: {
        message: 'Validation failed',
        details: [
          {
            field: 'shipmentId',
            message: 'shipmentId must match the first packageId'
          }
        ]
      }
    };
  }

  if (value.receiver.address.country === 'LK') {
    if (!SRI_LANKA_PROVINCES.includes(value.receiver.address.state)) {
      return {
        ok: false,
        error: {
          message: 'Validation failed',
          details: [
            {
              field: 'receiver.address.state',
              message: `State must be one of ${SRI_LANKA_PROVINCES.join(', ')} for Sri Lanka (LK)`
            }
          ]
        }
      };
    }

    if (!/^\d{5}$/.test(value.receiver.address.postalCode)) {
      return {
        ok: false,
        error: {
          message: 'Validation failed',
          details: [
            {
              field: 'receiver.address.postalCode',
              message: 'Postal code must be 5 digits for Sri Lanka (LK)'
            }
          ]
        }
      };
    }
  }

  return { ok: true, value };
};

const resolveCreatedBy = (user) => {
  return user?.client_id || user?.clientId || user?.userId || user?.sub || 'SYSTEM';
};

exports.createConsignment = async (req, res, next) => {
  try {
    const packageCount = req.query.packageCount ? parseInt(req.query.packageCount, 10) : undefined;

    if (req.query.packageCount && !Number.isFinite(packageCount)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Validation failed',
        details: [{ field: 'packageCount', message: 'packageCount must be a number' }]
      });
    }

    const validation = validateRequest(req.body, packageCount);

    if (!validation.ok) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: validation.error.message,
        details: validation.error.details
      });
    }

    const payload = validation.value;
    const createdBy = resolveCreatedBy(req.user);

    const existing = await db('consignments')
      .where('consignment_id', payload.shipmentId)
      .first();

    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        error: 'Consignment already exists',
        details: [{ field: 'shipmentId', message: 'A consignment with this shipmentId already exists' }]
      });
    }

    const responseData = await db.transaction(async trx => {
      let accountId = null;

      const accountNumber = payload.receiver.accountNumber;
      if (accountNumber) {
        const account = await trx('accounts')
          .where('account_number', accountNumber)
          .first();

        if (account) {
          accountId = account.id;
        } else {
          const inserted = await trx('accounts')
            .insert({
              account_number: accountNumber,
              allow_notification_send: false,
              created_by: createdBy,
              updated_by: createdBy
            })
            .returning('id');

          accountId = Array.isArray(inserted) ? inserted[0]?.id || inserted[0] : inserted;
        }
      }

      const consignmentInsert = await trx('consignments')
        .insert({
          consignment_id: payload.shipmentId,
          preferred_delivery_option: null,
          preferred_notification_channel: null,
          status: 'CREATED',
          delivery_date: new Date(payload.deliveryDate),
          service_type: payload.serviceType,
          cutoff_time: null,
          account_id: accountId,
          receiver_contact_name: payload.receiver.contactName,
          receiver_mobile_number: payload.receiver.mobileNumber,
          receiver_email: payload.receiver.emailAddress,
          receiver_address_1: payload.receiver.address.addressLine1,
          receiver_address_2: payload.receiver.address.addressLine2 || null,
          receiver_suburb: payload.receiver.address.suburb,
          receiver_city: payload.receiver.address.city,
          receiver_state: payload.receiver.address.state,
          receiver_country: payload.receiver.address.country,
          receiver_postcode: payload.receiver.address.postalCode,
          sender_contact_name: payload.sender.contactName,
          sender_mobile_number: payload.sender.mobileNumber,
          sender_email: payload.sender.emailAddress,
          created_by: createdBy,
          updated_by: createdBy
        })
        .returning('id');

      const consignmentId = Array.isArray(consignmentInsert)
        ? consignmentInsert[0]?.id || consignmentInsert[0]
        : consignmentInsert;

      const items = payload.packages.map(pkg => ({
        consignment_id: consignmentId,
        item_id: pkg.packageId,
        description: pkg.description || null,
        weight: pkg.weight,
        height: pkg.height,
        width: pkg.width,
        item_length: pkg.length,
        is_primary: pkg.isPrimary,
        created_by: createdBy,
        updated_by: createdBy
      }));

      await trx('items').insert(items);

      return {
        id: consignmentId,
        consignmentId: payload.shipmentId,
        packagesCreated: items.length,
        status: 'CREATED'
      };
    });

    // Prepare consignment data for notifications
    const consignmentNotificationData = {
      shipmentId: payload.shipmentId,
      timestamp: payload.timestamp,
      shipmentType: payload.shipmentType,
      deliveryDate: payload.deliveryDate,
      receiver: payload.receiver,
      sender: payload.sender,
      packages: payload.packages.map(pkg => ({
        packageId: pkg.packageId,
        isPrimary: pkg.isPrimary
      }))
    };

    // Send notifications asynchronously (non-blocking)
    const authHeader = req.headers.authorization;

    setImmediate(async () => {
      try {
        logger.info({ shipmentId: payload.shipmentId }, 'Starting async notification flow');

        // Call external shipment arrival API
        const externalResult = await notifyExternalShipmentArrival(consignmentNotificationData);
        logger.info(
          { shipmentId: payload.shipmentId, externalResult },
          'External API notification completed'
        );

        // Send notifications to customer
        const notificationResults = await notifyShipmentArrival(consignmentNotificationData, authHeader);
        logger.info(
          { shipmentId: payload.shipmentId, notificationResults },
          'Customer notifications completed'
        );
      } catch (error) {
        logger.error(
          { error: error.message, shipmentId: payload.shipmentId },
          'Error in async notification flow (non-blocking)'
        );
        // Don't throw - this is background work
      }
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: responseData,
      message: 'Consignment created successfully. Notifications will be sent shortly.'
    });
  } catch (error) {
    return next(error);
  }
};
