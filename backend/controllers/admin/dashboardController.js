const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Ticket = require('../../models/Ticket');
const { getOrSet, del } = require('../../utils/cache');

const CACHE_KEY = 'admin:dashboard:stats';
const CACHE_TTL = 60; // ثانیه

const DAY_NAMES = ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const first = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

const buildStats = async () => {
  const today = startOfDay(new Date());
  const weekAgo = addDays(today, -7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const twoMonthsAgo = new Date(today); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  // مرزهای ۷ روز گذشته: [today-6 ... today+1] => ۸ مرز برای ۷ سطل
  const dayBoundaries = [];
  for (let i = 6; i >= -1; i--) dayBoundaries.push(addDays(today, -i));

  // ── ۱) درآمد امروز/هفته/ماه/ماه قبل + نمودار هفتگی: همه در یک کوئری
  const revenuePromise = Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: twoMonthsAgo } } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              today: { $sum: { $cond: [{ $gte: ['$createdAt', today] }, '$total', 0] } },
              week: { $sum: { $cond: [{ $gte: ['$createdAt', weekAgo] }, '$total', 0] } },
              month: { $sum: { $cond: [{ $gte: ['$createdAt', monthAgo] }, '$total', 0] } },
              prevMonth: { $sum: { $cond: [{ $lt: ['$createdAt', monthAgo] }, '$total', 0] } }
            }
          }
        ],
        weekly: [
          { $match: { createdAt: { $gte: dayBoundaries[0], $lt: dayBoundaries[7] } } },
          {
            $bucket: {
              groupBy: '$createdAt',
              boundaries: dayBoundaries,
              default: 'out_of_range',
              output: { total: { $sum: '$total' } }
            }
          }
        ]
      }
    }
  ]);

  // ── ۲) شمارش سفارش‌ها بر اساس وضعیت: به جای ۶ کوئری، یک کوئری
  const orderStatusPromise = Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // ── ۳) پرفروش‌ترین محصولات (محدود به یک ماه، مطابق برچسب «ماهانه» در UI)
  const topProductsPromise = Order.aggregate([
    { $match: { createdAt: { $gte: monthAgo } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        sales: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { sales: -1 } },
    { $limit: 5 }
  ]);

  // ── ۴) سفارش‌های اخیر با نام کاربر در همان کوئری (بدون populate جداگانه)
  const recentOrdersPromise = Order.aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userDoc' } },
    {
      $project: {
        _id: 0,
        orderRef: 1,
        total: 1,
        status: 1,
        createdAt: 1,
        customer: { $arrayElemAt: ['$userDoc.name', 0] }
      }
    }
  ]);

  // ── ۵) تیکت‌ها: به جای ۴ کوئری، یک کوئری
  const ticketPromise = Ticket.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // ── اجرای کاملاً موازی همه‌چیز
  const [
    revenueRes,
    orderStatusRes,
    topProducts,
    recentOrdersRaw,
    usersTotal,
    usersNewToday,
    usersNewWeek,
    usersActive,
    productsTotal,
    productsOutOfStock,
    productsLowStock,
    ticketRes
  ] = await Promise.all([
    revenuePromise,
    orderStatusPromise,
    topProductsPromise,
    recentOrdersPromise,
    User.estimatedDocumentCount(),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ lastLogin: { $gte: weekAgo } }),
    Product.estimatedDocumentCount(),
    Product.countDocuments({ stock: 0 }),
    Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
    ticketPromise
  ]);

  // ── پردازش درآمد
  const totals = first(first(revenueRes)?.totals) || { today: 0, week: 0, month: 0, prevMonth: 0 };
  const growth = totals.prevMonth > 0
    ? Number((((totals.month - totals.prevMonth) / totals.prevMonth) * 100).toFixed(1))
    : (totals.month > 0 ? 100 : 0);

  // ── پردازش نمودار هفتگی (سطل‌ها را روی ۷ روز نگاشت می‌کنیم تا روزهای خالی هم صفر باشند)
  const bucketMap = new Map();
  for (const b of (first(revenueRes)?.weekly || [])) {
    if (b._id instanceof Date) bucketMap.set(new Date(b._id).getTime(), b.total || 0);
  }
  const weeklyRevenue = dayBoundaries.slice(0, 7).map((d) => ({
    day: DAY_NAMES[d.getDay()],
    value: bucketMap.get(d.getTime()) || 0
  }));

  // ── پردازش وضعیت سفارش‌ها
  const orderCounts = {};
  let ordersTotal = 0;
  for (const row of orderStatusRes) {
    orderCounts[row._id] = row.count;
    ordersTotal += row.count;
  }

  // ── پردازش تیکت‌ها
  const ticketCounts = {};
  let ticketsTotal = 0;
  for (const row of ticketRes) {
    ticketCounts[row._id] = row.count;
    ticketsTotal += row.count;
  }

  return {
    revenue: {
      today: totals.today || 0,
      week: totals.week || 0,
      month: totals.month || 0,
      growth
    },
    orders: {
      total: ordersTotal,
      pending: orderCounts.pending || 0,
      processing: orderCounts.processing || 0,
      shipped: orderCounts.shipped || 0,
      delivered: orderCounts.delivered || 0,
      cancelled: orderCounts.cancelled || 0
    },
    users: {
      total: usersTotal,
      newToday: usersNewToday,
      newWeek: usersNewWeek,
      active: usersActive
    },
    products: {
      total: productsTotal,
      outOfStock: productsOutOfStock,
      lowStock: productsLowStock
    },
    tickets: {
      total: ticketsTotal,
      open: ticketCounts.open || 0,
      inProgress: ticketCounts.in_progress || 0,
      resolved: ticketCounts.resolved || 0
    },
    weeklyRevenue,
    topProducts,
    recentOrders: recentOrdersRaw.map((o) => ({
      id: o.orderRef,
      customer: o.customer || 'نامشخص',
      total: o.total,
      status: o.status,
      date: new Date(o.createdAt).toLocaleDateString('fa-IR')
    }))
  };
};

const getDashboardStats = async (req, res) => {
  try {
    if (req.query.fresh === '1') del(CACHE_KEY);
    const data = await getOrSet(CACHE_KEY, CACHE_TTL, buildStats);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[dashboard] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// برای پاک‌کردن دستی کش بعد از ثبت سفارش یا تغییر وضعیت
const invalidateDashboardCache = () => del(CACHE_KEY);

module.exports = { getDashboardStats, invalidateDashboardCache };
