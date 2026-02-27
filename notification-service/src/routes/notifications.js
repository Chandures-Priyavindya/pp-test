const express = require('express');
const {
	sendShipmentArrival,
	getNotificationStatus,
	sendAccessLink,
	sendOtp,
	sendOtpAlert
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/notifications/shipment-arrival:
 *   post:
 *     summary: Send shipment arrival notification (email, SMS, push)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consignmentId
 *               - type
 *               - recipientEmail
 *               - recipientPhone
 *               - recipientName
 *               - shipmentDetails
 *     responses:
 *       202:
 *         description: Notification queued for delivery
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/shipment-arrival', requireAuth, sendShipmentArrival);
router.post('/access-link', requireAuth, sendAccessLink);
// OTP notifications are called from the orchestration service using access tokens.
// Do not require auth here because those tokens are not JWTs.
router.post('/otp', sendOtp);
router.post('/otp-alert', sendOtpAlert);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   get:
 *     summary: Get notification status
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification status retrieved
 *       404:
 *         description: Notification not found
 */
router.get('/:notificationId', requireAuth, getNotificationStatus);

module.exports = router;
