const express = require('express');
const { requestOtp, verifyOtp } = require('../controllers/otpController');

const router = express.Router();

// OTP endpoints (public - no auth required, validated by token)
router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);

module.exports = router;
