/**
 * کرون بازیابی اسنپ‌پی — الزام پشتیبانی: «Get Payment Status خودکار»
 * اگر مرورگر مشتری بعد از پرداخت بسته شود و callback نرسد، این جاب
 * هر ۱۰ دقیقه پرداخت‌های pending را با getPurchaseStatus چک می‌کند
 * و سفارش‌های پرداخت‌شده را نهایی می‌کند (settle + finalize).
 */
const cron = require('node-cron');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const {
  isSnappPayConfigured, getPurchaseStatus, settlePurchase,
} = require('../services/snappayService');
const { finalizePaidSnappPay } = require('../controllers/snappayPaymentController');

const FAIL_STATES = ['CANCEL', 'CANCELLED', 'CANCELED', 'FAILED', 'EXPIRED', 'REJECTED'];

const recoverSnappayPayments = async () => {
  if (!isSnappPayConfigured()) return;
  try {
    const graceMs = 15 * 60 * 1000;        // حداقل ۱۵ دقیقه از ساخت توکن گذشته باشد
    const horizonMs = 24 * 60 * 60 * 1000;  // فقط ۲۴ ساعت اخیر
    const payments = await Payment.find({
      provider: 'snappay',
      status: 'pending',
      authority: { $exists: true, $ne: '' },
      createdAt: { $gte: new Date(Date.now() - horizonMs), $lte: new Date(Date.now() - graceMs) },
    }).limit(20);

    for (const payment of payments) {
      try {
        const st = await getPurchaseStatus(payment.authority);
        if (!st.success) continue;
        const s = String((st.response && st.response.status) || '').toUpperCase();
        if (!s || s === 'ONGOING' || s === 'PENDING') continue; // هنوز در جریان

        const order = await Order.findById(payment.order);
        if (!order) continue;

        if (s === 'SETTLE' || s === 'VERIFY' || s === 'UPDATED') {
          // قبلاً جای دیگری نهایی شده؟ فقط رکورد را ببند
          if (order.paymentStatus === 'paid') {
            payment.status = 'paid';
            payment.paidAt = payment.paidAt || new Date();
            await payment.save();
            continue;
          }
          if (s === 'VERIFY') await settlePurchase(payment.authority).catch(() => {});
          const refId = (st.response && st.response.transactionId) || '';
          const done = await finalizePaidSnappPay(payment, order, refId);
          if (done) console.log(`[snappay-recovery] نهایی شد | order=${order.orderRef} payment=${payment._id}`);
        } else if (FAIL_STATES.includes(s)) {
          payment.status = 'failed';
          payment.failureReason = 'SnappPayStatus:' + s;
          payment.failedAt = new Date();
          await payment.save();
          console.log(`[snappay-recovery] ناموفق علامت‌گذاری شد | payment=${payment._id} state=${s}`);
        }
      } catch (err) {
        console.error(`[snappay-recovery] خطا در payment=${payment._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[snappay-recovery] error:', err.message);
  }
};

const initSnappayRecovery = () => {
  cron.schedule('*/10 * * * *', recoverSnappayPayments);
  setTimeout(recoverSnappayPayments, 45 * 1000); // یک بار بعد از استارت
  console.log('[snappay-recovery] فعال — هر ۱۰ دقیقه');
};

module.exports = { initSnappayRecovery, recoverSnappayPayments };