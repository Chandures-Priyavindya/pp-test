const axios = require('axios');
const pino = require('pino');
const { StatusCodes } = require('http-status-codes');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const EXTERNAL_ARRIVAL_API = process.env.EXTERNAL_ARRIVAL_API || 'https://f40qgpv7wh.execute-api.ap-southeast-1.amazonaws.com/qa';
const EXTERNAL_API_TOKEN = process.env.EXTERNAL_API_TOKEN || '';

/**
 * Call external shipment arrival API
 * PATCH /v1/consignments/:shipmentId/arrival
 */
const notifyExternalShipmentArrival = async (consignmentData) => {
  try {
    const { shipmentId, packages, timestamp } = consignmentData;

    if (!EXTERNAL_API_TOKEN) {
      logger.warn({ shipmentId }, 'External API token not configured, skipping external notification');
      return { success: false, error: 'Token not configured' };
    }

    // Build primary package for arrival notification
    const primaryPackage = packages.find(p => p.isPrimary) || packages[0];

    const arrivalPayload = {
      messageId: `ARRIVAL-${shipmentId}-${Date.now()}`,
      timestamp: new Date(timestamp).toISOString(),
      isSingle: packages.length === 1,
      shipmentType: consignmentData.shipmentType || 'NON-DOCUMENT',
      shipmentId: shipmentId,
      shipmentArrival: new Date().toISOString(),
      packages: packages.map(pkg => ({
        packageId: pkg.packageId
      }))
    };

    const url = `${EXTERNAL_ARRIVAL_API}/v1/consignments/${shipmentId}/arrival`;
    const requestId = `REQ-${shipmentId}-${Date.now()}`;

    logger.info(
      { shipmentId, url, requestId },
      'Calling external shipment arrival API'
    );

    const response = await axios.patch(url, arrivalPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXTERNAL_API_TOKEN}`,
        'X-Request-ID': requestId
      },
      params: {
        requestId: requestId,
        packageCount: packages.length,
        chunkId: 1
      },
      timeout: 15000
    });

    logger.info(
      { shipmentId, status: response.status, requestId },
      'External shipment arrival API called successfully'
    );

    return {
      success: true,
      status: response.status,
      data: response.data,
      requestId
    };
  } catch (error) {
    logger.error(
      { error: error.message, shipmentId: consignmentData.shipmentId },
      'Failed to call external shipment arrival API'
    );
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

module.exports = {
  notifyExternalShipmentArrival
};
