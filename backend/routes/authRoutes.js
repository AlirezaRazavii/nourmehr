const express = require('express');
const { body } = require('express-validator');
const {
  getMe,
  logout,
  requestSmsCode,
  verifySmsCode,
  completeProfile,
  googleAuth,
  googleCallback,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/optionalAuth');

const {
  smsRequestByIp,
  smsRequestByPhone,
  smsGlobalBudget,
  smsVerifyByIp,
  smsVerifyByPhone,
} = require('../middleware/rateLimiter');


const router = express.Router();

// اعتبارسنجی شماره موبایل
const phoneValidation = [
  body('phone').matches(/^09\d{9}$/).withMessage('شماره موبایل معتبر نیست'),
];

// --- اندپوینت‌های پیامکی ---
router.post(
  '/sms/request',
  smsRequestByIp,
  smsRequestByPhone,
  smsGlobalBudget,
  phoneValidation,
  requestSmsCode
);

router.post(
  '/sms/verify',
  smsVerifyByIp,
  smsVerifyByPhone,
  verifySmsCode
);

// --- تکمیل پروفایل (نیازمند توکن) ---
router.post('/complete-profile', protect, completeProfile);

// --- سایر ---
router.get('/me', protect, getMe);
router.post('/logout', optionalAuth, logout);
// --- Google OAuth (شرطی) ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', googleAuth);
  router.get('/google/callback', googleCallback);
} else {
  router.get('/google', (req, res) => {
    res.status(400).json({ success: false, message: 'Google OAuth not configured' });
  });
  router.get('/google/callback', (req, res) => {
    res.status(400).json({ success: false, message: 'Google OAuth not configured' });
  });
}

module.exports = router;
