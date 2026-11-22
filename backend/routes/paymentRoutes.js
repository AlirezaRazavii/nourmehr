const express = require('express');
const multer = require('multer');
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
const {
  getDigipayAvailability,
  initiateDigipayPayment,
  digipayCallback,
} = require('../controllers/digipayPaymentController');

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

// دیجی‌پی (کیف پول و اعتبار — درگاه یکپارچه UPG)
router.get('/digipay/available', protect, getDigipayAvailability);
router.post('/digipay/initiate', protect, initiateDigipayPayment);
// بازگشت از دیجی‌پی — عمومی؛ مسیر موفق معمولاً POST است و انصراف ممکن است GET بدون بدنه باشد.
// multer.none() برای حالت form-data (multipart) است — JSON و urlencoded توسط express قبلاً پارس می‌شوند
const digipayCallbackUpload = multer().none();
router.post('/digipay/callback', digipayCallbackUpload, digipayCallback);
router.get('/digipay/callback', digipayCallback);

module.exports = router;