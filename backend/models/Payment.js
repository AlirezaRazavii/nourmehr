const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['online', 'cod', 'wallet', 'torobpay','snappay','digipay'], required: true },
  provider: { type: String, enum: ['mock', 'zarinpal', 'torobpay', 'idpay', 'nextpay', 'cash_on_delivery', 'snappay', 'digipay'], default: 'mock' },
  authority: { type: String, unique: true, sparse: true },
  txnShort: { type: String, index: true }, // شناسه کوتاه ۲۰ کاراکتری اسنپ‌پی برای callback
  purchaseType: { type: Number }, // نوع واقعی خرید دیجی‌پی از Callback (۵=اعتبار، ۱۱=کیف پول، ۱۳=BNPL، ۲۴=کارت اعتباری)
  refId: String,
  status: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], default: 'pending' },
  callbackUrl: String,
  failureReason: String,
  paidAt: Date,
  failedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);