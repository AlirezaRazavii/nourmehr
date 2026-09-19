const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { initiateOnlinePayment, verifyOnlinePayment, getPaymentStatus } = require('../controllers/paymentController');
const {
  getTorobPayEligibility,
  initiateTorobPayPayment,
  torobPayCallback,
} = require('../controllers/torobpayPaymentController');

const router = express.Router();

// زرین‌پال
router.get('/verify', verifyOnlinePayment);
router.post('/initiate', protect, initiateOnlinePayment);
router.get('/status/:authority', protect, getPaymentStatus);

// ترب‌پی (خرید اقساطی)
router.get('/torobpay/eligible', protect, getTorobPayEligibility);
router.post('/torobpay/initiate', protect, initiateTorobPayPayment);
// بازگشت از ترب‌پی — عمومی (ترب‌پی نمی‌تواند توکن ما را امضا کند؛ صحت با verify سمت سرور چک می‌شود)
router.post('/torobpay/callback', torobPayCallback);

module.exports = router;