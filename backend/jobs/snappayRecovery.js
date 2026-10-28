/**
 * کرون بازیابی اسنپ‌پی — الزام پشتیبانی: «Get Payment Status خودکار»
 * اگر مرورگر مشتری بعد از پرداخت بسته شود و callback نرسد، این جاب
 * هر ۵ دقیقه پرداخت‌های pending را با status API چک می‌کند و سفارش را نهایی می‌کند.
 * (هم‌سبک torobpayRecovery — بدون وابستگی جدید)
 */
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const {
  isSnappPayConfigured, getPurchaseStatus, settlePurchase, revertPurchase,
} = require('../services/snappayService');
const { finalizePaidSnappPay } = require('../controllers/snappayPaymentController');

const INTERVAL_MS = 5 * 60 * 1000;      // هر ۵ دقیقه
const MIN_AGE_MS = 10 * 60 * 1000;      // حداقل ۱۰ دقیقه از ساخت توکن
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // فقط ۲۴ ساعت اخیر

const FAIL_STATES = ['CANCEL', 'CANCELLED', 'CANCELED', 'FAILED', 'EXPIRED', 'REJECTED'];

let running = false;

const recoverOne = async (payment) => {
  const st = await getPurchaseStatus(payment.authority);
  if (!st.success) {
    console.warn('[snappay][recovery] status ناموفق: payment=' + payment._id + ' code=' + st.code + ' ' + st.message);
    return; // خطای موقت — ران بعدی
  }

  const s = String((st.response && st.response.status) || '').toUpperCase();
  if (!s || s === 'ONGOING' || s === 'PENDING') return; // هنوز در جریان

  const order = await Order.findById(payment.order);
  if (!order) return;

  if (s === 'SETTLE' || s === 'VERIFY' || s === 'UPDATED') {
    // سفارش با پرداخت دیگری کامل شده → این توکن دیرهنگام؛ وجه رفته را برگردان
    if (order.paymentStatus === 'paid' && payment.status !== 'paid') {
      const reverted = await revertPurchase(payment.authority);
      if (reverted.success) {
        payment.status = 'refunded';
        payment.failureReason = 'DuplicatePaymentReverted';
      } else {
        payment.status = 'failed';
        payment.failureReason = 'DuplicatePaymentNeedsManualRefund';
        console.error('[snappay][recovery] بازپرداخت دستی لازم: payment=' + payment._id + ' order=' + order._id);
      }
      await payment.save();
      return;
    }
    if (order.paymentStatus === 'paid') {
      payment.status = 'paid';
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();
      return;
    }
    if (s === 'VERIFY') {
      const set = await settlePurchase(payment.authority);
      if (!set.success) console.error('[snappay][recovery] settle ناموفق: payment=' + payment._id, set.code, set.message);
    }
    const refId = (st.response && st.response.transactionId) || '';
    const done = await finalizePaidSnappPay(payment, order, refId);
    if (done) console.log(`[snappay][recovery] نهایی شد | order=${order.orderRef} payment=${payment._id}`);
    return;
  }

  if (FAIL_STATES.includes(s)) {
    payment.status = 'failed';
    payment.failureReason = 'SnappPayStatus:' + s;
    payment.failedAt = new Date();
    await payment.save();
    console.warn(`[snappay][recovery] پرداخت سمت اسنپ‌پی شکست/لغو شد: payment=${payment._id} state=${s}`);
  }
  // وضعیت‌های ناشناخته → دست نمی‌زنیم؛ ران بعدی چک می‌شود
};

const recoverSnappayPayments = async () => {
  if (running || !isSnappPayConfigured()) return;
  running = true;
  try {
    const payments = await Payment.find({
      provider: 'snappay',
      status: { $in: ['pending', 'processing'] },
      authority: { $exists: true, $ne: '' },
      createdAt: { $gte: new Date(Date.now() - MAX_AGE_MS), $lte: new Date(Date.now() - MIN_AGE_MS) },
    }).sort({ createdAt: 1 }).limit(20);

    for (const payment of payments) {
      try {
        await recoverOne(payment);
      } catch (err) {
        console.error(`[snappay][recovery] خطا در payment=${payment._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[snappay][recovery] error:', err.message);
  } finally {
    running = false;
  }
};

const initSnappayRecovery = () => {
  const t = setInterval(() => recoverSnappayPayments(), INTERVAL_MS);
  t.unref();
  const t2 = setTimeout(recoverSnappayPayments, 90 * 1000);
  t2.unref();
  console.log('🟢 SnappPay recovery cron فعال شد (هر ۵ دقیقه).');
};

module.exports = { initSnappayRecovery, recoverSnappayPayments };