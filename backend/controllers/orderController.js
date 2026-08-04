const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const {
  validateDiscount: validateDiscountEngine,
  consumeDiscount,
  rollbackDiscount,
} = require('../utils/discountEngine');

const generateOrderRef = () => 'NM-' + Date.now();


// نرخ ارسال فقط سمت سرور تعیین می‌شود — کلاینت هیچ نقشی در قیمت ندارد
const SHIPPING_RATES = Object.freeze({ express: 150000, normal: 80000 });
const ALLOWED_SHIPPING_METHODS = Object.keys(SHIPPING_RATES);


// روش‌های پرداخت مجاز
const ALLOWED_PAYMENT_METHODS = ['cod', 'online'];

// قیمت واحد با احتساب سایز انتخابی و تخفیف درصدی محصول
const getUnitPrice = (product, sizeName) => {
  let base = product.price;
  let sizeDiscount = 0;
  if (sizeName && Array.isArray(product.sizes)) {
    const s = product.sizes.find(x => {
      if (!x || !x.name) return false;
      // نام سایز ممکن است رشته یا آبجکت دوزبانه باشد
      if (typeof x.name === 'string') return x.name === sizeName;
      return x.name.fa === sizeName || x.name.en === sizeName;
    });
    if (s) {
      if (s.price) base = s.price;
      if (s.discountPercent && s.discountPercent > 0) sizeDiscount = s.discountPercent;
    }
  }
  if (sizeDiscount > 0) {
    return base * (1 - sizeDiscount / 100);
  }
  if (product.discountPercent && product.discountPercent > 0) {
    return base * (1 - product.discountPercent / 100);
  }
  return base;
};

// محاسبه هزینه ارسال بر اساس روش انتخابی
const calculateShippingCost = (method) => SHIPPING_RATES[method] ?? SHIPPING_RATES.normal;

// اعتبارسنجی کد تخفیف (بدون مصرف) — برای فرم Checkout
const validateDiscount = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (subtotal == null || isNaN(Number(subtotal)) || Number(subtotal) < 0) {
      return res.status(400).json({ success: false, message: 'مبلغ سبد خرید نامعتبر است' });
    }
    const userId = req.user._id;
    const { discount, amount } = await validateDiscountEngine(code, Number(subtotal), userId);

    const message = discount.type === 'percent'
      ? `کد تخفیف ${discount.value}٪ اعمال شد`
      : `کد تخفیف ${amount.toLocaleString('fa-IR')} تومانی اعمال شد`;

    return res.json({
      success: true,
      discountAmount: amount,
      discountType: discount.type,
      discountValue: discount.value,
      description: discount.description || '',
      message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'خطا در بررسی کد تخفیف',
    });
  }
};

const createOrder = async (req, res) => {
  try {
    const { shippingInfo, paymentMethod, discountCode } = req.body;
    const userId = req.user._id;

    // اعتبارسنجی روش پرداخت (امنیتی — کاربر نباید مقدار دلخواه بفرستد)
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'روش پرداخت نامعتبر است' });
    }
    if (!shippingInfo || typeof shippingInfo !== 'object') {
      return res.status(400).json({ success: false, message: 'اطلاعات ارسال ناقص است' });
    }
        const shippingMethod = ALLOWED_SHIPPING_METHODS.includes(shippingInfo.shippingMethod)
      ? shippingInfo.shippingMethod
      : 'normal';
    shippingInfo.shippingMethod = shippingMethod;

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'سبد خرید خالی است' });
    }

    let subtotal = 0;
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;
      if (!product) continue;
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `موجودی محصول ${product.name} کافی نیست` });
      }
      const unitPrice = getUnitPrice(product, item.size);
      subtotal += unitPrice * item.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: unitPrice,
        quantity: item.quantity,
        color: item.color || '',
        size: item.size || '',
        image: product.mainImage || ''
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'سبد خرید خالی است' });
    }

    // اعتبارسنجی کد تخفیف بدون مصرف کردن آن
    let discountAmount = 0;
    let validDiscountCode = null;
    if (discountCode) {
      try {
        const result = await validateDiscountEngine(discountCode, subtotal, userId);
        discountAmount = result.amount;
        validDiscountCode = result.discount.code;
      } catch (err) {
        return res.status(err.statusCode || 400).json({ success: false, message: err.message });
      }
    }

    const shippingCost = calculateShippingCost(shippingMethod);

    const total = Math.max(0, subtotal - discountAmount) + shippingCost;


    // کاهش موجودی (اتمیک، سازگار با MongoDB standalone)
    // فهرست محصولاتی که موجودی‌شان کم شده تا در صورت خطا برگردانده شوند
    const decremented = [];
    try {
      for (const item of cart.items) {
        if (!item.product) continue;
        const result = await Product.updateOne(
          { _id: item.product._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        );
        if (result.matchedCount === 0) {
          // بازگرداندن موجودی محصولاتی که تا اینجا کم شده بود
          for (const d of decremented) {
            await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } });
          }
          return res.status(400).json({ success: false, message: `موجودی محصول ${item.product.name} کافی نیست` });
        }
        decremented.push({ id: item.product._id, qty: item.quantity });
      }
    } catch (stockErr) {
      for (const d of decremented) {
        await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } });
      }
      throw stockErr;
    }

    const order = new Order({
      orderRef: generateOrderRef(),
      user: userId,
      items: orderItems,
      shippingInfo,
      paymentMethod,
      subtotal,
      discountAmount,
      shippingCost,
      total,
      discountCode: validDiscountCode,
      discountConsumed: false,
      status: 'pending',
      paymentStatus: 'pending'
    });
    await order.save();

    // ایجاد رکورد پرداخت
    const payment = new Payment({
      order: order._id,
      user: userId,
      amount: total,
      method: paymentMethod,
      provider: paymentMethod === 'online' ? 'zarinpal' : 'cash_on_delivery',
      status: paymentMethod === 'cod' ? 'paid' : 'pending'
    });
    await payment.save();

    // برای پرداخت در محل (COD): سفارش تأیید، تخفیف مصرف، و سبد خرید خالی می‌شود
    if (paymentMethod === 'cod') {
      order.status = 'confirmed';
      order.paymentStatus = 'paid';
      if (order.discountCode && !order.discountConsumed) {
        const consumed = await consumeDiscount(order.discountCode);
        if (consumed) order.discountConsumed = true;
      }
      await order.save();

      // فقط در COD سبد را همین‌جا خالی می‌کنیم
      await Cart.deleteOne({ user: userId });
    }
    // برای پرداخت آنلاین: سبد را نگه می‌داریم تا اگر پرداخت شکست خورد
    // کاربر بتواند دوباره تلاش کند یا به COD تغییر دهد.
    // حذف سبد بعد از تأیید موفق در paymentController انجام می‌شود.

    // ایجاد اعلان برای ادمین
    try {
      await Notification.create({
        type: 'order',
        title: 'سفارش جدید',
        message: `سفارش جدید با کد ${order.orderRef} به مبلغ ${total.toLocaleString('fa-IR')} تومان ثبت شد.`,
        link: '/admin/orders'
      });
    } catch (notifErr) {
      // خطای اعلان نباید ثبت سفارش را متوقف کند
      console.error('[createOrder] notification error:', notifErr.message);
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('[createOrder] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// دریافت لیست سفارشات کاربر
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (!['pending', 'awaiting_payment'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this order' });
    }
    order.status = 'cancelled';

    // اگر تخفیف قبلاً مصرف شده بود، برگردان
    if (order.discountCode && order.discountConsumed) {
      await rollbackDiscount(order.discountCode);
      order.discountConsumed = false;
    }

    await order.save();

    // بازگرداندن موجودی
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { validateDiscount, createOrder, getMyOrders, getOrderById, cancelOrder };
