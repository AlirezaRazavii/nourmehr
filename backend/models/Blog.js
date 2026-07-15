const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  slug: { type: String, required: true, unique: true, lowercase: true },
  excerpt: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  content: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  image: { type: String, default: '' }, // تصویر شاخص مقاله
  type: { type: String, enum: ['news', 'event', 'article'], default: 'news' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  viewsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);