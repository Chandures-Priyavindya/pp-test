const { StatusCodes } = require('http-status-codes');
const { AppError } = require('../utils/errors');

/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized responses with full logging
 */
const globalErrorHandler = (err, req, res, next) => {
  const requestId = req.requestId || 'UNKNOWN';
  const logger = req.logger || console;

  // Determine error details
  let error = err;
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details = null;

  // Handle custom app errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;

    logger.error(err, 'MIDDLEWARE', 'GLOBAL_ERROR_HANDLER', {
      errorType: err.name,
      errorCode,
      statusCode,
      details
    });
  }
  // Handle validation errors (from express-validator, joi, etc)
  else if (err.name === 'ValidationError' || err.array) {
    statusCode = StatusCodes.BAD_REQUEST;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = {
      validationErrors: err.array ? err.array() : [{ msg: err.message }]
    };

    logger.error(err, 'MIDDLEWARE', 'GLOBAL_ERROR_HANDLER', {
      errorType: 'VALIDATION',
      details
    });
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid token';

    logger.warn({ errorMessage: err.message, requestId }, 'Invalid token provided');
  }
  // Handle token expired errors
  else if (err.name === 'TokenExpiredError') {
    statusCode = StatusCodes.UNAUTHORIZED;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token has expired';

    logger.warn({ errorMessage: err.message, requestId }, 'Token expired');
  }
  // Handle database errors
  else if (err.code && err.code.startsWith('PROTOCOL_')) {
    statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    errorCode = 'DATABASE_ERROR';
    message = 'Database connection failed';

    logger.error(err, 'MIDDLEWARE', 'GLOBAL_ERROR_HANDLER', {
      errorType: 'DATABASE',
      errorCode: err.code
    });
  }
  // Handle timeout errors
  else if (err.code === 'ECONNABORTED' || err.name === 'TimeoutError') {
    statusCode = StatusCodes.REQUEST_TIMEOUT;
    errorCode = 'REQUEST_TIMEOUT';
    message = 'Request timeout';

    logger.warn({ requestId, errorMessage: err.message }, 'Request timeout');
  }
  // Handle default errors
  else {
    statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    message = err.message || 'An unexpected error occurred';

    logger.error(err, 'MIDDLEWARE', 'GLOBAL_ERROR_HANDLER', {
      errorType: err.name || 'UNKNOWN',
      message,
      stack: err.stack
    });
  }

  // Build response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    }
  };

  // Add details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
    if (details) {
      response.error.details = details;
    }
  } else if (details) {
    response.error.details = details;
  }

  // Send response
  res.status(statusCode).json(response);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { globalErrorHandler, asyncHandler };
