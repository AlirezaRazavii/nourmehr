const Payment = require('../../models/Payment');
const Order = require('../../models/Order');
const { rollbackDiscount } = require('../../utils/discountEngine');

const getPayments = async (req, res) => {
  try {
    let { status, page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 10)); // سقف امن برای limit

    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const skip = (page - 1) * limit;
    const payments = await Payment.find(filter)
      .populate('order', 'orderRef')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Payment.countDocuments(filter);

    res.json({ success: true, data: payments, total });
  } catch (error) {
    console.error('[admin getPayments] error:', error);
    res.status(500).json({ success: false, message: 'خطا در دریافت پرداخت‌ها' });
  }
};

// تأیید دستی پرداخت توسط ادمین (برای موارد استثنایی)
const verifyPaymentByAdmin = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'پرداخت یافت نشد' });

    if (payment.status === 'paid') {
      return res.status(400).json({ success: false, message: 'این پرداخت قبلاً تأیید شده است' });
    }
    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'این پرداخت عودت داده شده و قابل تأیید نیست' });
    }

    const order = await Order.findById(payment.order);
    if (!order) return res.status(404).json({ success: false, message: 'سفارش مرتبط یافت نشد' });

    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    order.paymentStatus = 'paid';
    order.status = 'confirmed';

    // مصرف کد تخفیف فقط یک بار (هماهنگ با جریان پرداخت آنلاین)
    if (order.discountCode && !order.discountConsumed) {
      const { consumeDiscount } = require('../../utils/discountEngine');
      const consumed = await consumeDiscount(order.discountCode);
      if (consumed) order.discountConsumed = true;
    }

    await order.save();

    res.json({ success: true, message: 'پرداخت توسط ادمین تأیید شد' });
  } catch (error) {
    console.error('[admin verifyPayment] error:', error);
    res.status(500).json({ success: false, message: 'خطا در تأیید پرداخت' });
  }
};

// عودت وجه توسط ادمین
const refundPaymentByAdmin = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'پرداخت یافت نشد' });

    if (payment.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'فقط پرداخت‌های موفق قابل عودت هستند' });
    }

    const order = await Order.findById(payment.order);

    payment.status = 'refunded';
    await payment.save();

    if (order) {
      order.paymentStatus = 'refunded';
      order.status = 'refunded';

      // اگر تخفیف مصرف شده بود، برگردان
      if (order.discountCode && order.discountConsumed) {
        await rollbackDiscount(order.discountCode);
        order.discountConsumed = false;
      }

      // بازگرداندن موجودی محصولات
      const Product = require('../../models/Product');
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
        }
      }

      await order.save();
    }

    res.json({ success: true, message: 'وجه با موفقیت عودت داده شد' });
  } catch (error) {
    console.error('[admin refundPayment] error:', error);
    res.status(500).json({ success: false, message: 'خطا در عودت وجه' });
  }
};

module.exports = { getPayments, verifyPaymentByAdmin, refundPaymentByAdmin };
