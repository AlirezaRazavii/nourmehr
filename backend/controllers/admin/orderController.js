const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Payment = require('../../models/Payment');
const { rollbackDiscount } = require('../../utils/discountEngine');
const { cancelPurchase, revertPurchase } = require('../../services/snappayService');

// وضعیت‌های جریان ارسال — فقط برای سفارش‌های «پرداخت‌شده» مجاز
const FULFILLMENT_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];
// وضعیت‌های پایان‌کار — موجودی و تخفیف باید برگردد
const TERMINAL_STATUSES = ['cancelled', 'refunded'];

const getOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)); // حداکثر ۱۰۰
    const filter = {};
    if (status) filter.status = status;

    /* ---------- جستجو (الزام اسنپ‌پی: transactionId قابل جستجو) ---------- */
    const rawSearch = String(search || '').trim();
    if (rawSearch) {
      // ارقام فارسی/عربی → انگلیسی
      const q = rawSearch
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // فرار کاراکترهای regex
      const rx = new RegExp(esc, 'i');
      const digits = q.replace(/\D/g, '');

      // واریانت‌های موبایل: 0913… / 913… / 98913…
      const phoneSrc = [esc];
      if (digits.length >= 8) {
        if (digits.startsWith('0')) phoneSrc.push(digits.slice(1));
        else if (digits.startsWith('98')) phoneSrc.push('0' + digits.slice(2));
        else phoneSrc.push('0' + digits);
      }
      const phoneRx = new RegExp(phoneSrc.join('|'));

      filter.$or = [
        { orderRef: rx },
        { paymentRefId: rx },              // ⭐ کد تراکنش اسنپ‌پی / سایر درگاه‌ها
        { 'shippingInfo.fullName': rx },
        { 'shippingInfo.phone': phoneRx },
      ];

      // نام یا موبایلِ اکانت کاربر
      const users = await User.find({ $or: [{ phone: phoneRx }, { name: rx }] })
        .select('_id')
        .limit(50);
      if (users.length) filter.$or.push({ user: { $in: users.map((u) => u._id) } });

      // «NM…» = شناسه داخلی پرداخت اسنپ‌پی → مستقیم سفارشِ همان پرداخت
      if (/^nm/i.test(q) && mongoose.isValidObjectId(q.slice(2))) {
        const pay = await Payment.findById(q.slice(2)).select('order').lean();
        if (pay) filter.$or.push({ _id: pay.order });
      }
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, data: orders, total, page, limit, totalPages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      'pending', 'confirmed', 'processing',
      'shipped', 'delivered', 'cancelled', 'refunded',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'وضعیت سفارش نامعتبر است' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }

    const previousStatus = order.status;

    // بدون تغییر؟
    if (previousStatus === status) {
      return res.json({ success: true, message: 'وضعیت سفارش تغییری نکرد', data: order });
    }

    // ۱) سفارش لغو/عودت‌شده قابل بازگشت نیست
    //    (وگرنه موجودی دوبار برگردانده می‌شد!)
    if (TERMINAL_STATUSES.includes(previousStatus)) {
      return res.status(400).json({
        success: false,
        message: 'سفارش لغو/عودت‌شده قابل تغییر نیست. در صورت نیاز، سفارش جدید ثبت شود.',
      });
    }

    // ۲) جریان ارسال/تحویل فقط برای سفارش‌های پرداخت‌شده مجاز است
    //    (فیکس ریشه باگ تخفیف — دیگر سفارش پرداخت‌نشده «تأیید» نمی‌شود)
    if (FULFILLMENT_STATUSES.includes(status) && order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'این سفارش هنوز پرداخت نشده است — تا تکمیل پرداخت قابل پردازش نیست',
      });
    }

    // ۳) عودت وجه فقط برای سفارش‌های پرداخت‌شده
    if (status === 'refunded' && order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'عودت فقط برای سفارش‌های پرداخت‌شده ممکن است',
      });
    }

    // ۴) تغییر اتمیک — اگر همزمان (کرون انقضا / کاربر / ادمین دیگر) وضعیت را
    //    عوض کرده باشد، این درخواست رد می‌شود تا موجودی دو بار برنگردد
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: previousStatus },
      { $set: { status } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({
        success: false,
        message: 'وضعیت این سفارش همزمان تغییر کرده است — لیست را رفرش کنید',
      });
    }

    // ۴.۵) سفارشِ پرداخت‌شده با اسنپ‌پی → لغو/عودت = «مرجوع کل سیستمی» (Cancel API)
    //      اگر اسنپ‌پی نپذیرد، وضعیت برمی‌گردد و هیچ‌چیز تغییر نمی‌کند
    if (TERMINAL_STATUSES.includes(status)
        && order.paymentMethod === 'snappay'
        && order.paymentStatus === 'paid') {
      const payment = await Payment.findOne({
        order: order._id,
        provider: 'snappay',
        status: 'paid',
        authority: { $exists: true, $ne: '' },
      }).sort({ paidAt: -1 });

      if (!payment || !payment.authority) {
        await Order.updateOne({ _id: order._id }, { $set: { status: previousStatus } });
        return res.status(404).json({
          success: false,
          message: 'رکورد پرداخت اسنپ‌پی یافت نشد — از دکمه «بازپرداخت کامل» در جزئیات سفارش استفاده کنید',
        });
      }

      let r = await cancelPurchase(payment.authority).catch((e) => ({ success: false, message: e.message }));
      if (!r.success) r = await revertPurchase(payment.authority).catch((e) => ({ success: false, message: e.message }));

      if (!r.success) {
        await Order.updateOne({ _id: order._id }, { $set: { status: previousStatus } });
        console.error('[snappay][status] مرجوع کل ناموفق — وضعیت برگردانده شد | order=' + order.orderRef, r.message);
        return res.status(502).json({
          success: false,
          message: 'بازپرداخت اسنپ‌پی ناموفق بود — وضعیت سفارش تغییر نکرد. کمی بعد دوباره تلاش کنید.',
        });
      }

      payment.status = 'refunded';
      await payment.save();
      await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'refunded' } });
      console.log(`[snappay][status] سفارش ${order.orderRef} در اسنپ‌پی مرجوع شد`);
    }

    // ۵) لغو/عودت → موجودی رزروشده برگردد + تخفیف مصرف‌شده rollback شود
    if (TERMINAL_STATUSES.includes(status)) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
      if (order.discountCode && order.discountConsumed) {
        await rollbackDiscount(order.discountCode);
        await Order.updateOne({ _id: order._id }, { $set: { discountConsumed: false } });
      }
      console.log(`[admin] سفارش ${order.orderRef} → ${status} | موجودی و تخفیف برگشت داده شد`);
    }

    const fresh = await Order.findById(order._id);
    return res.json({
      success: true,
      message: 'وضعیت سفارش با موفقیت به‌روزرسانی شد',
      data: fresh,
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({ success: false, message: 'خطا در به‌روزرسانی وضعیت سفارش' });
  }
};

// ثبت / به‌روزرسانی کد رهگیری و شرکت حمل
const updateOrderTracking = async (req, res) => {
  try {
    const { code, carrier } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'کد رهگیری الزامی است' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });

    // کد رهگیری برای سفارشِ در جریان ارسال معنا دارد
    if (['pending', 'cancelled', 'refunded'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'برای این وضعیت سفارش، کد رهگیری ثبت نمی‌شود' });
    }

    order.tracking = {
      code: String(code).trim(),
      carrier: carrier ? String(carrier).trim() : '',
    };
    await order.save();

    return res.json({ success: true, message: 'اطلاعات رهگیری ذخیره شد', data: order });
  } catch (error) {
    console.error('updateOrderTracking error:', error);
    return res.status(500).json({ success: false, message: 'خطا در ذخیره اطلاعات رهگیری' });
  }
};

module.exports = { getOrders, getOrderById, updateOrderStatus, updateOrderTracking };
