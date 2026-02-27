const axios = require('axios');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';

/**
 * Trigger shipment arrival notifications via notification-service
 * Notification-service will handle all channels: Email, SMS, Push
 */
const notifyShipmentArrival = async (consignmentData, authHeader) => {
  try {
    const { shipmentId, receiver, deliveryDate, packages } = consignmentData;

    logger.info({ shipmentId }, 'Triggering shipment arrival notification via notification-service');

    // Single API call to notification-service
    // It handles all notification channels internally
    const notificationPayload = {
      consignmentId: shipmentId,
      type: 'SHIPMENT_ARRIVAL',
      recipientEmail: receiver.emailAddress,
      recipientPhone: receiver.mobileNumber,
      recipientName: receiver.contactName,
      shipmentDetails: {
        shipmentId,
        deliveryDate,
        deliveryCity: receiver.address.city,
        deliveryState: receiver.address.state,
        deliveryCountry: receiver.address.country,
        postalCode: receiver.address.postalCode,
        packageCount: packages.length
      },
      metadata: {
        shipmentId,
        receiverName: receiver.contactName,
        deliveryDate,
        city: receiver.address.city,
        country: receiver.address.country
      }
    };

    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/notifications/shipment-arrival`,
      notificationPayload,
      {
        headers,
        timeout: 10000
      }
    );

    logger.info(
      { shipmentId, notificationId: response.data?.data?.id },
      'Shipment arrival notification triggered successfully'
    );

    return {
      success: true,
      notificationId: response.data?.data?.id,
      message: 'Notification queued for processing'
    };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        shipmentId: consignmentData.shipmentId,
        status: error.response?.status
      },
      'Failed to trigger shipment arrival notification'
    );

    // Don't throw - allow consignment creation to succeed even if notification fails
    return {
      success: false,
      error: error.message,
      message: 'Notification service unavailable, consignment created but notification delayed'
    };
  }
};

/**
 * Send access link email via notification-service
 */
const notifyAccessLink = async (payload, authHeader) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/notifications/access-link`,
      payload,
      { headers, timeout: 10000 }
    );

    return {
      success: true,
      notificationId: response.data?.data?.notificationId,
      message: 'Access link notification queued'
    };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        status: error.response?.status,
        consignmentId: payload?.shipmentId
      },
      'Failed to trigger access link notification'
    );

    return {
      success: false,
      error: error.message,
      message: 'Notification service unavailable, access link created without email'
    };
  }
};

/**
 * Send OTP alert notification via notification-service
 */
const notifyOtpAlert = async (payload, authHeader) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/notifications/otp-alert`,
      payload,
      { headers, timeout: 10000 }
    );

    return {
      success: true,
      notificationId: response.data?.data?.notificationId
    };
  } catch (error) {
    logger.error(
      {
        error: error.message,
        status: error.response?.status,
        shipmentId: payload?.shipmentId
      },
      'Failed to trigger OTP alert notification'
    );

    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  notifyShipmentArrival,
  notifyAccessLink,
  notifyOtpAlert
};
