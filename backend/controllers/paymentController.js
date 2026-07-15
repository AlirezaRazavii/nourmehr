const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const { initiatePayment, verifyPayment, isZarinpalConfigured } = require('../services/zarinpalService');
const { consumeDiscount } = require('../utils/discountEngine');

const CLIENT_URL = process.env.CLIENT_URL || '';

const NON_PAYABLE_STATUSES = ['cancelled', 'refunded'];

// شروع فرآیند پرداخت (بعد از ثبت سفارش)
const initiateOnlinePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'شناسه سفارش الزامی است' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'این سفارش قبلاً پرداخت شده است' });
    }
    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'این سفارش لغو شده و قابل پرداخت نیست' });
    }

    if (!isZarinpalConfigured()) {
      return res.status(400).json({ success: false, message: 'پرداخت آنلاین در این سرور پیکربندی نشده است' });
    }

    const result = await initiatePayment({
      amount: order.total,
      description: `پرداخت سفارش ${order.orderRef}`,
      orderId: order._id.toString(),
      callbackUrl: process.env.ZARINPAL_CALLBACK_URL,
    });

    if (result.success) {
      let payment = await Payment.findOne({ order: order._id });
      if (!payment) {
        payment = new Payment({
          order: order._id,
          user: order.user,
          amount: order.total,
          method: 'online',
          provider: 'zarinpal',
        });
      }
      payment.authority = result.authority;
      payment.amount = order.total;
      payment.status = 'pending';
      await payment.save();

      return res.json({ success: true, paymentUrl: result.paymentUrl, authority: result.authority });
    }

    return res.status(502).json({ success: false, message: result.message || 'خطا در اتصال به درگاه پرداخت' });
  } catch (error) {
    console.error('[initiateOnlinePayment] error:', error);
    return res.status(500).json({ success: false, message: 'خطا در شروع پرداخت' });
  }
};

// تأیید پرداخت (callback از زرین‌پال)
const verifyOnlinePayment = async (req, res) => {
  const fail = (code) =>
    res.redirect(`${CLIENT_URL}/payment/callback?status=failed&message=${encodeURIComponent(code)}`);
  const ok = (refId, orderRef) =>
    res.redirect(`${CLIENT_URL}/payment/callback?status=success&refId=${encodeURIComponent(refId)}&orderRef=${encodeURIComponent(orderRef)}`);

  try {
    const { Authority, Status } = req.query;

    if (!Authority) return fail('AuthorityNotFound');
    if (Status !== 'OK') return fail('PaymentCanceled');

    const payment = await Payment.findOne({ authority: Authority });
    if (!payment) return fail('PaymentNotFound');

    const order = await Order.findById(payment.order);
    if (!order) return fail('OrderNotFound');

    // idempotent: اگر قبلاً paid شده همان نتیجه موفق را بده
    if (payment.status === 'paid') {
      return ok(payment.refId, order.orderRef);
    }

    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      payment.status = 'failed';
      payment.failureReason = 'OrderCancelled';
      await payment.save();
      return fail('OrderCancelled');
    }

    // قفل اتمیک برای جلوگیری از race condition
    const claimed = await Payment.findOneAndUpdate(
      { authority: Authority, status: { $nin: ['paid', 'processing'] } },
      { status: 'processing' },
      { new: true }
    );
    if (!claimed) {
      const fresh = await Payment.findOne({ authority: Authority });
      if (fresh?.status === 'paid') return ok(fresh.refId, order.orderRef);
      return fail('PaymentProcessing');
    }

    const verification = await verifyPayment({ authority: Authority, amount: order.total });

    if (verification.success) {
      claimed.status = 'paid';
      claimed.refId = verification.refId;
      claimed.paidAt = new Date();
      await claimed.save();

      order.paymentStatus = 'paid';
      order.status = 'confirmed';

      if (order.discountCode && !order.discountConsumed) {
        const consumed = await consumeDiscount(order.discountCode);
        if (consumed) order.discountConsumed = true;
      }

      await order.save();

      // پرداخت موفق: حالا سبد خرید کاربر خالی می‌شود
      try {
        await Cart.deleteOne({ user: order.user });
      } catch (cartErr) {
        console.error('[verifyOnlinePayment] cart delete error:', cartErr.message);
      }

      return ok(verification.refId, order.orderRef);
    }

    claimed.status = 'failed';
    claimed.failureReason = verification.message || 'VerifyFailed';
    await claimed.save();
    return fail('VerifyFailed');
  } catch (error) {
    console.error('[verifyOnlinePayment] error:', error);
    return fail('ServerError');
  }
};

// استعلام وضعیت پرداخت (فقط صاحب پرداخت یا ادمین)
const getPaymentStatus = async (req, res) => {
  try {
    const { authority } = req.params;
    const payment = await Payment.findOne({ authority }).populate('order', 'orderRef');
    if (!payment) return res.status(404).json({ success: false, message: 'پرداخت یافت نشد' });

    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    return res.json({
      success: true,
      status: payment.status,
      refId: payment.refId,
      orderRef: payment.order?.orderRef,
    });
  } catch (error) {
    console.error('[getPaymentStatus] error:', error);
    return res.status(500).json({ success: false, message: 'خطا در دریافت وضعیت پرداخت' });
  }
};

module.exports = { initiateOnlinePayment, verifyOnlinePayment, getPaymentStatus };
