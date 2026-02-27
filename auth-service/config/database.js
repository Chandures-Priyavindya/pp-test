const knex = require('knex');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Supabase connection (PostgreSQL)
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.SUPABASE_DB_HOST,
    port: process.env.SUPABASE_DB_PORT || 6543,
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: {
      rejectUnauthorized: false,
      ca: process.env.SUPABASE_DB_SSL_CERT
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
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  },
  debug: process.env.NODE_ENV === 'development'
});

// Test connection
db.raw('SELECT 1+1 as result')
  .then(() => logger.info('✅ Supabase database connected'))
  .catch(err => {
    logger.error(err, '❌ Database connection failed');
    process.exit(1);
  });

module.exports = db;
