const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { initiateOnlinePayment, verifyOnlinePayment, getPaymentStatus } = require('../controllers/paymentController');

const router = express.Router();

// Endpoint عمومی برای بازگشت از زرین‌پال (بدون نیاز به auth – چون زرین‌پال نمی‌تواند توکن بفرستد)
router.get('/verify', verifyOnlinePayment);

// مسیرهای محافظت‌شده
router.post('/initiate', protect, initiateOnlinePayment);
router.get('/status/:authority', protect, getPaymentStatus);

module.exports = router;