const Collection = require('../models/Collection');
const Product = require('../models/Product');
const { getOrSet } = require('../utils/cache');

const getFinalPrice = (product) => {
  if (product.discountPercent && product.discountPercent > 0) {
    return product.price * (1 - product.discountPercent / 100);
  }
  return product.price;
};

const formatProduct = (p) => ({
  ...p,
  finalPrice: getFinalPrice(p),
  priceFormatted: p.price.toLocaleString('fa-IR'),
  finalPriceFormatted: getFinalPrice(p).toLocaleString('fa-IR')
});

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
          products: products.map(formatProduct)
        };
      }));
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// صفحه اختصاصی یک کالکشن (با slug یا id) + محصولات با صفحه‌بندی
const getCollectionBySlugOrId = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { id } = req.params;
    const { page = 1, limit = 12, sort = 'newest' } = req.query;

    const or = [{ slug: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });

    const collection = await Collection.findOne({ $or: or });
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    let sortOption = {};
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else sortOption = { createdAt: -1 };

    const skip = (page - 1) * limit;
    const filter = { collections: collection._id, status: 'active' };
    const products = await Product.find(filter)
      .populate('category')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        collection: collection.toObject(),
        products: products.map(formatProduct),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCollections, getHomeCollections, getCollectionBySlugOrId };
