const Discount = require('../models/Discount');
const Category = require('../models/Category');
const { getOrSet } = require('../utils/cache');

const getActiveDiscounts = async (req, res) => {
  try {
    const data = await getOrSet('public:discounts', 60, async () => {
      const now = new Date();

      // ⭐ فیکس باگ قدیمی: کدهای بدون تاریخ پایان (همیشگی) هم نمایش داده شوند —
      //    کوئری قبلی endDate: { $gte: now } سندهای بدون endDate را حذف می‌کرد
      const discounts = await Discount.find({
        status: 'active',
        isPublic: true,
        startDate: { $lte: now },
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      })
        .select('code type value minPurchase maxDiscount endDate description firstPurchaseOnly usedCount usageLimit products categories allowedPaymentMethods')
        .sort({ endDate: 1 })
        .lean();

      const filtered = discounts.filter((d) => {
        const used = Number(d.usedCount) || 0;
        const limit = d.usageLimit == null ? Infinity : Number(d.usageLimit);
        return used < limit;
      });

      // نام دسته‌ها برای نمایش محدودیت‌ها («فقط الماس‌تراش‌ها»)
      const catIds = [];
      for (const d of filtered) {
        for (const id of (d.categories || [])) catIds.push(String(id));
      }
      const catNameMap = new Map();
      if (catIds.length) {
        try {
          const cats = await Category.find({ _id: { $in: catIds } }).select('name').lean();
          for (const c of cats) {
            const n = c.name;
            const label = typeof n === 'string' ? n : ((n && (n.fa || n.en)) || '');
            if (label) catNameMap.set(String(c._id), label);
          }
        } catch { /* نمایش نام دسته حیاتی نیست */ }
      }

      return filtered.map((d) => {
        const { usedCount, usageLimit, categories, products, ...rest } = d;
        const categoryNames = (categories || [])
          .map((id) => catNameMap.get(String(id)))
          .filter(Boolean);
        return {
          ...rest,
          restrictions: {
            hasCategories: categoryNames.length > 0,
            categoryNames,
            productCount: (products || []).length,
            // null = همه روش‌ها مجاز — آرایه = لیست سفید
            allowedPaymentMethods:
              (d.allowedPaymentMethods && d.allowedPaymentMethods.length)
                ? d.allowedPaymentMethods
                : null,
          },
        };
      });
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActiveDiscounts };
