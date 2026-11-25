const mongoose = require('mongoose');

/**
 * ⭐ رکورد حسابرسی هر مصرف واقعی کد تخفیف (برای گزارش و دیباگ ادمین)
 *  — یکتا روی (discount, order): هر سفارش حداکثر یک بار مصرف ثبت می‌کند
 *  — rollback سفارش، رکورد مربوطه را حذف می‌کند
 */
const discountUsageSchema = new mongoose.Schema({
  discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', required: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, default: 0, min: 0 },
  consumedAt: { type: Date, default: Date.now },
});

discountUsageSchema.index({ discount: 1, order: 1 }, { unique: true });
discountUsageSchema.index({ discount: 1, user: 1 });

module.exports = mongoose.model('DiscountUsage', discountUsageSchema);
