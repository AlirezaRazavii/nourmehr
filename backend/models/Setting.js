const mongoose = require('mongoose');

const shippingOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  cost: { type: Number, required: true, min: 0 },
  icon: { type: String, default: '📦' },
  isActive: { type: Boolean, default: true },
  minOrder: { type: Number, default: 0 }
}, { _id: false });

const settingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'NOURMEHR' },
  siteTagline: { type: String, default: 'Luxury Persian Art' },
  currency: { type: String, default: 'تومان' },
  currencySymbol: { type: String, default: 'ت' },
  enableRegistration: { type: Boolean, default: true },
  enableGoogleLogin: { type: Boolean, default: true },
  enableSmsLogin: { type: Boolean, default: true },
  paymentMethods: [String],
  shippingMethods: [String],
  shippingOptions: {
    type: [shippingOptionSchema],
    default: [
      { id: 'express', title: 'ارسال پیشتاز', description: '۲ تا ۴ روز کاری', cost: 150000, icon: '🚀', isActive: true, minOrder: 0 },
      { id: 'normal', title: 'ارسال سفارشی', description: '۴ تا ۷ روز کاری', cost: 80000, icon: '📦', isActive: true, minOrder: 0 }
    ]
  },
  contactPhone: String,
  contactEmail: String,
  address: String,
  contactHours: String,
  mapUrl: String,
  socialMedia: {
    instagram: String,
    telegram: String,
    whatsapp: String
  },
  seo: {
    title: String,
    description: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);