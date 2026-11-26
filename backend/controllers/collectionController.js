const Collection = require('../models/Collection');
const Product = require('../models/Product');
const { getOrSet } = require('../utils/cache');
const { getPriceInfo, withCampaignView } = require('../utils/pricing');

// قیمت سایز-آگاه: ارزان‌ترین سایزِ تخفیف‌خورده (مطابق کارت محصولات و سبد)
const formatProduct = (raw) => {
  const p = withCampaignView(raw);
  const info = getPriceInfo(p);
  return {
    ...p,
    finalPrice: info.minPrice,
    priceFormatted: Number(p.price || 0).toLocaleString('fa-IR'),
    finalPriceFormatted: Number(info.minPrice || 0).toLocaleString('fa-IR'),
    priceInfo: info
  };
};

// لیست همه کالکشن‌های فعال (برای منو یا صفحه فهرست کالکشن‌ها)
const getCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ status: 'active' }).sort({ sortOrder: 1 });
    res.json({ success: true, data: collections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// کالکشن‌هایی که باید در صفحه هوم نمایش داده شوند، همراه با چند محصول هر کدام
const getHomeCollections = async (req, res) => {
  try {
    const previewLimit = parseInt(req.query.previewLimit) || 10;
    const cacheKey = `public:home-collections:${previewLimit}`;

    const data = await getOrSet(cacheKey, 300, async () => {
      const collections = await Collection.find({ status: 'active', showOnHome: true })
        .sort({ sortOrder: 1 })
        .lean();

      return Promise.all(collections.map(async (col) => {
        const products = await Product.find({ collections: col._id, status: 'active' })
          .populate('category')
          .sort({ createdAt: -1 })
          .limit(previewLimit)
          .lean();
        return {
          ...col,
          products
        };
      }));
    });

    // ⭐ قیمت‌ها بیرون از کش محاسبه می‌شوند
    const out = (data || []).map((col) => ({
      ...col,
      products: (col.products || []).map(formatProduct)
    }));

    res.json({ success: true, data: out });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// صفحه اختصاصی یک کالکشن (با slug یا id) + محصولات با صفحه‌بندی
const getCollectionBySlugOrId = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { id } = req.params;
    const { page = 1, limit = 100, sort = 'newest' } = req.query;

    const or = [{ slug: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });

    const collection = await Collection.findOne({ $or: or }).lean();
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    let sortOption = {};
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else sortOption = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 100));
    const skip = (pageNum - 1) * limitNum;

    const filter = { collections: collection._id, status: 'active' };

    const products = await Product.find(filter)
      .populate('category')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean(); // ← بدون این، ...p فیلدهای محصول را کپی نمی‌کرد و محصولات خالی برمی‌گشتند

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        collection,
        products: products.map(formatProduct),
        total
      }
    });
  } catch (error) {
    console.error('[getCollectionBySlugOrId] error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCollections, getHomeCollections, getCollectionBySlugOrId };
