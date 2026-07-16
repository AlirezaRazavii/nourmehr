const axios = require('axios');

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
      text: `کد تایید شما: ${code}`,
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
  console.log('[SMS RUNTIME] provider:', process.env.SMS_PROVIDER, '| apiKey len:', (process.env.SMS_API_KEY || '').length);
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
    console.error('SMS send error:', kavenegarMsg || error.message);
    return { success: false, message: kavenegarMsg || error.message };
  }
};

module.exports = { sendVerificationCode };
