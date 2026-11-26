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

// حل قیمت برای یک سایز مشخص (یا null = سطح محصول)
const resolveWithSize = (product, size) => {
  const p = product || {};
  const sizePrice = toNum(size && size.price);
  const original = sizePrice > 0 ? sizePrice : toNum(p.price);

  const sizePercent = normalizePercent(size && size.discountPercent);
  const productPercent = normalizePercent(p.discountPercent);
  const percent = sizePercent > 0 ? sizePercent : productPercent;
  const source = sizePercent > 0 ? 'size' : productPercent > 0 ? 'product' : 'none';

  const final = applyPercent(original, percent);
  return { original, final, percent, source, hasDiscount: percent > 0 && final < original };
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
};