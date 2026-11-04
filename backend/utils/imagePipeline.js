/**
 * پایپ‌لاین تصویر مقالات با sharp
 *
 * ورودی: فایل multer (jpg/png/webp/avif)
 * خروجی: WebP در چند عرض + srcset + خودکار فرمت‌پذیرفته‌شده همه مرورگرها
 *
 * نصب پیش‌نیاز:  npm i sharp
 *
 * چرا WebP چندعرضی؟
 *  - LCP: مرورگر فقط عرض مناسب صفحه را دانلود می‌کند (کاهش ~۷۰٪ حجم موبایل)
 *  - srcset به کارت‌ها و تصویر شاخص مقاله داده می‌شود
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ARTICLE_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/articles');
fs.mkdirSync(ARTICLE_UPLOAD_DIR, { recursive: true });

// عرض‌های استاندارد — 480 موبایل، 768 تبلت، 1200 دسکتاپ، 1600 رتینا/شاخص
const WIDTHS = [480, 768, 1200, 1600];

const MAX_DIMENSION = 2400; // سقف ضلع بزرگ تصویر ورودی
const QUALITY = 78; // توازن کیفیت/حجم برای WebP

/**
 * پردازش تصویر مقاله
 * @param {Express.Multer.File} file - فایل آپلودشده
 * @param {string} alt - متن جایگزین (برای بازگرداندن به ادیتور)
 * @returns {{url, variants:[{w,url}], width, height, alt, placeholder}}
 */
const processArticleImage = async (file, alt = '') => {
  if (!file || !file.path) {
    const err = new Error('فایل نامعتبر است');
    err.status = 400;
    throw err;
  }

  const baseName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const meta = await sharp(file.path)
    .rotate() // اعمال EXIF (عکس موبایل‌ها اغلب چرخیده‌اند)
    .metadata();

  // عرض واقعی ورودی — از آن بزرگ‌تر Upscale نمی‌کنیم
  const srcWidth = Math.min(meta.width || 1600, MAX_DIMENSION);

  const targets = WIDTHS.filter(w => w <= Math.max(srcWidth, 480));
  if (!targets.length) targets.push(480);

  const variants = [];
  for (const w of targets) {
    const outName = `${baseName}-${w}.webp`;
    const outPath = path.join(ARTICLE_UPLOAD_DIR, outName);

    await sharp(file.path)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 4 })
      .toFile(outPath);

    variants.push({ w, url: `/uploads/articles/${outName}` });
  }

  // نسخه اصلی (بزرگ‌ترین) به‌عنوان URL پیش‌فرض — برای og:image و fallback
  const main = variants[variants.length - 1];

  // placeholder کوچک LQIP برای بلور-آپ (اختیاری در فرانت)
  const lqipBuffer = await sharp(file.path)
    .rotate()
    .resize({ width: 24 })
    .webp({ quality: 30 })
    .toBuffer();

  // فایل اصلی آپلودی دیگر لازم نیست — همه چیز WebP تولیدشده است
  try { fs.unlinkSync(file.path); } catch (_) { /* بی‌خطر */ }

  return {
    url: main.url,
    variants, // [{w:480,url},...] — مستقیم قابل استفاده در srcset
    width: main.w,
    height: Math.round((meta.height || 900) * (main.w / (meta.width || 1600))),
    alt: alt || '',
    placeholder: `data:image/webp;base64,${lqipBuffer.toString('base64')}`
  };
};

module.exports = { processArticleImage, ARTICLE_UPLOAD_DIR, WIDTHS };
