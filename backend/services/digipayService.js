/**
 * سرویس ارتباط با درگاه پرداخت یکپارچه دیجی‌پی (DigiPay UPG)
 * مستندات: https://www.mydigipay.com/developers/docs/upg/
 *
 * واحد پول: دیتابیس سایت = تومان | دیجی‌پی = ریال (تبدیل ×۱۰ فقط اینجا)
 *
 * جریان کامل (مطابق بخش ۴ مستندات):
 *  ۱) لاگین (oauth/token) → Access Token (اعتبار ~۱ ساعت) + Refresh Token
 *  ۲) تیکت خرید (tickets/business?type=11) → redirectUrl → هدایت کاربر
 *  ۳) نتیجه پرداخت (Callback) — معمولاً POST به callbackUrl (انصراف: GET بدون بدنه)
 *  ۴) تایید پرداخت (purchases/verify?type={type}) — ⚠️ حداکثر ۳ دقیقه بعد از پرداخت؛
 *     در غیر این صورت تراکنش Auto Reverse می‌شود و مبلغ به کاربر برمی‌گردد
 *  ۵) تحویل خرید (purchases/deliver?type={type}) — فقط برای CREDIT و BNPL الزامی
 *  ۶) بازگشت خرید (refunds?type={نوع عودت}) — عودت کامل یا جزئی
 *  ۷) پیگیری عودت (refunds/{inquiryId}?type={نوع عودت})
 */
const axios = require('axios');

const BASE_URL = (process.env.DIGIPAY_BASE_URL || 'https://api.mydigipay.com/digipay/api').replace(/\/+$/, '');
const CLIENT_ID = process.env.DIGIPAY_CLIENT_ID;
const CLIENT_SECRET = process.env.DIGIPAY_CLIENT_SECRET;
const USERNAME = process.env.DIGIPAY_USERNAME;
const PASSWORD = process.env.DIGIPAY_PASSWORD;
// هدر Digipay-Version — مستند: «تاریخ پیاده‌سازی به فرمت yyyy-MM-dd؛ مقدار ثابت یکتا نیست»
const API_VERSION = process.env.DIGIPAY_API_VERSION || '2022-02-02';

/* مسیر اندپوینت‌ها — نسبی به آدرس پایه */
const EP = {
  oauth: '/oauth/token',
  ticket: '/tickets/business?type=11', // ۱۱ = تمام فیچرهای UPG (کیف پول/اعتبار/BNPL)
  verify: (type) => `/purchases/verify?type=${type}`,
  deliver: (type) => `/purchases/deliver?type=${type}`,
  refund: (type) => `/refunds?type=${type}`,
  refundInquiry: (id, type) => `/refunds/${encodeURIComponent(id)}?type=${type}`,
};

/* نوع خرید — کد type بازگشده در Callback (جدول ۱۲ مستندات) — با نوع تیکت اولیه UPG اشتباه نشود */
const PURCHASE_TYPE = {
  WALLET: 11,      // کیف پول نقدی
  CREDIT: 5,       // اعتبار خرید
  BNPL: 13,        // خرید اقساطی (Buy Now Pay Later)
  CREDIT_CARD: 24, // کارت اعتباری
};

/* نوع عودت (جدول «نوع عودت» بخش ۱۱) — بر اساس نوع واقعی خرید از Callback */
const REFUND_TYPE = {
  DEBIT: 0,   // عودت خودکار — برای روش‌های خارج از جدول (مثل CREDIT_CARD)
  WALLET: 11,
  CREDIT: 5,
  BNPL: 13,
};

/* تحویل خرید فقط برای پرداخت‌های اعتباری الزامی است (بخش ۱۰ مستندات) */
const DELIVERY_REQUIRED_TYPES = [PURCHASE_TYPE.CREDIT, PURCHASE_TYPE.BNPL];

const TOMAN_TO_RIAL = 10;

const isDigipayConfigured = () =>
  !!(CLIENT_ID && CLIENT_SECRET && USERNAME && PASSWORD);

const toRial = (toman) => Math.round(Number(toman || 0) * TOMAN_TO_RIAL);

// نوع عودت مناسب هر نوع خرید؛ برای روش‌های خارج از جدول → Debit (عودت خودکار)
const refundTypeForPurchase = (purchaseType) => {
  const t = Number(purchaseType);
  if (t === PURCHASE_TYPE.WALLET) return REFUND_TYPE.WALLET;
  if (t === PURCHASE_TYPE.CREDIT) return REFUND_TYPE.CREDIT;
  if (t === PURCHASE_TYPE.BNPL) return REFUND_TYPE.BNPL;
  return REFUND_TYPE.DEBIT;
};

const isDeliveryRequired = (purchaseType) =>
  DELIVERY_REQUIRED_TYPES.includes(Number(purchaseType));

/* --------------------- توکن OAuth (با کش حافظه + Refresh) --------------------- */
let tokenCache = { accessToken: null, refreshToken: null, expiresAt: 0 };

const basicAuthHeader = () =>
  'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');

// فراخوانی خام سرویس توکن — grantType = 'password' یا 'refresh_token'
const requestToken = async (grantType, extra = {}) => {
  const form = new URLSearchParams({ grant_type: grantType, ...extra });
  const { data } = await axios.post(BASE_URL + EP.oauth, form.toString(), {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 20000,
  });
  const accessToken = data && data.access_token;
  if (!accessToken) {
    throw new Error('پاسخ توکن دیجی‌پی نامعتبر بود: ' + JSON.stringify(data).slice(0, 200));
  }
  const expiresIn = Number(data && data.expires_in) || 3300;
  tokenCache = {
    accessToken,
    refreshToken: (data && data.refresh_token) || tokenCache.refreshToken || null,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return accessToken;
};

const getAccessToken = async (forceLogin = false) => {
  if (!isDigipayConfigured()) throw new Error('درگاه دیجی‌پی پیکربندی نشده است');

  // توکن معتبر در کش؟ (با ۶۰ ثانیه حاشیه امنیت)
  if (!forceLogin && tokenCache.accessToken && tokenCache.expiresAt - Date.now() > 60000) {
    return tokenCache.accessToken;
  }

  // توکن منقضی شده: اول تلاش با refresh_token (بخش ۲-۶ مستندات)
  if (!forceLogin && tokenCache.refreshToken) {
    try {
      return await requestToken('refresh_token', { refresh_token: tokenCache.refreshToken });
    } catch (e) {
      // اگر رفرش‌توکن هم منقضی/نامعتبر بود (۴۰۱) → لاگین کامل
    }
  }

  // لاگین کامل با نام کاربری/رمز (بخش ۶ مستندات)
  return requestToken('password', { username: USERNAME, password: PASSWORD });
};

/* ----------------------------- کمک‌تابع خطاها ----------------------------- */
const buildError = (error, prefix) => {
  const status = error.response && error.response.status;
  const body = error.response && error.response.data;
  const resultStatus = body && body.result && body.result.status;
  const resultMessage =
    (body && body.result && (body.result.message || body.result.title)) ||
    (body && (body.error_description || body.error)) ||
    error.message ||
    'خطای نامشخص';
  return {
    success: false,
    httpStatus: status || 0,
    code: resultStatus !== undefined ? resultStatus : status || 0,
    message: `${prefix} (HTTP ${status || '-'} / کد ${resultStatus !== undefined ? resultStatus : '-'}) — ${resultMessage}`,
    raw: body,
  };
};

/* ------------------- فراخوانی API با مدیریت خودکار توکن ------------------- */
// در صورت انقضای توکن (۴۰۱) یک‌بار توکن تازه می‌گیرد و دوباره تلاش می‌کند
const apiCall = async (method, path, body) => {
  const doCall = async (token) => {
    // هدرها مطابق جدول ۵ مستندات (برای همه سرویس‌های UPG معتبر)
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json; charset=UTF-8',
      Agent: 'WEB',
      'Digipay-Version': API_VERSION,
    };
    return axios.request({
      method,
      url: BASE_URL + path,
      headers,
      data: body,
      timeout: 25000,
    });
  };

  let token = await getAccessToken();
  let response;
  try {
    response = await doCall(token);
  } catch (firstError) {
    const s = firstError.response && firstError.response.status;
    if (s === 401) {
      // توکن منقضی شده — لاگین مجدد (نه refresh) و تلاش دوباره
      token = await getAccessToken(true);
      response = await doCall(token);
    } else {
      throw firstError;
    }
  }

  const data = response.data;
  // موفقیت = HTTP 200 و result.status = 0 (جدول ۳۰: ۰ یعنی عملیات با موفقیت انجام شد)
  const resultStatus = data && data.result && data.result.status;
  if (response.status === 200 && (resultStatus === 0 || resultStatus === undefined)) {
    return { success: true, response: data };
  }
  return {
    success: false,
    code: resultStatus,
    message: (data && data.result && (data.result.message || data.result.title)) ||
      `پاسخ غیرموفق دیجی‌پی (کد ${resultStatus})`,
    raw: data,
  };
};

/* ----------------------------- ۲) تیکت خرید ----------------------------- */
// payload = { amount(ریال), cellNumber, providerId, callbackUrl, basketDetailsDto }
const createTicket = async (payload) => {
  try {
    return await apiCall('POST', EP.ticket, payload);
  } catch (error) {
    return buildError(error, 'خطا در ایجاد تیکت خرید دیجی‌پی');
  }
};

/* ----------------------------- ۴) تایید پرداخت ----------------------------- */
// ⚠️ باید حداکثر تا ۳ دقیقه پس از پرداخت موفق فراخوانی شود وگرنه Auto Reverse می‌شود
// Idempotent است: تکرار برای خرید قبلاً تاییدشده، همان پاسخ موفق را برمی‌گرداند
const verifyPurchase = async (purchaseType, { trackingCode, providerId }) => {
  try {
    return await apiCall('POST', EP.verify(purchaseType), { trackingCode, providerId });
  } catch (error) {
    return buildError(error, 'خطا در تایید پرداخت دیجی‌پی');
  }
};

/* ----------------------------- ۵) تحویل خرید ----------------------------- */
// فقط برای CREDIT و BNPL الزامی؛ تکرار برای خرید تحویل‌شده HTTP 200 می‌دهد و تغییری ایجاد نمی‌کند
// data = { deliveryDate(Epoch ms), invoiceNumber, trackingCode, products: [نام فارسی کالاها] }
const deliverPurchase = async (purchaseType, data) => {
  try {
    return await apiCall('POST', EP.deliver(purchaseType), data);
  } catch (error) {
    return buildError(error, 'خطا در ارسال تحویل خرید دیجی‌پی');
  }
};

/* ----------------------------- ۶) بازگشت خرید ----------------------------- */
// ⚠️ HTTP 200 فقط یعنی «ثبت درخواست»؛ نتیجه نهایی از Refund Inquiry
// data = { providerId(یکتا), amount(ریال), saleTrackingCode, customerName?, description? }
const refundPurchase = async (refundType, data) => {
  try {
    return await apiCall('POST', EP.refund(refundType), data);
  } catch (error) {
    return buildError(error, 'خطا در ثبت بازگشت وجه دیجی‌پی');
  }
};

/* --------------------------- ۷) پیگیری بازگشت وجه --------------------------- */
// inquiryId = کد پیگیری Refund یا همان providerId ارسالی در درخواست عودت
// پاسخ: status — 0 موفق | 1 شکست (resultCode علت) | 2 در حال پردازش (استعلام تکرار شود)
const refundInquiry = async (refundType, inquiryId) => {
  try {
    return await apiCall('GET', EP.refundInquiry(inquiryId, refundType), undefined);
  } catch (error) {
    return buildError(error, 'خطا در پیگیری بازگشت وجه دیجی‌پی');
  }
};

module.exports = {
  isDigipayConfigured,
  toRial,
  refundTypeForPurchase,
  isDeliveryRequired,
  PURCHASE_TYPE,
  REFUND_TYPE,
  createTicket,
  verifyPurchase,
  deliverPurchase,
  refundPurchase,
  refundInquiry,
};
