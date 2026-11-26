const mongoose = require('mongoose');

/**
 * کمپین = لایهٔ تخفیفِ زمان‌دار روی کاتالوگ.
 * اصل معماری: کاتالوگ (price / sizes) هرگز توسط کمپین بازنویسی نمی‌شود؛
 * تخفیف «موقع خواندن» اعمال می‌شود. پس پایان کمپین = بازگشت خودکار قیمت‌ها.
 */
const campaignTargetSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // خالی = همهٔ سایزها؛ در غیر این صورت فقط همین نام سایزها
    sizes: { type: [String], default: [] },
    percent: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    name: {
      fa: { type: String, required: [true, 'نام فارسی کمپین الزامی است'], trim: true, maxlength: 120 },
      en: { type: String, trim: true, default: '', maxlength: 120 },
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: {
      fa: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },

    // null = بدون محدودیت زمانی در آن سمت
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'expired', 'archived'],
      default: 'draft',
    },
    // بعد از پایان: آرشیو (پیش‌فرض) یا مخفی‌کردن کامل — حذف واقعی نداریم
    expiryAction: { type: String, enum: ['archive', 'hide'], default: 'archive' },
    expiredAt: { type: Date, default: null },

    // کمپین با priority بالاتر برنده است (هم‌پوشانی دو کمپین)
    priority: { type: Number, default: 0 },

    targets: {
      type: [campaignTargetSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 500,
        message: 'حداکثر ۵۰۰ هدف در هر کمپین مجاز است',
      },
    },

    showCountdown: { type: Boolean, default: true },
    countdownLabel: {
      fa: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    bannerImage: { type: String, trim: true, default: '' },
    themeColor: { type: String, trim: true, default: '#c5a059' },

    oldSlugs: { type: [String], default: [] },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
campaignSchema.index({ 'targets.product': 1 });

/**
 * وضعیت مؤثر بر اساس زمان — تنها مرجع تصمیم (هم cron و هم کنترلر از همین استفاده می‌کنند).
 * draft و archived دستی‌اند و cron دستشان نمی‌زند.
 */
campaignSchema.statics.computeStatus = function (doc, now = new Date()) {
  const current = doc.status || 'draft';
  if (current === 'draft' || current === 'archived') return current;

  const starts = doc.startsAt ? new Date(doc.startsAt) : null;
  const ends = doc.endsAt ? new Date(doc.endsAt) : null;

  if (ends && now >= ends) return doc.expiryAction === 'hide' ? 'archived' : 'expired';
  if (starts && now < starts) return 'scheduled';
  return 'active';
};

module.exports = mongoose.model('Campaign', campaignSchema);