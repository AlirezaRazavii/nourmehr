/**
 * تست اتصال به محیط استیجینگ اسنپ‌پی
 * اجرا: node scripts/test-snappay.js
 */
require('dotenv').config();
const svc = require('../services/snappayService');

const run = async () => {
  console.log('──────────── تست اتصال SnappPay (staging) ────────────');

  if (!svc.isSnappPayConfigured()) {
    console.error('❌ متغیرهای SNAPPAY_* در .env کامل نیستند');
    process.exit(1);
  }
  console.log('✅ متغیرهای محیط کامل است\n');

  // ۱) احراز هویت (OAuth) — اگر IP شما whitelist نشده باشد همین‌جا خطا می‌گیریم
  try {
    await svc.getAccessToken();
    console.log('✅ احراز هویت موفق — JWT دریافت شد (یعنی IP شما whitelist شده است)\n');
  } catch (err) {
    console.error('❌ احراز هویت ناموفق: ' + err.message);
    console.error('   → اگر خطا 403/Timeout است، احتمالاً IP این دستگاه هنوز به اسنپ‌پی اعلام نشده');
    process.exit(1);
  }

  // ۲) بررسی صلاحیت مبلغ ۵۰۰,۰۰۰ تومان
  const el = await svc.checkEligibility(500000);
  console.log('➤ eligible (۵۰۰,۰۰۰ تومان):', JSON.stringify(el, null, 2), '\n');

  // ۳) وضعیت یک توکن ساختگی — باید خطای «کنترل‌شده» بدهد (یعنی endpoint در دسترس است)
  const st = await svc.getPurchaseStatus('test-dummy-token-123');
  console.log('➤ status (توکن ساختگی):', JSON.stringify(st), '\n');

  console.log('──────────── پایان تست ────────────');
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });