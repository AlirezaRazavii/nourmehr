const rateLimit = require('express-rate-limit');

const smsRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.' },
});


const smsVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً بعداً امتحان کنید.' },
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'درخواست‌های بیش از حد. لطفاً صبر کنید.' },
});

module.exports = { smsRequestLimiter, smsVerifyLimiter, globalLimiter };
