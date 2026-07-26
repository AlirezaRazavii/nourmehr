const mongoose = require('mongoose');
const path = require('path');
const fsp = require('fs').promises;

const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { PRODUCTS_UPLOAD_DIR } = require('../../middleware/upload');
const { invalidateProductCache, invalidateCategoryCache } = require('../../utils/cache');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const buildUniqueSlug = async (base, excludeId = null) => {
  const root = slugify(base) || 'product';
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? root : `${root}-${crypto_suffix()}`;
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    if (!(await Product.exists(query))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
};

const crypto_suffix = () => Math.random().toString(36).slice(2, 7);

const resolveCategory = async (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (mongoose.Types.ObjectId.isValid(raw)) {
    const byId = await Category.exists({ _id: raw });
    if (byId) return new mongoose.Types.ObjectId(raw);
  }
  const cat = await Category.findOne({
    $or: [{ slug: raw }, { 'name.fa': raw }, { 'name.en': raw }],
  })
    .select('_id')
    .lean();
  return cat ? cat._id : null;
};

/* ------------------------------ حذف امن فایل‌ها ------------------------------ */
const deleteImageFile = async (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return;

  const filename = path.basename(imagePath.split('?')[0]);
  if (!filename || filename === '.' || filename === '..' || filename.includes('\0')) return;

  const full = path.resolve(PRODUCTS_UPLOAD_DIR, filename);
  // محافظت قطعی در برابر path traversal (با جداکننده مسیر، نه startsWith خام)
  if (full !== PRODUCTS_UPLOAD_DIR && !full.startsWith(PRODUCTS_UPLOAD_DIR + path.sep)) return;

  try {
    await fsp.unlink(full);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[AdminProduct:unlink]', full, err.message);
  }
};

const deleteMany = (list = []) =>
  Promise.allSettled([...new Set(list.filter(Boolean))].map(deleteImageFile));

/* -------------------------------- خطاها ------------------------------------ */
const handleError = (res, error, ctx = '') => {
  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors).map((e) => e.message).join(' | '),
    });
  }
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'مقدار';
    return res.status(409).json({ success: false, message: `${field} تکراری است` });
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'شناسه ارسال‌شده نامعتبر است' });
  }
  console.error(`[AdminProduct${ctx ? ':' + ctx : ''}]`, error);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'خطای داخلی سرور' : error.message,
  });
};

const IMMUTABLE_FIELDS = [
  '_id', 'id', '__v', 'createdAt', 'updatedAt',
  'ratingAverage', 'ratingCount', 'viewsCount', 'sold',
];
const stripImmutable = (obj) => {
  IMMUTABLE_FIELDS.forEach((k) => delete obj[k]);
  return obj;
};

const clampShortDesc = (data) => {
  if (!data.shortDesc?.fa && data.description?.fa) {
    data.shortDesc = {
      fa: String(data.description.fa).replace(/<[^>]*>/g, '').slice(0, 200),
      en: data.description.en ? String(data.description.en).replace(/<[^>]*>/g, '').slice(0, 200) : '',
    };
  }
  return data;
};

/* ---------------------------------- READ ----------------------------------- */
const getProducts = async (req, res) => {
  try {
    const { category, search, status, sort = 'newest' } = req.query;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const filter = {};

    if (category && category !== 'all') {
      const catId = await resolveCategory(category);
      if (!catId) {
        return res.json({ success: true, data: [], total: 0, page, pages: 0 });
      }
      filter.category = catId;
    }

    if (status && status !== 'all') {
      if (!['active', 'inactive', 'out_of_stock'].includes(status)) {
        return res.status(400).json({ success: false, message: 'وضعیت درخواستی نامعتبر است' });
      }
      filter.status = status;
    }

    const q = String(search || '').trim().slice(0, 80);
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ 'name.fa': rx }, { 'name.en': rx }, { slug: rx }, { sku: rx }];
    }

    const sortMap = {
      price_asc: { price: 1, _id: 1 },
      price_desc: { price: -1, _id: 1 },
      stock_asc: { stock: 1, _id: 1 },
      oldest: { createdAt: 1, _id: 1 },
      newest: { createdAt: -1, _id: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.newest;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('-description -features -relatedProducts')
        .populate('category', 'name slug')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: false }),
      Product.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: products,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    handleError(res, error, 'getProducts');
  }
};

const getProductById = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'شناسه ارسال نشده است' });

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id.toLowerCase() };

    const product = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('relatedProducts', 'name slug mainImage price category')
      .lean();

    if (!product) return res.status(404).json({ success: false, message: 'محصول یافت نشد' });

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: product });
  } catch (error) {
    handleError(res, error, 'getProductById');
  }
};

/* --------------------------------- CREATE ---------------------------------- */
const createProduct = async (req, res) => {
  let createdImages = [];
  try {
    const { categoryId, category, image, gallery, relatedProducts, ...rest } = req.body;
    const productData = stripImmutable({ ...rest });

    if (!productData.name?.fa || String(productData.name.fa).trim() === '') {
      return res.status(400).json({ success: false, message: 'نام فارسی محصول الزامی است' });
    }
    if (productData.price === undefined || productData.price === null || productData.price === '') {
      return res.status(400).json({ success: false, message: 'قیمت محصول الزامی است' });
    }

    productData.price = Number(productData.price);
    if (!Number.isFinite(productData.price) || productData.price < 0) {
      return res.status(400).json({ success: false, message: 'قیمت باید عددی نامنفی باشد' });
    }
    if (productData.stock !== undefined) {
      productData.stock = Math.max(0, parseInt(productData.stock, 10) || 0);
    }
    if (productData.discountPercent !== undefined) {
      const d = Number(productData.discountPercent) || 0;
      if (d < 0 || d > 100) {
        return res.status(400).json({ success: false, message: 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد' });
      }
      productData.discountPercent = d;
    }

    const categoryValue = categoryId || category;
    const resolvedCategory = await resolveCategory(categoryValue);
    if (!resolvedCategory) {
      return res.status(400).json({
        success: false,
        message: `دسته‌بندی "${categoryValue || ''}" یافت نشد. ابتدا دسته‌بندی را در بخش مدیریت دسته‌بندی‌ها بسازید.`,
      });
    }
    productData.category = resolvedCategory;
    productData.slug = await buildUniqueSlug(productData.slug || productData.name.fa);

    if (image !== undefined) productData.mainImage = image || '';
    if (gallery !== undefined) {
      productData.images = Array.isArray(gallery) ? gallery.filter(Boolean) : gallery ? [gallery] : [];
    }
    createdImages = [productData.mainImage, ...(productData.images || [])].filter(Boolean);

    if (Array.isArray(relatedProducts)) {
      productData.relatedProducts = [
        ...new Set(relatedProducts.filter((rid) => mongoose.Types.ObjectId.isValid(rid)).map(String)),
      ].slice(0, 12);
    }

    clampShortDesc(productData);

    const product = await Product.create(productData);

    invalidateProductCache();
    invalidateCategoryCache();

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    // اگر ذخیره شکست خورد، تصاویر آپلودشده یتیم نمانند
    if (createdImages.length) deleteMany(createdImages);
    handleError(res, error, 'createProduct');
  }
};

/* --------------------------------- UPDATE ---------------------------------- */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'شناسه محصول نامعتبر است' });
    }

    const { categoryId, category, image, gallery, relatedProducts, ...rest } = req.body;
    const productData = stripImmutable({ ...rest });

    const existing = await Product.findById(id).select('mainImage images category').lean();
    if (!existing) return res.status(404).json({ success: false, message: 'محصول یافت نشد' });

    if (productData.price !== undefined) {
      productData.price = Number(productData.price);
      if (!Number.isFinite(productData.price) || productData.price < 0) {
        return res.status(400).json({ success: false, message: 'قیمت باید عددی نامنفی باشد' });
      }
    }
    if (productData.stock !== undefined) {
      productData.stock = Math.max(0, parseInt(productData.stock, 10) || 0);
    }
    if (productData.discountPercent !== undefined) {
      const d = Number(productData.discountPercent) || 0;
      if (d < 0 || d > 100) {
        return res.status(400).json({ success: false, message: 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد' });
      }
      productData.discountPercent = d;
    }

    let categoryChanged = false;
    const categoryValue = categoryId || category;
    if (categoryValue) {
      const resolvedCategory = await resolveCategory(categoryValue);
      if (!resolvedCategory) {
        return res.status(400).json({ success: false, message: `دسته‌بندی "${categoryValue}" یافت نشد.` });
      }
      categoryChanged = String(resolvedCategory) !== String(existing.category);
      productData.category = resolvedCategory;
    }

    if (productData.slug) {
      productData.slug = await buildUniqueSlug(productData.slug, id);
    }

    // فایل‌ها فقط جمع می‌شوند؛ حذف واقعی بعد از موفقیت آپدیت انجام می‌شود
    const filesToDelete = [];

    if (image !== undefined) {
      if (existing.mainImage && existing.mainImage !== image) filesToDelete.push(existing.mainImage);
      productData.mainImage = image || '';
    }

    if (gallery !== undefined) {
      const newGallery = Array.isArray(gallery) ? gallery.filter(Boolean) : gallery ? [gallery] : [];
      const keep = new Set([...newGallery, productData.mainImage ?? existing.mainImage]);
      (existing.images || []).forEach((img) => {
        if (!keep.has(img)) filesToDelete.push(img);
      });
      productData.images = newGallery;
    }

    if (Array.isArray(relatedProducts)) {
      productData.relatedProducts = [
        ...new Set(
          relatedProducts
            .filter((rid) => mongoose.Types.ObjectId.isValid(rid) && String(rid) !== String(id))
            .map(String)
        ),
      ].slice(0, 12);
    }

    clampShortDesc(productData);

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: productData },
      { new: true, runValidators: true, context: 'query' }
    ).populate('category', 'name slug');

    if (!product) return res.status(404).json({ success: false, message: 'محصول یافت نشد' });

    deleteMany(filesToDelete);
    invalidateProductCache();
    if (categoryChanged) invalidateCategoryCache();

    res.json({ success: true, data: product });
  } catch (error) {
    handleError(res, error, 'updateProduct');
  }
};

/* --------------------------------- DELETE ---------------------------------- */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'شناسه محصول نامعتبر است' });
    }

    // حذف اتمیک: اگر سند برنگردد یعنی قبلاً حذف شده و نباید فایلی پاک شود
    const product = await Product.findByIdAndDelete(id).select('mainImage images').lean();
    if (!product) return res.status(404).json({ success: false, message: 'محصول یافت نشد' });

    await Product.updateMany({ relatedProducts: id }, { $pull: { relatedProducts: id } });

    deleteMany([product.mainImage, ...(product.images || [])]);
    invalidateProductCache();
    invalidateCategoryCache();

    res.json({ success: true, message: 'محصول حذف شد' });
  } catch (error) {
    handleError(res, error, 'deleteProduct');
  }
};

/* --------------------------------- UPLOAD ---------------------------------- */
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'فایلی ارسال نشده است' });
    const filePath = `/uploads/products/${req.file.filename}`;
    res.status(201).json({
      success: true,
      filePath,
      url: filePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    handleError(res, error, 'uploadProductImage');
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, message: 'مسیر تصویر ارسال نشده است' });
    }
    if (!/^\/uploads\/products\/[A-Za-z0-9._-]+$/.test(filePath)) {
      return res.status(400).json({ success: false, message: 'مسیر تصویر نامعتبر است' });
    }

    // اگر تصویر هنوز به محصولی وصل است، نباید حذف شود
    const inUse = await Product.exists({
      $or: [{ mainImage: filePath }, { images: filePath }],
    });
    if (inUse) {
      return res.status(409).json({
        success: false,
        message: 'این تصویر به یک محصول متصل است و قابل حذف مستقیم نیست',
      });
    }

    await deleteImageFile(filePath);
    res.json({ success: true, message: 'تصویر حذف شد' });
  } catch (error) {
    handleError(res, error, 'deleteProductImage');
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
};
