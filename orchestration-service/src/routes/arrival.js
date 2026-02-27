const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { requireAuth } = require('../middleware/authMiddleware');
const db = require('../../config/database');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const router = express.Router();

/**
 * @swagger
 * /api/consignments/{shipmentId}/arrival:
 *   patch:
 *     summary: Record shipment arrival
 *     tags: [Consignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *       - in: query
 *         name: packageCount
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Arrival recorded
 *       400:
 *         description: Validation error
 *       404:
 *         description: Consignment not found
 */
router.patch('/:shipmentId/arrival', requireAuth, async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const { messageId, timestamp, shipmentArrival } = req.body;

    // Find consignment
    const consignment = await db('consignments')
      .where('consignment_id', shipmentId)
      .first();

    if (!consignment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Consignment not found',
        details: [{ field: 'shipmentId', message: `No consignment found with ID ${shipmentId}` }]
      });
    }

    // Update consignment status to ARRIVED
    await db('consignments')
      .where('id', consignment.id)
      .update({
        status: 'ARRIVED',
        updated_by: req.user?.clientId || 'SYSTEM',
        updated_date: new Date()
      });

    // Log the arrival event
    await db('api_logs').insert({
      consignment_id: shipmentId,
      request_id: messageId || `ARRIVAL-${shipmentId}-${Date.now()}`,
      url: `/api/consignments/${shipmentId}/arrival`,
      request_payload: JSON.stringify(req.body),
      response_payload: JSON.stringify({ success: true }),
      from_system: 'external-api',
      to_system: 'orchestration-service',
      has_retried: false,
      status: 'SUCCESS',
      created_by: req.user?.clientId || 'SYSTEM'
    });

    logger.info(
      { shipmentId, messageId },
      'Shipment arrival recorded successfully'
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        shipmentId,
        status: 'ARRIVED',
        arrivedAt: shipmentArrival || new Date().toISOString(),
        message: 'Shipment arrival recorded successfully'
      }
    });
  } catch (error) {
    logger.error(error, 'Error recording shipment arrival');
    return next(error);
  }
});

module.exports = router;
