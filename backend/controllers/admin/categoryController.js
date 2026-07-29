const mongoose = require('mongoose');
const path = require('path');
const fsp = require('fs').promises;

const Category = require('../../models/Category');
const Product = require('../../models/Product');
const { PRODUCTS_UPLOAD_DIR } = require('../../middleware/upload');
const { invalidateCategoryCache } = require('../../utils/cache');

const EDITABLE = [
  'name', 'slug', 'description', 'icon', 'image',
  'sortOrder', 'status', 'parents', 'metaTitle', 'metaDescription',
];

const pick = (src = {}) =>
  EDITABLE.reduce((acc, k) => {
    if (src[k] !== undefined) acc[k] = src[k];
    return acc;
  }, {});

const IMAGE_PATH_RE = /^\/uploads\/products\/[A-Za-z0-9._-]+$/;

/* ------------------------- حذف امن فایل از دیسک ------------------------- */
const deleteImageFile = async (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return;

  const filename = path.basename(imagePath.split('?')[0]);
  if (!filename || filename === '.' || filename === '..' || filename.includes('\0')) return;

  const full = path.resolve(PRODUCTS_UPLOAD_DIR, filename);
  if (full !== PRODUCTS_UPLOAD_DIR && !full.startsWith(PRODUCTS_UPLOAD_DIR + path.sep)) return;

  try {
    await fsp.unlink(full);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[admin/categoryController:unlink]', full, err.message);
  }
};

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
    if (req.body?.parents && Array.isArray(req.body.parents) && req.body.parents.includes(id)) {
      return res.status(400).json({ success: false, message: 'دسته‌بندی نمی‌تواند والد خودش باشد' });
    }

    const body = pick(req.body);

    // اگر تصویر عوض شد، فایل قدیمی بعد از موفقیت آپدیت پاک می‌شود
    let oldImage = null;
    if (body.image !== undefined) {
      const existing = await Category.findById(id).select('image').lean();
      if (existing?.image && existing.image !== body.image) oldImage = existing.image;
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true, context: 'query' }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'دسته‌بندی یافت نشد' });
    }

    if (oldImage) deleteImageFile(oldImage);

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
      Category.countDocuments({ parents: id }),
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

    if (category.image) deleteImageFile(category.image);

    invalidateCategoryCache();
    res.json({ success: true, message: 'دسته‌بندی حذف شد' });
  } catch (error) {
    fail(res, error);
  }
};

/* -------------------------- آپلود / حذف تصویر -------------------------- */
const uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'فایلی ارسال نشده است' });
    }
    const filePath = `/uploads/products/${req.file.filename}`;
    res.status(201).json({
      success: true,
      filePath,
      url: filePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    fail(res, error);
  }
};

const deleteCategoryImage = async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, message: 'مسیر تصویر ارسال نشده است' });
    }
    if (!IMAGE_PATH_RE.test(filePath)) {
      return res.status(400).json({ success: false, message: 'مسیر تصویر نامعتبر است' });
    }

    const [usedByCategory, usedByProduct] = await Promise.all([
      Category.exists({ image: filePath }),
      Product.exists({ $or: [{ mainImage: filePath }, { images: filePath }] }),
    ]);

    if (usedByCategory || usedByProduct) {
      return res.status(409).json({
        success: false,
        message: 'این تصویر در حال استفاده است و قابل حذف مستقیم نیست',
      });
    }

    await deleteImageFile(filePath);
    res.json({ success: true, message: 'تصویر حذف شد' });
  } catch (error) {
    fail(res, error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  deleteCategoryImage,
};
