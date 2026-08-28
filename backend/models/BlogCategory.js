const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
  name: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

blogCategorySchema.index({ order: 1 });

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
