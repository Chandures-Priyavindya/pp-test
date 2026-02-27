const knex = require('knex');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Supabase Database Connection using Knex.js
 * PostgreSQL with connection pooling
 */
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT) || 6543,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: {
      rejectUnauthorized: false
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 60000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    }
  },
  debug: process.env.NODE_ENV === 'development'
});

/**
 * Test database connection on startup
 */
db.raw('SELECT 1+1 as result')
  .then(() => {
    logger.info({
      host: process.env.SUPABASE_DB_HOST,
      database: process.env.SUPABASE_DB_NAME
    }, '✅ Supabase database connected successfully');
  })
  .catch(err => {
    logger.error({
      host: process.env.SUPABASE_DB_HOST,
      database: process.env.SUPABASE_DB_NAME,
      error: err.message
    }, '❌ Database connection failed');
    process.exit(1);
  });

module.exports = db;
