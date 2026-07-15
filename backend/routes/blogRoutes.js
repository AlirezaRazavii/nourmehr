const express = require('express');
const router = express.Router();
const { getHomeAnnouncements, getBlogs, getBlogBySlug } = require('../controllers/blogController');
const langMiddleware = require('../middleware/languageMiddleware');

// اعمال میدلور زبان روی تمام مسیرهای بلاگ
router.use(langMiddleware);

router.get('/home', getHomeAnnouncements);
router.get('/', getBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;