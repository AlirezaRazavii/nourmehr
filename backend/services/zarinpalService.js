const axios = require('axios');

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID;
const CALLBACK_URL = process.env.ZARINPAL_CALLBACK_URL;

const REQUEST_URL = 'https://api.zarinpal.com/pg/v4/payment/request.json';
const VERIFY_URL  = 'https://api.zarinpal.com/pg/v4/payment/verify.json';
const START_PAY   = 'https://www.zarinpal.com/pg/StartPay/';

const isZarinpalConfigured = () => !!(MERCHANT_ID && CALLBACK_URL);

const initiatePayment = async ({ amount, description, orderId, callbackUrl = CALLBACK_URL }) => {
  if (!isZarinpalConfigured()) throw new Error('درگاه زرین‌پال پیکربندی نشده است');
  try {
    const { data } = await axios.post(REQUEST_URL, {
      merchant_id: MERCHANT_ID,
      amount: Math.round(amount),
      currency: 'IRT',
      callback_url: callbackUrl,
      description: description || `پرداخت سفارش ${orderId}`,
      metadata: { order_id: String(orderId) },
    });
    if (data?.data?.code === 100 && data.data.authority) {
      return { success: true, authority: data.data.authority, paymentUrl: START_PAY + data.data.authority };
    }
    // errors ممکن است آبجکت یا آرایه باشد
    const errMsg = data?.errors?.message || (Array.isArray(data?.errors) ? data.errors[0]?.message : '') || 'خطا در اتصال به درگاه';
    return { success: false, message: errMsg, code: data?.errors?.code };
  } catch (error) {
    console.error('Zarinpal initiate error:', error.response?.data || error.message);
    return { success: false, message: 'خطا در ارتباط با درگاه پرداخت' };
  }
};

const verifyPayment = async ({ authority, amount }) => {
  if (!isZarinpalConfigured()) throw new Error('درگاه زرین‌پال پیکربندی نشده است');
  try {
    const { data } = await axios.post(VERIFY_URL, {
      merchant_id: MERCHANT_ID,
      amount: Math.round(amount),
      authority,
    });
    const code = data?.data?.code;
    if (code === 100 || code === 101) {
      return { success: true, refId: data.data.ref_id, alreadyVerified: code === 101 };
    }
    const errMsg = data?.errors?.message || (Array.isArray(data?.errors) ? data.errors[0]?.message : '') || 'پرداخت تأیید نشد';
    return { success: false, message: errMsg };
  } catch (error) {
    console.error('Zarinpal verify error:', error.response?.data || error.message);
    return { success: false, message: 'خطا در تأیید پرداخت' };
  }
};

module.exports = { initiatePayment, verifyPayment, isZarinpalConfigured };
