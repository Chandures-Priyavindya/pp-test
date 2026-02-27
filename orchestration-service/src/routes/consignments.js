const express = require('express');
const { createConsignment } = require('../controllers/consignmentsController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/consignments:
 *   post:
 *     summary: Create a consignment with packages
 *     tags: [Consignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: packageCount
 *         schema:
 *           type: integer
 *         description: Number of packages in the request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Consignment created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Consignment already exists
 */
router.post('/', requireAuth, createConsignment);

module.exports = router;

