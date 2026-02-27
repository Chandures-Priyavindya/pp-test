const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.status(StatusCodes.NOT_IMPLEMENTED).json({
    success: false,
    error: 'Items endpoint not implemented yet'
  });
});

module.exports = router;
