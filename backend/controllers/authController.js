const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationCode } = require('../services/smsService');
const { saveCode, verifyCode, getRemainingTime } = require('../utils/smsStore');
const crypto = require('crypto');
const IS_PROD = process.env.NODE_ENV === 'production';


const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  addresses: user.addresses,
  createdAt: user.createdAt,
  isSuperAdmin: user.isSuperAdmin,
  permissions: user.permissions,
  isProfileComplete: user.isProfileComplete,
});

// ==================== درخواست کد پیامک ====================
const requestSmsCode = async (req, res) => {
  const { phone } = req.body;

  // اعتبارسنجی سختگیرانه شماره موبایل ایرانی
  if (!phone || !/^09\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'شماره موبایل معتبر نیست' });
  }

  // جلوگیری از اسپم: اگر برای این شماره کد فعال وجود دارد، اجازه ارسال مجدد نده
  const remaining = await getRemainingTime(phone);
  if (remaining > 0) {
    return res.status(429).json({
      success: false,
      message: `کد قبلی هنوز معتبر است. لطفاً ${remaining} ثانیه دیگر تلاش کنید.`,
      remaining,
    });
  }

    const isSmsConfigured =
    process.env.SMS_PROVIDER &&
    process.env.SMS_PROVIDER !== 'log' &&
    process.env.SMS_API_KEY;

  const code = String(crypto.randomInt(100000, 1000000));

  if (!isSmsConfigured) {
    // ⛔ در پروداکشن هرگز کد را چاپ نکن و success برنگردان.
    // اگر پیکربندی پیامک خراب شود، باید صریحاً خطا بدهیم تا
    // متوجه شویم — نه اینکه بی‌سروصدا کد را در لاگ بنویسیم.
    if (IS_PROD) {
      console.error('🔴 CRITICAL: SMS provider is not configured in production. OTP request rejected.');
      return res.status(503).json({
        success: false,
        message: 'سرویس پیامک در دسترس نیست. لطفاً کمی بعد تلاش کنید.',
      });
    }

    // فقط در محیط توسعه: کد در کنسول چاپ می‌شود
    await saveCode(phone, code);
    console.log(`[SMS MOCK] کد تایید برای شماره ${phone}: ${code}`);
    return res.json({
      success: true,
      message: 'کد تایید ارسال شد (حالت توسعه - کنسول را ببینید)',
      remaining: 120,
    });
  }

  const result = await sendVerificationCode(phone, code);
  if (result.success) {
    await saveCode(phone, code);
    return res.json({ success: true, message: 'کد تایید ارسال شد', remaining: 120 });
  }

  // جزئیات خام پرووایدر فقط در لاگ سرور می‌ماند، نه در پاسخ کاربر
  console.error('[SMS] send failed:', result.message || 'unknown provider error');
  return res.status(502).json({
    success: false,
    message: 'ارسال پیامک با مشکل مواجه شد. لطفاً چند لحظه بعد تلاش کنید.',
  });
};


// ==================== تایید کد و ورود/ثبت‌نام ====================
const verifySmsCode = async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !/^09\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'شماره موبایل معتبر نیست' });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, message: 'کد تایید معتبر نیست' });
  }

  const isValid = await verifyCode(phone, code);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'کد نامعتبر یا منقضی شده است' });
  }

  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    // ساخت کاربر جدید فقط با شماره موبایل - بدون نام و ایمیل
    user = await User.create({
      phone,
      isProfileComplete: false,
    });
    isNewUser = true;
  }

   // فقط حساب فعال اجازه ورود دارد (blocked و inactive هر دو رد می‌شوند)
  if (user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message:
        user.status === 'blocked'
          ? 'حساب کاربری شما مسدود شده است'
          : 'حساب کاربری شما غیرفعال است',
    });
  }

  user.lastLogin = Date.now();
  await user.save();

  // نسخه‌ی فعلی سشن داخل توکن قرار می‌گیرد
  const token = generateToken(user._id, user.tokenVersion ?? 0);

  res.json({
    success: true,
    token,
    isNewUser,
    needsProfile: !user.isProfileComplete, // آیا باید به صفحه تکمیل پروفایل برود؟
    user: buildUserResponse(user),
  });
};

// ==================== تکمیل پروفایل (نام و نام خانوادگی) ====================
const completeProfile = async (req, res) => {
  // req.user از میدلور protect می‌آید
  const { name } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'نام و نام خانوادگی باید حداقل ۳ حرف باشد' });
  }
  // جلوگیری از ورودی بیش از حد طولانی (امنیت)
  if (name.trim().length > 60) {
    return res.status(400).json({ success: false, message: 'نام بیش از حد طولانی است' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
  }

  user.name = name.trim();
  user.isProfileComplete = true;
  await user.save();

  res.json({
    success: true,
    message: 'پروفایل با موفقیت تکمیل شد',
    user: buildUserResponse(user),
  });
};

// ==================== سایر توابع (نگه‌داشته شده برای سازگاری) ====================
const getMe = async (req, res) => {
  if (req.user) {
    res.json({ success: true, user: req.user });
  } else {
    res.status(404).json({ success: false, message: 'User not found' });
  }
};

const logout = async (req, res) => {
  try {
    // با یک واحد افزایش، همه‌ی توکن‌های قبلی این کاربر باطل می‌شوند
    if (req.user?._id) {
      await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    }
  } catch (err) {
    // خروج باید همیشه از دید کاربر موفق باشد
    console.error('[AUTH] logout error:', err.message);
  }
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'خروج با موفقیت انجام شد' });
};

// ==================== Google OAuth (شرطی) ====================
const googleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ success: false, message: 'Google OAuth not configured' });
  }
  const passport = require('passport');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

const googleCallback = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ success: false, message: 'Google OAuth not configured' });
  }
  const passport = require('passport');
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }
    const token = generateToken(user._id, user.tokenVersion ?? 0);
    user.lastLogin = Date.now();
    await user.save();
    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  })(req, res, next);
};

module.exports = {
  getMe,
  logout,
  requestSmsCode,
  verifySmsCode,
  completeProfile,
  googleAuth,
  googleCallback,
};
