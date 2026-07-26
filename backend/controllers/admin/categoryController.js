const mongoose = require('mongoose');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const { invalidateCategoryCache } = require('../../utils/cache');

const EDITABLE = [
  'name', 'slug', 'description', 'icon', 'image',
  'sortOrder', 'status', 'parent', 'metaTitle', 'metaDescription',
];

const pick = (src = {}) =>
  EDITABLE.reduce((acc, k) => {
    if (src[k] !== undefined) acc[k] = src[k];
    return acc;
  }, {});

const fail = (res, error) => {
  console.error('[admin/categoryController]', error);
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'دسته‌بندی با این نام یا اسلاگ قبلاً ثبت شده است' });
  }
  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors).map((e) => e.message).join('، '),
    });
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'شناسه نامعتبر است' });
  }
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'خطای سرور' : error.message,
  });
};

const getCategories = async (req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      Category.find().sort({ sortOrder: 1, _id: 1 }).lean(),
      Product.aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    const data = categories.map((c) => ({
      ...c,
      productCount: countMap.get(String(c._id)) || 0,
    }));

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data });
  } catch (error) {
    fail(res, error);
  }
};

const createCategory = async (req, res) => {
  try {
    const body = pick(req.body);
    if (!body.name?.fa || !String(body.name.fa).trim()) {
      return res.status(400).json({ success: false, message: 'نام فارسی دسته‌بندی الزامی است' });
    }
    const category = await Category.create(body);
    invalidateCategoryCache();
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    fail(res, error);
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'شناسه نامعتبر است' });
    }
    if (String(req.body?.parent || '') === id) {
      return res.status(400).json({ success: false, message: 'دسته‌بندی نمی‌تواند والد خودش باشد' });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: pick(req.body) },
      { new: true, runValidators: true, context: 'query' }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'دسته‌بندی یافت نشد' });
    }

    invalidateCategoryCache();
    res.json({ success: true, data: category });
  } catch (error) {
    fail(res, error);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'شناسه نامعتبر است' });
    }

    const [productCount, childCount] = await Promise.all([
      Product.countDocuments({ category: id }),
      Category.countDocuments({ parent: id }),
    ]);

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این دسته‌بندی دارای ${productCount} محصول است و قابل حذف نیست. ابتدا محصولات را حذف یا دسته‌بندی آن‌ها را تغییر دهید.`,
      });
    }
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این دسته‌بندی دارای ${childCount} زیرمجموعه است. ابتدا زیرمجموعه‌ها را حذف کنید.`,
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'دسته‌بندی یافت نشد' });
    }

    invalidateCategoryCache();
    res.json({ success: true, message: 'دسته‌بندی حذف شد' });
  } catch (error) {
    fail(res, error);
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
