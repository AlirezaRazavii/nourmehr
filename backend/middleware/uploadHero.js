const multer = require('multer')

// فایل را موقتاً در حافظه نگه می‌داریم؛ نوشتن در دیتابیس داخل کنترلر انجام می‌شود
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('فقط فایل‌های تصویری مجاز هستند (jpg, png, webp, gif, avif)'), false)
}

const uploadHero = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // حداکثر ۱۰ مگابایت
})

module.exports = uploadHero
