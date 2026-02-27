const { StatusCodes } = require('http-status-codes');
const pino = require('pino');
const jwtService = require('../utils/jwt');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * JWT Token Validation Middleware (for all services)
 * Validates Bearer token using public key - STATELESS
 */
const validateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractToken(authHeader);

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'No authorization token provided'
      });
    }

    // Verify token using public key (stateless - no DB call needed)
    const decoded = jwtService.verifyToken(token, 'access');

    // Attach user info to request
    req.user = {
      userId: decoded.sub,
      clientId: decoded.clientId,
      roles: decoded.roles,
      jti: decoded.jti
    };

    next();
  } catch (error) {
    logger.warn({ error: error.message }, 'Token validation failed');

    const status = error.message.includes('Token expired')
      ? StatusCodes.UNAUTHORIZED
      : StatusCodes.FORBIDDEN;

    res.status(status).json({
      success: false,
      error: error.message || 'Token validation failed'
    });
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required roles
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

module.exports = { validateToken, authorize };
