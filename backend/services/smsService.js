// services/smsService.js
const axios = require('axios');

// مقداردهی از env
const PROVIDER = process.env.SMS_PROVIDER || 'log';
const API_KEY = process.env.SMS_API_KEY;
const FROM = process.env.SMS_FROM;
const TEMPLATE_CODE = process.env.SMS_TEMPLATE_CODE;
if (process.env.NODE_ENV !== 'production') {
  console.log('[SMS DEBUG] provider:', PROVIDER, '| apiKey length:', API_KEY ? API_KEY.length : 0, '| template:', TEMPLATE_CODE);
}

// ------------------------------------------------------
// 1. Provider: Log (فقط در کنسول چاپ می‌کند)
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
    if (!API_KEY) {
      throw new Error('SMS_API_KEY برای ملی پیامک تنظیم نشده است');
    }
    const url = `https://rest.payamak-panel.com/api/SendSimpleSMS`;
    const response = await axios.post(url, {
      username: API_KEY.split(':')[0],
      password: API_KEY.split(':')[1],
      to: phone,
      from: FROM,
      text: `کد تایید شما: ${code}`,
    });
    if (response.data?.RetStatus === 1) {
      return { success: true };
    }
    throw new Error('خطا در ارسال پیامک');
  },
};

// ------------------------------------------------------
// انتخاب provider بر اساس متغیر محیطی
// ------------------------------------------------------
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

/**
 * ارسال کد تایید از طریق سرویس فعال
 * @param {string} phone - شماره موبایل
 * @param {string} code - کد تایید ۶ رقمی
 * @returns {Promise<{success: boolean}>}
 */
const sendVerificationCode = async (phone, code) => {
  try {
    return await activeProvider.send(phone, code);
  } catch (error) {
    // چاپ پیام خطای دقیق‌تر (اگر پاسخ از سمت کاوه‌نگار باشد)
    const kavenegarMsg = error.response?.data?.return?.message;
    console.error('SMS send error:', kavenegarMsg || error.message);
    return { success: false, message: kavenegarMsg || error.message };
  }
};

module.exports = { sendVerificationCode };
