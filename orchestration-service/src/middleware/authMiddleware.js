const axios = require('axios');
const { StatusCodes } = require('http-status-codes');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Token Validation Middleware
 * Calls auth-service to validate token and check revocation
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

    // Call auth-service to validate token
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

    // Attach user info to request
    req.user = response.data.data;

    next();
  } catch (error) {
    logger.warn({ error: error.message }, 'Token validation failed');

    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: 'Token validation failed'
    });
  }
};

/**
 * Role-based Authorization Middleware
 */
const authorize = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (requiredRoles.length === 0) {
      return next();
    }

    const hasRole = requiredRoles.some(role => req.user.roles.includes(role));

    if (!hasRole) {
      logger.warn(
        { userId: req.user.userId, required: requiredRoles, actual: req.user.roles },
        'Insufficient permissions'
      );

      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { requireAuth, authorize };
