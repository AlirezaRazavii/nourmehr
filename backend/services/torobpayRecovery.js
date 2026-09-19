/**
 * cron بازیابی پرداخت‌های اقساطی ترب‌پی
 *
 * نگاشت وضعیت‌ها در status API ترب‌پی:
 *   PENDING ← NEW, IPG, W_FOR_VERIFY  (W_FOR_VERIFY = پرداخت شده، منتظر verify!)
 *   VERIFY  ← W_FOR_SETTLE            (قبلاً verify شده)
 *   SETTLE  ← ONGOING, PAID, UPDATED  (تسویه شده)
 *   REVERT  ← FAILED, CANCELED
 *
 * چون PENDING سه معنی دارد، تنها راه تشخیصِ «پرداخت‌شده ولی verify‌نشده»
 * تلاش برای verify است: اگر سفارش W_FOR_VERIFY باشد موفق می‌شود،
 * وگرنه خطای 1053 (وضعیت نامعتبر) می‌گیریم و صبر می‌کنیم.
 */
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const {
  isTorobPayConfigured,
  verifyPurchase, settlePurchase, revertPurchase, getPurchaseStatus,
} = require('./torobpayService');
const { finalizePaidTorobPay } = require('../controllers/torobpayPaymentController');

const INTERVAL_MS = 5 * 60 * 1000;
const MIN_AGE_MS = 3 * 60 * 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STALE_PENDING_MS = 60 * 60 * 1000;

let running = false;

const markFailed = async (payment, reason) => {
  payment.status = 'failed';
  payment.failureReason = reason;
  payment.failedAt = new Date();
  await payment.save();
};

const recoverOne = async (payment) => {
  const order = await Order.findById(payment.order);
  if (!order) {
    await markFailed(payment, 'OrderMissing');
    return;
  }

  // سفارش با پرداخت دیگری کامل شده → این توکن دیرهنگام است
  if (order.paymentStatus === 'paid' && payment.status !== 'paid') {
    const reverted = await revertPurchase(payment.authority);
    if (reverted.success) {
      payment.status = 'refunded';
      payment.failureReason = 'DuplicatePaymentReverted';
    } else if (reverted.code === 1053) {
      // این توکن هیچ‌وقت پرداخت نشده (تلاش رهاشده) — نیازی به بازپرداخت نیست
      payment.status = 'failed';
      payment.failureReason = 'AbandonedToken';
    } else {
      payment.status = 'failed';
      payment.failureReason = 'DuplicatePaymentNeedsManualRefund';
      console.error('[torobpay][recovery] بازپرداخت دستی لازم: payment=' + payment._id + ' order=' + order._id);
    }
    await payment.save();
    return;
  }

  const st = await getPurchaseStatus(payment.authority);
  if (!st.success) {
    console.warn('[torobpay][recovery] status ناموفق: payment=' + payment._id + ' code=' + st.code + ' ' + st.message);
    return; // خطای موقت — ران بعدی
  }

  const status = st.response && st.response.status;
  const refId = st.response && st.response.transactionId;
  const ageMs = Date.now() - new Date(payment.createdAt).getTime();

  if (status === 'SETTLE') {
    // قبلاً verify و settle شده ولی به‌روزرسانی محلی نمانده (crash)
    await finalizePaidTorobPay(payment, order, refId);
    console.log('[torobpay][recovery] همگام‌سازی سفارش تسویه‌شده: payment=' + payment._id);
    return;
  }

  if (status === 'VERIFY') {
    // W_FOR_SETTLE: verify شده ولی settle نمانده (crash بین verify و settle)
    const s = await settlePurchase(payment.authority);
    if (!s.success) console.error('[torobpay][recovery] settle ناموفق: payment=' + payment._id, s.code, s.message);
    await finalizePaidTorobPay(payment, order, refId);
    console.log('[torobpay][recovery] settle کامل شد: payment=' + payment._id);
    return;
  }

  if (status === 'REVERT') {
    // FAILED/CANCELED سمت ترب‌پی — وجه به کاربر برگشته است
    await markFailed(payment, 'TorobPayReverted');
    console.warn('[torobpay][recovery] سفارش سمت ترب‌پی REVERT شد (وجه برگشته): payment=' + payment._id + ' order=' + order.orderRef);
    return;
  }

  if (status === 'PENDING') {
    // NEW / IPG / W_FOR_VERIFY — با تلاش verify تشخیص می‌دهیم
    const v = await verifyPurchase(payment.authority);
    if (v.success) {
      const s = await settlePurchase(payment.authority);
      if (!s.success) console.error('[torobpay][recovery] settle ناموفق: payment=' + payment._id, s.code, s.message);
      await finalizePaidTorobPay(payment, order, v.response && v.response.transactionId);
      console.log('[torobpay][recovery] پرداخت گم‌شده نجات یافت: payment=' + payment._id + ' order=' + order.orderRef);
      return;
    }
    if (v.code === 1007 || v.code === 1005) {
      // توکن/سفارش سمت ترب‌پی وجود ندارد — شکست قطعی
      await markFailed(payment, 'TokenInvalid:' + v.code);
      return;
    }
    // 1053 = هنوز پرداخت نشده (NEW/IPG) → صبر برای ران بعدی
    if (ageMs > STALE_PENDING_MS) {
      await markFailed(payment, 'PendingTimeout');
    }
    return;
  }
};

const processPendingTorobPayPayments = async () => {
  if (running || !isTorobPayConfigured()) return;
  running = true;
  try {
    const payments = await Payment.find({
      provider: 'torobpay',
      status: { $in: ['pending', 'processing'] },
      authority: { $exists: true, $ne: null },
      createdAt: { $lt: new Date(Date.now() - MIN_AGE_MS), $gt: new Date(Date.now() - MAX_AGE_MS) },
    })
      .sort({ createdAt: 1 })
      .limit(20);

    for (const payment of payments) {
      try {
        await recoverOne(payment);
      } catch (err) {
        console.error('[torobpay][recovery] payment=' + payment._id + ': ' + err.message);
      }
    }
  } catch (err) {
    console.error('[torobpay][recovery] error:', err.message);
  } finally {
    running = false;
  }
};

const startTorobPayRecovery = () => {
  if (!isTorobPayConfigured()) {
    console.log('ℹ️ ترب‌پی پیکربندی نشده؛ cron بازیابی غیرفعال است.');
    return;
  }
  const t = setInterval(() => processPendingTorobPayPayments(), INTERVAL_MS);
  t.unref();
  const t2 = setTimeout(() => processPendingTorobPayPayments(), 90000);
  t2.unref();
  console.log('🟢 TorobPay recovery cron فعال شد (هر ۵ دقیقه).');
};

module.exports = { startTorobPayRecovery, processPendingTorobPayPayments };
