const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Push Notification Service - Firebase/OneSignal Integration
 * Can be extended to support Firebase Cloud Messaging or OneSignal
 */
class PushNotificationService {
  constructor() {
    this.provider = process.env.PUSH_NOTIFICATION_PROVIDER || 'onesignal';
    this.enabled = !!process.env.PUSH_NOTIFICATION_API_KEY;
    
    if (this.enabled) {
      logger.info({ provider: this.provider }, '✅ Push notification service initialized');
    } else {
      logger.warn('⚠️ Push notification service not configured');
    }
  }

  /**
   * Send shipment arrival push notification
   */
  async sendShipmentArrivalNotification(consignmentData) {
    if (!this.enabled) {
      logger.warn('Push notification service disabled');
      return { success: false, message: 'Push service not configured' };
    }

    try {
      const { recipientName, shipmentDetails } = consignmentData;
      const { shipmentId, deliveryCity } = shipmentDetails;

      if (this.provider === 'onesignal') {
        return await this.sendViaOneSignal(consignmentData);
      } else if (this.provider === 'firebase') {
        return await this.sendViaFirebase(consignmentData);
      }

      return { success: false, message: 'Unknown push provider' };
    } catch (error) {
      logger.error(
        { error: error.message, shipmentId: consignmentData.shipmentDetails.shipmentId },
        'Failed to send push notification'
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Send via OneSignal
   */
  async sendViaOneSignal(consignmentData) {
    const axios = require('axios');
    const { shipmentDetails } = consignmentData;
    const { shipmentId, deliveryCity } = shipmentDetails;

    try {
      const payload = {
        headings: { en: `Shipment ${shipmentId} Arrived` },
        contents: {
          en: `Your package has arrived in ${deliveryCity}. Tap to view delivery options.`
        },
        big_picture: 'https://parcelpoint.com/images/shipment-arrived.jpg',
        data: {
          shipmentId,
          action: 'VIEW_CONSIGNMENT',
          deeplink: `parcelpoint://track/${shipmentId}`
        },
        included_segments: ['All']
      };

      const response = await axios.post(
        'https://onesignal.com/api/v1/notifications',
        payload,
        {
          headers: {
            'Authorization': `Basic ${process.env.PUSH_NOTIFICATION_API_KEY}`,
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      );

      logger.info(
        { shipmentId, notificationId: response.data?.body?.id },
        'Push notification sent via OneSignal'
      );

      return {
        success: true,
        notificationId: response.data?.body?.id,
        provider: 'onesignal',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(
        { error: error.message, shipmentId: shipmentDetails.shipmentId },
        'OneSignal push notification failed'
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Send via Firebase Cloud Messaging
   */
  async sendViaFirebase(consignmentData) {
    logger.info('Firebase push notification support coming soon');
    return { success: false, message: 'Firebase support coming soon' };
  }
}

module.exports = new PushNotificationService();
