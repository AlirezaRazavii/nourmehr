/**
 * کنترلر پرداخت دیجی‌پی (DigiPay UPG)
 * جریان: initiate (تیکت خرید) → صفحه پرداخت دیجی‌پی (کیف پول/اعتبار/BNPL)
 *        → callback (تطبیق سفارش + Verify فوری + تحویل خودکار برای پرداخت اعتباری)
 *        → ریدایرکت به فرانت
 *
 * نکته حیاتی مستندات: اگر Verify تا ۳ دقیقه پس از پرداخت موفق انجام نشود،
 * تراکنش Auto Reverse می‌شود و مبلغ خودکار به کاربر برمی‌گردد.
 * همین ویژگی برای «سفارش لغوشده/تکراری» هم بازگشت وجه را تضمین می‌کند:
 * کافی است Verify نکنیم تا مبلغ خودکار برگردد.
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');
const { consumeDiscountForOrder } = require('../utils/discountEngine');
const { getClientUrl } = require('../utils/urlHelper');
const { sendAdminOrderSms } = require('../services/smsService');
const {
  isDigipayConfigured, toRial, isDeliveryRequired, PURCHASE_TYPE,
  createTicket, verifyPurchase, deliverPurchase,
} = require('../services/digipayService');

const NON_PAYABLE_STATUSES = ['cancelled', 'refunded'];

/* ------------------------------- کمک‌تابع‌ها ------------------------------- */
const extractName = (n) => {
  if (!n) return '';
  if (typeof n === 'string') return n;
  return (n && (n.fa || n.en)) || '';
};

// ⭐ مستند دیجی‌پی: cellNumber باید دقیقاً با فرمت 09xxxxxxxxx ارسال شود
const toDigipayMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('98') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.startsWith('0098') && digits.length === 13) return '0' + digits.slice(4);
  if (digits.length === 10 && !digits.startsWith('0')) return '0' + digits;
  return digits;
};

// جزییات سبد خرید (basketDetailsDto) — برای پرداخت‌های Credit و BNPL لازم است؛
// چون نوع پرداخت را کاربر در صفحه دیجی‌پی انتخاب می‌کند، همیشه ارسال می‌شود
const buildBasketDetails = async (order, basketId) => {
  const productIds = order.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('category')
    .populate('category', 'name');
  const categoryNames = new Map(
    products.map((p) => [String(p._id), extractName(p.category && p.category.name) || 'نورمهر'])
  );

  return {
    basketId: String(basketId).slice(0, 30), // حداکثر ۳۰ کاراکتر (جدول ۷)
    items: order.items.map((item) => ({
      productCode: String(item.product),
      brand: categoryNames.get(String(item.product)) || 'نورمهر',
      productType: 1, // بادوام — صنایع دستی (جدول ۹: ۱ = بادوام)
      count: item.quantity,
    })),
  };
};

/* -------- نهایی‌سازی موفق (پرداخت + در صورت نیاز تحویل خودکار) -------- */
const finalizePaidDigipay = async (payment, order, trackingCode, purchaseType, deliveryDone) => {
  payment.status = 'paid';
  payment.refId = String(trackingCode);
  // ⭐ نوع واقعی خرید از Callback — برای Verify/Delivery/Refund لازم است
  payment.purchaseType = Number(purchaseType);
  if (deliveryDone === false) payment.failureReason = 'DeliveryPending';
  payment.paidAt = payment.paidAt || new Date();
  await payment.save();

  order.paymentStatus = 'paid';
  order.status = 'confirmed';
  // ⭐ کد پیگیری دیجی‌پی — قابل جستجو در پنل ادمین (مثل اسنپ‌پی)
  order.paymentRefId = String(trackingCode);
  // ⭐ پشتیبانی دیجی‌پی برای پیگیری، trackingCode می‌خواهد
  order.paymentToken = String(trackingCode);

  if (order.discountCode && !order.discountConsumed) {
    // ⭐ اعتبارسنجی مجدد کامل (درگاه/اقلام/سهم کاربر/ظرفیت) بعد از پرداخت موفق
    const r = await consumeDiscountForOrder(order);
    if (r.success) {
      order.discountConsumed = true;
    } else {
      console.error('[discount] مصرف کد تخفیف ناموفق (پس از پرداخت موفق): order=' + order._id + ' code=' + order.discountCode + ' reason=' + (r.reason || 'unknown'));
    }
  }
  await order.save();

  // ⭐ پیامک اطلاع‌رسانی سفارش تاییدشده به ادمین‌ها (fire-and-forget)
  //    مثل اسنپ‌پی/ترب/درگاه اصلی — خطای پیامک هرگز جریان پرداخت را متوقف نمی‌کند
  sendAdminOrderSms(order._id);

  // پرداخت موفقِ نهایی‌شده: سبد خرید خالی شود
  try {
    await Cart.deleteOne({ user: order.user });
  } catch (err) {
    console.error('[digipay] cart delete error:', err.message);
  }
  return true;
};

/* --------------------------- available (برای فرانت) --------------------------- */
// فرانت با این می‌فهمد دکمه دیجی‌پی را نشان بدهد یا نه
const getDigipayAvailability = async (req, res) => {
  return res.json({ success: true, available: isDigipayConfigured() });
};

/* ------------------------------- initiate ------------------------------- */
const initiateDigipayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'شناسه سفارش الزامی است' });
    }
    if (!isDigipayConfigured()) {
      return res.status(400).json({ success: false, message: 'درگاه دیجی‌پی پیکربندی نشده است' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }
    if (order.paymentMethod !== 'digipay') {
      return res.status(400).json({ success: false, message: 'این سفارش برای پرداخت با دیجی‌پی ثبت نشده است' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'این سفارش قبلاً پرداخت شده است' });
    }
    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'این سفارش لغو شده و قابل پرداخت نیست' });
    }

    const user = await User.findById(order.user).select('phone').catch(() => null);
    const cellNumber = toDigipayMobile(
      (order.shippingInfo && order.shippingInfo.phone) || (user && user.phone)
    );
    if (!/^09\d{9}$/.test(cellNumber)) {
      return res.status(400).json({
        success: false,
        message: 'شماره موبایل معتبر (۰۹xxxxxxxxx) برای پرداخت با دیجی‌پی لازم است',
      });
    }

    const callbackUrl =
      process.env.DIGIPAY_CALLBACK_URL ||
      (getClientUrl(req) + '/api/payments/digipay/callback');

    // پرداخت pending قبلی بدون authority را استفاده مجدد کن (مثل اسنپ‌پی)
    let payment = await Payment.findOne({
      order: order._id,
      provider: 'digipay',
      status: 'pending',
      authority: { $exists: false },
    });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        user: order.user,
        amount: order.total,
        method: 'digipay',
        provider: 'digipay',
        status: 'pending',
      });
      await payment.save(); // برای ساخت providerId یکتا به _id نیاز داریم
    }

    // ⭐ providerId یکتای ما — الزام مستند: حداکثر ۱۰۰ کاراکتر
    const providerId = 'NM' + String(payment._id);

    // payload مطابق جدول ۶ و ۷ مستندات (همه مبالغ ریال)
    const payload = {
      amount: toRial(order.total),
      cellNumber,
      providerId,
      callbackUrl,
      basketDetailsDto: await buildBasketDetails(order, order._id),
    };

    const result = await createTicket(payload);
    if (!result.success || !result.response || !result.response.redirectUrl) {
      console.error('[digipay][initiate] ticket error:', result.code, result.message);
      try { console.error('[digipay][initiate] payload:', JSON.stringify(payload).slice(0, 800)); } catch {}
      return res.status(502).json({
        success: false,
        message: 'خطا در اتصال به درگاه دیجی‌پی',
        detail: result.message,
      });
    }

    payment.authority = providerId; // شناسه ما برای این خرید — در callback تطبیق می‌شود
    payment.callbackUrl = callbackUrl;
    payment.status = 'pending';
    await payment.save();

    return res.json({
      success: true,
      ticket: result.response.ticket,
      paymentPageUrl: result.response.redirectUrl,
    });
  } catch (error) {
    console.error('[digipay][initiate] error:', error);
    return res.status(500).json({ success: false, message: 'خطا در شروع پرداخت دیجی‌پی' });
  }
};

/* ------------------------------- callback ------------------------------- */
// دیجی‌پی نتیجه را معمولاً POST (JSON) به callbackUrl برمی‌گرداند؛
// در انصراف ممکن است GET بدون بدنه باشد — هر دو مدیریت می‌شوند.
const digipayCallback = async (req, res) => {
  const baseUrl = getClientUrl(req);
  const front = (params) =>
    baseUrl + '/payment/callback?provider=digipay&' + new URLSearchParams(params).toString();
  const fail = (code) => res.redirect(303, front({ status: 'failed', message: code }));
  const ok = (refId, orderRef) =>
    res.redirect(303, front({ status: 'success', refId: refId || '', orderRef: orderRef || '' }));

  try {
    const body = req.body || {};
    // شناسه‌ها به‌صورت رشته نگه داشته می‌شوند (دقت اعداد بزرگ در JS — توصیه مستندات)
    const providerId = String(body.providerId || req.query.providerId || '').trim();
    const trackingCode = String(body.trackingCode || req.query.trackingCode || '').trim();
    const resultState = String(body.result || req.query.result || '').trim().toUpperCase();
    const purchaseType = Number(body.type || req.query.type || 0) || PURCHASE_TYPE.WALLET;
    // مبلغ Callback به ریال
    const callbackAmountRial = Number(body.amount || req.query.amount || 0);

    // ⭐ برای دیباگ: کل بدنه callback لاگ می‌شود
    console.log('[digipay][callback] received:', JSON.stringify(body).slice(0, 500));

    // بازگشت خالی پس از انصراف (GET بدون بدنه) — طبق مستندات فیلدها اجباری فرض نشوند
    if (!providerId) {
      return fail('PaymentCanceled');
    }

    // یافتن پرداخت با شناسه providerId که موقع initiate ذخیره کرده‌ایم
    let payment = await Payment.findOne({ authority: providerId, provider: 'digipay' }).catch(() => null);
    if (!payment) {
      // fallback: فرمت NM + ObjectId
      const paymentId = providerId.startsWith('NM') ? providerId.slice(2) : providerId;
      if (!mongoose.isValidObjectId(paymentId)) return fail('InvalidCallback');
      payment = await Payment.findById(paymentId);
      if (payment && payment.provider !== 'digipay') payment = null;
    }
    if (!payment) return fail('PaymentNotFound');

    const order = await Order.findById(payment.order);
    if (!order) return fail('OrderNotFound');

    // idempotent — اگر قبلاً پرداخت شده همان نتیجه موفق را بده
    if (payment.status === 'paid') return ok(payment.refId, order.orderRef);

    // نتیجه ناموفق یا بدون کد پیگیری → شکست/انصراف
    if (resultState === 'FAILURE' || !trackingCode) {
      payment.status = 'failed';
      payment.failureReason = resultState === 'FAILURE'
        ? 'DigipayFailure'
        : 'DigipayCanceledOrEmpty';
      payment.failedAt = new Date();
      await payment.save();
      return fail(resultState === 'FAILURE' ? 'VerifyFailed' : 'PaymentCanceled');
    }

    // ⭐ الزام مستندات (بخش ۹): قبل از Verify، مبلغ و providerId با سفارش تطبیق داده شود
    if (callbackAmountRial > 0 && callbackAmountRial !== toRial(payment.amount)) {
      console.error('[digipay][callback] عدم تطابق مبلغ!',
        'callback(rial)=', callbackAmountRial, 'payment(rial)=', toRial(payment.amount));
      // Verify نمی‌کنیم → بعد از ۳ دقیقه Auto Reverse و مبلغ برمی‌گردد
      payment.status = 'failed';
      payment.failureReason = 'AmountMismatchAutoReversed';
      payment.failedAt = new Date();
      await payment.save();
      return fail('AmountMismatch');
    }

    // اگر سفارش در همین فاصله لغو شده → Verify نکن؛ Auto Reverse خودش پول را برمی‌گرداند
    if (NON_PAYABLE_STATUSES.includes(order.status)) {
      payment.status = 'failed';
      payment.failureReason = 'OrderCancelledAutoReversed';
      payment.failedAt = new Date();
      await payment.save();
      console.error('[digipay][callback] سفارش لغوشده — بدون Verify؛ مبلغ تا ۳ دقیقه دیگر Auto Reverse می‌شود: order=' + order._id);
      return fail('OrderCancelled');
    }

    // اگر سفارش با پرداخت دیگری کامل شده → این پرداخت را Verify نکن (Auto Reverse)
    if (order.paymentStatus === 'paid') {
      payment.status = 'failed';
      payment.failureReason = 'DuplicatePaymentAutoReversed';
      payment.failedAt = new Date();
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

    // ⭐ Verify — بلافاصله (مهلت ۳ دقیقه‌ای Auto Reverse)
    const verifyRes = await verifyPurchase(purchaseType, { trackingCode, providerId });
    if (!verifyRes.success) {
      payment.status = 'failed';
      payment.failureReason = (verifyRes.message || 'VerifyFailed').slice(0, 250);
      payment.failedAt = new Date();
      await payment.save();
      console.error('[digipay][callback] verify ناموفق:', verifyRes.code, verifyRes.message, 'type=' + purchaseType);
      return fail('VerifyFailed');
    }

    // ⭐ تحویل خودکار (انتخاب کارفرما) — فقط برای پرداخت‌های اعتباری CREDIT/BNPL الزامی است
    let deliveryDone = null; // null = لازم نبود
    if (isDeliveryRequired(purchaseType)) {
      const deliveryData = {
        deliveryDate: Date.now(),
        invoiceNumber: String(order.orderRef || order._id),
        trackingCode: String(trackingCode),
        products: order.items.map((it, idx) => extractName(it.name) || ('کالا ' + (idx + 1))),
      };
      const deliverRes = await deliverPurchase(purchaseType, deliveryData);
      if (deliverRes.success) {
        deliveryDone = true;
      } else {
        // Verify موفق بوده؛ تحویل ناموفق فقط لاگ می‌شود تا پرداخت کاربر بی‌نقص بماند
        deliveryDone = false;
        console.error('[digipay][callback] ⚠️ DELIVERY ناموفق (Verify موفق بود) — type=' + purchaseType,
          'code=' + deliverRes.code, deliverRes.message,
          '| trackingCode=' + trackingCode, '| باید در پنل دیجی‌پی پیگیری شود');
      }
    }

    await finalizePaidDigipay(payment, order, trackingCode, purchaseType, deliveryDone);
    return ok(trackingCode, order.orderRef);
  } catch (error) {
    console.error('[digipay][callback] error:', error);
    return fail('ServerError');
  }
};

module.exports = {
  getDigipayAvailability,
  initiateDigipayPayment,
  digipayCallback,
};
