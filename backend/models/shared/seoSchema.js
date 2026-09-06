/**
 * اسکیمای مشترک سئو — قابل الحاق به Product / Blog / Collection / Category
 * همه فیلدها اختیاری‌اند؛ رندرر و فرانت در صورت خالی بودن به
 * نام/توضیح کوتاه موجودیت fallback می‌کنند.
 */
const mongoose = require('mongoose');

const CHANGEFREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

/** فیلدهای سئوی هر زبان — داخل seo.fa و seo.en */
const localizedSeo = () => new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 75, default: '' },
    description: { type: String, trim: true, maxlength: 175, default: '' },
    focusKeyword: { type: String, trim: true, maxlength: 100, default: '' },
    canonicalUrl: { type: String, trim: true, maxlength: 500, default: '' },
    ogImage: { type: String, trim: true, maxlength: 500, default: '' },
    ogTitle: { type: String, trim: true, maxlength: 95, default: '' },
    ogDescription: { type: String, trim: true, maxlength: 200, default: '' },
    noIndex: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * اسکیمای سئوی مشترک
 * @param {object} opts - priority/changefreq پیش‌فرضِ آن موجودیت
 */
const seoSchema = (opts = {}) => new mongoose.Schema(
  {
    fa: localizedSeo(),
    en: localizedSeo(),
    sitemap: {
      include: { type: Boolean, default: true },
      priority: { type: Number, min: 0, max: 1, default: opts.priority ?? 0.9 },
      changefreq: {
        type: String,
        enum: [...CHANGEFREQS, ''],
        default: opts.changefreq ?? 'weekly',
      },
    },
  },
  { _id: false }
);

module.exports = { seoSchema, CHANGEFREQS };