const Discount = require('../models/Discount');

const getActiveDiscounts = async (req, res) => {
  try {
    const now = new Date();

    const discounts = await Discount.find({
      status: 'active',
      isPublic: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .select('code type value minPurchase maxDiscount endDate description firstPurchaseOnly usedCount usageLimit')
      .sort({ endDate: 1 })
      .lean();

    const filtered = discounts.filter((d) => {
      const used = Number(d.usedCount) || 0;
      const limit = d.usageLimit == null ? Infinity : Number(d.usageLimit);
      return used < limit;
    });

    const result = filtered.map(({ usedCount, usageLimit, ...rest }) => rest);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActiveDiscounts };
