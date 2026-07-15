const express = require('express');
const { createContactMessage } = require('../controllers/contactController');
const { optionalAuth } = require('../middleware/optionalAuth');

const router = express.Router();

// عمومی: ارسال پیام از فرم تماس (اگر کاربر لاگین باشد به حسابش وصل می‌شود)
router.post('/', optionalAuth, createContactMessage);

module.exports = router;
