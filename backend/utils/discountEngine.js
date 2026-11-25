// backend/utils/discountEngine.js
// ---------------------------------------------------------------------------
// موتور کد تخفیف — نسخه‌ی «محدودیت‌پذیر»
//  • محدودیت به محصولات/دسته‌ها: درصد روی قیمت اصلیِ «اقلام مجاز»،
//    کد تومانی از کل سفارش کم می‌شود با سقفِ جمع اقلام مجاز
//  • محدودیت به روش پرداخت: لیست سفید (خالی = همه مجاز)
//  • minPurchase روی جمع اقلام مجاز سنجیده می‌شود
//  • مصرف اتمیک: ظرفیت کل با $expr + سهم هر کاربر با DiscountClaim
//    (رفع باگ race دو پرداخت همزمان و شکاف validate تا consume)
//  • consumeDiscountForOrder هنگام پرداخت موفق «اعتبارسنجی مجدد کامل»
//    انجام می‌دهد — اگر کد دیگر معتبر نبود مصرف نمی‌شود و دلیلش لاگ می‌شود
// ---------------------------------------------------------------------------
const Discount = require('../models/Discount');
const DiscountClaim = require('../models/DiscountClaim');
const DiscountUsage = require('../models/DiscountUsage');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');

// وضعیت‌هایی که یعنی سفارش معتبر بوده و باید در شمارش استفاده‌ی کاربر حساب شود
const VALID_ORDER_STATUSES = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];

// نام فارسی روش‌های پرداخت — برای پیام‌های خطا
const PAYMENT_METHOD_LABELS = {
  online: 'پرداخت آنلاین',
  cod: 'پرداخت در محل',
  wallet: 'کیف پول',
  torobpay: 'ترب‌پی',
  snappay: 'اسنپ‌پی',
  digipay: 'دیجی‌پی',
};

const err = (statusCode, message) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

/* ------------------------- محدودیت‌ها (خالص) ------------------------- */

// آیا کد محدودیتی دارد؟ (محصول/دسته/درگاه)
const isRestricted = (discount) =>
  !!((discount.products && discount.products.length) ||
     (discount.categories && discount.categories.length) ||
     (discount.allowedPaymentMethods && discount.allowedPaymentMethods.length));

// لیست سفید درگاه‌ها — null یعنی همه مجاز
const getAllowedPaymentMethods = (discount) =>
  (discount.allowedPaymentMethods && discount.allowedPaymentMethods.length
    ? discount.allowedPaymentMethods.map(String)
    : null);

const isPaymentMethodAllowed = (discount, method) => {
  const allowed = getAllowedPaymentMethods(discount);
  return !allowed || !method || allowed.includes(String(method));
};

/**
 * محاسبه اقلام مجاز سبد — تابع خالص (قابل تست بدون دیتابیس)
 * @param {object} discount
 * @param {Array<{productId:string, quantity:number, unitPrice:number,
 *                originalUnitPrice:number, categories:string[]}>} items
 * @returns {{restricted, eligibleItems, eligibleSubtotal, eligibleOriginalSubtotal,
 *            totalCount, eligibleCount}}
 */
function computeEligibility(discount, items) {
  const productSet = new Set((discount.products || []).map(String));
  const categorySet = new Set((discount.categories || []).map(String));
  const hasProductFilter = productSet.size > 0;
  const hasCategoryFilter = categorySet.size > 0;
  const restricted = hasProductFilter || hasCategoryFilter;

  const eligibleItems = [];
  let eligibleSubtotal = 0;
  let eligibleOriginalSubtotal = 0;

  for (const item of (items || [])) {
    const pid = String(item.productId);
    const cats = (item.categories || []).map(String);
    const match = !restricted
      || (hasProductFilter && productSet.has(pid))
      || (hasCategoryFilter && cats.some((c) => categorySet.has(c)));
    if (!match) continue;

    const qty = Number(item.quantity) || 1;
    const payable = Number(item.unitPrice) || 0;
    const original = Number(item.originalUnitPrice != null ? item.originalUnitPrice : item.unitPrice) || 0;
    eligibleItems.push(item);
    eligibleSubtotal += payable * qty;
    eligibleOriginalSubtotal += original * qty;
  }

  return {
    restricted,
    eligibleItems,
    eligibleSubtotal,
    eligibleOriginalSubtotal,
    totalCount: (items || []).length,
    eligibleCount: eligibleItems.length,
  };
}

/**
 * محاسبه مبلغ تخفیف (percent و fixed)
 * @param {number} base - پایه محاسبه درصد (قیمت اصلی اقلام مجاز)
 * @param {number} [cap] - سقف نهایی (جمع قابل پرداخت اقلام مجاز)
 */
function calcDiscountAmount(discount, base, cap) {
  let amount = 0;
  if (discount.type === 'percent') {
    amount = Math.round((base * discount.value) / 100);
  } else if (discount.type === 'fixed') {
    amount = discount.value;
  }
  if (discount.maxDiscount != null && discount.maxDiscount > 0 && amount > discount.maxDiscount) {
    amount = discount.maxDiscount;
  }
  const finalCap = cap != null && Number.isFinite(Number(cap)) ? Number(cap) : base;
  if (amount > finalCap) amount = finalCap;
  return Math.max(0, amount);
}

// نام فارسی دسته‌های کد (برای پیام خطا و نمایش)
async function getCategoryNames(discount) {
  const ids = (discount.categories || []).map(String);
  if (!ids.length) return [];
  try {
    const cats = await Category.find({ _id: { $in: ids } }).select('name').lean();
    return cats
      .map((c) => {
        const n = c.name;
        if (!n) return '';
        return typeof n === 'string' ? n : (n.fa || n.en || '');
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/* ---------------------- اعتبارسنجی کامل (بدون مصرف) ---------------------- */
/**
 * @param {object} p
 * @param {string} p.code
 * @param {Array} p.items - اقلام سبد: {productId, quantity, unitPrice, originalUnitPrice, categories}
 * @param {string|null} p.userId
 * @param {string|null} p.paymentMethod - درگاه انتخابی کاربر (برای چک لیست سفید)
 * @returns {Promise<{discount, amount, eligibility, allowedPaymentMethods, categoryNames}>}
 */
async function validateDiscount({ code, items, userId = null, paymentMethod = null }) {
  if (!code || !String(code).trim()) {
    throw err(400, 'کد تخفیف وارد نشده است');
  }
  const normalized = normalizeCode(code);
  const discount = await Discount.findOne({ code: normalized });
  if (!discount) {
    throw err(404, 'کد تخفیف نامعتبر است');
  }

  const now = new Date();

  if (discount.status !== 'active') {
    throw err(400, 'این کد تخفیف دیگر فعال نیست');
  }
  if (discount.startDate && now < new Date(discount.startDate)) {
    throw err(400, 'زمان استفاده از این کد تخفیف هنوز فرا نرسیده است');
  }
  if (discount.endDate && now > new Date(discount.endDate)) {
    throw err(400, 'مهلت استفاده از این کد تخفیف به پایان رسیده است');
  }
  if (discount.usedCount >= discount.usageLimit) {
    throw err(400, 'ظرفیت استفاده از این کد تخفیف تکمیل شده است');
  }

  // ---------- محدودیت محصول/دسته ----------
  const eligibility = computeEligibility(discount, items);
  if (eligibility.restricted && eligibility.eligibleSubtotal <= 0) {
    const names = await getCategoryNames(discount);
    const target = names.length
      ? `دسته‌های «${names.join('، ')}»`
      : `${(discount.products || []).length} محصولِ منتخب`;
    throw err(400, `این کد تخفیف فقط برای ${target} قابل استفاده است و سبد شما شامل آن‌ها نیست`);
  }

  // ---------- محدودیت روش پرداخت ----------
  if (paymentMethod && !isPaymentMethodAllowed(discount, paymentMethod)) {
    const allowed = getAllowedPaymentMethods(discount) || [];
    const list = allowed.map((m) => PAYMENT_METHOD_LABELS[m] || m).join('، ');
    throw err(400, `این کد تخفیف فقط با روش‌های پرداخت «${list}» قابل استفاده است`);
  }

  // ---------- حداقل خرید — روی جمع اقلام مجاز ----------
  if (discount.minPurchase && eligibility.eligibleSubtotal < discount.minPurchase) {
    const suffix = eligibility.restricted ? ' (از اقلام مجاز این کد)' : '';
    throw err(
      400,
      `حداقل مبلغ خرید${suffix} برای این کد ${Number(discount.minPurchase).toLocaleString('fa-IR')} تومان است`
    );
  }

  // ---------- بررسی‌های وابسته به کاربر (تخمینی برای UX — قفل نهایی در consume) ----------
  if (userId) {
    const userUsedCount = await Order.countDocuments({
      user: userId,
      discountCode: normalized,
      discountConsumed: true,
      status: { $in: VALID_ORDER_STATUSES },
    });
    if (userUsedCount >= discount.perUserLimit) {
      throw err(400, 'شما قبلاً از این کد تخفیف استفاده کرده‌اید');
    }

    if (discount.firstPurchaseOnly) {
      const previousOrders = await Order.countDocuments({
        user: userId,
        status: { $in: VALID_ORDER_STATUSES },
      });
      if (previousOrders > 0) {
        throw err(400, 'این کد تخفیف فقط برای اولین خرید قابل استفاده است');
      }
    }
  }

  // ---------- مبلغ ----------
  const amount = calcDiscountAmount(
    discount,
    eligibility.eligibleOriginalSubtotal,
    eligibility.eligibleSubtotal
  );
  if (amount <= 0) {
    throw err(400, 'این کد تخفیف برای سبد فعلی قابل اعمال نیست');
  }

  return {
    discount,
    amount,
    eligibility,
    allowedPaymentMethods: getAllowedPaymentMethods(discount),
    categoryNames: await getCategoryNames(discount),
  };
}

/* ------------------------------- مصرف اتمیک ------------------------------- */

// افزایش اتمیک شمارنده‌ی هر کاربر — upsert با ایندکس یکتا (رفع race)
async function claimUserSlot(discountId, userId, perUserLimit) {
  const filter = { discount: discountId, user: userId, count: { $lt: perUserLimit } };
  try {
    const r = await DiscountClaim.findOneAndUpdate(
      filter,
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    return !!r;
  } catch (e) {
    // برخورد همزمانی (11000): سند همین حالا ساخته شده — بدون upsert دوباره
    if (e.code === 11000 || /E11000/i.test(String(e.message || ''))) {
      const r = await DiscountClaim.findOneAndUpdate(filter, { $inc: { count: 1 } }, { new: true });
      return !!r;
    }
    throw e;
  }
}

// اقلام سفارش به شکل ورودی موتور (دسته‌ی محصول از دیتابیس تازه خوانده می‌شود)
async function buildOrderEngineItems(order) {
  const productIds = (order.items || []).map((i) => i.product);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select('category').lean()
    : [];
  const catMap = new Map(products.map((p) => [String(p._id), p.category ? [String(p.category)] : []]));

  return (order.items || []).map((item) => ({
    productId: String(item.product),
    quantity: item.quantity,
    unitPrice: item.price,           // قیمت لحظه‌ی ثبت سفارش (قابل پرداخت)
    originalUnitPrice: item.price,   // اسنپ‌شات — برای مصرف کافی است
    categories: catMap.get(String(item.product)) || [],
  }));
}

/**
 * ⭐ مصرف کد تخفیف هنگام پرداخت موفق — با اعتبارسنجی مجدد کامل
 *    (رفع شکاف: کد بین ثبت سفارش تا لحظه پرداخت ممکن است منقضی/پر/محدود شده باشد)
 * @param {object} order - سند سفارش (paymentMethod, items, discountCode, user, ...)
 * @returns {Promise<{success:boolean, skipped?:boolean, reason?:string}>}
 */
async function consumeDiscountForOrder(order) {
  if (!order || !order.discountCode) return { success: true, skipped: true };
  const code = normalizeCode(order.discountCode);
  const discount = await Discount.findOne({ code });
  if (!discount) return { success: false, reason: 'NotFound' };

  const now = new Date();
  if (discount.status !== 'active') return { success: false, reason: 'Inactive' };
  if (discount.startDate && now < new Date(discount.startDate)) return { success: false, reason: 'NotStarted' };
  if (discount.endDate && now > new Date(discount.endDate)) return { success: false, reason: 'Expired' };

  if (!isPaymentMethodAllowed(discount, order.paymentMethod)) {
    return { success: false, reason: 'PaymentMethodNotAllowed' };
  }

  const items = await buildOrderEngineItems(order);
  const eligibility = computeEligibility(discount, items);
  if (eligibility.restricted && eligibility.eligibleSubtotal <= 0) {
    return { success: false, reason: 'NoEligibleItems' };
  }
  if (discount.minPurchase && eligibility.eligibleSubtotal < discount.minPurchase) {
    return { success: false, reason: 'MinPurchaseNotMet' };
  }

  // ——— ۱) ظرفیت کل (اتمیک) ———
  const updated = await Discount.findOneAndUpdate(
    { _id: discount._id, status: 'active', $expr: { $lt: ['$usedCount', '$usageLimit'] } },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  if (!updated) return { success: false, reason: 'CapacityFull' };

  // ——— ۲) سهم کاربر (اتمیک) ———
  const userId = order.user || null;
  if (userId) {
    let claimed = false;
    try {
      claimed = await claimUserSlot(discount._id, userId, discount.perUserLimit);
    } catch (e) {
      console.error('[discount] claimUserSlot error:', e.message);
      claimed = false;
    }
    if (!claimed) {
      // ظرفیت را برگردان — سهم کاربر پر بود
      await Discount.updateOne({ _id: discount._id, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
      return { success: false, reason: 'PerUserLimitReached' };
    }
  }

  // ——— ۳) رکورد حسابرسی ———
  try {
    await DiscountUsage.create({
      discount: discount._id,
      code,
      user: userId || undefined,
      order: order._id,
      amount: order.discountAmount || 0,
    });
  } catch (e) {
    // یکتایی (discount, order) — رکورد از قبل هست؛ درست همان رفتار idempotent
  }

  // ——— ۴) انقضای خودکار پس از تکمیل ظرفیت ———
  if (updated.usedCount >= updated.usageLimit) {
    await Discount.updateOne(
      { _id: updated._id, usedCount: { $gte: updated.usageLimit }, status: 'active' },
      { $set: { status: 'expired' } }
    );
  }

  return { success: true };
}

/* ------------------------------- بازگرداندن مصرف ------------------------------- */
/**
 * بازگرداندن مصرف کد — هنگام کنسل/عودت سفارش
 * (ظرفیت + سهم کاربر + رکورد حسابرسی، هر سه برمی‌گردند)
 * @param {object} order - سند سفارش
 */
async function rollbackDiscountForOrder(order) {
  if (!order || !order.discountCode) return { success: true, skipped: true };
  const code = normalizeCode(order.discountCode);
  const discount = await Discount.findOne({ code });
  if (!discount) return { success: false };

  const updated = await Discount.findOneAndUpdate(
    { _id: discount._id, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { new: true }
  );
  if (!updated) {
    // مصرفی روی این کد نبوده — فقط رکورد حسابرسی احتمالی را پاک کن
    if (order._id) await DiscountUsage.deleteOne({ order: order._id }).catch(() => {});
    return { success: false };
  }

  // اگر فقط به‌خاطر تکمیل ظرفیت expired شده بود و هنوز در بازه است → فعال شود
  const now = new Date();
  if (
    updated.status === 'expired' &&
    updated.usedCount < updated.usageLimit &&
    (!updated.endDate || now <= new Date(updated.endDate)) &&
    (!updated.startDate || now >= new Date(updated.startDate))
  ) {
    await Discount.updateOne({ _id: updated._id }, { $set: { status: 'active' } });
  }

  // سهم کاربر
  if (order.user) {
    await DiscountClaim.updateOne(
      { discount: discount._id, user: order.user, count: { $gt: 0 } },
      { $inc: { count: -1 } }
    ).catch(() => {});
  }

  // رکورد حسابرسی
  if (order._id) {
    await DiscountUsage.deleteOne({ order: order._id }).catch(() => {});
  }

  return { success: true };
}

module.exports = {
  // خالص (قابل تست)
  calcDiscountAmount,
  computeEligibility,
  isRestricted,
  getAllowedPaymentMethods,
  isPaymentMethodAllowed,
  // ثابت‌ها
  PAYMENT_METHOD_LABELS,
  VALID_ORDER_STATUSES,
  // اصلی
  validateDiscount,
  consumeDiscountForOrder,
  rollbackDiscountForOrder,
};
