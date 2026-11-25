const mongoose = require('mongoose');

/**
 * ⭐ شمارنده‌ی اتمیک استفاده‌ی هر کاربر از یک کد تخفیف
 *  — رفع باگ race: قبلاً شمارش perUser با «شمارش سفارش‌ها» انجام می‌شد
 *    (check-then-act) و دو پرداخت همزمان هر دو از فیلتر رد می‌شدند.
 *  — حالا یک رکورد (discount, user) با شمارنده؛ افزایش با شرط count < perUserLimit
 *    به‌صورت اتمیک روی دیتابیس انجام می‌شود (برخورد upsert با ایندکس یکتا =>
 *    retry یک‌بار؛ نتیجه: دقیقاً حداکثر perUserLimit مصرف ممکن است).
 */
const discountClaimSchema = new mongoose.Schema({
  discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

discountClaimSchema.index({ discount: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('DiscountClaim', discountClaimSchema);
