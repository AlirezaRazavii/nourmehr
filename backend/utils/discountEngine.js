// backend/utils/discountEngine.js
const Discount = require('../models/Discount');
const Order = require('../models/Order');

// وضعیت‌هایی که یعنی سفارش معتبر بوده و باید در شمارش استفاده‌ی کاربر حساب شود
const VALID_ORDER_STATUSES = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];

/**
 * محاسبه مبلغ تخفیف روی کالاها (percent و fixed)
 */
function calcDiscountAmount(discount, subtotal) {
  let amount = 0;

  if (discount.type === 'percent') {
    amount = Math.round((subtotal * discount.value) / 100);
  } else if (discount.type === 'fixed') {
    amount = discount.value;
  }

  if (discount.maxDiscount != null && discount.maxDiscount > 0 && amount > discount.maxDiscount) {
    amount = discount.maxDiscount;
  }
  if (amount > subtotal) amount = subtotal;

  return Math.max(0, amount);
}

/**
 * اعتبارسنجی کامل کد تخفیف (بدون مصرف)
 * @param {string} code
 * @param {number} subtotal
 * @param {string} userId - شناسه کاربر لاگین‌شده (برای محدودیت هر کاربر و اولین خرید)
 * @returns { discount, amount }
 */
async function validateDiscount(code, subtotal, userId = null) {
  if (!code || !String(code).trim()) {
    const err = new Error('کد تخفیف وارد نشده است');
    err.statusCode = 400;
    throw err;
  }

  const normalized = String(code).trim().toUpperCase();
  const discount = await Discount.findOne({ code: normalized });

  if (!discount) {
    const err = new Error('کد تخفیف نامعتبر است');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();

  if (discount.status !== 'active') {
    const err = new Error('این کد تخفیف دیگر فعال نیست');
    err.statusCode = 400;
    throw err;
  }
  if (discount.startDate && now < new Date(discount.startDate)) {
    const err = new Error('زمان استفاده از این کد تخفیف هنوز فرا نرسیده است');
    err.statusCode = 400;
    throw err;
  }
  if (discount.endDate && now > new Date(discount.endDate)) {
    const err = new Error('مهلت استفاده از این کد تخفیف به پایان رسیده است');
    err.statusCode = 400;
    throw err;
  }
  if (discount.usedCount >= discount.usageLimit) {
    const err = new Error('ظرفیت استفاده از این کد تخفیف تکمیل شده است');
    err.statusCode = 400;
    throw err;
  }
  if (discount.minPurchase && subtotal < discount.minPurchase) {
    const err = new Error(
      `حداقل مبلغ خرید برای این کد ${Number(discount.minPurchase).toLocaleString('fa-IR')} تومان است`
    );
    err.statusCode = 400;
    throw err;
  }

  // --- بررسی‌های وابسته به کاربر ---
  if (userId) {
    const userUsedCount = await Order.countDocuments({
      user: userId,
      discountCode: normalized,
      discountConsumed: true,
      status: { $in: VALID_ORDER_STATUSES },
    });
    if (userUsedCount >= discount.perUserLimit) {
      const err = new Error('شما قبلاً از این کد تخفیف استفاده کرده‌اید');
      err.statusCode = 400;
      throw err;
    }

    if (discount.firstPurchaseOnly) {
      const previousOrders = await Order.countDocuments({
        user: userId,
        status: { $in: VALID_ORDER_STATUSES },
      });
      if (previousOrders > 0) {
        const err = new Error('این کد تخفیف فقط برای اولین خرید قابل استفاده است');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const amount = calcDiscountAmount(discount, subtotal);

  if (amount <= 0) {
    const err = new Error('این کد تخفیف برای سبد فعلی قابل اعمال نیست');
    err.statusCode = 400;
    throw err;
  }

  return { discount, amount };
}

/**
 * مصرف اتمیک کد تخفیف — هنگام تأیید/پرداخت سفارش
 */
async function consumeDiscount(code) {
  if (!code) return false;
  const normalized = String(code).trim().toUpperCase();

  const updated = await Discount.findOneAndUpdate(
    {
      code: normalized,
      status: 'active',
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  );

  if (!updated) return false;

  if (updated.usedCount >= updated.usageLimit) {
    updated.status = 'expired';
    await updated.save();
  }
  return true;
}

/**
 * بازگرداندن مصرف کد تخفیف — هنگام کنسل/بازپرداخت
 */
async function rollbackDiscount(code) {
  if (!code) return false;
  const normalized = String(code).trim().toUpperCase();

  const updated = await Discount.findOneAndUpdate(
    { code: normalized, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { new: true }
  );

  if (!updated) return false;

  const now = new Date();
  if (
    updated.status === 'expired' &&
    updated.usedCount < updated.usageLimit &&
    (!updated.endDate || now <= new Date(updated.endDate)) &&
    (!updated.startDate || now >= new Date(updated.startDate))
  ) {
    updated.status = 'active';
    await updated.save();
  }
  return true;
}

module.exports = { calcDiscountAmount, validateDiscount, consumeDiscount, rollbackDiscount };
