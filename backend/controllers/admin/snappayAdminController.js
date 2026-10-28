/**
 * ادمین — عملیات مرجوعی اسنپ‌پی (الزامات پشتیبانی برای تایید)
 *   PUT  /admin/orders/:id/snappay/update → مرجوع جزئی (Update API) — کاهش تعداد/حذف آیتم
 *   POST /admin/orders/:id/snappay/cancel → مرجوع کل (Cancel API) — بازپرداخت کامل
 * ⚠️ هر دو غیرقابل بازگشت‌اند — فرانت باید قبل از فراخوانی پاپ‌آپ تأییدیه مجدد نشان دهد.
 */
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const Product = require('../../models/Product');
const { rollbackDiscount } = require('../../utils/discountEngine');
const {
  toRial, isAmountInRange, updatePurchase, cancelPurchase, revertPurchase,
} = require('../../services/snappayService');

/* ---------- کمک‌تابع‌ها (همان منطق کنترلر پرداخت) ---------- */
const extractName = (n) => {
  if (!n) return '';
  if (typeof n === 'string') return n;
  return (n && (n.fa || n.en)) || '';
};

// از ۱۲ کاراکتر اول ObjectId عدد یکتا (همان روش توکن اولیه — idها باید با cartList اولیه بخوانند)
const numericId = (objectId) => {
  const hex = String(objectId || '').substring(0, 12);
  const n = parseInt(hex, 16);
  return Number.isFinite(n) && n > 0 ? n : Date.now();
};

const findPaidSnappay = async (orderId) => {
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return { error: { status: 400, message: 'شناسه سفارش نامعتبر است' } };
  }
  const order = await Order.findById(orderId);
  if (!order) return { error: { status: 404, message: 'سفارش یافت نشد' } };
  if (order.paymentMethod !== 'snappay') {
    return { error: { status: 400, message: 'این سفارش با اسنپ‌پی پرداخت نشده است' } };
  }
  if (order.paymentStatus !== 'paid') {
    return { error: { status: 400, message: 'این سفارش پرداخت موفق اسنپ‌پی ندارد' } };
  }
  if (['cancelled', 'refunded'].includes(order.status)) {
    return { error: { status: 400, message: 'این سفارش لغو/عودت شده و قابل تغییر نیست' } };
  }
  const payment = await Payment.findOne({
    order: order._id,
    provider: 'snappay',
    status: 'paid',
    authority: { $exists: true, $ne: '' },
  }).sort({ paidAt: -1 });
  if (!payment || !payment.authority) {
    return { error: { status: 404, message: 'رکورد پرداخت اسنپ‌پی این سفارش یافت نشد' } };
  }
  return { order, payment };
};

/* ================= Update — مرجوع جزئی ================= */
const updateSnappayOrder = async (req, res) => {
  try {
    const { items } = req.body || {}; // [{ index, quantity }] — quantity جدید (۰ = حذف)
    const found = await findPaidSnappay(req.params.id);
    if (found.error) {
      return res.status(found.error.status).json({ success: false, message: found.error.message });
    }
    const { order, payment } = found;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'لیست تغییرات ارسال نشده است' });
    }

    // تعداد جدید — فقط کاهش مجاز است
    const newQty = order.items.map(() => null);
    for (const it of items) {
      const idx = Number(it.index);
      const qty = Number(it.quantity);
      if (!Number.isInteger(idx) || idx < 0 || idx >= order.items.length) {
        return res.status(400).json({ success: false, message: 'اندیس آیتم نامعتبر است' });
      }
      if (!Number.isInteger(qty) || qty < 0 || qty > order.items[idx].quantity) {
        return res.status(400).json({
          success: false,
          message: `تعداد «${extractName(order.items[idx].name) || 'کالا ' + (idx + 1)}» فقط بین ۰ تا ${order.items[idx].quantity} می‌تواند باشد`,
        });
      }
      newQty[idx] = qty;
    }

    const finalQty = order.items.map((it, idx) => (newQty[idx] === null ? it.quantity : newQty[idx]));
    if (!finalQty.some((q, idx) => q !== order.items[idx].quantity)) {
      return res.status(400).json({ success: false, message: 'تعدادی تغییر نکرده است' });
    }
    if (finalQty.every((q) => q === 0)) {
      return res.status(400).json({
        success: false,
        message: 'همه اقلام حذف می‌شوند — برای مرجوع کامل از «بازپرداخت کامل (Cancel)» استفاده کنید',
      });
    }

    // ---------- مبالغ جدید ----------
    let newSubtotal = 0;
    order.items.forEach((it, idx) => { newSubtotal += it.price * finalQty[idx]; });
    const newDiscount = Math.min(Number(order.discountAmount || 0), newSubtotal);
    const newTotal = newSubtotal - newDiscount + Number(order.shippingCost || 0);

    if (!isAmountInRange(newTotal)) {
      return res.status(400).json({
        success: false,
        message: `مبلغ جدید (${newTotal.toLocaleString('fa-IR')} تومان) خارج از بازه مجاز اسنپ‌پی است`,
      });
    }

    // ---------- cartList جدید — همان idهای اولیه، فقط تعداد کمتر/حذف ----------
    const productIds = order.items.filter((it, idx) => finalQty[idx] > 0).map((it) => it.product);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('category')
      .populate('category', 'name');
    const catMap = new Map(
      products.map((p) => [String(p._id), extractName(p.category && p.category.name) || 'عمومی'])
    );

    const cartItems = [];
    order.items.forEach((it, idx) => {
      if (finalQty[idx] === 0) return;
      cartItems.push({
        id: numericId(it.product), // ⭐ باید با cartList توکن اولیه یکی باشد
        name: extractName(it.name) || ('کالا ' + (idx + 1)),
        count: finalQty[idx],
        amount: toRial(it.price),
        category: catMap.get(String(it.product)) || 'عمومی',
        commissionType: 100,
      });
    });

    // ⚠️ فقط فیلدهای لازم — deserializer اسنپ‌پی سخت‌گیر است (درس خطای 1005!)
    const payload = {
      amount: toRial(newTotal),
      cartList: [{
        cartId: numericId(order._id),
        totalAmount: toRial(newSubtotal + Number(order.shippingCost || 0)),
        taxAmount: 0,
        shippingAmount: toRial(order.shippingCost || 0),
        isTaxIncluded: false,
        isShipmentIncluded: false,
        cartItems,
      }],
      discountAmount: toRial(newDiscount),
      externalSourceAmount: 0,
    };

mo    // ⭐ سرویس ما: updatePurchase(payload) — paymentToken داخل payload
    const result = await updatePurchase({ paymentToken: payment.authority, ...payload });dule.exports = { getOrders, getOrderById, updateOrderStatus, updateOrderTracking };
    if (!result.success) {
      console.error('[snappay][admin-update] ناموفق:', result.code, result.message,
        '| order=' + order.orderRef, 'payment=' + payment._id);
      return res.status(502).json({
        success: false,
        message: 'اسنپ‌پی تغییرات را نپذیرفت',
        detail: result.message,
      });
    }

    // ---------- موفق: موجودی برگشتی + همگام‌سازی سفارش ----------
    for (let idx = 0; idx < order.items.length; idx++) {
      const diff = order.items[idx].quantity - finalQty[idx];
      if (diff > 0 && order.items[idx].product) {
        await Product.findByIdAndUpdate(order.items[idx].product, { $inc: { stock: diff } });
      }
    }

    const updatedItems = [];
    order.items.forEach((it, idx) => {
      if (finalQty[idx] > 0) {
        updatedItems.push({
          product: it.product, name: it.name, size: it.size,
          price: it.price, quantity: finalQty[idx],
        });
      }
    });
    order.items = updatedItems;
    order.subtotal = newSubtotal;
    order.discountAmount = newDiscount;
    order.total = newTotal;
    await order.save();

    console.log(`[snappay][admin-update] سفارش ${order.orderRef} کاهش یافت | مبلغ جدید: ${newTotal}`);
    const fresh = await Order.findById(order._id);
    return res.json({ success: true, message: 'تغییرات با موفقیت در اسنپ‌پی ثبت شد', data: fresh });
  } catch (error) {
    console.error('updateSnappayOrder error:', error);
    return res.status(500).json({ success: false, message: 'خطا در ارسال تغییرات به اسنپ‌پی' });
  }
};

/* ================= Cancel — مرجوع کل ================= */
const cancelSnappayOrder = async (req, res) => {
  try {
    const found = await findPaidSnappay(req.params.id);
    if (found.error) {
      return res.status(found.error.status).json({ success: false, message: found.error.message });
    }
    const { order, payment } = found;

    let r = await cancelPurchase(payment.authority).catch((e) => ({ success: false, message: e.message }));
    if (!r.success) {
      console.error('[snappay][admin-cancel] cancel ناموفق، تلاش revert:', r.message);
      r = await revertPurchase(payment.authority).catch((e) => ({ success: false, message: e.message }));
    }
    if (!r.success) {
      console.error('[snappay][admin-cancel] revert هم ناموفق | order=' + order.orderRef, r.message);
      return res.status(502).json({
        success: false,
        message: 'بازپرداخت اسنپ‌پی ناموفق بود — وضعیت سفارش تغییر نکرد',
        detail: r.message,
      });
    }

    payment.status = 'refunded';
    await payment.save();

    order.status = 'refunded';
    order.paymentStatus = 'refunded';
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    if (order.discountCode && order.discountConsumed) {
      await rollbackDiscount(order.discountCode);
      order.discountConsumed = false;
    }
    await order.save();

    console.log(`[snappay][admin-cancel] سفارش ${order.orderRef} کاملاً مرجوع شد`);
    return res.json({ success: true, message: 'کل مبلغ به مشتری بازگردانده شد', data: order });
  } catch (error) {
    console.error('cancelSnappayOrder error:', error);
    return res.status(500).json({ success: false, message: 'خطا در بازپرداخت اسنپ‌پی' });
  }
};

module.exports = { updateSnappayOrder, cancelSnappayOrder };