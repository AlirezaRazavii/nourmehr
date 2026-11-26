// backend/utils/pricing.js
/**
 *  تنها مرجع محاسبه قیمت در کل پروژه.
 * قانون‌ها (یک‌جا تعریف می‌شوند تا همه‌جا یکسان باشند):
 *  - قیمت پایه: قیمت سایز (اگر > 0) وگرنه قیمت محصول
 *  - تخفیف: تخفیف سایز (اگر > 0) وگرنه تخفیف محصول — جمع نمی‌شوند
 *  - درصد معتبر: 0 < d < 100 (۱۰۰٪ = بدون تخفیف؛ جلوی سفارش صفر تومانی)
 *  - گردکردن: Math.round همه‌جا
 * این فایل عمداً هیچ مدلی require نمی‌کند (خالص و بدون وابستگی).
 */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// درصد تخفیف معتبر؛ ۱۰۰ یا بیشتر → تخفیف اعمال نمی‌شود
const normalizePercent = (v) => {
  const d = toNum(v);
  return d > 0 && d < 100 ? d : 0;
};

// اعمال درصد تخفیف روی قیمت پایه
const applyPercent = (base, percent) => {
  const b = toNum(base);
  const d = normalizePercent(percent);
  return d > 0 ? Math.round(b * (1 - d / 100)) : b;
};

// یافتن سایز با نام (رشته یا آبجکت دوزبانه)
const findSize = (product, sizeName) => {
  if (!sizeName || !product || !Array.isArray(product.sizes)) return null;
  return (
    product.sizes.find((x) => {
      if (!x || !x.name) return false;
      if (typeof x.name === 'string') return x.name === sizeName;
      return x.name.fa === sizeName || x.name.en === sizeName;
    }) || null
  );
};

/* ------------------------- لایهٔ کمپین (تزریقی) -------------------------
 * رجیستری کمپین خودش را اینجا ثبت می‌کند؛ این فایل هیچ مدلی را require نمی‌کند.
 * اگر رجیستری ثبت نشده باشد (مثلاً در تست)، رفتار دقیقاً مثل قبل می‌ماند.
 */
let campaignProvider = null;
const setCampaignProvider = (fn) => {
  campaignProvider = typeof fn === 'function' ? fn : null;
};

// آیا این هدفِ کمپین شامل این سایز می‌شود؟ (sizes خالی = همهٔ سایزها)
const sizeMatches = (target, size) => {
  if (!target.sizes || target.sizes.length === 0) return true;
  if (!size || !size.name) return false;
  const names =
    typeof size.name === 'string'
      ? [size.name]
      : [size.name.fa, size.name.en].filter(Boolean);
  return names.some((n) => target.sizes.includes(n));
};

const campaignPercentFor = (product, size) => {
  if (!campaignProvider || !product || !product._id) return 0;
  let best = 0;
  for (const t of campaignProvider(product._id) || []) {
    if (!sizeMatches(t, size)) continue;
    const p = normalizePercent(t.percent);
    if (p > best) best = p;
  }
  return best;
};

// حل قیمت برای یک سایز مشخص (یا null = سطح محصول)
const resolveWithSize = (product, size) => {
  const p = product || {};
  const sizePrice = toNum(size && size.price);
  const original = sizePrice > 0 ? sizePrice : toNum(p.price);

  const sizePercent = normalizePercent(size && size.discountPercent);
  const productPercent = normalizePercent(p.discountPercent);
  const catalogPercent = sizePercent > 0 ? sizePercent : productPercent;

  // ⭐ کمپین و کاتالوگ جمع نمی‌شوند؛ تخفیف بزرگ‌تر برنده است
  const campPercent = campaignPercentFor(p, size);
  const percent = Math.max(catalogPercent, campPercent);
  const source =
    percent === 0
      ? 'none'
      : campPercent > 0 && campPercent >= catalogPercent
      ? 'campaign'
      : sizePercent > 0
      ? 'size'
      : 'product';

  const final = applyPercent(original, percent);
  return { original, final, percent, source, hasDiscount: percent > 0 && final < original };
};

/**
 * ⭐ نمای «تخفیف مؤثر» برای پاسخ API عمومی.
 * روی یک کپی کار می‌کند (سندِ کش‌شده هرگز mutate نمی‌شود) تا فرانت
 * بدون دانستن چیزی از کمپین، همان عدد بک‌اند را محاسبه کند.
 * دیتابیس دست‌نخورده می‌ماند.
 */
const withCampaignView = (product) => {
  const p = product;
  if (!p || !p._id || !campaignProvider) return product;
  const targets = campaignProvider(p._id);
  if (!targets || !targets.length) return product;

  const productPercent = normalizePercent(p.discountPercent);
  const newProductPercent = Math.max(productPercent, campaignPercentFor(p, null));

  const sizes = (Array.isArray(p.sizes) ? p.sizes : []).map((s) => {
    const sp = normalizePercent(s && s.discountPercent);
    const catalog = sp > 0 ? sp : productPercent;
    return { ...s, discountPercent: Math.max(catalog, campaignPercentFor(p, s)) };
  });

  return { ...p, discountPercent: newProductPercent, sizes };
};

// قیمت واحد قابل پرداخت برای سایز انتخابی
const resolveUnitPrice = (product, sizeName = null) =>
  resolveWithSize(product, findSize(product, sizeName));

// اطلاعات قیمت برای کارت محصول / کالکشن (ارزان‌ترین سایز)
const getPriceInfo = (product) => {
  const empty = { minPrice: 0, oldPrice: null, hasMultipleSizes: false, hasDiscount: false };
  if (!product) return empty;

  const sizes = (Array.isArray(product.sizes) ? product.sizes : []).filter(
    (s) => s && toNum(s.price) > 0
  );
  const hasMultipleSizes = sizes.length > 1;

  if (sizes.length > 0) {
    let minPrice = Infinity;
    let oldPrice = null;
    for (const s of sizes) {
      const r = resolveWithSize(product, s);
      if (r.final < minPrice) {
        minPrice = r.final;
        oldPrice = r.percent > 0 ? r.original : null;
      }
    }
    const hasDiscount = oldPrice !== null && oldPrice > minPrice;
    return { minPrice, oldPrice: hasDiscount ? oldPrice : null, hasMultipleSizes, hasDiscount };
  }

  const basePrice = toNum(product.price);
  if (basePrice <= 0) return { ...empty, hasMultipleSizes };

  const r = resolveWithSize(product, null);
  let oldPrice = null;
  const op = toNum(product.oldPrice);
  if (op > r.final) oldPrice = op;
  else if (r.percent > 0 && basePrice > r.final) oldPrice = basePrice;

  const hasDiscount = oldPrice !== null && oldPrice > r.final;
  return { minPrice: r.final, oldPrice: hasDiscount ? oldPrice : null, hasMultipleSizes, hasDiscount };
};

module.exports = {
  toNum,
  normalizePercent,
  applyPercent,
  findSize,
  resolveWithSize,
  resolveUnitPrice,
  getPriceInfo,
  setCampaignProvider,
  withCampaignView,
};