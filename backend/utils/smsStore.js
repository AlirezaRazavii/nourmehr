const SmsCode = require('../models/SmsCode');

const CODE_TTL_MS = 2 * 60 * 1000; // ۲ دقیقه

/**
 * ذخیره کد تایید برای شماره موبایل (کد قبلی همین شماره جایگزین می‌شود)
 * @param {string} phone
 * @param {string} code
 */
const saveCode = async (phone, code) => {
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  // upsert: اگر رکوردی برای این شماره هست به‌روزرسانی، وگرنه بساز
  await SmsCode.findOneAndUpdate(
    { phone },
    { phone, code, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );
};

/**
 * زمان باقی‌مانده (به ثانیه) تا انقضای کد فعلی برای این شماره
 * اگر کدی نباشد یا منقضی شده باشد، ۰ برمی‌گرداند
 * @param {string} phone
 * @returns {Promise<number>}
 */
const getRemainingTime = async (phone) => {
  const record = await SmsCode.findOne({ phone });
  if (!record) return 0;
  const remainingMs = record.expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) {
    await SmsCode.deleteOne({ phone });
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
};

/**
 * بررسی و حذف کد تایید
 * @param {string} phone
 * @param {string} code
 * @returns {Promise<boolean>}
 */
const verifyCode = async (phone, code) => {
  const record = await SmsCode.findOne({ phone });
  if (!record) return false;

  // اگر منقضی شده
  if (Date.now() > record.expiresAt.getTime()) {
    await SmsCode.deleteOne({ phone });
    return false;
  }

  // اگر کد اشتباه است: شمارنده تلاش را زیاد کن (محافظت در برابر حدس زدن)
  if (record.code !== code) {
    record.attempts += 1;
    // بعد از ۵ تلاش اشتباه، کد را باطل کن
    if (record.attempts >= 5) {
      await SmsCode.deleteOne({ phone });
    } else {
      await record.save();
    }
    return false;
  }

  // کد درست: حذف و موفقیت
  await SmsCode.deleteOne({ phone });
  return true;
};

module.exports = { saveCode, verifyCode, getRemainingTime };
