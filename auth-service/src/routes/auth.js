const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/authenticate:
 *   post:
 *     summary: Authenticate using OAuth2 client credentials
 *     description: Exchange client credentials for access and refresh tokens
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
 *                 description: OAuth2 grant type
 *               clientId:
 *                 type: string
 *                 description: Client identifier from auth_clients table
 *                 example: parcelpoint-web
 *               clientSecret:
 *                 type: string
 *                 description: Client secret from auth_clients table
 *     responses:
 *       200:
 *         description: Tokens issued successfully
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
 *                       description: JWT access token (Bearer token)
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
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
 */
router.post('/authenticate', authController.authenticate);

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
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify access token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verified
 *       401:
 *         description: Invalid token
 */
router.post('/verify', authController.verify);

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate token without throwing errors
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token validity status
 */
router.get('/validate', authController.validate);

/**
 * @swagger
 * /api/auth/revoke:
 *   post:
 *     summary: Revoke/logout token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token revoked
 *       401:
 *         description: Unauthorized
 */
router.post('/revoke', authController.revoke);

module.exports = router;
