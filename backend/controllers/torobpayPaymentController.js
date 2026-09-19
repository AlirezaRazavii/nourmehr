/**
 * کنترلر پرداخت اقساطی ترب‌پی
 * جریان: eligible → createOrder(torobpay) → initiate → صفحه پرداخت ترب‌پی
 *        → callback(verify+settle) → ریدایرکت به فرانت + cron بازیابی
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');
const { consumeDiscount } = require('../utils/discountEngine');
const { getClientUrl } = require('../utils/urlHelper');
const {
  isTorobPayConfigured, toRial, isAmountInRange,
  checkEligibility, createPurchaseToken, verifyPurchase, settlePurchase,
  revertPurchase, getPurchaseStatus,
} = require('../services/torobpayService');

const NON_PAYABLE_STATUSES = ['cancelled', 'refunded'];

/* ------------------------------- کمک‌تابع‌ها ------------------------------- */
const extractName = (n) => {
  if (!n) return '';
  if (typeof n === 'string') return n;
  return (n && (n.fa || n.en)) || '';
};

// ساخت cartList طبق مستندات (فقط «یک» سبد قابل ارسال است)
const buildCartList = async (order) => {
  const productIds = order.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('category')
    .populate('category', 'name');
  const categoryNames = new Map(
    products.map((p) => [String(p._id), extractName(p.category && p.category.name) || 'عمومی'])
  );

  const cartItems = order.items.map((item, idx) => ({
    id: String(item.product),
    name: extractName(item.name) || ('کالا ' + (idx + 1)),
    count: item.quantity,
    amount: toRial(item.price),
    category: categoryNames.get(String(item.product)) || 'عمومی',
    commissionType: 0,
  }));

  return [{
    cartId: String(order._id),
    totalAmount: toRial(order.subtotal),
    taxAmount: 0,
    shippingAmount: toRial(order.shippingCost),
    isTaxIncluded: false,
    isShipmentIncluded: false,
    cartItems: cartItems,
  }];
};

/* -------- نهایی‌سازی موفق (مشترک بین callback و cron بازیابی) -------- */
const finalizePaidTorobPay = async (payment, order, refId) => {
  payment.status = 'paid';
  if (refId) payment.refId = String(refId);
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  order.paymentStatus = 'paid';
  order.status = 'confirmed';
  if (refId) order.paymentRefId = String(refId);

  if (order.discountCode && !order.discountConsumed) {
    const consumed = await consumeDiscount(order.discountCode);
    if (consumed) order.discountConsumed = true;
  }
  await order.save();

  // سبد خرید پس از پرداخت موفق خالی می‌شود
  try {
    await Cart.deleteOne({ user: order.user });
  } catch (err) {
    console.error('[torobpay] cart delete error:', err.message);
  }
};

/* ------------------------------- eligible ------------------------------- */
const getTorobPayEligibility = async (req, res) => {
  try {
    if (!isTorobPayConfigured()) return res.json({ success: true, eligible: false });

    const amount = Number(req.query.amount); // تومان
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'مبلغ نامعتبر است' });
    }

    const result = await checkEligibility(amount);
    if (!result.success) {
      console.error('[torobpay][eligible]', result.code, result.message);
      return res.json({ success: true, eligible: false });
    }
    return res.json({
      success: true,
      eligible: result.eligible,
      title: result.title,
      description: result.description,
    });
  } catch (error) {
    console.error('[torobpay][eligible] error:', error.message);
    return res.json({ success: true, eligible: false });
  }
};

/* ------------------------------- initiate ------------------------------- */
const initiateTorobPayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'شناسه سفارش الزامی است' });
    }
    if (!isTorobPayConfigured()) {
      return res.status(400).json({ success: false, message: 'پرداخت اقساطی در این سرور پیکربندی نشده است' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    if (order.paymentMethod !== 'torobpay') {
      return res.status(400).json({ success: false, message: 'این سفارش برای پرداخت اقساطی ثبت نشده است' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'این سفارش قبلاً پرداخت شده است' });
    }
    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'این سفارش لغو شده و قابل پرداخت نیست' });
    }
    if (!isAmountInRange(order.total)) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ این سفارش در بازه مجاز پرداخت اقساطی نیست (۲۰ هزار تا ۱۰۰ میلیون تومان)',
      });
    }

    const user = await User.findById(order.user).select('phone');
    const returnUrl =
      process.env.TOROBPAY_CALLBACK_URL ||
      (getClientUrl(req) + '/api/payments/torobpay/callback');

    let payment = await Payment.findOne({
      order: order._id,
      provider: 'torobpay',
      status: 'pending',
      authority: { $exists: false },
    });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        user: order.user,
        amount: order.total,
        method: 'torobpay',
        provider: 'torobpay',
        status: 'pending',
      });
    }

    const payload = {
      amount: toRial(order.total),
      discountAmount: toRial(order.discountAmount),
      externalSourceAmount: 0,
      mobile: (order.shippingInfo && order.shippingInfo.phone) || (user && user.phone),
      paymentMethodTypeDto: 'ONLINE_CREDIT',
      returnURL: returnUrl,
      transactionId: String(payment._id),
      cartList: await buildCartList(order),
      address: order.shippingInfo && order.shippingInfo.address,
      postalCode: order.shippingInfo && order.shippingInfo.postalCode,
      customer_full_name: order.shippingInfo && order.shippingInfo.fullName,
      city: order.shippingInfo && order.shippingInfo.city,
      province: order.shippingInfo && order.shippingInfo.province,
      registration_phone_number: (user && user.phone) || (order.shippingInfo && order.shippingInfo.phone),
    };

    const result = await createPurchaseToken(payload);
    if (!result.success) {
      console.error('[torobpay][initiate] token error:', result.code, result.message);
      return res.status(502).json({ success: false, message: 'خطا در اتصال به درگاه ترب‌پی', detail: result.message });
    }

    payment.authority = result.response.paymentToken;
    payment.amount = order.total;
    payment.callbackUrl = returnUrl;
    payment.status = 'pending';
    await payment.save();

    return res.json({
      success: true,
      paymentToken: result.response.paymentToken,
      paymentPageUrl: result.response.paymentPageUrl,
    });
  } catch (error) {
    console.error('[torobpay][initiate] error:', error);
    return res.status(500).json({ success: false, message: 'خطا در شروع پرداخت اقساطی' });
  }
};

/* ------------------------------- callback ------------------------------- */
// ترب‌پی کاربر را با POST (form-urlencoded) برمی‌گرداند:
//   transactionId=<paymentId>&state=OK|FAILED&amount=<rial>
const torobPayCallback = async (req, res) => {
  const baseUrl = getClientUrl(req);
  const front = (params) =>
    baseUrl + '/payment/callback?provider=torobpay&' + new URLSearchParams(params).toString();
  const fail = (code) => res.redirect(303, front({ status: 'failed', message: code }));
  const ok = (refId, orderRef) =>
    res.redirect(303, front({ status: 'success', refId: refId || '', orderRef: orderRef || '' }));

  try {
    const transactionId = String((req.body && req.body.transactionId) || '').trim();
    const state = String((req.body && req.body.state) || '').trim();

    if (!transactionId || !mongoose.isValidObjectId(transactionId)) return fail('InvalidCallback');
    const payment = await Payment.findById(transactionId);
    if (!payment || payment.provider !== 'torobpay') return fail('PaymentNotFound');

    const order = await Order.findById(payment.order);
    if (!order) return fail('OrderNotFound');

    // idempotent — اگر قبلاً پرداخت شده همان نتیجه موفق را بده
    if (payment.status === 'paid') return ok(payment.refId, order.orderRef);

    if (state !== 'OK') {
      payment.status = 'failed';
      payment.failureReason = 'TorobPayState:' + (state || 'EMPTY');
      payment.failedAt = new Date();
      await payment.save();
      return fail('PaymentCanceled');
    }

    // بررسی مبلغ (ریال) — در صورت اختلاف، استعلام status ترب‌پی مرجع نهایی است
    const expectedRial = toRial(payment.amount);
    const callbackAmount = Number(req.body && req.body.amount);
    if (Number.isFinite(callbackAmount) && callbackAmount > 0 && callbackAmount !== expectedRial) {
      console.error('[torobpay][callback] amount mismatch: got=' + callbackAmount + ' expected=' + expectedRial + ' payment=' + payment._id);
      const st = await getPurchaseStatus(payment.authority);
      const statusAmount = st.success ? Number(st.response && st.response.amount) : NaN;
      if (!st.success || statusAmount !== expectedRial) {
        payment.status = 'failed';
        payment.failureReason = 'AmountMismatch';
        payment.failedAt = new Date();
        await payment.save();
        return fail('AmountMismatch');
      }
    }

    // اگر سفارش قبلاً با پرداخت دیگری کامل شده → وجه این توکن را برگردان
    if (order.paymentStatus === 'paid') {
      const reverted = await revertPurchase(payment.authority);
      payment.status = reverted.success ? 'refunded' : 'failed';
      payment.failureReason = reverted.success ? 'DuplicatePaymentReverted' : 'DuplicatePaymentNeedsManualRefund';
      await payment.save();
      if (!reverted.success) {
        console.error('[torobpay] پرداخت تکراری نیازمند بازپرداخت دستی: payment=' + payment._id + ' order=' + order._id);
      }
      return ok(order.paymentRefId, order.orderRef);
    }

    // قفل اتمیک برای جلوگیری از race condition
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $nin: ['paid', 'processing'] } },
      { status: 'processing' },
      { new: true }
    );
    if (!claimed) return fail('PaymentProcessing');

    // verify: W_FOR_VERIFY → W_FOR_SETTLE
    const verifyRes = await verifyPurchase(payment.authority);
    if (!verifyRes.success) {
      // شاید callback قبلی میان verify و save قطع شده باشد → با status چک کن
      if (verifyRes.code === 1053) {
        const st = await getPurchaseStatus(payment.authority);
        const stStatus = st.success && st.response && st.response.status;
        if (stStatus === 'SETTLE' || stStatus === 'VERIFY') {
          if (stStatus === 'VERIFY') await settlePurchase(payment.authority);
          await finalizePaidTorobPay(payment, order, st.response.transactionId);
          return ok(st.response.transactionId, order.orderRef);
        }
      }
      payment.status = 'failed';
      payment.failureReason = verifyRes.message || 'VerifyFailed';
      payment.failedAt = new Date();
      await payment.save();
      return fail('VerifyFailed');
    }

    // settle: W_FOR_SETTLE → ONGOING (تأیید نهایی)
    const settleRes = await settlePurchase(payment.authority);
    if (!settleRes.success) {
      // verify موفق بوده یعنی پول گرفته شده؛ settle خودکار هم پس از ۱۰ دقیقه انجام می‌شود
      console.error('[torobpay][callback] settle ناموفق (verify موفق بود): payment=' + payment._id, settleRes.code, settleRes.message);
    }

    await finalizePaidTorobPay(payment, order, verifyRes.response && verifyRes.response.transactionId);
    return ok(verifyRes.response && verifyRes.response.transactionId, order.orderRef);
  } catch (error) {
    console.error('[torobpay][callback] error:', error);
    return fail('ServerError');
  }
};

module.exports = {
  getTorobPayEligibility,
  initiateTorobPayPayment,
  torobPayCallback,
  finalizePaidTorobPay,
};
