/**
 * روت‌های عمومی مقالات — /api/articles
 * آینه‌ی ساختار blogRoutes تا انتقال فرانت بدون تغییر الگو ممکن باشد.
 */
const express = require('express');
const router = express.Router();
const {
  getArticles,
  getHomeAnnouncements,
  getCategories,
  getTags,
  getArticleBySlug,
  getRelatedArticles,
  getAdjacentArticles,
  getAuthor
} = require('../controllers/articleController');
const { optionalAuth } = require('../middleware/optionalAuth');

const langMiddleware = require('../middleware/languageMiddleware');

// زبان درخواست از هدر Accept-Language تعیین می‌شود (همان الگوی بلاگ)
router.use(langMiddleware);

// مسیرهای ثابت قبل از /:slug
router.get('/home', getHomeAnnouncements);
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/', optionalAuth, getArticles);

// نویسنده (E-E-A-T) — id کاربر
router.get('/author/:id', getAuthor);

// مقاله و صفحات وابسته — slug می‌تواند fa یا en یا legacy باشد
router.get('/:slug/related', getRelatedArticles);
router.get('/:slug/adjacent', getAdjacentArticles);
router.get('/:slug', getArticleBySlug);

module.exports = router;
