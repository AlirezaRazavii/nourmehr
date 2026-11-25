/**
 * ادمین — بازگشت وجه دیجی‌پی (Refund)
 *   POST /admin/orders/:id/digipay/refund → بازپرداخت کامل مبلغ به مشتری
 *
 * ⚠️ طبق مستندات دیجی‌پی:
 *  - HTTP 200 فقط به معنای «ثبت درخواست عودت» است، نه انجام نهایی آن
 *  - نتیجه نهایی از سرویس Refund Inquiry گرفته می‌شود (status: 0 موفق | 1 شکست | 2 در حال پردازش)
 *  - این عملیات غیرقابل بازگشت است — فرانت باید قبل از فراخوانی پاپ‌آپ تأییدیه دو مرحله‌ای نشان دهد
 */
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const Product = require('../../models/Product');
const { rollbackDiscountForOrder } = require('../../utils/discountEngine');
const {
  toRial, refundTypeForPurchase, refundPurchase, refundInquiry,
} = require('../../services/digipayService');

const findPaidDigipay = async (orderId) => {
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return { error: { status: 400, message: 'شناسه سفارش نامعتبر است' } };
  }
  const order = await Order.findById(orderId);
  if (!order) return { error: { status: 404, message: 'سفارش یافت نشد' } };
  if (order.paymentMethod !== 'digipay') {
    return { error: { status: 400, message: 'این سفارش با دیجی‌پی پرداخت نشده است' } };
  }
  if (order.paymentStatus !== 'paid') {
    return { error: { status: 400, message: 'این سفارش پرداخت موفق دیجی‌پی ندارد' } };
  }
  if (['cancelled', 'refunded'].includes(order.status)) {
    return { error: { status: 400, message: 'این سفارش لغو/عودت شده و قابل تغییر نیست' } };
  }
  const payment = await Payment.findOne({
    order: order._id,
    provider: 'digipay',
    status: 'paid',
    refId: { $exists: true, $ne: '' },
  }).sort({ paidAt: -1 });
  if (!payment || !payment.refId) {
    return { error: { status: 404, message: 'رکورد پرداخت دیجی‌پی این سفارش یافت نشد' } };
  }
  return { order, payment };
};

/* ---------------------- بازپرداخت کامل (Refund) ---------------------- */
const refundDigipayOrder = async (req, res) => {
  try {
    const found = await findPaidDigipay(req.params.id);
    if (found.error) {
      return res.status(found.error.status).json({ success: false, message: found.error.message });
    }
    const { order, payment } = found;

    // نوع واقعی خرید که موقع callback ذخیره شده → نوع عودت متناظر (جدول نوع عودت)
    const refundType = refundTypeForPurchase(payment.purchaseType);
    // شناسه یکتای درخواست عودت — با زمان، تا پس از شکست قطعیِ یک تلاش، تلاش جدید ممکن باشد
    // (مستندات: تکرار همان providerId همان نتیجه قبلی را برمی‌گرداند، حتی اگر ناموفق بوده باشد)
    const refundProviderId = ('NMR' + String(payment._id) + '-' + Date.now().toString(36)).slice(0, 100);

    const result = await refundPurchase(refundType, {
      providerId: refundProviderId,
      amount: toRial(payment.amount), // بازپرداخت کامل مبلغ تراکنش (ریال)
      saleTrackingCode: String(payment.refId), // trackingCode خرید اصلی
      customerName: (order.shippingInfo && order.shippingInfo.fullName) || undefined,
      description: 'بازپرداخت کامل سفارش ' + (order.orderRef || order._id),
    });

    if (!result.success) {
      console.error('[digipay][admin-refund] ثبت عودت ناموفق:',
        result.code, result.message, '| order=' + order.orderRef, 'payment=' + payment._id);
      return res.status(502).json({
        success: false,
        message: 'دیجی‌پی درخواست عودت را نپذیرفت',
        detail: result.message,
      });
    }

    // ثبت شد — استعلام وضعیت نهایی (چند ثانیه بعد معمولاً نتیجه حاضر است)
    let inquiryStatus = 2; // پیش‌فرض: در حال پردازش
    let resultCode = null;
    try {
      await new Promise((r) => setTimeout(r, 2500));
      const inquiry = await refundInquiry(refundType, refundProviderId);
      if (inquiry.success && inquiry.response && inquiry.response.result && inquiry.response.result.status === 0) {
        inquiryStatus = Number(inquiry.response.status);
        resultCode = inquiry.response.resultCode;
      }
      console.log('[digipay][admin-refund] استعلام عودت:', JSON.stringify(inquiry.response || {}).slice(0, 300));
    } catch (e) {
      console.error('[digipay][admin-refund] خطای استعلام (نادیده گرفته شد):', e.message);
    }

    if (inquiryStatus === 1) {
      // عودت شکست خورده — سفارش را عودت‌شده علامت نمی‌زنیم؛ ادمین می‌تواند دوباره تلاش کند
      console.error('[digipay][admin-refund] عودت شکست خورد — resultCode=' + resultCode + ' | order=' + order.orderRef);
      return res.status(502).json({
        success: false,
        message: 'عودت ثبت شد اما دیجی‌پی آن را ناموفق اعلام کرد (کد ' + (resultCode ?? 'نامشخص') + ') — لطفاً با پشتیبانی دیجی‌پی هماهنگ کنید',
      });
    }

    // موفق یا «در حال پردازش» (Pending) — سفارش عودت‌شده ثبت می‌شود
    payment.status = 'refunded';
    payment.failureReason = undefined;
    await payment.save();

    order.status = 'refunded';
    order.paymentStatus = 'refunded';
    for (const item of order.items) {
      if (item.product) await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    if (order.discountCode && order.discountConsumed) {
      await rollbackDiscountForOrder(order);
      order.discountConsumed = false;
    }
    await order.save();

    const message = inquiryStatus === 0
      ? 'کل مبلغ به مشتری بازگردانده شد'
      : 'درخواست بازگشت وجه ثبت شد و در حال پردازش است — نتیجه نهایی را در پنل دیجی‌پی پیگیری کنید';
    console.log('[digipay][admin-refund] سفارش ' + order.orderRef + ' عودت داده شد | status=' + inquiryStatus);
    return res.json({ success: true, message, data: order });
  } catch (error) {
    console.error('refundDigipayOrder error:', error);
    return res.status(500).json({ success: false, message: 'خطا در بازگشت وجه دیجی‌پی' });
  }
};

module.exports = { refundDigipayOrder };
