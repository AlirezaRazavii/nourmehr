const express = require('express');
const router = express.Router();
const {
  getHomeAnnouncements,
  getBlogs,
  getCategories,
  getBlogBySlug,
  getRelatedBlogs,
  getAdjacentBlogs,
  getComments,
  createComment
} = require('../controllers/blogController');
const { protect } = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/optionalAuth');
const langMiddleware = require('../middleware/languageMiddleware');

// اعمال میدلور زبان روی تمام مسیرهای بلاگ
router.use(langMiddleware);

// مسیرهای ثابت باید قبل از /:slug باشند
router.get('/home', getHomeAnnouncements);
router.get('/categories', getCategories);
router.get('/', optionalAuth, getBlogs);

// نظرات
router.get('/:slug/comments', getComments);
router.post('/:slug/comments', protect, createComment);

// مقاله و صفحات وابسته
router.get('/:slug/related', getRelatedBlogs);
router.get('/:slug/adjacent', getAdjacentBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;
