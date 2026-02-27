const pino = require('pino');
const { v4: uuidv4 } = require('uuid');

/**
 * Production Logger with Request Context
 */
class ContextLogger {
  constructor() {
    this.baseLogger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{levelLabel} [{requestId}] {msg}'
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime
    });
  }

  /**
   * Create request-scoped logger
   */
  createRequestLogger(req) {
    const requestId = req.requestId || uuidv4();
    req.requestId = requestId;

    return {
      requestId,
      info: (data, message) => this.baseLogger.info(
        { ...data, requestId, layer: 'REQUEST' },
        message
      ),
      start: (layer, functionName, params = {}) => this.baseLogger.info(
        {
          requestId,
          layer,
          functionName,
          action: 'START',
          params: this._sanitize(params)
        },
        `[${layer}] ${functionName} started`
      ),
      end: (layer, functionName, result = {}) => this.baseLogger.info(
        {
          requestId,
          layer,
          functionName,
          action: 'END',
          result: this._sanitize(result)
        },
        `[${layer}] ${functionName} completed`
      ),
      error: (error, layer, functionName, params = {}) => this.baseLogger.error(
        {
          requestId,
          layer,
          functionName,
          action: 'ERROR',
          errorCode: error.errorCode || 'UNKNOWN_ERROR',
          errorMessage: error.message,
          errorStack: error.stack,
          params: this._sanitize(params)
        },
        `[${layer}] ${functionName} failed: ${error.message}`
      ),
      warn: (data, message) => this.baseLogger.warn(
        { ...data, requestId, layer: 'REQUEST' },
        message
      ),
      debug: (data, message) => this.baseLogger.debug(
        { ...data, requestId, layer: 'REQUEST' },
        message
      )
    };
  }

  /**
   * Sanitize sensitive data
   */
  _sanitize(data) {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken', 'privateKey'];
    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObj = (obj) => {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObj(obj[key]);
        }
      }
    };

    sanitizeObj(sanitized);
    return sanitized;
  }
}

module.exports = new ContextLogger();
