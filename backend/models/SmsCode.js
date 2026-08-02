const mongoose = require('mongoose');

const smsCodeSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  // زمان انقضا: مانگو با TTL index خودش بعد از رسیدن به این زمان داکیومنت را حذف می‌کند
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }, // تعداد تلاش‌های اشتباه (برای امنیت بیشتر)
}, { timestamps: true });

// TTL Index: هر داکیومنت دقیقاً در زمان expiresAt خودش حذف می‌شود
smsCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SmsCode', smsCodeSchema);
