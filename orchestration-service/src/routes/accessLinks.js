const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { createAccessLink, validateAccessLink } = require('../controllers/accessLinksController');

const router = express.Router();

// Create access link for a consignment (auth required)
router.post('/consignments/:shipmentId/access-link', requireAuth, createAccessLink);

// Create access link using shipmentId in body (auth required)
router.post('/access-links', requireAuth, createAccessLink);

// Validate access link (public)
router.get('/access-links/validate', validateAccessLink);

module.exports = router;
