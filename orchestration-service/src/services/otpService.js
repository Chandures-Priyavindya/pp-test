const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pino = require('pino');
const db = require('../../config/database');
const axios = require('axios');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const OTP_EXPIRY_MINUTES = 2;
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 60;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_REQUESTS = 5;

let otpTablesReady = false;

/**
 * Ensure OTP tables exist
 */
const ensureOtpTables = async () => {
  if (otpTablesReady) return;

  // Create otp_requests table
  const otpRequestsExists = await db.schema.hasTable('otp_requests');
  if (!otpRequestsExists) {
    await db.schema.createTable('otp_requests', table => {
      table.uuid('id').primary();
      table.string('consignment_id', 50).notNullable();
      table.string('token_hash', 128).notNullable();
      table.string('otp_hash', 128).notNullable();
      table.string('channel', 10).notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('is_used').notNullable().defaultTo(false);
      table.boolean('is_verified').notNullable().defaultTo(false);
      table.integer('attempts').notNullable().defaultTo(0);
      table.string('ip_address', 64).nullable();
      table.string('user_agent', 512).nullable();
      table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
      table.timestamp('verified_at').nullable();
    });

    await db.schema.alterTable('otp_requests', table => {
      table.index(['consignment_id', 'token_hash'], 'idx_otp_requests_consignment_token');
      table.index(['expires_at'], 'idx_otp_requests_expires');
    });
  }

  // Create otp_attempts table (audit log)
  const otpAttemptsExists = await db.schema.hasTable('otp_attempts');
  if (!otpAttemptsExists) {
    await db.schema.createTable('otp_attempts', table => {
      table.uuid('id').primary();
      table.string('consignment_id', 50).notNullable();
      table.string('token_hash', 128).notNullable();
      table.string('action', 20).notNullable(); // OTP_REQUEST, OTP_VERIFY
      table.string('result', 20).notNullable(); // SUCCESS, FAILED, EXPIRED, etc
      table.string('otp_provided_hash', 128).nullable();
      table.string('ip_address', 64).nullable();
      table.string('user_agent', 512).nullable();
      table.text('error_message').nullable();
      table.jsonb('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    });

    await db.schema.alterTable('otp_attempts', table => {
      table.index(['consignment_id'], 'idx_otp_attempts_consignment');
      table.index(['ip_address', 'created_at'], 'idx_otp_attempts_ip_time');
      table.index(['token_hash', 'action', 'created_at'], 'idx_otp_attempts_token_action');
    });
  }

  // Create link_locks table
  const linkLocksExists = await db.schema.hasTable('link_locks');
  if (!linkLocksExists) {
    await db.schema.createTable('link_locks', table => {
      table.string('consignment_id', 50).notNullable();
      table.string('token_hash', 128).notNullable();
      table.timestamp('locked_at').notNullable().defaultTo(db.fn.now());
      table.timestamp('expires_at').notNullable();
      table.string('reason', 100).notNullable();
      table.integer('failed_attempts').notNullable();
      table.string('ip_address', 64).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
    });

    await db.schema.alterTable('link_locks', table => {
      table.index(['consignment_id', 'token_hash', 'is_active'], 'idx_link_locks_active');
      table.index(['expires_at'], 'idx_link_locks_expires');
    });
  }

  otpTablesReady = true;
};

/**
 * Hash data with SHA256
 */
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');

/**
 * Generate cryptographically secure 6-digit OTP
 */
const generateOtp = () => {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  return String(num % 1000000).padStart(6, '0');
};

/**
 * Validate access token structure
 */
exports.validateAccessToken = async (token) => {
  try {
    const secret = process.env.ACCESS_LINK_SECRET;
    if (!secret) {
      logger.error('ACCESS_LINK_SECRET not configured');
      return { valid: false, error: 'Server configuration error' };
    }

    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Invalid token format' };
    }

    const parts = token.split('.');
    if (parts.length === 3) {
      return { valid: false, error: 'JWT not supported for OTP. Use access-link token.' };
    }

    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [payloadEncoded, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadEncoded)
      .digest('base64url');

    if (signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid token signature' };
    }

    let payload;
    try {
      const payloadJson = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
      payload = JSON.parse(payloadJson);
    } catch (parseError) {
      logger.error(parseError, 'Failed to parse token payload');
      return { valid: false, error: 'Invalid token payload format' };
    }

    if (!payload?.shipmentId || typeof payload?.exp !== 'number') {
      return { valid: false, error: 'Invalid token payload' };
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, shipmentId: payload.shipmentId, payload };
  } catch (error) {
    logger.error(error, 'Token validation error');
    return { valid: false, error: 'Token validation failed' };
  }
};

/**
 * Check rate limiting (5 requests per 10 minutes per IP)
 */
exports.checkRateLimit = async (ipAddress, shipmentId) => {
  await ensureOtpTables();

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const count = await db('otp_attempts')
    .where('ip_address', ipAddress)
    .where('consignment_id', shipmentId)
    .where('created_at', '>=', windowStart)
    .count('* as total')
    .first();

  const requestCount = parseInt(count?.total || 0, 10);

  if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MINUTES * 60)
    };
  }

  return { allowed: true };
};

/**
 * Check if link is locked
 */
exports.checkLockStatus = async (shipmentId, token) => {
  await ensureOtpTables();

  const tokenHash = hash(token);
  const now = new Date();

  const lock = await db('link_locks')
    .where('consignment_id', shipmentId)
    .where('token_hash', tokenHash)
    .where('is_active', true)
    .where('expires_at', '>', now)
    .orderBy('locked_at', 'desc')
    .first();

  if (lock) {
    return {
      locked: true,
      expiresAt: lock.expires_at,
      reason: lock.reason
    };
  }

  return { locked: false };
};

/**
 * Lock link for specified duration
 */
exports.lockLink = async (shipmentId, token, durationMinutes) => {
  await ensureOtpTables();

  const tokenHash = hash(token);
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  await db('link_locks').insert({
    id: uuidv4(),
    consignment_id: shipmentId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    reason: 'EXCESSIVE_FAILED_ATTEMPTS',
    failed_attempts: MAX_ATTEMPTS,
    is_active: true
  });

  logger.warn({ shipmentId, expiresAt }, 'Link locked due to failed OTP attempts');
};

/**
 * Log OTP attempt
 */
exports.logAttempt = async (data) => {
  await ensureOtpTables();

  const tokenHash = data.token ? hash(data.token) : null;
  const otpProvidedHash = data.otpProvided ? hash(data.otpProvided) : null;

  await db('otp_attempts').insert({
    id: uuidv4(),
    consignment_id: data.shipmentId,
    token_hash: tokenHash,
    action: data.action,
    result: data.result,
    otp_provided_hash: otpProvidedHash,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    error_message: data.error || null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null
  });
};

/**
 * Generate and send OTP
 */
exports.generateAndSendOtp = async (data) => {
  await ensureOtpTables();

  const { shipmentId, token, channel, recipientEmail, recipientPhone, recipientName, ipAddress, userAgent } = data;

  const otp = generateOtp();
  const requestId = uuidv4();
  const tokenHash = hash(token);
  const otpHash = hash(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP request
  await db('otp_requests').insert({
    id: requestId,
    consignment_id: shipmentId,
    token_hash: tokenHash,
    otp_hash: otpHash,
    channel,
    expires_at: expiresAt,
    is_used: false,
    is_verified: false,
    attempts: 0,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  // Send OTP via notification service
  try {
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
    await axios.post(`${notificationUrl}/api/notifications/otp`, {
      type: 'OTP',
      recipientEmail: channel === 'EMAIL' ? recipientEmail : null,
      recipientPhone: channel === 'SMS' ? recipientPhone : null,
      recipientName,
      otp,
      shipmentId,
      expiresAt: expiresAt.toISOString(),
      channel
    }, { timeout: 10000 });
  } catch (error) {
    logger.error(error, 'Failed to send OTP via notification service');
    return {
      success: false,
      error: 'Failed to send OTP'
    };
  }

  // Log successful OTP request
  await exports.logAttempt({
    shipmentId,
    token,
    ipAddress,
    userAgent,
    action: 'OTP_REQUEST',
    result: 'SUCCESS',
    metadata: { channel, requestId }
  });

  logger.info({ shipmentId, requestId, channel }, 'OTP generated and sent');

  return {
    success: true,
    requestId,
    expiresAt: expiresAt.toISOString()
  };
};

/**
 * Verify OTP
 */
exports.verifyOtp = async (data) => {
  await ensureOtpTables();

  const { shipmentId, token, otp, ipAddress, userAgent } = data;

  const tokenHash = hash(token);
  const otpHash = hash(otp);
  const now = new Date();

  // Find active OTP request
  const otpRequest = await db('otp_requests')
    .where('consignment_id', shipmentId)
    .where('token_hash', tokenHash)
    .where('is_used', false)
    .where('expires_at', '>', now)
    .orderBy('created_at', 'desc')
    .first();

  if (!otpRequest) {
    await exports.logAttempt({
      shipmentId,
      token,
      ipAddress,
      userAgent,
      action: 'OTP_VERIFY',
      result: 'NOT_FOUND_OR_EXPIRED',
      otpProvided: otp
    });

    return {
      valid: false,
      error: 'OTP not found or expired',
      code: 'OTP_EXPIRED',
      attempts: 0
    };
  }

  // Increment attempt counter
  await db('otp_requests')
    .where('id', otpRequest.id)
    .increment('attempts', 1);

  const currentAttempts = otpRequest.attempts + 1;

  // Verify OTP
  if (otpRequest.otp_hash !== otpHash) {
    await exports.logAttempt({
      shipmentId,
      token,
      ipAddress,
      userAgent,
      action: 'OTP_VERIFY',
      result: 'WRONG_OTP',
      otpProvided: otp,
      metadata: { attempts: currentAttempts }
    });

    return {
      valid: false,
      error: 'Invalid OTP',
      code: 'WRONG_OTP',
      attempts: currentAttempts,
      lockExpiresAt: currentAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()
        : null
    };
  }

  // Mark as used and verified
  await db('otp_requests')
    .where('id', otpRequest.id)
    .update({
      is_used: true,
      is_verified: true,
      verified_at: now
    });

  await exports.logAttempt({
    shipmentId,
    token,
    ipAddress,
    userAgent,
    action: 'OTP_VERIFY',
    result: 'SUCCESS',
    metadata: { requestId: otpRequest.id }
  });

  // Generate short-lived access token for shipment access
  const accessToken = crypto.randomBytes(32).toString('base64url');

  return {
    valid: true,
    requestId: otpRequest.id,
    accessToken
  };
};

module.exports = exports;
