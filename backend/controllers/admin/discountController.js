const Discount = require('../../models/Discount');

const getDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json({ success: true, data: discounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDiscount = async (req, res) => {
  try {
    // نرمال‌سازی کد
    if (req.body.code) req.body.code = req.body.code.trim().toUpperCase();
    const discount = new Discount(req.body);
    await discount.save();
    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'این کد تخفیف قبلاً ثبت شده است' });
    }
    // خطای اعتبارسنجی
    if (error.name === 'ValidationError' || error.message.includes('تاریخ') || error.message.includes('درصدی')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDiscount = async (req, res) => {
  try {
    if (req.body.code) req.body.code = req.body.code.trim().toUpperCase();
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!discount) return res.status(404).json({ success: false, message: 'کد تخفیف یافت نشد' });
    res.json({ success: true, data: discount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'این کد تخفیف قبلاً ثبت شده است' });
    }
    if (error.name === 'ValidationError' || error.message.includes('تاریخ') || error.message.includes('درصدی')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ success: false, message: 'کد تخفیف یافت نشد' });
    res.json({ success: true, message: 'کد تخفیف حذف شد' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDiscounts, createDiscount, updateDiscount, deleteDiscount };
