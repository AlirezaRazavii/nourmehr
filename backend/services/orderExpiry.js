/**
 * لغو خودکار سفارش‌های پرداخت‌نشده قدیمی
 * (مهلت: ۲۴ ساعت از آخرین تغییر سفارش)
 * موجودی رزروشده آزاد و تخفیف مصرف‌شده (در صورت وجود) برگردانده می‌شود.
 */
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const { rollbackDiscount } = require('../utils/discountEngine');

const EXPIRY_HOURS = 24;
const BATCH_LIMIT = 100;

const cancelExpiredUnpaidOrders = async () => {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);

    const expired = await Order.find({
      status: 'pending',
      paymentStatus: { $in: ['pending', 'failed'] },
      updatedAt: { $lt: cutoff },
    })
      .sort({ updatedAt: 1 })
      .limit(BATCH_LIMIT);

    let cancelled = 0;
    for (const order of expired) {
      // اگر پرداختی همین الان در حال تأیید است (کاربر داخل درگاه)، این دور ردش کن
      const processing = await Payment.exists({ order: order._id, status: 'processing' });
      if (processing) continue;

      order.status = 'cancelled';
      if (order.discountCode && order.discountConsumed) {
        await rollbackDiscount(order.discountCode);
        order.discountConsumed = false;
      }
      await order.save();

      // آزادسازی موجودی رزروشده
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }

      cancelled++;
      console.log(`[orderExpiry] سفارش ${order.orderRef} (پرداخت‌نشده +${EXPIRY_HOURS} ساعت) لغو و موجودی آزاد شد`);
    }

    if (cancelled > 0) console.log(`[orderExpiry] ${cancelled} سفارش پرداخت‌نشده منقضی شد`);
    return cancelled;
  } catch (err) {
    console.error('[orderExpiry] error:', err.message);
    return 0;
  }
};

const startOrderExpiryCron = () => {
  // ۱۵ ثانیه بعد از بالا آمدن، یک‌بار اجرا کن (پاکسازی سفارش‌های قدیمیِ مانده)
  const t = setTimeout(() => cancelExpiredUnpaidOrders(), 15_000);
  if (typeof t.unref === 'function') t.unref();

  const timer = setInterval(() => {
    cancelExpiredUnpaidOrders();
  }, 30 * 60_000);
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`🟢 Order expiry cron فعال شد (هر ۳۰ دقیقه — مهلت پرداخت: ${EXPIRY_HOURS} ساعت)`);
};

module.exports = { cancelExpiredUnpaidOrders, startOrderExpiryCron };