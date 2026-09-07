const mongoose = require('mongoose');
const { seoSchema } = require('./shared/seoSchema');

const categorySchema = new mongoose.Schema({
  name: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  slug: { type: String, required: true, unique: true, lowercase: true },
  icon: { type: String, default: '◆' },
  image: { type: String, default: '', trim: true },
  description: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  sortOrder: { type: Number, default: 0 },
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],

  // ---------- سئو ----------
  seo: seoSchema({ priority: 0.7, changefreq: 'weekly' })
}, { timestamps: true });

categorySchema.index({ status: 1, sortOrder: 1 });
categorySchema.index({ parents: 1 });

module.exports = mongoose.model('Category', categorySchema);
