/**
 * سرویس ارتباط با درگاه پرداخت اعتباری ترب‌پی (TorobPay)
 *
 * ⚠️ واحد پول:
 *   دیتابیس سایت = تومان | ترب‌پی = ریال
 *   همه تبدیل‌ها اینجا متمرکز شده (×۱۰)
 */
const axios = require('axios');

const BASE_URL = (process.env.TOROBPAY_BASE_URL || 'https://cpg.torobpay.com').replace(/\/+$/, '');
const CLIENT_ID = process.env.TOROBPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.TOROBPAY_CLIENT_SECRET;
const USERNAME = process.env.TOROBPAY_USERNAME;
const PASSWORD = process.env.TOROBPAY_PASSWORD;

/* مسیر اندپوینت‌ها — اگر مسیر توکن خرید در مستندات متفاوت بود،
   با TOROBPAY_TOKEN_PATH در .env اصلاح می‌شود (نیازی به تغییر کد نیست). */
const EP = {
  oauth: '/api/online/v1/oauth/token',
  token: process.env.TOROBPAY_TOKEN_PATH || '/api/online/payment/v1/token',
  verify: '/api/online/payment/v1/verify',
  settle: '/api/online/payment/v1/settle',
  revert: '/api/online/payment/v1/revert',
  status: '/api/online/payment/v1/status',
  cancel: '/api/online/payment/v1/cancel',
  eligible: '/api/online/offer/v1/eligible',
};

const TOMAN_TO_RIAL = 10;
const MIN_AMOUNT_RIAL = 200_000;        // = ۲۰,۰۰۰ تومان
const MAX_AMOUNT_RIAL = 1_000_000_000;  // = ۱۰۰,۰۰۰,۰۰۰ تومان

const isTorobPayConfigured = () => !!(CLIENT_ID && CLIENT_SECRET && USERNAME && PASSWORD);

const toRial = (toman) => Math.round(Number(toman || 0) * TOMAN_TO_RIAL);

const isAmountInRange = (amountToman) => {
  const rial = toRial(amountToman);
  return rial >= MIN_AMOUNT_RIAL && rial <= MAX_AMOUNT_RIAL;
};

/* ------------------------- توکن JWT (با کش حافظه) ------------------------- */
// توکن ~۱ ساعت اعتبار دارد؛ ۵۵ دقیقه کش می‌شود و در صورت 401 یک‌بار تازه می‌شود.
let jwtCache = { token: null, expiresAt: 0 };

const getAccessToken = async (forceRefresh = false) => {
  if (!isTorobPayConfigured()) throw new Error('درگاه ترب‌پی پیکربندی نشده است');
  if (!forceRefresh && jwtCache.token && jwtCache.expiresAt - Date.now() > 60_000) {
    return jwtCache.token;
  }
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const { data } = await axios.post(
    `${BASE_URL}${EP.oauth}`,
    { username: USERNAME, password: PASSWORD },
    { headers: { Authorization: `Basic ${basic}` }, timeout: 20_000 }
  );
  const token = data?.access_token || data?.response?.access_token;
  if (!token) throw new Error('پاسخ توکن ترب‌پی نامعتبر بود');
  const expiresIn = Number(data?.expires_in) || 3300;
  jwtCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
};

/* ------------------ فراخوانی عمومی اندپوینت‌های ترب‌پی ------------------ */
const callApi = async (method, path, { body, params } = {}) => {
  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    return { success: false, code: 0, message: err.message };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await axios.request({
        method,
        url: `${BASE_URL}${path}`,
        data: body,
        params,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25_000,
      });
      if (data && data.successful) return { success: true, response: data.response };
      // HTTP 2xx ولی successful=false (محافظ احتیاطی)
      const e = data?.error || {};
      return { success: false, code: e.code ?? 0, message: e.message || e.user_message || 'پاسخ نامعتبر از ترب‌پی' };
    } catch (error) {
      const resp = error.response;
      // توکن منقضی شده → تازه کن و یک‌بار دیگر تلاش کن
      if (resp?.status === 401 && attempt === 0) {
        try {
          token = await getAccessToken(true);
        } catch (err) {
          return { success: false, code: 0, message: err.message };
        }
        continue;
      }
      if (resp) {
        const e = resp.data?.error || {};
        return {
          success: false,
          code: e.code ?? resp.status,
          message: e.message || e.user_message || `خطای ترب‌پی (HTTP ${resp.status})`,
        };
      }
      return { success: false, code: 0, message: 'ارتباط با درگاه ترب‌پی برقرار نشد' };
    }
  }
  return { success: false, code: 0, message: 'خطای غیرمنتظره در فراخوانی ترب‌پی' };
};

/* --------------------------- بررسی صلاحیت (eligible) --------------------------- */
// پاسخ فقط به مبلغ و مرچنت وابسته است (نه کاربر) → کش ۵ دقیقه‌ای امن است.
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

  const res = await callApi('GET', EP.eligible, { params: { amount: amountRial } });
  if (!res.success) return { success: false, message: res.message, code: res.code };

  const result = {
    success: true,
    eligible: !!res.response?.eligible,
    title: res.response?.title_message || 'پرداخت اقساطی با ترب‌پی',
    description: res.response?.description || '',
  };
  if (eligibleCache.size >= ELIGIBLE_CACHE_MAX) eligibleCache.clear();
  eligibleCache.set(amountRial, { result, at: Date.now() });
  return result;
};

/* ------------------------------ عملیات پرداخت ------------------------------ */
const createPurchaseToken = async (payload) => callApi('POST', EP.token, { body: payload });
const verifyPurchase = async (paymentToken) => callApi('POST', EP.verify, { body: { paymentToken } });
const settlePurchase = async (paymentToken) => callApi('POST', EP.settle, { body: { paymentToken } });
const revertPurchase = async (paymentToken) => callApi('POST', EP.revert, { body: { paymentToken } });
const cancelPurchase = async (paymentToken) => callApi('POST', EP.cancel, { body: { paymentToken } });
const getPurchaseStatus = async (paymentToken) => callApi('GET', EP.status, { params: { paymentToken } });

module.exports = {
  isTorobPayConfigured,
  toRial,
  isAmountInRange,
  checkEligibility,
  createPurchaseToken,
  verifyPurchase,
  settlePurchase,
  revertPurchase,
  cancelPurchase,
  getPurchaseStatus,
  MIN_AMOUNT_RIAL,
  MAX_AMOUNT_RIAL,
};