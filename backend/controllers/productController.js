const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { getOrSet, KEYS } = require('../utils/cache');

const LIST_FIELDS =
  'name slug mainImage price oldPrice discountPercent stock status category ' +
  'shortDesc isFeatured ratingAverage ratingCount colors sizes createdAt';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) => toNum(v).toLocaleString('fa-IR');

const getFinalPrice = (p) => {
  const price = toNum(p?.price);
  const d = toNum(p?.discountPercent);
  if (d > 0 && d < 100) return Math.round(price * (1 - d / 100));
  return price;
};

const withPricing = (p) => {
  const finalPrice = getFinalPrice(p);
  return {
    ...p,
    finalPrice,
    priceFormatted: fmt(p.price),
    finalPriceFormatted: fmt(finalPrice),
  };
};

const fail = (res, error, code = 500) => {
  console.error('[productController]', error);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(code).json({
    success: false,
    message: isProd ? 'خطای سرور' : error.message,
  });
};

const SORTS = {
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
};

const getProducts = async (req, res) => {
  try {
    const { category, search, sort = 'newest' } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const q = String(search || '').trim().slice(0, 80);
    const sortKey = SORTS[sort] ? sort : 'newest';
    const cat = String(category || 'all').trim().slice(0, 80);

    const cacheKey =
      `${KEYS.PRODUCT_LIST}${cat}|${q}|${pageNum}|${limitNum}|${sortKey}`;

    const payload = await getOrSet(cacheKey, 60, async () => {
      const filter = { status: { $ne: 'inactive' } };

      if (cat && cat !== 'all') {
        if (mongoose.Types.ObjectId.isValid(cat)) {
          filter.category = new mongoose.Types.ObjectId(cat);
        } else {
          const found = await getOrSet(
            `${KEYS.CATEGORY_SLUG}${cat}`,
            600,
            () => Category.findOne({ slug: cat }).select('_id').lean(),
            { negativeTtl: 60 }
          );
          // دستهٔ ناموجود => نتیجهٔ خالی، نه «محصولات بدون دسته»
          if (!found) return { data: [], total: 0 };
          filter.category = found._id;
        }
      }

      if (q) {
        const rx = new RegExp(escapeRegex(q), 'i');
        filter.$or = [
          { 'name.fa': rx }, { 'name.en': rx },
          { 'shortDesc.fa': rx }, { 'shortDesc.en': rx },
        ];
      }

      const [docs, total] = await Promise.all([
        Product.find(filter)
          .select(LIST_FIELDS)
          .populate('category', 'name slug icon parents')
          .sort(SORTS[sortKey])
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Product.countDocuments(filter),
      ]);

      return { data: docs.map(withPricing), total };
    });

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({
      success: true,
      data: payload.data,
      total: payload.total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(payload.total / limitNum)),
    });
  } catch (error) {
    fail(res, error);
  }
};

const getProductBySlugOrId = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || id.length > 120) {
      return res.status(400).json({ success: false, message: 'شناسه نامعتبر است' });
    }

    const productData = await getOrSet(
      `${KEYS.PRODUCT_ONE}${id}`,
      120,
      async () => {
        const or = [{ slug: id }];
        if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });

        const product = await Product.findOne({ $or: or })
          .populate('category', 'name slug icon parents')
          .populate({
            path: 'relatedProducts',
            select: 'name slug mainImage price discountPercent category stock',
            populate: { path: 'category', select: 'name slug' },
          })
          .lean();

        if (!product) return null;

        const out = withPricing(product);
        out.relatedProducts = (product.relatedProducts || []).map(withPricing);

        if (out.relatedProducts.length === 0) {
          const categoryId = product.category?._id || product.category;
          if (categoryId) {
            const auto = await Product.find({
              category: categoryId,
              _id: { $ne: product._id },
              status: 'active',
            })
              .select('name slug mainImage price discountPercent category stock')
              .populate('category', 'name slug')
              .sort({ createdAt: -1 })
              .limit(6)
              .lean();
            out.relatedProducts = auto.map(withPricing);
          }
        }
        return out;
      },
      { negativeTtl: 30 }
    );

    if (!productData) {
      return res.status(404).json({ success: false, message: 'محصول یافت نشد' });
    }

    // شمارنده: خارج از چرخهٔ پاسخ، خطایش نباید ریکوئست را بشکند
    Product.updateOne({ _id: productData._id }, { $inc: { viewsCount: 1 } })
      .catch((e) => console.error('[viewsCount]', e.message));

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, data: productData });
  } catch (error) {
    fail(res, error);
  }
};

const getCategories = async (req, res) => {
  try {
    const data = await getOrSet(KEYS.PRODUCT_CATEGORIES, 600, () =>
      Category.find({ status: 'active' })
        .select('name slug icon image sortOrder parents')
        .sort({ sortOrder: 1, _id: 1 })
        .lean()
    );
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: data || [] });
  } catch (error) {
    fail(res, error);
  }
};

module.exports = { getProducts, getProductBySlugOrId, getCategories };
