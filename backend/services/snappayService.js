/**
 * سرویس ارتباط با درگاه پرداخت اعتباری اسنپ‌پی (SnappPay)
 * واحد پول: دیتابیس سایت = تومان | اسنپ‌پی = ریال (تبدیل ×۱۰ فقط اینجا)
 *
 * ساختار API همان پلتفرم ترب‌پی است با دو تفاوت:
 *  ۱) OAuth با بدنه form-urlencoded (grant_type=password & scope=online-merchant)
 *  ۲) endpoint جدید Update برای مرجوعی جزئی اقلام سفارش
 */
const axios = require('axios');

const BASE_URL = (process.env.SNAPPAY_BASE_URL || '').replace(/\/+$/, '');
const CLIENT_ID = process.env.SNAPPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.SNAPPAY_CLIENT_SECRET;
const USERNAME = process.env.SNAPPAY_USERNAME;
const PASSWORD = process.env.SNAPPAY_PASSWORD;

/* مسیر اندپوینت‌ها — مطابق Postman اسنپ‌پی */
const EP = {
  oauth: '/api/online/v1/oauth/token',
  token: '/api/online/payment/v1/token',
  verify: '/api/online/payment/v1/verify',
  settle: '/api/online/payment/v1/settle',
  revert: '/api/online/payment/v1/revert',
  status: '/api/online/payment/v1/status',
  cancel: '/api/online/payment/v1/cancel',
  update: '/api/online/payment/v1/update',
  eligible: '/api/online/offer/v1/eligible',
};

const TOMAN_TO_RIAL = 10;
// بازه مبلغ (ریال) — با env قابل تنظیم؛ طبق ایمیل اسنپ‌پی سفارش تست تا ۱۰۰ هزار تومان
const MIN_AMOUNT_RIAL = Number(process.env.SNAPPAY_MIN_RIAL) || 200000;      // ۲۰,۰۰۰ تومان
const MAX_AMOUNT_RIAL = Number(process.env.SNAPPAY_MAX_RIAL) || 1000000000; // ۱۰۰,۰۰۰,۰۰۰ تومان

const isSnappPayConfigured = () =>
  !!(BASE_URL && CLIENT_ID && CLIENT_SECRET && USERNAME && PASSWORD);

const toRial = (toman) => Math.round(Number(toman || 0) * TOMAN_TO_RIAL);

const isAmountInRange = (amountToman) => {
  const rial = toRial(amountToman);
  return rial >= MIN_AMOUNT_RIAL && rial <= MAX_AMOUNT_RIAL;
};

/* ------------------------- توکن JWT (با کش حافظه) ------------------------- */
let jwtCache = { token: null, expiresAt: 0 };

const getAccessToken = async (forceRefresh = false) => {
  if (!isSnappPayConfigured()) throw new Error('درگاه اسنپ‌پی پیکربندی نشده است');
  if (!forceRefresh && jwtCache.token && jwtCache.expiresAt - Date.now() > 60000) {
    return jwtCache.token;
  }

  const basic = Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');

  // ⚠️ طبق Postman اسنپ‌پی: بدنه form-urlencoded است (نه JSON مثل ترب‌پی)
  const form = new URLSearchParams({
    grant_type: 'password',
    scope: 'online-merchant',
    username: USERNAME,
    password: PASSWORD,
  });

  const { data } = await axios.post(BASE_URL + EP.oauth, form.toString(), {
    headers: {
      Authorization: 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 20000,
  });

  const token = (data && (data.access_token || (data.response && data.response.access_token))) || null;
  if (!token) {
    throw new Error('پاسخ توکن اسنپ‌پی نامعتبر بود: ' + JSON.stringify(data).slice(0, 200));
  }
  const expiresIn = Number(data && data.expires_in) || 3300;
  jwtCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
};

/* ------------------ فراخوانی عمومی اندپوینت‌های اسنپ‌پی ------------------ */
const callApi = async (method, path, opts) => {
  const body = opts && opts.body;
  const params = opts && opts.params;
  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    return { success: false, code: 0, message: err.message };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await axios.request({
        method: method,
        url: BASE_URL + path,
        data: body,
        params: params,
        headers: { Authorization: 'Bearer ' + token },
        timeout: 25000,
      });

      if (data && data.successful) return { success: true, response: data.response };

      const e = (data && data.error) || {};
      return {
        success: false,
        code: e.code || 0,
        message: e.message || e.user_message || 'پاسخ نامعتبر از اسنپ‌پی',
      };
    } catch (error) {
      const resp = error.response;
      if (resp && resp.status === 401 && attempt === 0) {
        try {
          token = await getAccessToken(true);
        } catch (err) {
          return { success: false, code: 0, message: err.message };
        }
        continue;
      }
      if (resp) {
        const e = (resp.data && resp.data.error) || {};
        return {
          success: false,
          code: e.code || resp.status,
          message: e.message || e.user_message || 'خطای اسنپ‌پی (HTTP ' + resp.status + ')',
        };
      }
      return { success: false, code: 0, message: 'ارتباط با درگاه اسنپ‌پی برقرار نشد' };
    }
  }
  return { success: false, code: 0, message: 'خطای غیرمنتظره در فراخوانی اسنپ‌پی' };
};

/* --------------------------- بررسی صلاحیت (eligible) --------------------------- */
const eligibleCache = new Map();
const ELIGIBLE_CACHE_TTL = 5 * 60 * 1000;
const ELIGIBLE_CACHE_MAX = 100;

const checkEligibility = async (amountToman) => {
  const amountRial = toRial(amountToman);
  if (!Number.isFinite(amountRial) || amountRial < MIN_AMOUNT_RIAL || amountRial > MAX_AMOUNT_RIAL) {
    return { success: true, eligible: false };
  }
  const cached = eligibleCache.get(amountRial);
  if (cached && Date.now() - cached.at < ELIGIBLE_CACHE_TTL) return cached.result;

  // paymentMethodTypes اختیاری است — اگر در مستندات مقدار مشخصی به تو دادند، در env بگذار
  const params = { amount: amountRial };
  if (process.env.SNAPPAY_PAYMENT_METHOD_TYPES) {
    params.paymentMethodTypes = process.env.SNAPPAY_PAYMENT_METHOD_TYPES;
  }

  const res = await callApi('GET', EP.eligible, { params });
  if (!res.success) return { success: false, message: res.message, code: res.code };

  const result = {
    success: true,
    eligible: !!(res.response && res.response.eligible),
    title: (res.response && res.response.title_message) || 'پرداخت اقساطی با اسنپ‌پی',
    description: (res.response && res.response.description) || '',
  };
  if (eligibleCache.size >= ELIGIBLE_CACHE_MAX) eligibleCache.clear();
  eligibleCache.set(amountRial, { result: result, at: Date.now() });
  return result;
};

/* ------------------------------ عملیات پرداخت ------------------------------ */
const createPurchaseToken = async (payload) => callApi('POST', EP.token, { body: payload });
const verifyPurchase = async (paymentToken) => callApi('POST', EP.verify, { body: { paymentToken: paymentToken } });
const settlePurchase = async (paymentToken) => callApi('POST', EP.settle, { body: { paymentToken: paymentToken } });
const revertPurchase = async (paymentToken) => callApi('POST', EP.revert, { body: { paymentToken: paymentToken } });
const cancelPurchase = async (paymentToken) => callApi('POST', EP.cancel, { body: { paymentToken: paymentToken } });
const getPurchaseStatus = async (paymentToken) => callApi('GET', EP.status, { params: { paymentToken: paymentToken } });
// ⭐ جدید — مخصوص اسنپ‌پی: مرجوعی جزئی (آپدیت اقلام سفارش پس از پرداخت)
const updatePurchase = async (payload) => callApi('POST', EP.update, { body: payload });

module.exports = {
  isSnappPayConfigured,
  getAccessToken, // برای اسکریپت تست
  toRial,
  isAmountInRange,
  checkEligibility,
  createPurchaseToken,
  verifyPurchase,
  settlePurchase,
  revertPurchase,
  cancelPurchase,
  getPurchaseStatus,
  updatePurchase,
  MIN_AMOUNT_RIAL,
  MAX_AMOUNT_RIAL,
};