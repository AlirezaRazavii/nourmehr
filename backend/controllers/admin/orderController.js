const Order = require('../../models/Order');
const { consumeDiscount, rollbackDiscount } = require('../../utils/discountEngine');

// وضعیت‌هایی که یعنی سفارش نهایی/معتبر شده و باید تخفیف مصرف شود
const CONSUME_STATUSES = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];
// وضعیت‌هایی که یعنی سفارش لغو شده و باید تخفیف برگردد
const ROLLBACK_STATUSES = ['cancelled', 'refunded'];

const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Order.countDocuments(filter);
    res.json({ success: true, data: orders, total });
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
      'pending', 'paid', 'confirmed', 'processing',
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
    order.status = status;

    // --- منطق مصرف / بازگردانی تخفیف ---
    if (order.discountCode) {
      const shouldConsume = CONSUME_STATUSES.includes(status);
      const shouldRollback = ROLLBACK_STATUSES.includes(status);

      // مصرف تخفیف فقط اگر قبلاً مصرف نشده باشد
      if (shouldConsume && !order.discountConsumed) {
        const ok = await consumeDiscount(order.discountCode);
        if (ok) {
          order.discountConsumed = true;
        } else {
          // ظرفیت کد پر شده — جلوی تأیید سفارش را می‌گیریم
          order.status = previousStatus;
          await order.save();
          return res.status(400).json({
            success: false,
            message: 'ظرفیت کد تخفیف این سفارش تکمیل شده و امکان تأیید نیست',
          });
        }
      }

      // بازگردانی تخفیف فقط اگر قبلاً مصرف شده باشد
      if (shouldRollback && order.discountConsumed) {
        await rollbackDiscount(order.discountCode);
        order.discountConsumed = false;
      }
    }

    await order.save();

    return res.json({
      success: true,
      message: 'وضعیت سفارش با موفقیت به‌روزرسانی شد',
      data: order,
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({ success: false, message: 'خطا در به‌روزرسانی وضعیت سفارش' });
  }
};

module.exports = { getOrders, getOrderById, updateOrderStatus };
