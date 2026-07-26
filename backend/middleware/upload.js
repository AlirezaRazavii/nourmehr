const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * منبع واحد حقیقت برای مسیر آپلود.
 * از backend/middleware/ دو پوشه بالا => <project-root>/uploads/products
 * دقیقاً همان مسیری که server.js با express.static سرو می‌کند.
 */
const PRODUCTS_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/products');
const HERO_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/hero');

// یک بار در زمان بوت ساخته می‌شود، نه در هر درخواست
fs.mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 12;

// mimetype => پسوند امنی که خودمان تولید می‌کنیم
const ALLOWED_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/pjpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

const ALLOWED_EXT = /^\.(jpe?g|png|gif|webp|avif)$/i;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PRODUCTS_UPLOAD_DIR),
  filename: (req, file, cb) => {
    // پسوند از mimetype ساخته می‌شود، نه از نام فایل کاربر
    const ext = ALLOWED_TYPES.get(String(file.mimetype).toLowerCase()) || '.jpg';
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_TYPES.has(mime)) {
    return cb(
      Object.assign(new Error('فقط تصاویر jpg، png، gif، webp و avif مجاز هستند'), {
        status: 400,
        code: 'INVALID_FILE_TYPE',
      })
    );
  }
  if (!ALLOWED_EXT.test(ext)) {
    return cb(
      Object.assign(new Error('پسوند فایل نامعتبر است'), {
        status: 400,
        code: 'INVALID_FILE_EXT',
      })
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
    fields: 40,
    parts: MAX_FILES + 40,
    headerPairs: 100,
  },
});

/**
 * میان‌افزار خطای اختصاصی آپلود.
 * باید بلافاصله بعد از upload.single/array در روت قرار بگیرد
 * تا خطاهای multer به‌جای «Internal server error» پیام درست بدهند.
 */
const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: `حجم فایل نباید بیشتر از ${MAX_FILE_SIZE / (1024 * 1024)} مگابایت باشد`,
      LIMIT_FILE_COUNT: `حداکثر ${MAX_FILES} فایل در هر درخواست مجاز است`,
      LIMIT_UNEXPECTED_FILE: 'نام فیلد فایل ارسالی نادرست است',
      LIMIT_PART_COUNT: 'تعداد بخش‌های فرم بیش از حد مجاز است',
    };
    return res.status(400).json({
      success: false,
      message: map[err.code] || 'خطا در آپلود فایل',
    });
  }

  if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_FILE_EXT') {
    return res.status(400).json({ success: false, message: err.message });
  }

  return next(err);
};

module.exports = {
  upload,
  handleUploadError,
  PRODUCTS_UPLOAD_DIR,
  HERO_UPLOAD_DIR,
  MAX_FILE_SIZE,
};
