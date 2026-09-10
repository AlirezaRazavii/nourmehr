const express = require('express');
const { verifyTorobToken } = require('../middleware/torobAuth');
const { getTorobProducts } = require('../controllers/torobController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

/* پیش‌نمایش پاسخ ترب — فقط ادمین سایت خودمان.
   همان کنترلر و همان فرمت خروجی ترب، ولی با توکن ورود ادمین.
   ⚠️ باید «قبل از» verifyTorobToken تعریف شود تا JWT ترب لازم نداشته باشد. */
router.post('/preview', protect, admin, getTorobProducts);

// مسیر اصلی ترب — پشت احراز هویت JWT ترب (EdDSA)
router.use(verifyTorobToken);
router.post('/products', getTorobProducts);

module.exports = router;