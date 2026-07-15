const mongoose = require('mongoose');

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