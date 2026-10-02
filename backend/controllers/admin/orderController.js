const Order = require('../../models/Order');
const Product = require('../../models/Product');
const { rollbackDiscount } = require('../../utils/discountEngine');

// وضعیت‌های جریان ارسال — فقط برای سفارش‌های «پرداخت‌شده» مجاز
const FULFILLMENT_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];
// وضعیت‌های پایان‌کار — موجودی و تخفیف باید برگردد
const TERMINAL_STATUSES = ['cancelled', 'refunded'];

const getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)); // حداکثر ۱۰۰
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    // دو کوئری موازی — سریع‌تر
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
