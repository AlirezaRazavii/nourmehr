const express = require('express');
const { getPublicSettings } = require('../controllers/admin/settingController');

const router = express.Router();

// عمومی: تنظیمات قابل‌نمایش سایت (برای صفحه تماس و ...)
router.get('/', getPublicSettings);

module.exports = router;
