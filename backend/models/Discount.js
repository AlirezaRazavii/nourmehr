const mongoose = require('mongoose');

// ⭐ روش‌های پرداخت قابل محدودکردن برای کد تخفیف — هم‌نام با enum سفارش
//    (در حال حاضر سفارش فقط با ۴ درگاه ثبت می‌شود؛ cod/wallet برای آینده)
const ALLOWED_PAYMENT_METHODS = ['online', 'cod', 'wallet', 'torobpay', 'snappay', 'digipay'];

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
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

  // ---------------------------------------------------------
  // ⭐ محدودیت‌های اعمال کد — قانون: آرایه خالی = نامحدود
  //   (کدهای موجود دیتابیس بدون هیچ تغییری مثل قبل کار می‌کنند)
  // ---------------------------------------------------------
  // فقط روی این محصولات قابل استفاده
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  // فقط روی محصولاتِ این دسته‌ها قابل استفاده
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  // فقط با این روش‌های پرداخت قابل استفاده — لیست سفید
  allowedPaymentMethods: [{
    type: String,
    enum: ALLOWED_PAYMENT_METHODS,
  }],
}, { timestamps: true });

// ——— اعتبارسنجی ———
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
module.exports.ALLOWED_PAYMENT_METHODS = ALLOWED_PAYMENT_METHODS;
