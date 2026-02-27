const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class JWTService {
  constructor() {
    this.privateKey = this.parseKey(process.env.JWT_PRIVATE_KEY);
    this.publicKey = this.parseKey(process.env.JWT_PUBLIC_KEY);
    this.algorithm = 'RS256';
    this.accessTokenExpiry = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY) || 7200; // 2 hours
    this.refreshTokenExpiry = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY) || 604800; // 7 days
  }

  parseKey(raw) {
    const key = (raw || '').trim();
    if (!key) {
      return '';
    }

    const normalized = key.replace(/\\n/g, '\n');
    if (normalized.startsWith('-----BEGIN')) {
      return normalized;
    }

    const decoded = Buffer.from(normalized, 'base64').toString('utf8').trim();
    return decoded;
  }

  /**
   * Generate access token (short-lived, 2 hours)
   */
  generateAccessToken(payload) {
    try {
      if (!this.privateKey || !this.privateKey.includes('BEGIN')) {
        throw new Error('JWT private key is missing or invalid');
      }
      const jti = crypto.randomUUID();
      const token = jwt.sign(
        {
          ...payload,
          sub: String(payload.sub ?? payload.userId),
          jti,
          type: 'access'
        },
        this.privateKey,
        {
          algorithm: this.algorithm,
          expiresIn: this.accessTokenExpiry,
          issuer: 'ups-lms-auth-service'
        }
      );

      return {
        token,
        jti,
        expiresAt: new Date(Date.now() + this.accessTokenExpiry * 1000),
        expiresIn: this.accessTokenExpiry
      };
    } catch (error) {
      logger.error(error, 'Failed to generate access token');
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Generate refresh token (long-lived, 7 days)
   */
  generateRefreshToken(payload) {
    try {
      if (!this.privateKey || !this.privateKey.includes('BEGIN')) {
        throw new Error('JWT private key is missing or invalid');
      }
      const jti = crypto.randomUUID();
      const token = jwt.sign(
        {
          ...payload,
          sub: String(payload.sub ?? payload.userId),
          jti,
          type: 'refresh'
        },
        this.privateKey,
        {
          algorithm: this.algorithm,
          expiresIn: this.refreshTokenExpiry,
          issuer: 'ups-lms-auth-service'
        }
      );

      return {
        token,
        jti,
        expiresAt: new Date(Date.now() + this.refreshTokenExpiry * 1000),
        expiresIn: this.refreshTokenExpiry
      };
    } catch (error) {
      logger.error(error, 'Failed to generate refresh token');
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verify and decode token (used by all services)
   */
  verifyToken(token, type = 'access') {
    try {
      if (!this.publicKey || !this.publicKey.includes('BEGIN')) {
        throw new Error('JWT public key is missing or invalid');
      }
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
        issuer: 'ups-lms-auth-service'
      });

      if (type && decoded.type !== type) {
        throw new Error(`Invalid token type: expected ${type}`);
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Token expired');
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid token');
        throw new Error('Invalid token');
      }
      logger.error(error, 'Token verification failed');
      throw error;
    }
  }

  /**
   * Hash token for storage
   */
  hashToken(token) {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(payload) {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken: accessToken.token,
      accessTokenJti: accessToken.jti,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.token,
      refreshTokenJti: refreshToken.jti,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      refreshTokenHash: this.hashToken(refreshToken.token)
    };
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = new JWTService();
