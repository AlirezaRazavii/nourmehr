const express = require('express');
const router = express.Router();
const { getProductReviews, createReview } = require('../controllers/reviewController');
const authMiddlewareModule = require('../middleware/authMiddleware');

// پیدا کردن تابع احراز هویت (مهم نیست اسمش protect باشد یا isAuthenticated یا چیز دیگر)
const protect = authMiddlewareModule.protect || authMiddlewareModule.isAuthenticated || authMiddlewareModule.verifyToken || authMiddlewareModule;

// مسیر عمومی برای دیدن نظرات
router.get('/:productId', getProductReviews);

// مسیر خصوصی برای ثبت نظر (کاربر باید لاگین باشد)
router.post('/', protect, createReview);

module.exports = router;