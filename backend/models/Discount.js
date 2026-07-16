const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed', 'freeShipping'], required: true },
  value: { type: Number, required: true, min: 0 },
  minPurchase: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: null, min: 0 },
  usageLimit: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 1 },        
  firstPurchaseOnly: { type: Boolean, default: false },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: false },
  status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
  isPublic: { type: Boolean, default: false },
  description: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' },
  },
}, { timestamps: true });

discountSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('تاریخ پایان باید بعد از تاریخ شروع باشد'));
  }
  if (this.type === 'percent' && this.value > 100) {
    return next(new Error('مقدار تخفیف درصدی نمی‌تواند بیشتر از ۱۰۰ باشد'));
  }
  next();
});

module.exports = mongoose.model('Discount', discountSchema);
