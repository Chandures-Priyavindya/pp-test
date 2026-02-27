const { StatusCodes } = require('http-status-codes');
const db = require('../../config/database');
const jwtService = require('../utils/jwt');
const passwordService = require('../utils/password');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  validateAuthenticateRequest,
  validateRefreshTokenRequest,
  validateTokenHeader
} = require('../utils/validators');
const {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
  NotFoundError
} = require('../utils/errors');

/**
 * @swagger
 * /api/auth/authenticate:
 *   post:
 *     summary: Authenticate client using OAuth2 client credentials flow
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grantType
 *               - clientId
 *               - clientSecret
 *             properties:
 *               grantType:
 *                 type: string
 *                 enum: ['client_credentials']
 *                 description: OAuth2 grant type (must be client_credentials)
 *               clientId:
 *                 type: string
 *                 description: Client identifier (from auth_clients.client_id)
 *               clientSecret:
 *                 type: string
 *                 description: Client secret (from auth_clients.client_secret)
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     accessTokenExpiresIn:
 *                       type: number
 *                       example: 7200
 *                     refreshTokenExpiresIn:
 *                       type: number
 *                       example: 604800
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
exports.authenticate = asyncHandler(async (req, res) => {
  const { grantType, clientId, clientSecret } = req.body;
  const LAYER = 'CONTROLLER';
  const FUNCTION = 'authenticate';

  try {
    // Validate request
    req.logger.start(LAYER, FUNCTION, { grantType, clientId });
    validateAuthenticateRequest({ grantType, clientId, clientSecret });

    // Only support client_credentials grant type
    if (grantType !== 'client_credentials') {
      throw new AuthenticationError('Unsupported grant type. Only client_credentials is supported', { grantType });
    }

    // Verify client exists and credentials match
    req.logger.start(LAYER, 'verifyClientCredentials', { clientId });
    const client = await db('auth_clients')
      .where('client_id', clientId)
      .andWhere('is_active', true)
      .first();

    if (!client || client.client_secret !== clientSecret) {
      req.logger.warn({ clientId }, 'Invalid client ID or secret');
      throw new AuthenticationError('Invalid client credentials', { clientId });
    }

    req.logger.end(LAYER, 'verifyClientCredentials', { clientFound: true, clientName: client.client_name });

    // Generate token pair (no user context for client credentials)
    req.logger.start(LAYER, 'generateTokenPair', { clientId });
    const tokenPair = jwtService.generateTokenPair({
      sub: client.id.toString(),
      clientId: client.client_id,
      grantType: 'client_credentials',
      type: 'auth'
    });

    // Store token record in database
    req.logger.start(LAYER, 'storeTokenRecord', { clientId });
    const tokenRecord = await db('auth_tokens').insert({
      client_id: client.id,
      refresh_token_hash: tokenPair.refreshTokenHash,
      refresh_token_expires_at: tokenPair.refreshTokenExpiresAt,
      access_token_jti: tokenPair.accessTokenJti,
      access_token_expires_at: tokenPair.accessTokenExpiresAt,
      is_revoked: false,
      created_by: 'auth-service'
    });

    req.logger.end(LAYER, 'storeTokenRecord', { tokenId: tokenRecord[0] });

    req.logger.end(LAYER, FUNCTION, {
      clientId,
      clientName: client.client_name,
      accessTokenJti: tokenPair.accessTokenJti
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
        tokenType: 'Bearer',
        expiresAt: tokenPair.accessTokenExpiresAt
      }
    });
  } catch (error) {
    req.logger.error(error, LAYER, FUNCTION, { clientId, grantType });
    throw error;
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const LAYER = 'CONTROLLER';
  const FUNCTION = 'refresh';

  try {
    req.logger.start(LAYER, FUNCTION, { hasRefreshToken: !!refreshToken });
    validateRefreshTokenRequest({ refreshToken });

    // Verify refresh token
    req.logger.start(LAYER, 'verifyRefreshToken', {});
    const decoded = jwtService.verifyToken(refreshToken, 'refresh');
    req.logger.end(LAYER, 'verifyRefreshToken', { jti: decoded.jti });

    // Check if token exists and not revoked in database (lookup by refresh token hash)
    req.logger.start(LAYER, 'checkTokenRevocation', { jti: decoded.jti });
    const refreshTokenHash = jwtService.hashToken(refreshToken);
    const tokenRecord = await db('auth_tokens')
      .where('refresh_token_hash', refreshTokenHash)
      .andWhere('is_revoked', false)
      .first();

    if (!tokenRecord) {
      req.logger.warn({ jti: decoded.jti }, 'Refresh token not found or revoked');
      throw new AuthenticationError('Refresh token not valid or has been revoked', { jti: decoded.jti });
    }

    req.logger.end(LAYER, 'checkTokenRevocation', { found: true, revoked: false });

    // Generate new token pair (absolute refresh token rotation)
    req.logger.start(LAYER, 'generateNewTokenPair', { clientId: decoded.clientId });
    const newTokenPair = jwtService.generateTokenPair({
      sub: decoded.sub,
      clientId: decoded.clientId,
      grantType: 'client_credentials'
    });

    // Revoke old refresh token and create new token record
    req.logger.start(LAYER, 'rotateRefreshToken', { oldTokenId: tokenRecord.id });
    await db('auth_tokens')
      .where('id', tokenRecord.id)
      .update({
        is_revoked: true,
        updated_at: new Date(),
        updated_by: 'auth-service'
      });

    // Insert new token record with new tokens
    const newTokenRecord = await db('auth_tokens').insert({
      client_id: tokenRecord.client_id,
      refresh_token_hash: newTokenPair.refreshTokenHash,
      refresh_token_expires_at: newTokenPair.refreshTokenExpiresAt,
      access_token_jti: newTokenPair.accessTokenJti,
      access_token_expires_at: newTokenPair.accessTokenExpiresAt,
      is_revoked: false,
      created_by: 'auth-service'
    });

    req.logger.end(LAYER, 'rotateRefreshToken', { newTokenId: newTokenRecord[0], oldTokenRevoked: true });
    req.logger.end(LAYER, FUNCTION, { newAccessJti: newTokenPair.accessTokenJti, clientId: decoded.clientId });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        accessToken: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken,
        tokenType: 'Bearer',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
        expiresAt: newTokenPair.accessTokenExpiresAt,
        refreshExpiresAt: newTokenPair.refreshTokenExpiresAt
      }
    });
  } catch (error) {
    req.logger.error(error, LAYER, FUNCTION, { refreshToken: '***REDACTED***' });
    throw error;
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify and validate access token
 *     description: Verify that an access token is valid and not revoked
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     clientId:
 *                       type: string
 *                     grantType:
 *                       type: string
 *                       example: client_credentials
 *                     jti:
 *                       type: string
 *                       description: JWT ID
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     issuedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
exports.verify = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const LAYER = 'CONTROLLER';
  const FUNCTION = 'verify';

  try {
    req.logger.start(LAYER, FUNCTION, {});
    const token = validateTokenHeader(authHeader);

    // Verify token
    req.logger.start(LAYER, 'decodeToken', {});
    const decoded = jwtService.verifyToken(token, 'access');
    req.logger.end(LAYER, 'decodeToken', { userId: decoded.sub, jti: decoded.jti });

    // Check if token is revoked
    req.logger.start(LAYER, 'checkRevocation', { jti: decoded.jti });
    const isRevoked = await db('auth_tokens')
      .where('access_token_jti', decoded.jti)
      .andWhere('is_revoked', true)
      .first();

    if (isRevoked) {
      req.logger.warn({ jti: decoded.jti }, 'Token is revoked');
      throw new AuthenticationError('Token has been revoked', { jti: decoded.jti });
    }

    req.logger.end(LAYER, 'checkRevocation', { revoked: false });
    req.logger.end(LAYER, FUNCTION, { valid: true, userId: decoded.sub });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        valid: true,
        clientId: decoded.clientId,
        grantType: decoded.grantType,
        jti: decoded.jti,
        expiresAt: new Date(decoded.exp * 1000),
        issuedAt: new Date(decoded.iat * 1000)
      }
    });
  } catch (error) {
    req.logger.error(error, LAYER, FUNCTION, {});
    throw error;
  }
});

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate token status (non-throwing)
 *     description: Check if a token is valid without throwing errors (soft validation)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token validity status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 valid:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientId:
 *                       type: string
 *                     grantType:
 *                       type: string
 *                     jti:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 */
exports.validate = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const LAYER = 'CONTROLLER';
  const FUNCTION = 'validate';

  try {
    req.logger.start(LAYER, FUNCTION, {});
    const token = validateTokenHeader(authHeader);

    const decoded = jwtService.verifyToken(token, 'access');
    req.logger.end(LAYER, FUNCTION, { valid: true, userId: decoded.sub });

    res.status(StatusCodes.OK).json({
      success: true,
      valid: true,
      data: {
        clientId: decoded.clientId,
        grantType: decoded.grantType,
        jti: decoded.jti,
        expiresAt: new Date(decoded.exp * 1000)
      }
    });
  } catch (error) {
    req.logger.warn({ error: error.message }, 'Token validation failed');
    res.status(StatusCodes.OK).json({
      success: true,
      valid: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/revoke:
 *   post:
 *     summary: Revoke/logout current token
 *     description: Mark the current access token as revoked (logout)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token revoked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
exports.revoke = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const LAYER = 'CONTROLLER';
  const FUNCTION = 'revoke';

  try {
    req.logger.start(LAYER, FUNCTION, {});
    const token = validateTokenHeader(authHeader);

    const decoded = jwtService.verifyToken(token, 'access');
    req.logger.start(LAYER, 'markTokenRevoked', { jti: decoded.jti });

    // Mark token as revoked
    await db('auth_tokens')
      .where('access_token_jti', decoded.jti)
      .update({
        is_revoked: true,
        updated_at: new Date(),
        updated_by: 'auth-service'
      });

    req.logger.end(LAYER, 'markTokenRevoked', { jti: decoded.jti });
    req.logger.end(LAYER, FUNCTION, { clientId: decoded.clientId, jti: decoded.jti });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    req.logger.error(error, LAYER, FUNCTION, {});
    throw error;
  }
});
