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
const { consumeDiscountForOrder } = require('../utils/discountEngine');
const { getClientUrl } = require('../utils/urlHelper');
const {
  isSnappPayConfigured, toRial, isAmountInRange,
  checkEligibility, createPurchaseToken, verifyPurchase, settlePurchase,
  revertPurchase, getPurchaseStatus,
} = require('../services/snappayService');
const { sendAdminOrderSms } = require('../services/smsService');

const NON_PAYABLE_STATUSES = ['cancelled', 'refunded'];

/* ------------------------------- کمک‌تابع‌ها ------------------------------- */
const extractName = (n) => {
  if (!n) return '';
  if (typeof n === 'string') return n;
  return (n && (n.fa || n.en)) || '';
};

// ⭐ مستند اسنپ‌پی: cartId و id باید «عدد» باشند (نمونه: "cartId": 0)
// از ۱۲ کاراکتر اول ObjectId عدد یکتا می‌سازیم (در بازه Long جا می‌شود)
const numericId = (objectId) => {
  const hex = String(objectId || '').substring(0, 12);
  const n = parseInt(hex, 16);
  return Number.isFinite(n) && n > 0 ? n : Date.now();
};

// ⭐ کد خطای 1005: موبایل باید الگوی +98XXXXXXXXXX داشته باشد
// "09132249808" → "+989132249808"
const toSnappMobile = (mobile) => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('98') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11) return '+98' + digits.slice(1);
  if (digits.length === 10) return '+98' + digits;
  return '+' + digits;
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
    id: numericId(item.product), // ⭐ عددی — اسنپ‌پی رشته قبول نمی‌کند
    name: extractName(item.name) || ('کالا ' + (idx + 1)),
    count: item.quantity,
    amount: toRial(item.price),
    category: categoryNames.get(String(item.product)) || 'عمومی',
    commissionType: 100, // ⭐ پیش‌فرض رسمی مستند = 100 (عدد)
  }));

  return [{
    cartId: numericId(order._id), // ⭐ عددی
    totalAmount: toRial(order.subtotal + order.shippingCost), // فرمول مستند: اقلام + ارسال + مالیات
    taxAmount: 0,
    shippingAmount: toRial(order.shippingCost), // پس‌کرایه = صفر (چون موقع تحویل پرداخت می‌شود)
    isTaxIncluded: true,
    isShipmentIncluded: true,
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
  // ⭐ توکن پرداخت — پشتیبانی اسنپ‌پی برای پیگیری درخواست می‌خواهد
  if (payment.authority) order.paymentToken = String(payment.authority);

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
  sendAdminOrderSms(order._id);

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
      // ⭐ کد خطای 1005: موبایل باید +98XXXXXXXXXX باشد
      mobile: toSnappMobile((order.shippingInfo && order.shippingInfo.phone) || (user && user.phone)),
      // ⚠️ forcedPaymentMethodTypes حذف شد — طبق مستند اختیاری است + نیاز به فعالسازی تیم دارد
      // (مقدار ONLINE_CREDIT مال ترب‌پی بود! معتبر در اسنپ‌پی: POSTPAID / INSTALLMENT / FINANCING)
      returnURL: returnUrl,
      // ⭐ الزام پشتیبانی: حداکثر ۲۰ کاراکتر — ۱۸ کاراکتر آخر ObjectId + پیشوند NM
      transactionId: 'NM' + String(payment._id).slice(-18),
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
    // ⭐ شناسه کوتاه ۲۰ کاراکتری برای یافتن پرداخت در callback
    payment.txnShort = payload.transactionId;
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

    // یافتن پرداخت: اول شناسه کوتاه ۲۰ کاراکتری ذخیره‌شده، بعد فرمت قدیمی NM+ObjectId
    let payment = null;
    if (transactionId) {
      payment = await Payment.findOne({ txnShort: transactionId }).catch(() => null);
    }
    if (!payment) {
      const paymentId = transactionId.startsWith('NM') ? transactionId.slice(2) : transactionId;
      if (!paymentId || !mongoose.isValidObjectId(paymentId)) return fail('InvalidCallback');
      payment = await Payment.findById(paymentId);
    }
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
    //    timeout هر دو ۴۵ ثانیه است (الزام پشتیبانی: ۳۰ ثانیه تا ۱ دقیقه)
    const verifyRes = await verifyPurchase(payment.authority);
    if (!verifyRes.success) {
      // ⭐ الزام مستند ۱۹-۲۱: وریفای خطا داد/timeout خورد → سرویس Status کال شود
      const st = await getPurchaseStatus(payment.authority);
      const s = st.success ? String((st.response && st.response.status) || '').toUpperCase() : '';

      // Status = SETTLE/UPDATED → سمت اسنپ‌پی نهایی شده؛ سفارش موفق فرض شود
      if (s === 'SETTLE' || s === 'UPDATED') {
        const refId = (st.response && st.response.transactionId) || transactionId;
        await finalizePaidSnappPay(payment, order, refId);
        return ok(refId, order.orderRef);
      }

      // Status = VERIFY → طبق مستند: سفارش را ستل کن
      if (s === 'VERIFY') {
        const settleAfterStatus = await settlePurchase(payment.authority);
        if (settleAfterStatus.success) {
          const refId = (st.response && st.response.transactionId) || transactionId;
          await finalizePaidSnappPay(payment, order, refId);
          return ok(refId, order.orderRef);
        }
        // ستل هم شکست خورد → موفق فرض نشود؛ کرون بازیابی (هر ۵ دقیقه) با Status پیگیری می‌کند
        payment.failureReason = 'SettleFailedAfterVerifyStatus';
        await payment.save();
        console.error('[snappay][callback] settle پس از Status(VERIFY) ناموفق — کرون پیگیری می‌کند: payment=' + payment._id);
        return fail('SettleFailed');
      }

      // ⭐ Status = PENDING → دوباره verify بزن (مستند ۱۹-۲۱)
      if (s === 'PENDING') {
        const retryVerify = await verifyPurchase(payment.authority);
        if (retryVerify.success) {
          const refId = (retryVerify.response && retryVerify.response.transactionId) || transactionId;
          const settleRetry = await settlePurchase(payment.authority);
          if (settleRetry.success) {
            await finalizePaidSnappPay(payment, order, refId);
            return ok(refId, order.orderRef);
          }
          // ستل پس از verify مجدد شکست خورد → دوباره Status (الزام مستند)
          const st3 = await getPurchaseStatus(payment.authority);
          const s3 = st3.success ? String((st3.response && st3.response.status) || '').toUpperCase() : '';
          if (s3 === 'VERIFY') {
            const settleAgain3 = await settlePurchase(payment.authority);
            if (settleAgain3.success) {
              await finalizePaidSnappPay(payment, order, refId);
              return ok(refId, order.orderRef);
            }
          } else if (s3 === 'SETTLE' || s3 === 'UPDATED') {
            await finalizePaidSnappPay(payment, order, refId);
            return ok(refId, order.orderRef);
          }
          payment.failureReason = 'SettleFailedAfterPendingVerify';
          await payment.save();
          console.error('[snappay][callback] settle پس از verify مجدد (PENDING) ناموفق — کرون پیگیری می‌کند: payment=' + payment._id);
          return fail('SettleFailed');
        }
      }

      // وضعیت نامشخص (Status هم جواب نداد / ONGOING / re-verify ناموفق)
      // → payment را failed نکن؛ processing بماند تا کرون بازیابی با Status تکلیفش را روشن کند
      //    (اگر اینجا failed می‌شد، وریفایِ موفقِ سمت اسنپ‌پی برای همیشه گم می‌شد)
      payment.failureReason = ('VerifyUnresolved: ' + (verifyRes.message || 'VerifyFailed')).slice(0, 250);
      await payment.save();
      console.error('[snappay][callback] verify نامشخص — کرون بازیابی پیگیری می‌کند: payment=' + payment._id,
        verifyRes.code, verifyRes.message, '| status:', s || 'N/A');
      return fail('VerifyPending');
    }

    // settle — تأیید نهایی
    // ⭐ الزام مستند: settle خطا داد/جواب نداد → Status کال شود؛
    //    VERIFY → دوباره settle، SETTLE → از قبل موفق؛ در غیر این صورت موفق فرض نشود
    const settleRes = await settlePurchase(payment.authority);
    if (!settleRes.success) {
      console.error('[snappay][callback] settle ناموفق (verify موفق بود): payment=' + payment._id, settleRes.code, settleRes.message);
      const st2 = await getPurchaseStatus(payment.authority);
      const s2 = st2.success ? String((st2.response && st2.response.status) || '').toUpperCase() : '';
      if (s2 === 'VERIFY') {
        const settleAgain = await settlePurchase(payment.authority);
        if (!settleAgain.success) {
          // ستل مجدد هم شکست خورد → سفارش موفق فرض نشود؛ کرون با Status پیگیری می‌کند
          payment.failureReason = 'SettleRetryFailed';
          await payment.save();
          console.error('[snappay][callback] تلاش مجدد settle ناموفق — کرون بازیابی پیگیری می‌کند: payment=' + payment._id);
          return fail('SettleFailed');
        }
        console.log('[snappay][callback] settle در تلاش مجدد موفق شد: payment=' + payment._id);
      } else if (s2 === 'SETTLE' || s2 === 'UPDATED') {
        console.log('[snappay][callback] طبق استعلام، از قبل SETTLE شده: payment=' + payment._id);
      } else {
        payment.failureReason = 'SettleStatusUnresolved: ' + (s2 || 'UNKNOWN');
        await payment.save();
        console.error('[snappay][callback] وضعیت پس از settle ناموفق (' + (s2 || 'نامشخص') + ') — کرون بازیابی پیگیری می‌کند: payment=' + payment._id);
        return fail('SettlePending');
      }
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