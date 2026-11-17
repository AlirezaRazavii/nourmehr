// services/smsService.js
const axios = require('axios');
const Order = require('../models/Order');
const Setting = require('../models/Setting');

// ------------------------------------------------------
// 1. Provider: Log
// ------------------------------------------------------
const logProvider = {
  async send(phone, code) {
    console.log(`[SMS MOCK] ارسال کد تایید به شماره ${phone}: ${code}`);
    return { success: true };
  },
};

// ------------------------------------------------------
// 2. Provider: Kavenegar (روش Verify/Lookup)
// ------------------------------------------------------
const kavenegarProvider = {
  async send(phone, code) {
    const API_KEY = process.env.SMS_API_KEY;
    const TEMPLATE_CODE = process.env.SMS_TEMPLATE_CODE;

    if (!API_KEY) {
      throw new Error('SMS_API_KEY برای کاوه‌نگار تنظیم نشده است');
    }
    if (!TEMPLATE_CODE) {
      throw new Error('SMS_TEMPLATE_CODE (نام الگو) برای کاوه‌نگار تنظیم نشده است');
    }
    const url = `https://api.kavenegar.com/v1/${API_KEY}/verify/lookup.json`;
    const response = await axios.get(url, {
      params: {
        receptor: phone,
        token: code,
        token2: code,
        template: TEMPLATE_CODE,
      },
    });
    if (response.data?.return?.status === 200) {
      return { success: true };
    }
    throw new Error(response.data?.return?.message || 'خطا در ارسال پیامک');
  },
};

// ------------------------------------------------------
// 3. Provider: Melipayamak
// ------------------------------------------------------
const melipayamakProvider = {
  async send(phone, code) {
    const API_KEY = process.env.SMS_API_KEY;
    const FROM = process.env.SMS_FROM;

    if (!API_KEY) {
      throw new Error('SMS_API_KEY برای ملی پیامک تنظیم نشده است');
    }
    const url = `https://rest.payamak-panel.com/api/SendSimpleSMS`;
    const response = await axios.post(url, {
      username: API_KEY.split(':')[0],
      password: API_KEY.split(':')[1],
      to: phone,
      from: FROM,
      text: `نورمهر\nکد تایید شما: ${code}\n@Nourmehr.ir #${code}`,
    });
    if (response.data?.RetStatus === 1) {
      return { success: true };
    }
    throw new Error('خطا در ارسال پیامک');
  },
};

/**
 * ارسال کد تایید از طریق سرویس فعال
 * @param {string} phone - شماره موبایل
 * @param {string} code - کد تایید ۶ رقمی
 */
const sendVerificationCode = async (phone, code) => {
  // provider را در لحظه‌ی ارسال می‌خوانیم تا مطمئن باشیم dotenv اجرا شده
  const PROVIDER = process.env.SMS_PROVIDER || 'log';

  let activeProvider;
  switch (PROVIDER) {
    case 'kavenegar':
      activeProvider = kavenegarProvider;
      break;
    case 'melipayamak':
      activeProvider = melipayamakProvider;
      break;
    default:
      activeProvider = logProvider;
  }

  try {
    return await activeProvider.send(phone, code);
  } catch (error) {
    const kavenegarMsg = error.response?.data?.return?.message;
    // جزئیات کامل فقط در لاگ سرور — کنترلر این را به کاربر نشان نمی‌دهد
    console.error('[SMS] provider error:', kavenegarMsg || error.message);
    return { success: false, message: kavenegarMsg || error.message };
  }
};

// ------------------------------------------------------
// ⭐ ارسال متن آزاد با کاوه‌نگار (sms/send.json)
//    برای پیامک اطلاع‌رسانی ادمین — جدا از الگوی OTP
// ------------------------------------------------------
const kavenegarSendText = async (phone, message) => {
  const API_KEY = process.env.SMS_API_KEY;
  if (!API_KEY) {
    throw new Error('SMS_API_KEY برای کاوه‌نگار تنظیم نشده است');
  }

  const url = `https://api.kavenegar.com/v1/${API_KEY}/sms/send.json`;
  const params = { receptor: phone, message };
  // خط ارسال اختصاصی (اختیاری): در .env بگذارید KAVENEGAR_SENDER=1xxxxxxxxx
  if (process.env.KAVENEGAR_SENDER) {
    params.sender = process.env.KAVENEGAR_SENDER;
  }

  const response = await axios.get(url, { params });
  if (response.data?.return?.status === 200) {
    return { success: true };
  }
  throw new Error(response.data?.return?.message || 'خطا در ارسال پیامک');
};

// ------------------------------------------------------
// ⭐ تبدیل ارقام فارسی/عربی به لاتین (قبل از اعتبارسنجی شماره)
// ------------------------------------------------------
const toLatinDigits = (s) =>
  String(s || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

// ------------------------------------------------------
// ⭐ پیامک اطلاع‌رسانی «سفارش تاییدشده» برای ادمین‌ها
//    - شماره گیرنده‌ها از پنل ادمین (تنظیمات → پیامک اطلاع‌رسانی سفارش) خوانده می‌شود
//    - اگر در پنل شماره‌ای ثبت نشده بود، از متغیر محیطی ADMIN_NOTIFY_PHONES
//      (با کاما جدا: "09131112233,09132223344") استفاده می‌شود
//    - قفل اتمیک adminSmsSent تضمین می‌کند هر سفارش فقط یک بار پیامک بگیرد،
//      حتی اگر چند مسیر تایید (درگاه/کرون/تایید دستی) همزمان اجرا شوند
//    - هر خطا فقط لاگ می‌شود و هرگز جریان پرداخت را متوقف نمی‌کند
// ------------------------------------------------------
const sendAdminOrderSms = async (orderId) => {
  try {
    if (!orderId) return { success: false };

    // تنظیمات از دیتابیس
    let settings = null;
    try {
      settings = await Setting.findOne();
    } catch (e) {
      console.error('[SMS][admin] خواندن تنظیمات ناموفق:', e.message);
    }

    const enabled = settings ? settings.adminOrderSmsEnabled !== false : true;

    // شماره‌ها: اول از پنل ادمین (ارقام فارسی/عربی خودکار به لاتین تبدیل می‌شوند)
    let phones = (settings?.adminNotifyPhones || [])
      .map((p) => toLatinDigits(p).replace(/\D/g, ''))
      .filter((p) => /^09\d{9}$/.test(p));

    // پشتیبان: متغیر محیطی
    if (phones.length === 0 && process.env.ADMIN_NOTIFY_PHONES) {
      phones = String(process.env.ADMIN_NOTIFY_PHONES)
        .split(',')
        .map((p) => toLatinDigits(p).replace(/\D/g, ''))
        .filter((p) => /^09\d{9}$/.test(p));
    }

    if (!enabled || phones.length === 0) {
      return { success: false, skipped: true };
    }

    // قفل اتمیک ضد ارسال تکراری (هر ۴ مسیر تایید سفارش اینجا جمع می‌شوند)
    const order = await Order.findOneAndUpdate(
      { _id: orderId, adminSmsSent: { $ne: true } },
      { $set: { adminSmsSent: true } }
    );
    if (!order) {
      return { success: true, alreadySent: true };
    }

    const buyer = (order.shippingInfo?.fullName || '').trim() || 'نامشخص';
    const total = (order.total || 0).toLocaleString('fa-IR');
    const message = `نورمهر — سفارش جدید!\nکد: ${order.orderRef} | خریدار: ${buyer}\nمبلغ: ${total} تومان`;

    let sent = 0;
    for (const phone of phones) {
      try {
        await kavenegarSendText(phone, message);
        sent++;
      } catch (e) {
        console.error(
          `[SMS][admin] ارسال به ${phone} ناموفق:`,
          e.response?.data?.return?.message || e.message
        );
      }
    }
    console.log(`[SMS][admin] سفارش ${order.orderRef} ← پیامک برای ${sent}/${phones.length} ادمین ارسال شد`);
    return { success: sent > 0, sent };
  } catch (error) {
    // خطای پیامک هرگز نباید جریان پرداخت/تایید سفارش را خراب کند
    console.error('[SMS][admin] sendAdminOrderSms error:', error.message);
    return { success: false };
  }
};

module.exports = { sendVerificationCode, sendAdminOrderSms };