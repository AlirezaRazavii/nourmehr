const crypto = require('crypto');
const SmsCode = require('../models/SmsCode');

const CODE_TTL_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// کد هرگز به‌صورت خام ذخیره نمی‌شود
const hashCode = (phone, code) =>
  crypto
    .createHmac('sha256', process.env.SMS_CODE_PEPPER || process.env.JWT_SECRET)
    .update(`${phone}:${code}`)
    .digest('hex');

const saveCode = async (phone, code) => {
  await SmsCode.findOneAndUpdate(
    { phone },
    {
      phone,
      code: hashCode(phone, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const getRemainingTime = async (phone) => {
  const record = await SmsCode.findOne({ phone }).lean();
  if (!record) return 0;
  const ms = new Date(record.expiresAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
};

const verifyCode = async (phone, code) => {
  const hashed = hashCode(phone, code);

  // یک عملیات اتمیک: اگر کد درست، منقضی‌نشده و زیر سقف تلاش بود → حذف و true
  const matched = await SmsCode.findOneAndDelete({
    phone,
    code: hashed,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: MAX_ATTEMPTS },
  });
  if (matched) return true;

  // شمارش اتمیک تلاش ناموفق
  const rec = await SmsCode.findOneAndUpdate(
    { phone },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (rec && rec.attempts >= MAX_ATTEMPTS) {
    await SmsCode.deleteOne({ phone });
  }
  return false;
};

module.exports = { saveCode, verifyCode, getRemainingTime };
