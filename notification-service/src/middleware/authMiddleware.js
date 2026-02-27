const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Token Validation Middleware
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.substring(7);

    // Validate token with auth-service
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    });

    if (!response.data.valid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = response.data.data;
    next();
  } catch (error) {
    logger.warn({ error: error.message }, 'Token validation failed');
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: 'Token validation failed'
    });
  }
};

module.exports = { requireAuth };
