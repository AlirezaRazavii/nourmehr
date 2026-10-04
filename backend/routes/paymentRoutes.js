const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { initiateOnlinePayment, verifyOnlinePayment, getPaymentStatus } = require('../controllers/paymentController');
const {
  getTorobPayEligibility,
  initiateTorobPayPayment,
  torobPayCallback,
} = require('../controllers/torobpayPaymentController');
const {
  getSnappPayEligibility,
  initiateSnappPayPayment,
  snappPayCallback,
} = require('../controllers/snappayPaymentController');

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

// اسنپ‌پی (خرید اقساطی)
router.get('/snappay/eligible', protect, getSnappPayEligibility);
router.post('/snappay/initiate', protect, initiateSnappPayPayment);
// بازگشت از اسنپ‌پی — عمومی؛ POST و GET هر دو (تا فرمت callback هرچه بود کار کند)
router.post('/snappay/callback', snappPayCallback);
router.get('/snappay/callback', snappPayCallback);

module.exports = router;