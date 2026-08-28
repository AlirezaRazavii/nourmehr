const mongoose = require('mongoose');

const seoSchema = new mongoose.Schema({
  title: {
    fa: { type: String, default: '', trim: true, maxlength: 200 },
    en: { type: String, default: '', trim: true, maxlength: 200 }
  },
  description: {
    fa: { type: String, default: '', trim: true, maxlength: 400 },
    en: { type: String, default: '', trim: true, maxlength: 400 }
  },
  keywords: {
    fa: { type: String, default: '', trim: true },
    en: { type: String, default: '', trim: true }
  },
  // اگر پر شود، canonical به جای آدرس پیش‌فرض مقاله با این مقدار ساخته می‌شود
  canonicalUrl: { type: String, default: '', trim: true },
  // تصویر مخصوص اشتراک‌گذاری؛ خالی بود از تصویر شاخص استفاده می‌شود
  ogImage: { type: String, default: '' },
  // خروج از ایندکس موتورهای جستجو (در robots متا و X-Robots-Tag اعمال می‌شود)
  noIndex: { type: Boolean, default: false },
  // کلمه کلیدی کانونی — فقط برای گزارش داخلی/تمرکز نویسنده
  focusKeyword: { type: String, default: '', trim: true }
}, { _id: false });

const tagSchema = new mongoose.Schema({
  slug: { type: String, required: true },
  fa: { type: String, default: '' },
  en: { type: String, default: '' }
}, { _id: false });

const blogSchema = new mongoose.Schema({
  title: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  slug: { type: String, required: true, unique: true, lowercase: true },
  // slugهای قبلی برای ریدایرکت ۳۰۱ پس از تغییر آدرس
  oldSlugs: { type: [String], default: [] },
  excerpt: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  content: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  image: { type: String, default: '' }, // تصویر شاخص مقاله
  imageAlt: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  type: { type: String, enum: ['news', 'event', 'article'], default: 'news' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', default: null },
  tags: { type: [tagSchema], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorName: { type: String, default: '' }, // نام نمایشی نویسنده (denormalized)
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'archived'],
    default: 'draft'
  },
  // تاریخ انتشار واقعی؛ برای scheduled تاریخ آینده است و پس از فرا رسیدن منتشر می‌شود
  publishedAt: { type: Date, default: null },
  featured: { type: Boolean, default: false },
  readingTime: { type: Number, default: 0 }, // دقیقه — به صورت خودکار محاسبه می‌شود
  viewsCount: { type: Number, default: 0 },
  seo: { type: seoSchema, default: () => ({}) }
}, { timestamps: true });

// متن محتوا را از تگ‌های HTML خالی می‌کند و زمان مطالعه (دقیقه) را برمی‌گرداند
const computeReadingTime = (html) => {
  const text = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  // میانگین خوانش فارسی ≈ 180 کلمه در دقیقه
  return Math.max(words ? 1 : 0, Math.ceil(words / 180));
};

blogSchema.pre('validate', function (next) {
  const faTime = computeReadingTime(this.content?.fa);
  const enTime = computeReadingTime(this.content?.en);
  this.readingTime = Math.max(faTime, enTime);
  next();
});

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ featured: -1, publishedAt: -1 });
blogSchema.index({ 'tags.slug': 1 });
blogSchema.index({ 'title.fa': 'text', 'title.en': 'text', 'content.fa': 'text', 'content.en': 'text' });

module.exports = mongoose.model('Blog', blogSchema);
module.exports.computeReadingTime = computeReadingTime;
