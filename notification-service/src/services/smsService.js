const twilio = require('twilio');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * SMS Service - Twilio Integration
 */
class SmsService {
  constructor() {
    try {
      if (process.env.TWILIO_ACCOUNT_SID && 
          process.env.TWILIO_AUTH_TOKEN && 
          process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.enabled = true;
        logger.info('✅ Twilio SMS service initialized');
      } else {
        this.enabled = false;
        logger.warn('⚠️ Twilio credentials not configured or invalid, SMS service disabled');
      }
    } catch (error) {
      this.enabled = false;
      logger.warn(error, '⚠️ Failed to initialize Twilio, SMS service disabled');
    }
  }

  /**
   * Send shipment arrival SMS
   */
  async sendShipmentArrivalSms(consignmentData) {
    if (!this.enabled) {
      logger.warn('SMS service disabled, skipping SMS notification');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const { recipientPhone, recipientName, shipmentDetails } = consignmentData;
      const { shipmentId, deliveryCity, deliveryDate } = shipmentDetails;

      const message = this.generateShipmentArrivalMessage(shipmentId, deliveryCity, deliveryDate);

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipientPhone
      });

      logger.info(
        { shipmentId, recipientPhone, messageSid: result.sid },
        'Shipment arrival SMS sent successfully'
      );

      return {
        success: true,
        messageSid: result.sid,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(
        { error: error.message, shipmentId: consignmentData.shipmentDetails.shipmentId },
        'Failed to send shipment arrival SMS'
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate SMS message for shipment arrival
   */
  generateShipmentArrivalMessage(shipmentId, deliveryCity, deliveryDate) {
    const date = new Date(deliveryDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return `ParcelPoint: Your shipment ${shipmentId} has arrived in ${deliveryCity}! Delivery scheduled for ${date}. Manage your preferences: https://parcelpoint.com/track/${shipmentId}`;
  }

  /**
   * Send OTP SMS
   */
  async sendOtpSms(payload) {
    if (!this.enabled) {
      logger.warn('SMS service disabled, skipping OTP SMS');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const { recipientPhone, shipmentId, otp, expiresAt } = payload;
      const message = this.generateOtpMessage(shipmentId, otp, expiresAt);

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: recipientPhone
      });

      logger.info(
        { shipmentId, recipientPhone, messageSid: result.sid },
        'OTP SMS sent successfully'
      );

      return {
        success: true,
        messageSid: result.sid,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(
        { error: error.message, shipmentId: payload.shipmentId },
        'Failed to send OTP SMS'
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate SMS message for OTP
   */
  generateOtpMessage(shipmentId, otp, expiresAt) {
    const expiry = new Date(expiresAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `ParcelPoint OTP: ${otp} for shipment ${shipmentId}. Expires at ${expiry}.`;
  }
}

module.exports = new SmsService();
