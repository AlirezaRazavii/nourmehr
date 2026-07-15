const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendVerificationCode } = require('../services/smsService');
const { saveCode, verifyCode, getRemainingTime } = require('../utils/smsStore');

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

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  if (!isSmsConfigured) {
    // حالت توسعه: کد در کنسول چاپ می‌شود
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
  return res.status(500).json({ success: false, message: result.message || 'خطا در ارسال پیامک' });
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

  // اگر کاربر مسدود است
  if (user.status === 'blocked') {
    return res.status(403).json({ success: false, message: 'حساب کاربری شما مسدود شده است' });
  }

  user.lastLogin = Date.now();
  await user.save();

  const token = generateToken(user._id);
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

const logout = (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
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
    const token = generateToken(user._id);
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
