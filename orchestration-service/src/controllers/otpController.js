const Joi = require('joi');
const { StatusCodes } = require('http-status-codes');
const pino = require('pino');
const db = require('../../config/database');
const otpService = require('../services/otpService');
const { notifyOtpAlert } = require('../services/notificationService');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const requestSchema = Joi.object({
  shipmentId: Joi.string().min(3).max(50).required(),
  channel: Joi.string().valid('SMS', 'EMAIL').default('EMAIL'),
  destination: Joi.string().optional() // Optional - will fetch from DB if not provided
});

const verifySchema = Joi.object({
  shipmentId: Joi.string().min(3).max(50).required(),
  otp: Joi.string().pattern(/^\d{6}$/).required()
});

/**
 * Request OTP for shipment access
 * POST /api/otp/request
 */
exports.requestOtp = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Missing or invalid Authorization header',
        code: 'MISSING_TOKEN'
      });
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const { error, value } = requestSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const { shipmentId, channel, destination } = value;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Validate access link token first
    const linkValidation = await otpService.validateAccessToken(token);
    if (!linkValidation.valid) {
      await otpService.logAttempt({
        shipmentId,
        token,
        ipAddress,
        userAgent,
        action: 'OTP_REQUEST',
        result: 'TOKEN_INVALID',
        error: linkValidation.error
      });

      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: linkValidation.error,
        code: 'TOKEN_INVALID'
      });
    }

    if (linkValidation.shipmentId !== shipmentId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Shipment ID mismatch',
        code: 'SHIPMENT_MISMATCH'
      });
    }

    // Check rate limiting
    const rateLimitCheck = await otpService.checkRateLimit(ipAddress, shipmentId);
    if (!rateLimitCheck.allowed) {
      await otpService.logAttempt({
        shipmentId,
        token,
        ipAddress,
        userAgent,
        action: 'OTP_REQUEST',
        result: 'RATE_LIMITED'
      });

      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: rateLimitCheck.retryAfter
      });
    }

    // Check if link is locked
    const lockStatus = await otpService.checkLockStatus(shipmentId, token);
    if (lockStatus.locked) {
      await otpService.logAttempt({
        shipmentId,
        token,
        ipAddress,
        userAgent,
        action: 'OTP_REQUEST',
        result: 'LINK_LOCKED'
      });

      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: 'Link is temporarily locked due to multiple failed attempts',
        code: 'LINK_LOCKED',
        lockExpiresAt: lockStatus.expiresAt
      });
    }

    // Get consignment details from database
    const consignment = await db('consignments')
      .where('consignment_id', shipmentId)
      .first();

    if (!consignment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Consignment not found',
        code: 'NOT_FOUND'
      });
    }

    // Get recipient info - from database if not provided in request
    let recipientEmail = destination;
    let recipientPhone = destination;
    
    if (!destination) {
      // Fetch from database
      recipientEmail = channel === 'EMAIL' ? consignment.receiver_email : null;
      recipientPhone = channel === 'SMS' ? consignment.receiver_mobile_number : null;
    }

    // Validate we have a destination
    if (!recipientEmail && !recipientPhone) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: `No ${channel === 'EMAIL' ? 'email' : 'phone'} found for receiver`,
        code: 'MISSING_DESTINATION'
      });
    }

    // Generate and send OTP
    const result = await otpService.generateAndSendOtp({
      shipmentId,
      token,
      channel,
      recipientEmail,
      recipientPhone,
      recipientName: consignment.receiver_contact_name,
      ipAddress,
      userAgent
    });

    if (!result.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: result.error,
        code: 'OTP_SEND_FAILED'
      });
    }

    logger.info({
      shipmentId,
      channel,
      ipAddress,
      requestId: result.requestId
    }, 'OTP requested successfully');

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        requestId: result.requestId,
        expiresAt: result.expiresAt,
        channel
      },
      message: `OTP sent via ${channel}. Valid for 2 minutes.`
    });
  } catch (error) {
    logger.error(error, 'Error processing OTP request');
    return next(error);
  }
};

/**
 * Verify OTP for shipment access
 * POST /api/otp/verify
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Missing or invalid Authorization header',
        code: 'MISSING_TOKEN'
      });
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const { error, value } = verifySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const { shipmentId, otp } = value;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Validate access link token
    const linkValidation = await otpService.validateAccessToken(token);
    if (!linkValidation.valid) {
      await otpService.logAttempt({
        shipmentId,
        token,
        ipAddress,
        userAgent,
        action: 'OTP_VERIFY',
        result: 'TOKEN_INVALID',
        error: linkValidation.error
      });

      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: linkValidation.error,
        code: 'TOKEN_INVALID'
      });
    }

    // Check if link is locked
    const lockStatus = await otpService.checkLockStatus(shipmentId, token);
    if (lockStatus.locked) {
      await otpService.logAttempt({
        shipmentId,
        token,
        ipAddress,
        userAgent,
        action: 'OTP_VERIFY',
        result: 'LINK_LOCKED',
        otpProvided: otp
      });

      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: 'Link is temporarily locked due to multiple failed attempts',
        code: 'LINK_LOCKED',
        lockExpiresAt: lockStatus.expiresAt
      });
    }

    // Verify OTP
    const verification = await otpService.verifyOtp({
      shipmentId,
      token,
      otp,
      ipAddress,
      userAgent
    });

    if (!verification.valid) {
      // Handle failed attempts
      if (verification.attempts >= 3 && verification.attempts < 5) {
        // Send warning notification
        setImmediate(async () => {
          await notifyOtpAlert({
            shipmentId,
            type: 'OTP_WARNING',
            attempts: verification.attempts,
            ipAddress,
            timestamp: new Date().toISOString(),
            link: token
          });
        });
      }

      if (verification.attempts >= 5) {
        // Lock link and send alert
        await otpService.lockLink(shipmentId, token, 60); // 1 hour lock

        setImmediate(async () => {
          await notifyOtpAlert({
            shipmentId,
            type: 'OTP_LOCK',
            attempts: verification.attempts,
            ipAddress,
            timestamp: new Date().toISOString(),
            link: token,
            lockDuration: '1 hour'
          });
        });

        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          error: 'Link locked due to excessive failed attempts',
          code: 'LINK_LOCKED',
          lockExpiresAt: verification.lockExpiresAt
        });
      }

      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: verification.error,
        code: verification.code,
        attemptsRemaining: Math.max(0, 5 - verification.attempts)
      });
    }

    logger.info({
      shipmentId,
      ipAddress,
      requestId: verification.requestId
    }, 'OTP verified successfully');

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        shipmentId,
        verified: true,
        accessToken: verification.accessToken
      },
      message: 'OTP verified successfully'
    });
  } catch (error) {
    logger.error(error, 'Error processing OTP verification');
    return next(error);
  }
};
