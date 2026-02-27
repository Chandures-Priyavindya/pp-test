const { v4: uuidv4 } = require('uuid');
const contextLogger = require('../utils/logger');

/**
 * Request ID Middleware
 * Assigns unique ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;

  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Request Logging Middleware
 * Logs incoming requests with parameters
 */
const requestLoggingMiddleware = (req, res, next) => {
  req.logger = contextLogger.createRequestLogger(req);

  const startTime = Date.now();

  req.logger.start('MIDDLEWARE', 'REQUEST_RECEIVED', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    if (res.statusCode < 400) {
      req.logger.end('MIDDLEWARE', 'REQUEST_COMPLETED', {
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

module.exports = { requestIdMiddleware, requestLoggingMiddleware };
