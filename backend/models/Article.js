/**
 * مدل «مقاله/خبر» سیستم رسانه‌ای جدید نورمهر (جایگزین تدریجی مدل Blog)
 *
 * تفاوت‌های کلیدی با Blog:
 *  ۱) اسلاگ مستقل برای هر زبان (slug.fa می‌تواند فارسی، slug.en لاتین باشد)
 *  ۲) محتوا = JSON تیپ‌تپ (منبع حقیقت) + HTML کش‌شده برای رندر سریع
 *  ۳) FAQ دوزبانه (برای JSON-LD FAQPage)
 *  ۴) relatedProducts — موتور لینک‌سازی داخلی مقاله ↔ محصول
 *  ۵) revisions — تاریخچه نسخه‌ها (حداکثر ۲۰ نسخه) برای بازگردانی
 *  ۶) legacySlugs — اسلاگ‌های قدیمی برای ریدایرکت ۳۰۱ خودکار
 *
 * نکته مهم: _id هنگام مهاجرت از Blog حفظ می‌شود تا هیچ ارجاعی نشکند.
 */
const mongoose = require('mongoose');
const { seoSchema } = require('./shared/seoSchema');

/* ------------------------------- زیراسکیماها ------------------------------- */

const tagSchema = new mongoose.Schema({
  slug: { type: String, required: true },
  fa: { type: String, default: '' },
  en: { type: String, default: '' }
}, { _id: false });

// متن دوزبانه (عنوان/خلاصه/alt و ...)
const localizedText = () => ({
  fa: { type: String, default: '' },
  en: { type: String, default: '' }
});

// محتوای هر زبان: JSON تیپ‌تپ منبع حقیقت + HTML رندرشده کش‌شده
const localizedContent = () => new mongoose.Schema({
  tiptap: { type: mongoose.Schema.Types.Mixed, default: null },
  html: { type: String, default: '' }
}, { _id: false });

const faqSchema = new mongoose.Schema({
  question: localizedText(),
  answer: localizedText()
}, { _id: false });

const relatedProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  note: localizedText()
}, { _id: false });

const revisionSchema = new mongoose.Schema({
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: String, default: '' },
  title: localizedText(),
  excerpt: localizedText(),
  content: {
    fa: localizedContent(),
    en: localizedContent()
  },
  note: { type: String, default: '' }
}, { _id: false });

/* --------------------------------- اسکیما --------------------------------- */

const articleSchema = new mongoose.Schema({
  title: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  // اسلاگ مستقل هر زبان — fa می‌تواند فارسی باشد (گوگل خوب نمایشش می‌دهد)
  slug: {
    fa: { type: String, required: true, lowercase: true, trim: true },
    en: { type: String, required: true, lowercase: true, trim: true }
  },
  // اسلاگ‌های قدیمی (مشترک یا تغییرکرده) → ریدایرکت ۳۰۱ خودکار
  legacySlugs: { type: [String], default: [] },
  excerpt: localizedText(),
  content: {
    fa: localizedContent(),
    en: localizedContent()
  },
  image: { type: String, default: '' }, // تصویر شاخص (خروجی پایپ‌لاین sharp)
  imageAlt: localizedText(),
  // srcset تصویر شاخص که پایپ‌لاین sharp تولید می‌کند: [{w:480,url:...},...]
  imageVariants: {
    type: [{ w: Number, url: String }],
    default: []
  },
  type: { type: String, enum: ['news', 'event', 'article'], default: 'news' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', default: null },
  tags: { type: [tagSchema], default: [] },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorName: { type: String, default: '' }, // denormalized برای سرعت لیست‌ها
  status: {
    type: String,
    enum: ['draft', 'review', 'scheduled', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: { type: Date, default: null },
  featured: { type: Boolean, default: false },
  readingTime: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  faq: { type: [faqSchema], default: [] },
  relatedProducts: { type: [relatedProductSchema], default: [] },
  // مقالات مرتبط — فقط انتخاب دستی ادمین (حداکثر ۶)؛ ترتیب نمایش = ترتیب همین آرایه
  relatedArticles: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }], default: [] },
  // قبلی/بعدی — اورراید دستی ادمین؛ null یعنی خودکار (بر اساس تاریخ انتشار)
  prevArticle: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', default: null },
  nextArticle: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', default: null },
  revisions: { type: [revisionSchema], default: [] },
  seo: seoSchema({ priority: 0.8, changefreq: 'weekly' })
}, { timestamps: true });

/* -------------------------------- ایندکس‌ها -------------------------------- */

articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ 'slug.fa': 1 }, { unique: true });
articleSchema.index({ 'slug.en': 1 }, { unique: true });
articleSchema.index({ legacySlugs: 1 });
articleSchema.index({ category: 1 });
articleSchema.index({ 'tags.slug': 1 });
articleSchema.index({ featured: -1, publishedAt: -1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index(
  { 'title.fa': 'text', 'title.en': 'text', 'content.fa.html': 'text', 'content.en.html': 'text' },
  { name: 'article_text' }
);

/* -------------------------------- هوک‌ها -------------------------------- */

// زمان مطالعه از HTML کش‌شده (میانگین خوانش فارسی ≈ ۱۸۰ کلمه/دقیقه)
const computeReadingTime = (html) => {
  const text = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(words ? 1 : 0, Math.ceil(words / 180));
};
articleSchema.pre('validate', function (next) {
  this.readingTime = Math.max(
    computeReadingTime(this.content?.fa?.html),
    computeReadingTime(this.content?.en?.html)
  );
  next();
});

// سقف ۲۰ نسخه در تاریخچه — قدیمی‌ها حذف می‌شوند
articleSchema.pre('save', function (next) {
  if (this.revisions && this.revisions.length > 20) {
    this.revisions = this.revisions.slice(-20);
  }
  next();
});

module.exports = mongoose.model('Article', mongoose.models.Article || articleSchema);
module.exports.computeReadingTime = computeReadingTime;
