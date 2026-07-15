const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['online', 'cod', 'wallet'], required: true },
  provider: { type: String, enum: ['mock', 'zarinpal', 'idpay', 'nextpay', 'cash_on_delivery'], default: 'mock' },
  authority: { type: String, unique: true, sparse: true },
  refId: String,
  status: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], default: 'pending' },
  callbackUrl: String,
  failureReason: String,
  paidAt: Date,
  failedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);