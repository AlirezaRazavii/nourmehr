const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const {
  validateDiscount: validateDiscountEngine,
  consumeDiscountForOrder,
  rollbackDiscountForOrder,
} = require('../utils/discountEngine');
const { resolveUnitPrice } = require('../utils/pricing');
const {
  CREDIT_PAYMENT_METHODS,
  blocksCredit,
  buildBlockMessage,
} = require('../utils/paymentPolicy');

const generateOrderRef = () => 'NM-' + Date.now();


const Setting = require('../models/Setting');

// روش‌های پرداخت مجاز
const ALLOWED_PAYMENT_METHODS = ['online', 'torobpay', 'snappay', 'digipay'];

// نام فارسی محصول به‌صورت رشته ساده — برای ذخیره در سفارش
const getLocalizedName = (name) => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.fa || name.en || '';
};

// قیمت واحد با احتساب سایز انتخابی و تخفیف درصدی محصول/سایز
const getUnitPrice = (product, sizeName) => resolveUnitPrice(product, sizeName).final;

// قیمت واحد «اصلی» (بدون تخفیف محصول/سایز) — پایه محاسبه درصد کد تخفیف
const getOriginalUnitPrice = (product, sizeName) => resolveUnitPrice(product, sizeName).original;

// محاسبه پویا و پایداری هزینه ارسال بر اساس تنظیمات دیتابیس
const calculateShippingCost = async (methodId) => {
  try {
    const settings = await Setting.findOne();
    if (settings && Array.isArray(settings.shippingOptions) && settings.shippingOptions.length > 0) {
      const match = settings.shippingOptions.find(s => s.id === methodId && s.isActive !== false);
      if (match) return match.cost;
      const firstActive = settings.shippingOptions.find(s => s.isActive !== false);
      if (firstActive) return firstActive.cost;
    }
  } catch (err) {
    console.error('[calculateShippingCost] Error fetching settings:', err);
  }
  if (methodId === 'express') return 150000;
  return 80000;
};

// اعتبارسنجی کد تخفیف (بدون مصرف) — برای فرم Checkout
const validateDiscount = async (req, res) => {
  try {
    const { code, paymentMethod } = req.body;
    const userId = req.user._id;

    // سبد از خود سرور محاسبه می‌شود (امن‌تر — کلاینت عدد دلخواه نفرستد):
    // payable  = مبلغ قابل پرداخت (با تخفیف محصول)
    // original = قیمت اصلی (بدون تخفیف محصول) — پایه درصد کد تخفیف
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    const engineItems = [];
    for (const item of (cart?.items || [])) {
      const product = item.product;
      if (!product) continue;
      engineItems.push({
        productId: String(product._id),
        quantity: item.quantity,
        unitPrice: getUnitPrice(product, item.size),
        originalUnitPrice: getOriginalUnitPrice(product, item.size),
        categories: [String(product.category)].filter(Boolean),
      });
    }

    const payable = engineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    if (payable <= 0) {
      return res.status(400).json({ success: false, message: 'سبد خرید خالی است' });
    }

    // ⭐ درگاه انتخابی هم پاس می‌شود — کد ممکن است فقط با بعضی درگاه‌ها مجاز باشد
    const result = await validateDiscountEngine({
      code,
      items: engineItems,
      userId,
      paymentMethod: paymentMethod || null,
    });
    const { discount, amount, eligibility } = result;

    const message = discount.type === 'percent'
      ? `کد تخفیف ${discount.value}٪ روی قیمت اصلی اعمال شد`
      : `کد تخفیف ${amount.toLocaleString('fa-IR')} تومانی اعمال شد`;

    return res.json({
      success: true,
      discountAmount: amount,
      discountType: discount.type,
      discountValue: discount.value,
      description: discount.description || '',
      message,
      // ⭐ اطلاعات محدودیت برای UI (قفل درگاه‌ها و نوت «روی چند قلم اعمال شد»)
      eligibleCount: eligibility.eligibleCount,
      totalItems: eligibility.totalCount,
      restricted: eligibility.restricted,
      categoryNames: result.categoryNames,
      productCount: (discount.products || []).length,
      allowedPaymentMethods: result.allowedPaymentMethods, // null = همه مجاز
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
    const shippingMethod = shippingInfo.shippingMethod || 'normal';
    shippingInfo.shippingMethod = shippingMethod;

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'سبد خرید خالی است' });
    }

    let subtotal = 0;
    let originalSubtotal = 0; // قیمت اصلی (قبل از تخفیف محصول) — گزارش/دیتا
    const orderItems = [];
    const engineItems = []; // ⭐ اقلام به زبان موتور تخفیف (دسته‌ها + قیمت‌ها)
    const creditBlockedItems = []; // ⭐ اقلامی که تخفیفشان از حد مجاز درگاه اعتباری بیشتر است
    for (const item of cart.items) {
      const product = item.product;
      if (!product) continue;
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `موجودی محصول ${product.name} کافی نیست` });
      }
      const r = resolveUnitPrice(product, item.size);
      const unitPrice = r.final;
      subtotal += unitPrice * item.quantity;
      originalSubtotal += r.original * item.quantity;
      if (blocksCredit(r.percent)) {
        creditBlockedItems.push({
          name: getLocalizedName(product.name),
          size: item.size || '',
          percent: r.percent,
        });
      }
      engineItems.push({
        productId: String(product._id),
        quantity: item.quantity,
        unitPrice,
        originalUnitPrice: r.original,
        categories: [String(product.category)].filter(Boolean),
      });
      orderItems.push({
        product: product._id,
        // نام به‌صورت رشته ساده ذخیره شود (نه آبجکت دوزبانه)
        name: getLocalizedName(product.name),
        price: unitPrice,
        quantity: item.quantity,
        color: item.color || '',
        size: item.size || '',
        image: product.mainImage || '',
        // ⭐ اسنپ‌شات تخفیف — مبنای گیت درگاه و گزارش‌های بعدی
        originalPrice: r.original,
        discountPercent: r.percent,
        discountSource: r.source
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'سبد خرید خالی است' });
    }

    // اعتبارسنجی کد تخفیف بدون مصرف کردن آن — با درگاه انتخابی
    // (کد ممکن است فقط با بعضی درگاه‌ها یا فقط روی بعضی اقلام مجاز باشد)
    let discountAmount = 0;
    let validDiscountCode = null;
    if (discountCode) {
      try {
        const result = await validateDiscountEngine({
          code: discountCode,
          items: engineItems,
          userId,
          paymentMethod,
        });
        discountAmount = result.amount;
        validDiscountCode = result.discount.code;
      } catch (err) {
        return res.status(err.statusCode || 400).json({ success: false, message: err.message });
      }
    }

    // ⭐ قفل درگاه اعتباری بر اساس آستانه تخفیف (کد تخفیف لحاظ نمی‌شود)
    const creditBlocked = creditBlockedItems.length > 0;
    if (creditBlocked && CREDIT_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: buildBlockMessage(creditBlockedItems, paymentMethod),
      });
    }

    const shippingCost = await calculateShippingCost(shippingMethod);

    const total = Math.max(0, subtotal - discountAmount) + shippingCost;


    // ---- ادامه همان سفارش پرداخت‌نشده (نه لغو، نه سفارش جدید!) ----
    // اگر کاربر قبلاً سفارشی ثبت کرده ولی پرداختش کامل نشده، همان سفارش
    // با اطلاعات جدید به‌روزرسانی می‌شود — همان شماره سفارش باقی می‌ماند
    let order = await Order.findOne({
      user: userId,
      status: 'pending',
      paymentStatus: { $in: ['pending', 'failed'] },
    }).sort({ createdAt: -1 });

    // اقلام رزروشده قبلی — برای بازگرداندن در صورت خطا
    let previousItems = null;

    if (order) {
      // اگر پرداختی همین الان در حال تأیید است (کاربر داخل درگاه)، اجازه تغییر نده
      const processingPayment = await Payment.exists({ order: order._id, status: 'processing' });
      if (processingPayment) {
        return res.status(400).json({
          success: false,
          message: 'پرداخت این سفارش در حال تأیید است. چند لحظه صبر کنید و دوباره تلاش کنید.',
        });
      }

      previousItems = order.items.map(i => ({ product: i.product, quantity: i.quantity }));

      // آزادسازی موقت موجودی رزروشده قبلی (بعداً با اقلام جدید دوباره رزرو می‌شود)
      for (const item of previousItems) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
      // اگر به هر دلیلی تخفیف مصرف شده بود، برگردان
      if (order.discountCode && order.discountConsumed) {
        await rollbackDiscountForOrder(order);
        order.discountConsumed = false;
      }
      // توکن‌های درگاهِ معلق قبلی باطل شوند (تا پرداخت قدیمی با مبلغ قدیمی نگیرد)
      await Payment.updateMany(
        { order: order._id, status: 'pending' },
        { $set: { status: 'failed', failureReason: 'OrderUpdated' } }
      );

      // به‌روزرسانی همان سفارش
      order.items = orderItems;
      order.shippingInfo = shippingInfo;
      order.paymentMethod = paymentMethod;
      order.subtotal = subtotal;
      order.discountAmount = discountAmount;
      order.discountCode = validDiscountCode;
      order.shippingCost = shippingCost;
      order.total = total;
      order.paymentStatus = 'pending';
    } else {
      order = new Order({
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
    }

    // ⭐ قفل تصمیم درگاه روی خود سفارش (سفارش‌های قدیمی undefined می‌مانند)
    order.creditBlocked = creditBlocked;

    // اعتبارسنجی کامل «قبل از» رزرو موجودی
    await order.validate();

    // ---- رزرو اتمیک موجودی + ذخیره سفارش، با بازگرداندن کامل در هر خطا ----
    const decremented = [];
    try {
      for (const item of cart.items) {
        if (!item.product) continue;
        const result = await Product.updateOne(
          { _id: item.product._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        );
        if (result.matchedCount === 0) {
          const err = new Error(`موجودی محصول ${item.product.name} کافی نیست`);
          err.statusCode = 400;
          throw err;
        }
        decremented.push({ id: item.product._id, qty: item.quantity });
      }
      await order.save(); // اگر ذخیره خطا داد، موجودی رزروشده برگردانده می‌شود
    } catch (err) {
      // موجودی رزروشده جدید را برگردان
      for (const d of decremented) {
        await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } });
      }
      // اگر سفارشِ استفاده‌مجدد بود، رزرو قبلی‌اش را دوباره برقرار کن
      // تا همان سفارش همچنان قابل پرداخت بماند
      if (previousItems) {
        for (const item of previousItems) {
          await Product.updateOne(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } }
          );
        }
      }
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }

    // ایجاد رکورد پرداخت
    const payment = new Payment({
      order: order._id,
      user: userId,
      amount: total,
      method: paymentMethod,
      provider: paymentMethod === 'online' ? 'zarinpal' : paymentMethod, // torobpay | snappay
      status: 'pending'
    });
    await payment.save();

    // سبد خرید عمداً نگه داشته می‌شود و فقط بعد از «پرداخت موفق»
    // در کنترلر پرداخت پاک می‌شود — تا کاربر بتواند دوباره تلاش کند

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
      await rollbackDiscountForOrder(order);
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

// بازیابی سبد خرید از سفارش پرداخت‌نشده (برای ویرایش و ادامه سفارش)
const restoreCartFromOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (order.status !== 'pending' || order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'این سفارش قابل ویرایش نیست' });
    }

    // سبد فعلی با اقلام همین سفارش جایگزین می‌شود
    // (بدون چک موجودی — چون همین سفارش موجودی را رزرو کرده است)
    await Cart.findOneAndDelete({ user: req.user._id });
    const cart = new Cart({
      user: req.user._id,
      items: order.items.map(i => ({
        product: i.product,
        quantity: i.quantity,
        color: i.color || '',
        size: i.size || ''
      }))
    });
    await cart.save();

    res.json({ success: true, message: 'سبد خرید از سفارش بازیابی شد' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { validateDiscount, createOrder, getMyOrders, getOrderById, cancelOrder, restoreCartFromOrder };
