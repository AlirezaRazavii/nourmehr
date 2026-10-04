/**
 * کنترلر پرداخت اقساطی اسنپ‌پی (SnappPay)
 * جریان: eligible → createOrder(snappay) → initiate → صفحه پرداخت اسنپ‌پی
 *        → callback(verify+settle) → ریدایرکت به فرانت + کرون بازیابی (فاز بعد)
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
  isSnappPayConfigured, toRial, isAmountInRange,
  checkEligibility, createPurchaseToken, verifyPurchase, settlePurchase,
  revertPurchase, getPurchaseStatus,
} = require('../services/snappayService');

const NON_PAYABLE_STATUSES = ['cancelled', 'refunded'];

/* ------------------------------- کمک‌تابع‌ها ------------------------------- */
const extractName = (n) => {
  if (!n) return '';
  if (typeof n === 'string') return n;
  return (n && (n.fa || n.en)) || '';
};

// ساخت cartList مطابق مستندات اسنپ‌پی (واحد: ریال)
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
    commissionType: '0', // مطابق Postman اسنپ‌پی: رشته
  }));

  return [{
    cartId: String(order._id),
    totalAmount: toRial(order.subtotal),
    taxAmount: 0,
    shippingAmount: toRial(order.shippingCost), // پس‌کرایه = صفر (چون موقع تحویل پرداخت می‌شود)
    isTaxIncluded: false,
    isShipmentIncluded: false,
    cartItems,
  }];
};

/* -------- نهایی‌سازی موفق (مشترک بین callback و کرون بازیابی) -------- */
const finalizePaidSnappPay = async (payment, order, refId) => {
  // محافظ: سفارش لغو شده → پول برگردد، سفارشِ بدون موجودیِ رزرو تأیید نشود
  if (NON_PAYABLE_STATUSES.includes(order.status)) {
    const reverted = await revertPurchase(payment.authority).catch(() => ({ success: false }));
    payment.status = reverted.success ? 'refunded' : 'failed';
    payment.failureReason = reverted.success ? 'OrderCancelledReverted' : 'OrderCancelledNeedsManualRefund';
    await payment.save();
    console.error('[snappay] finalize روی سفارش لغوشده — برگشت وجه ' +
      (reverted.success ? 'انجام شد' : 'نیازمند بررسی دستی') + ' | payment=' + payment._id);
    return false;
  }

  payment.status = 'paid';
  if (refId) payment.refId = String(refId);
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  order.paymentStatus = 'paid';
  order.status = 'confirmed';
  // ⭐ شناسه تراکنش اسنپ‌پی — الزام ایمیل: قابل جستجو در پنل ادمین
  if (refId) order.paymentRefId = String(refId);

  if (order.discountCode && !order.discountConsumed) {
    const consumed = await consumeDiscount(order.discountCode);
    if (consumed) order.discountConsumed = true;
  }
  await order.save();

  // پرداخت موفقِ نهایی‌شده: سبد خرید خالی شود
  try {
    await Cart.deleteOne({ user: order.user });
  } catch (err) {
    console.error('[snappay] cart delete error:', err.message);
  }
  return true;
};

/* ------------------------------- eligible ------------------------------- */
const getSnappPayEligibility = async (req, res) => {
  try {
    if (!isSnappPayConfigured()) return res.json({ success: true, eligible: false });

    const amount = Number(req.query.amount); // تومان
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'مبلغ نامعتبر است' });
    }

    const result = await checkEligibility(amount);
    if (!result.success) {
      console.error('[snappay][eligible]', result.code, result.message);
      return res.json({ success: true, eligible: false });
    }
    return res.json({
      success: true,
      eligible: result.eligible,
      title: result.title,
      description: result.description,
    });
  } catch (error) {
    console.error('[snappay][eligible] error:', error.message);
    return res.json({ success: true, eligible: false });
  }
};

/* ------------------------------- initiate ------------------------------- */
const initiateSnappPayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'شناسه سفارش الزامی است' });
    }
    if (!isSnappPayConfigured()) {
      return res.status(400).json({ success: false, message: 'پرداخت اقساطی اسنپ‌پی پیکربندی نشده است' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    if (order.paymentMethod !== 'snappay') {
      return res.status(400).json({ success: false, message: 'این سفارش برای پرداخت اسنپ‌پی ثبت نشده است' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'این سفارش قبلاً پرداخت شده است' });
    }
    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'این سفارش لغو شده و قابل پرداخت نیست' });
    }
    if (!isAmountInRange(order.total)) {
      return res.status(400).json({ success: false, message: 'مبلغ این سفارش در بازه مجاز اسنپ‌پی نیست' });
    }

    const user = await User.findById(order.user).select('phone');
    const returnUrl =
      process.env.SNAPPAY_CALLBACK_URL ||
      (getClientUrl(req) + '/api/payments/snappay/callback');

    let payment = await Payment.findOne({
      order: order._id,
      provider: 'snappay',
      status: 'pending',
      authority: { $exists: false },
    });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        user: order.user,
        amount: order.total,
        method: 'snappay',
        provider: 'snappay',
        status: 'pending',
      });
    }

    // ⚠️ ساختار دقیقاً مطابق Postman اسنپ‌پی — فیلد اضافه نفرست (deserializer سخت‌گیر است)
    // فیلدهای آدرسِ ترب‌پی حذف شدند (علت خطای 1005)
    const payload = {
      amount: toRial(order.total),
      cartList: await buildCartList(order),
      discountAmount: toRial(order.discountAmount),
      externalSourceAmount: 0,
      mobile: (order.shippingInfo && order.shippingInfo.phone) || (user && user.phone),
      forcedPaymentMethodTypes: ['ONLINE_CREDIT'], // مانند paymentMethodTypeDto ترب‌پی
      returnURL: returnUrl,
      // ⭐ شناسه مشترک و یونیک ما با اسنپ‌پی (الزام ایمیل — قابل جستجو در ادمین)
      transactionId: String(payment._id),
    };

    const result = await createPurchaseToken(payload);
    if (!result.success) {
      console.error('[snappay][initiate] token error:', result.code, result.message);
      // payload ارسالی را هم لاگ می‌کنیم تا در صورت خطا دقیق مقایسه شود
      try { console.error('[snappay][initiate] payload:', JSON.stringify(payload).slice(0, 800)); } catch {}
      return res.status(502).json({ success: false, message: 'خطا در اتصال به درگاه اسنپ‌پی', detail: result.message });
    }

    const r = result.response || {};
    const paymentToken = r.paymentToken;
    // نام فیلد آدرس صفحه پرداخت را مطمئن نیستیم — چند احتمال را چک می‌کنیم
    const pageUrl = r.paymentPageUrl || r.paymentUrl || r.redirectUrl;

    if (!paymentToken) {
      console.error('[snappay][initiate] پاسخ توکن نامعتبر:', JSON.stringify(r).slice(0, 300));
      return res.status(502).json({ success: false, message: 'پاسخ نامعتبر از اسنپ‌پی', detail: JSON.stringify(r).slice(0, 300) });
    }
    if (!pageUrl) {
      // برای دیباگ: کل کلیدهای پاسخ را لاگ می‌کنیم تا فیلد درست را پیدا کنیم
      console.error('[snappay][initiate] paymentPageUrl پیدا نشد! کلیدهای پاسخ:', Object.keys(r), JSON.stringify(r).slice(0, 300));
    }

    payment.authority = paymentToken;
    payment.amount = order.total;
    payment.callbackUrl = returnUrl;
    payment.status = 'pending';
    await payment.save();

    return res.json({
      success: true,
      paymentToken,
      paymentPageUrl: pageUrl,
    });
  } catch (error) {
    console.error('[snappay][initiate] error:', error);
    return res.status(500).json({ success: false, message: 'خطا در شروع پرداخت اسنپ‌پی' });
  }
};

/* ------------------------------- callback ------------------------------- */
// اسنپ‌پی کاربر را به returnURL برمی‌گرداند (فرمت همان ترب‌پی: transactionId & state)
// برای اطمینان هم body (form POST) و هم query (GET) را می‌خوانیم
const snappPayCallback = async (req, res) => {
  const baseUrl = getClientUrl(req);
  const front = (params) =>
    baseUrl + '/payment/callback?provider=snappay&' + new URLSearchParams(params).toString();
  const fail = (code) => res.redirect(303, front({ status: 'failed', message: code }));
  const ok = (refId, orderRef) =>
    res.redirect(303, front({ status: 'success', refId: refId || '', orderRef: orderRef || '' }));

  try {
    const transactionId = String(
      (req.body && req.body.transactionId) || req.query.transactionId || ''
    ).trim();
    const state = String(
      (req.body && req.body.state) || req.query.state || ''
    ).trim().toUpperCase();

    if (!transactionId || !mongoose.isValidObjectId(transactionId)) return fail('InvalidCallback');
    const payment = await Payment.findById(transactionId);
    if (!payment || payment.provider !== 'snappay') return fail('PaymentNotFound');

    const order = await Order.findById(payment.order);
    if (!order) return fail('OrderNotFound');

    // idempotent — اگر قبلاً پرداخت شده همان نتیجه موفق را بده
    if (payment.status === 'paid') return ok(payment.refId, order.orderRef);

    if (state !== 'OK' && state !== 'SUCCESS') {
      payment.status = 'failed';
      payment.failureReason = 'SnappPayState:' + (state || 'EMPTY');
      payment.failedAt = new Date();
      await payment.save();
      return fail('PaymentCanceled');
    }

    // اگر سفارش در همین فاصله لغو شده → وجه برگردد و سفارش لغو بماند
    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      const reverted = await revertPurchase(payment.authority).catch(() => ({ success: false }));
      payment.status = reverted.success ? 'refunded' : 'failed';
      payment.failureReason = reverted.success ? 'OrderCancelledReverted' : 'OrderCancelledNeedsManualRefund';
      await payment.save();
      if (!reverted.success) {
        console.error('[snappay] پرداختِ سفارش لغوشده نیازمند بازپرداخت دستی: payment=' + payment._id + ' order=' + order._id);
      }
      return fail('OrderCancelled');
    }

    // اگر سفارش با پرداخت دیگری کامل شده → وجه این توکن برگردد
    if (order.paymentStatus === 'paid') {
      const reverted = await revertPurchase(payment.authority).catch(() => ({ success: false }));
      payment.status = reverted.success ? 'refunded' : 'failed';
      payment.failureReason = reverted.success ? 'DuplicatePaymentReverted' : 'DuplicatePaymentNeedsManualRefund';
      await payment.save();
      return ok(order.paymentRefId, order.orderRef);
    }

    // قفل اتمیک برای جلوگیری از race condition
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $nin: ['paid', 'processing'] } },
      { status: 'processing' },
      { new: true }
    );
    if (!claimed) return fail('PaymentProcessing');

    // ⭐ الزام اسنپ‌پی: verify و settle به‌صورت سیستمی فراخوانی می‌شوند
    const verifyRes = await verifyPurchase(payment.authority);
    if (!verifyRes.success) {
      // شاید پرداخت انجام شده ولی callback قبلی ناقص مانده → با status چک کن
      const st = await getPurchaseStatus(payment.authority);
      if (st.success) {
        const stStatus = st.response && st.response.status;
        if (stStatus === 'SETTLE' || stStatus === 'VERIFY' || stStatus === 'ONGOING' || stStatus === 'UPDATED') {
          const refId = (st.response && st.response.transactionId) || transactionId;
          if (stStatus === 'VERIFY') await settlePurchase(payment.authority);
          await finalizePaidSnappPay(payment, order, refId);
          return ok(refId, order.orderRef);
        }
      }
      payment.status = 'failed';
      payment.failureReason = verifyRes.message || 'VerifyFailed';
      payment.failedAt = new Date();
      await payment.save();
      return fail('VerifyFailed');
    }

    // settle — تأیید نهایی
    const settleRes = await settlePurchase(payment.authority);
    if (!settleRes.success) {
      // verify موفق بوده یعنی پول گرفته شده؛ settle خودکار هم پس از چند دقیقه انجام می‌شود
      console.error('[snappay][callback] settle ناموفق (verify موفق بود): payment=' + payment._id, settleRes.code, settleRes.message);
    }

    const refId = (verifyRes.response && verifyRes.response.transactionId) || transactionId;
    await finalizePaidSnappPay(payment, order, refId);
    return ok(refId, order.orderRef);
  } catch (error) {
    console.error('[snappay][callback] error:', error);
    return fail('ServerError');
  }
};

module.exports = {
  getSnappPayEligibility,
  initiateSnappPayPayment,
  snappPayCallback,
  finalizePaidSnappPay,
};