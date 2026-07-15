const mongoose = require('mongoose');

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
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);