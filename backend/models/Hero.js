const mongoose = require('mongoose')

// هر اسلاید: متن دوزبانه + تصاویر (URL تصویری که از دیتابیس سرو می‌شود)
const slideSchema = new mongoose.Schema(
  {
    title:       { fa: { type: String, default: '' }, en: { type: String, default: '' } },
    subtitle:    { fa: { type: String, default: '' }, en: { type: String, default: '' } },
    description: { fa: { type: String, default: '' }, en: { type: String, default: '' } },
    buttonText:  { fa: { type: String, default: '' }, en: { type: String, default: '' } },
    buttonLink:  { type: String, default: '/products' },

    productImage: { type: String, default: '' },
    bgImage:      { type: String, default: '' },

    themeColor:   { type: String, default: '#0db9e9' },
    bgBrightness: { type: Number, default: 0.35, min: 0, max: 1 },

    order:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const heroSchema = new mongoose.Schema(
  {
    slides: [slideSchema],

    settings: {
      isEnabled:        { type: Boolean, default: true },
      autoplay:         { type: Boolean, default: true },
      autoplayDelay:    { type: Number, default: 7000 },
      pauseOnHover:     { type: Boolean, default: false },
      showTimer:        { type: Boolean, default: true },
      showCounter:      { type: Boolean, default: true },
      showBgTypography: { type: Boolean, default: true },
      showCornerDeco:   { type: Boolean, default: true },
      enableFloat:      { type: Boolean, default: true },
      transitionType:   { type: String, default: 'slide', enum: ['slide', 'fade', 'zoom'] },
      heroHeight:       { type: String, default: '100svh' },
    },

    key: { type: String, default: 'main', unique: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Hero', heroSchema)
