const mongoose = require('mongoose');
const { seoSchema } = require('./shared/seoSchema');

const collectionSchema = new mongoose.Schema({
  name: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  slug: { type: String, required: true, unique: true, lowercase: true },
  title: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  subtitle: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  description: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  icon: { type: String, default: '✦' },
  image: { type: String, default: '' },
  bgColor: { type: String, default: '#e53935' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  showOnHome: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },

  // ⭐ اتصال اختیاری به کمپین زمان‌دار (null = کالکشن معمولی)
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  // با پایان کمپین، این کالکشن هم از سایت ناپدید شود
  hideWhenCampaignEnds: { type: Boolean, default: true },

  // ---------- سئو ----------
  seo: seoSchema({ priority: 0.8, changefreq: 'weekly' })
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);