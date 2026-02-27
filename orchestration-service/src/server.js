require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createTerminus } = require('@godaddy/terminus');
const http = require('http');
const pino = require('pino');
const pinoHttp = require('pino-http');
const promBundle = require('express-prom-bundle');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { StatusCodes } = require('http-status-codes');

// Logger
const buildLoggerOptions = () => {
  const options = {
    level: process.env.LOG_LEVEL || 'info'
  };

  if (process.env.LOG_PRETTY !== 'false') {
    try {
      require.resolve('pino-pretty');
      options.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      };
    } catch (error) {
      // Fallback to default JSON logger if pino-pretty is unavailable
    }
  }

  return options;
};

const logger = pino(buildLoggerOptions());

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Prometheus metrics
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'ups-lms', service: 'orchestration' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 5000
    }
  }
});

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UPS LMS Orchestration Service API',
      version: '1.0.0',
      description: 'Main orchestration service for UPS LMS'
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Development server' }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Request logging
app.use(pinoHttp({ logger }));

// Metrics
app.use(metricsMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'orchestration-service',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  // Check database
  try {
    // Add your database health check here
    health.checks.database = { status: 'UP' };
  } catch (error) {
    health.checks.database = { status: 'DOWN', error: error.message };
    health.status = 'DOWN';
  }

  // Check Redis
  try {
    // Add Redis health check here
    health.checks.redis = { status: 'UP' };
  } catch (error) {
    health.checks.redis = { status: 'DOWN', error: error.message };
    health.status = 'DOWN';
  }

  const status = health.status === 'UP' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;
  res.status(status).json(health);
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/consignments', require('./routes/consignments'));
app.use('/api/consignments', require('./routes/arrival'));
app.use('/api/items', require('./routes/items'));
app.use('/api', require('./routes/accessLinks'));
app.use('/api', require('./routes/otp'));


// 404 Handler
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled error');

  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = process.env.NODE_ENV === 'production' && status >= 500
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown setup
createTerminus(server, {
  signals: ['SIGTERM', 'SIGINT', 'SIGHUP'],
  timeout: 10000,
  healthChecks: {
    '/health': async () => ({ status: 'UP' })
  },
  onSignal: async () => {
    logger.info('Server is starting cleanup');
    // Close database connections, Redis, etc.
  },
  onShutdown: async () => {
    logger.info('Cleanup finished, server is shutting down');
  },
  logger: (msg, err) => logger.error(err, msg)
});

// Start server
server.listen(PORT, () => {
  logger.info(`Orchestration service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
  logger.info(`Metrics: http://localhost:${PORT}/metrics`);
});

module.exports = { app, server };
