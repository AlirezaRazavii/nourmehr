const rateLimit = require('express-rate-limit');

const IS_PROD = process.env.NODE_ENV === 'production';
const PHONE_RE = /^09\d{9}$/;

/* ---------------------------------------------------------------
   نرمال‌سازی ارقام فارسی/عربی به انگلیسی
   بدون این، مهاجم با فرستادن «۰۹۱۲۳۴۵۶۷۸۹» کلید متفاوتی می‌سازد
   و محدودیت شماره را دور می‌زند.
--------------------------------------------------------------- */
const toEnDigits = (s) =>
  String(s || '')
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** کلید محدودیت = شماره موبایل نرمال‌شده (مستقل از IP) */
const phoneKey = (req) => toEnDigits(req.body?.phone).replace(/[\s-]/g, '').trim();

/** اگر شماره معتبر نبود، این درخواست را شمارش نکن (کنترلر خودش ۴۰۰ می‌دهد) */
const invalidPhone = (req) => !PHONE_RE.test(phoneKey(req));

const msg = (text) => ({ success: false, message: text });

/* ============================================================
   ۱) درخواست کد — سقف بر اساس IP
   جلوی اسکن سریع از یک نقطه را می‌گیرد.
============================================================ */
const smsRequestByIp = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IS_PROD ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.'),
});

/* ============================================================
   ۲) درخواست کد — سقف بر اساس شماره موبایل
   حتی با ۱۰۰ پروکسی، یک شماره بیشتر از این پیامک نمی‌گیرد.
   skipFailedRequests: فقط ارسال‌های موفق شمرده می‌شوند.
============================================================ */
const smsRequestByPhone = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_PROD ? 5 : 100,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: phoneKey,
  skip: invalidPhone,
  skipFailedRequests: true,
  message: msg('برای این شماره درخواست‌های زیادی ثبت شده است. یک ساعت دیگر تلاش کنید.'),
});

/* ============================================================
   ۳) سقف کل پیامک در ساعت — «کلید برق» مالی
   اگر مهاجم با شماره‌های تصادفی از IP های مختلف حمله کند،
   سقف IP و سقف شماره کار نمی‌کنند؛ فقط این جلوی سوختن
   اعتبار پنل پیامک را می‌گیرد.
============================================================ */
const smsGlobalBudget = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.SMS_HOURLY_BUDGET) || 200,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: () => 'global-sms-budget',
  skip: invalidPhone,
  skipFailedRequests: true,
  message: msg('سرویس پیامک موقتاً در دسترس نیست. لطفاً چند دقیقه بعد تلاش کنید.'),
});

/* ============================================================
   ۴) تأیید کد — سقف بر اساس IP
   skipSuccessfulRequests: ورود موفق سهمیه کاربر را نمی‌سوزاند.
============================================================ */
const smsVerifyByIp = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IS_PROD ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: msg('تلاش‌های ناموفق زیاد. لطفاً بعداً امتحان کنید.'),
});

/* ============================================================
   ۵) تأیید کد — سقف بر اساس شماره موبایل
   لایه دوم روی سقف ۵ تلاش داخل smsStore، چون این یکی
   حتی وقتی رکورد کد حذف شده هم فعال است.
============================================================ */
const smsVerifyByPhone = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IS_PROD ? 8 : 200,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: phoneKey,
  skip: invalidPhone,
  skipSuccessfulRequests: true,
  message: msg('تلاش‌های ناموفق برای این شماره زیاد است. ۱۰ دقیقه دیگر تلاش کنید.'),
});

/* --------------------------- سقف عمومی --------------------------- */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('درخواست‌های بیش از حد. لطفاً صبر کنید.'),
});

/* ---- نام‌های قدیمی برای سازگاری (اگر جایی import شده باشند) ---- */
const smsRequestLimiter = smsRequestByIp;
const smsVerifyLimiter = smsVerifyByIp;

module.exports = {
  smsRequestByIp,
  smsRequestByPhone,
  smsGlobalBudget,
  smsVerifyByIp,
  smsVerifyByPhone,
  globalLimiter,
  smsRequestLimiter,
  smsVerifyLimiter,
};
