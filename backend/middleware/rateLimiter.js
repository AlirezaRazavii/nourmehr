const rateLimit = require('express-rate-limit');

const IS_PROD = process.env.NODE_ENV === 'production';
const PHONE_RE = /^09\d{9}$/;

const num = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

/* ---------------------------------------------------------------
   سقف‌ها از env قابل تنظیم‌اند تا بدون تغییر کد بتوان تیون کرد.

   نکته مهم: یک CDN جلوی سایت است و IP واقعی کاربر به اپ نمی‌رسد،
   پس صدها کاربر یک IP مشترک دارند. به همین دلیل سقف IP سخاوتمندانه
   است؛ محافظت واقعی روی «شماره موبایل» و «سقف کل ساعتی» است.
--------------------------------------------------------------- */
const IP_REQ_MAX        = num(process.env.SMS_IP_MAX,           IS_PROD ? 40 : 200);
const PHONE_REQ_MAX     = num(process.env.SMS_PHONE_MAX,        IS_PROD ? 5  : 100);
const GLOBAL_MAX        = num(process.env.SMS_HOURLY_BUDGET,    200);
const IP_VERIFY_MAX     = num(process.env.SMS_VERIFY_IP_MAX,    IS_PROD ? 80 : 300);
const PHONE_VERIFY_MAX  = num(process.env.SMS_VERIFY_PHONE_MAX, IS_PROD ? 8  : 200);

/* نرمال‌سازی ارقام فارسی/عربی به انگلیسی
   بدون این، مهاجم با فرستادن «۰۹۱۲۳۴۵۶۷۸۹» کلید متفاوتی می‌سازد
   و محدودیت شماره را دور می‌زند. */
const toEnDigits = (s) =>
  String(s || '')
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** کلید محدودیت = شماره موبایل نرمال‌شده (مستقل از IP) */
const phoneKey = (req) => toEnDigits(req.body?.phone).replace(/[\s-]/g, '').trim();

/** اگر شماره معتبر نبود، شمارش نکن (کنترلر خودش ۴۰۰ می‌دهد) */
const invalidPhone = (req) => !PHONE_RE.test(phoneKey(req));

const msg = (text) => ({ success: false, message: text });

/* ============ ۱) درخواست کد — سقف IP (سد اولیه) ============ */
const smsRequestByIp = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IP_REQ_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: msg('تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.'),
});

/* ====== ۲) درخواست کد — سقف شماره موبایل (محافظ اصلی) ======
   حتی با ۱۰۰ پروکسی، یک شماره بیشتر از این پیامک نمی‌گیرد.
   skipFailedRequests: فقط ارسال موفق شمرده می‌شود. */
const smsRequestByPhone = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: PHONE_REQ_MAX,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: phoneKey,
  skip: invalidPhone,
  skipFailedRequests: true,
  message: msg('برای این شماره درخواست‌های زیادی ثبت شده است. یک ساعت دیگر تلاش کنید.'),
});

/* ====== ۳) سقف کل پیامک در ساعت — «کلید برق» مالی ======
   اگر مهاجم با شماره‌های تصادفی از IP های متعدد حمله کند،
   سقف IP و شماره کار نمی‌کنند؛ فقط این جلوی سوختن اعتبار
   پنل کاوه‌نگار را می‌گیرد. */
const smsGlobalBudget = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: GLOBAL_MAX,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: () => 'global-sms-budget',
  skip: invalidPhone,
  skipFailedRequests: true,
  message: msg('سرویس پیامک موقتاً در دسترس نیست. لطفاً چند دقیقه بعد تلاش کنید.'),
});

/* ============ ۴) تأیید کد — سقف IP ============
   skipSuccessfulRequests: ورود موفق سهمیه را نمی‌سوزاند. */
const smsVerifyByIp = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: IP_VERIFY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: msg('تلاش‌های ناموفق زیاد. لطفاً بعداً امتحان کنید.'),
});

/* ====== ۵) تأیید کد — سقف شماره (لایه دوم روی smsStore) ======
   این حتی وقتی رکورد کد از دیتابیس حذف شده هم فعال است. */
const smsVerifyByPhone = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: PHONE_VERIFY_MAX,
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

/* ---- نام‌های قدیمی برای سازگاری ---- */
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
