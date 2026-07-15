const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Ticket = require('../../models/Ticket');

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const revenue = {
      today: await Order.aggregate([{ $match: { createdAt: { $gte: today }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      week: await Order.aggregate([{ $match: { createdAt: { $gte: weekAgo }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      month: await Order.aggregate([{ $match: { createdAt: { $gte: monthAgo }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }])
    };
    const orders = {
      total: await Order.countDocuments(),
      pending: await Order.countDocuments({ status: 'pending' }),
      processing: await Order.countDocuments({ status: 'processing' }),
      shipped: await Order.countDocuments({ status: 'shipped' }),
      delivered: await Order.countDocuments({ status: 'delivered' }),
      cancelled: await Order.countDocuments({ status: 'cancelled' })
    };
    const users = {
      total: await User.countDocuments(),
      newToday: await User.countDocuments({ createdAt: { $gte: today } }),
      newWeek: await User.countDocuments({ createdAt: { $gte: weekAgo } }),
      active: await User.countDocuments({ lastLogin: { $gte: weekAgo } })
    };
    const products = {
      total: await Product.countDocuments(),
      outOfStock: await Product.countDocuments({ stock: 0 }),
      lowStock: await Product.countDocuments({ stock: { $gt: 0, $lte: 5 } })
    };
    const tickets = {
      total: await Ticket.countDocuments(),
      open: await Ticket.countDocuments({ status: 'open' }),
      inProgress: await Ticket.countDocuments({ status: 'in_progress' }),
      resolved: await Ticket.countDocuments({ status: 'resolved' })
    };
    // Weekly revenue breakdown (last 7 days)
    const weeklyRevenue = [];
    const dayNames = ['یک‌شنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه','شنبه'];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const result = await Order.aggregate([
        { $match: { createdAt: { $gte: dayStart, $lt: dayEnd }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      weeklyRevenue.push({
        day: dayNames[dayStart.getDay()],
        value: result[0]?.total || 0
      });
    }

    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, sales: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { sales: -1 } },
      { $limit: 5 }
    ]);
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name');

    res.json({
      success: true,
      data: {
        revenue: { today: revenue.today[0]?.total || 0, week: revenue.week[0]?.total || 0, month: revenue.month[0]?.total || 0, growth: 12.5 },
        orders,
        users,
        products,
        tickets,
        weeklyRevenue,
        topProducts,
        recentOrders: recentOrders.map(o => ({ id: o.orderRef, customer: o.user?.name || 'نامشخص', total: o.total, status: o.status, date: o.createdAt.toLocaleDateString('fa-IR') }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };