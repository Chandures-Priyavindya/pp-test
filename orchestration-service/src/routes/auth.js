const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const axios = require('axios');
const { StatusCodes } = require('http-status-codes');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate token (proxy to auth-service)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token validity status
 */
router.get('/validate', requireAuth, (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    valid: true,
    data: req.user
  });
});

/**
 * Proxy endpoints to auth-service
 * Authenticate, refresh, verify, revoke
 */
router.post('/authenticate', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/authenticate`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.response?.data?.error || 'Authentication failed'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.response?.data?.error || 'Refresh failed'
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/verify`,
      {},
      { headers: { Authorization: req.headers.authorization } }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.response?.data?.error || 'Verification failed'
    });
  }
});

router.post('/revoke', async (req, res) => {
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/revoke`,
      {},
      { headers: { Authorization: req.headers.authorization } }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: error.response?.data?.error || 'Revocation failed'
    });
  }
});

module.exports = router;
