/**
 * cron بازیابی پرداخت‌های اقساطی ترب‌پی
 * سناریو: کاربر پرداخت می‌کند اما callback به سایت نمی‌رسد (قطعی، بستن تب و...)
 * سفارش در ترب‌پی W_FOR_VERIFY می‌شود و اگر تا ۱۵ دقیقه verify نشود FAILED می‌شود.
 * این job هر ۵ دقیقه وضعیت را از ترب‌پی می‌پرسد و چرخه verify/settle را کامل می‌کند.
 */
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const {
  isTorobPayConfigured,
  verifyPurchase, settlePurchase, revertPurchase, getPurchaseStatus,
} = require('./torobpayService');
const { finalizePaidTorobPay } = require('../controllers/torobpayPaymentController');

const INTERVAL_MS = 5 * 60 * 1000;        // هر ۵ دقیقه
const MIN_AGE_MS = 3 * 60 * 1000;         // قبل از ۳ دقیقه دست نزن (کاربر شاید در درگاه است)
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STALE_PENDING_MS = 60 * 60 * 1000;  // PENDING بیش از یک ساعت → محلی failed

let running = false;

const recoverOne = async (payment) => {
  const order = await Order.findById(payment.order);
  if (!order) {
    payment.status = 'failed';
    payment.failureReason = 'OrderMissing';
    await payment.save();
    return;
  }

  // سفارش با پرداخت دیگری کامل شده → این پرداخت دیرهنگام است، وجه را برگردان
  if (order.paymentStatus === 'paid' && payment.status !== 'paid') {
    const reverted = await revertPurchase(payment.authority);
    payment.status = reverted.success ? 'refunded' : 'failed';
    payment.failureReason = reverted.success ? 'DuplicatePaymentReverted' : 'DuplicatePaymentNeedsManualRefund';
    await payment.save();
    if (!reverted.success) {
      console.error(`🔴 [torobpay][recovery] بازپرداخت دستی لازم: payment=${payment._id} order=${order._id}`);
    }
    return;
  }

  const st = await getPurchaseStatus(payment.authority);
  if (!st.success) {
    console.warn(`[torobpay][recovery] status ناموفق: payment=${payment._id} code=${st.code} ${st.message}`);
    return; // خطای موقت — ران بعدی
  }

  const status = st.response?.status;
  const refId = st.response?.transactionId;

  if (status === 'VERIFY') {
    // کاربر پرداخته ولی callback نرسیده — نجات در پنجره ۱۵ دقیقه‌ای
    const v = await verifyPurchase(payment.authority);
    if (v.success) {
      const s = await settlePurchase(payment.authority);
      if (!s.success) console.error(`[torobpay][recovery] ⚠️ settle ناموفق: payment=${payment._id}`, s.code, s.message);
      await finalizePaidTorobPay(payment, order, v.response?.transactionId);
      console.log(`🟢 [torobpay][recovery] پرداخت گم‌شده نجات یافت: payment=${payment._id} order=${order.orderRef}`);
    } else if (v.code !== 1053) {
      console.warn(`[torobpay][recovery] verify ناموفق: payment=${payment._id} code=${v.code} ${v.message}`);
    }
    return;
  }

  if (status === 'SETTLE') {
    // قبلاً verify/settle شده ولی به‌روزرسانی محلی نمانده (crash بین verify و save)
    await finalizePaidTorobPay(payment, order, refId);
    return;
  }

  if (status === 'REVERT') {
    payment.status = 'failed';
    payment.failureReason = 'TorobPayReverted';
    payment.failedAt = new Date();
    await payment.save();
    // سفارش pending می‌ماند تا کاربر دوباره تلاش کند
    return;
  }

  if (status === 'PENDING' && Date.now() - new Date(payment.createdAt).getTime() > STALE_PENDING_MS) {
    payment.status = 'failed';
    payment.failureReason = 'PendingTimeout';
    payment.failedAt = new Date();
    await payment.save();
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
        console.error(`[torobpay][recovery] payment=${payment._id}:`, err.message);
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
  setTimeout(() => processPendingTorobPayPayments(), 90_000).unref();
  console.log('🟢 TorobPay recovery cron فعال شد (هر ۵ دقیقه).');
};

module.exports = { startTorobPayRecovery, processPendingTorobPayPayments };