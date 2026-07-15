const Product = require('../models/Product');
const Category = require('../models/Category');

const getFinalPrice = (product) => {
  if (product.discountPercent && product.discountPercent > 0) {
    return product.price * (1 - product.discountPercent / 100);
  }
  return product.price;
};

const getProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12, sort = 'newest' } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const cat = await Category.findOne({ slug: category });
        if (cat) filter.category = cat._id;
      }
    }
    if (search) {
      filter.$or = [
        { 'name.fa': { $regex: search, $options: 'i' } },
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'shortDesc.fa': { $regex: search, $options: 'i' } },
        { 'shortDesc.en': { $regex: search, $options: 'i' } },
      ];
    }
    let sortOption = {};
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else sortOption = { createdAt: -1 };
    const skip = (page - 1) * limit;
    const products = await Product.find(filter).populate('category').sort(sortOption).skip(skip);
    const total = await Product.countDocuments(filter);
    const productsWithFinalPrice = products.map(p => ({
      ...p.toObject(),
      finalPrice: getFinalPrice(p),
      priceFormatted: p.price.toLocaleString('fa-IR'),
      finalPriceFormatted: getFinalPrice(p).toLocaleString('fa-IR')
    }));
    res.json({ success: true, data: productsWithFinalPrice, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductBySlugOrId = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { id } = req.params;
    // اگر id یک ObjectId معتبر بود هم با _id و هم با slug جستجو کن؛ در غیر این صورت فقط slug
    const or = [{ slug: id }];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });
    const product = await Product.findOne({ $or: or })
      .populate('category')
      .populate({
        path: 'relatedProducts',
        select: 'name slug mainImage price discountPercent category stock',
        populate: { path: 'category', select: 'name slug' }
      });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    // افزایش بازدید به صورت اتمیک و بدون انتظار (سریع‌تر و امن‌تر)
    Product.updateOne({ _id: product._id }, { $inc: { viewsCount: 1 } }).catch(() => {});
    const productObj = product.toObject();
    productObj.finalPrice = getFinalPrice(product);
    productObj.priceFormatted = product.price.toLocaleString('fa-IR');
    productObj.finalPriceFormatted = productObj.finalPrice.toLocaleString('fa-IR');

    // اگر محصولات مرتبط دستی انتخاب نشده، از دسته‌بندی خودکار بگیر
    if (!productObj.relatedProducts || productObj.relatedProducts.length === 0) {
      const categoryId = product.category?._id || product.category;
      if (categoryId) {
        const autoRelated = await Product.find({
          category: categoryId,
          _id: { $ne: product._id },
          status: 'active'
        })
          .select('name slug mainImage price discountPercent category stock')
          .populate('category', 'name slug')
          .limit(6)
          .sort({ createdAt: -1 });
        productObj.relatedProducts = autoRelated;
      }
    }

    res.json({ success: true, data: productObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' }).sort({ sortOrder: 1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProducts, getProductBySlugOrId, getCategories };