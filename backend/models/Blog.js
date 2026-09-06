const mongoose = require('mongoose');
const { seoSchema } = require('./shared/seoSchema');

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
  seo: seoSchema({ priority: 0.8, changefreq: 'weekly' })
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

/* ---- مهاجرت خودکار سئوی قدیمی به ساختار جدید ----
   ساختار قدیمی: seo.title.fa / seo.keywords ...
   ساختار جدید:  seo.fa.title / seo.fa.focusKeyword ...
   یک بار برای هر سند اجرا می‌شود (با فلگ داخلی). */
blogSchema.pre('save', function (next) {
  const seo = this.seo;
  // تشخیص ساختار قدیمی: seo.title آبجکت زبانی است (در ساختار جدید seo.title وجود ندارد)
  if (seo && typeof seo.title === 'object' && seo.title !== null && !Array.isArray(seo.title)) {
    const old = seo.toObject ? seo.toObject() : { ...seo };
    this.seo = {
      fa: {
        title: old.title?.fa || '',
        description: old.description?.fa || '',
        focusKeyword: old.focusKeyword || (old.keywords?.fa ? String(old.keywords.fa).split(',')[0].trim() : ''),
        canonicalUrl: old.canonicalUrl || '',
        ogImage: old.ogImage || '',
        ogTitle: '',
        ogDescription: '',
        noIndex: old.noIndex === true
      },
      en: {
        title: old.title?.en || '',
        description: old.description?.en || '',
        focusKeyword: old.keywords?.en ? String(old.keywords.en).split(',')[0].trim() : '',
        canonicalUrl: '',
        ogImage: old.ogImage || '',
        ogTitle: '',
        ogDescription: '',
        noIndex: false
      },
      sitemap: { include: true, priority: 0.8, changefreq: 'weekly' }
    };
  }
  next();
});

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ featured: -1, publishedAt: -1 });
blogSchema.index({ 'tags.slug': 1 });
blogSchema.index({ 'title.fa': 'text', 'title.en': 'text', 'content.fa': 'text', 'content.en': 'text' });

module.exports = mongoose.model('Blog', mongoose.models.Blog || blogSchema);
module.exports.computeReadingTime = computeReadingTime;