const Product = require('../../models/Product');
const Category = require('../../models/Category');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const getProducts = async (req, res) => {
  try {
    // تغییر limit پیش‌فرض به 1000 تا همه محصولات لود شوند
    const { category, search, status, page = 1, limit = 1000, sort = 'newest' } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') filter.status = status;
    
    // اصلاح جستجو برای ساختار دو زبانه
    if (search) {
      filter.$or = [
        { 'name.fa': { $regex: search, $options: 'i' } },
        { 'name.en': { $regex: search, $options: 'i' } }
      ];
    }
    
    let sortOption = {};
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else sortOption = { createdAt: -1 };
    
    const skip = (page - 1) * limit;
    const products = await Product.find(filter).populate('category').sort(sortOption).skip(skip).limit(parseInt(limit));
    const total = await Product.countDocuments(filter);
    res.json({ success: true, data: products, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category')
      .populate('relatedProducts', 'name slug mainImage price category');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const slugify = (text) =>
  text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const resolveCategory = async (value) => {
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value)) return value;
  // جستجوی دسته‌بندی بر اساس نام فارسی یا انگلیسی
  const cat = await Category.findOne({ $or: [{ 'name.fa': value }, { 'name.en': value }] });
  return cat ? cat._id : null;
};

const deleteImageFiles = (imagePath) => {
  if (!imagePath) return;
  const filename = path.basename(imagePath);
  const fullPath = path.join(__dirname, '../../../uploads/products', filename);
  try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
};

const createProduct = async (req, res) => {
  try {
    const { categoryId, category, image, gallery, relatedProducts, ...rest } = req.body;
    const productData = { ...rest };
    
    // بررسی نام فارسی و قیمت
    if (!productData.name || !productData.name.fa || !productData.price) {
      return res.status(400).json({ success: false, message: 'نام فارسی و قیمت محصول الزامی هستند' });
    }
    
    const categoryValue = categoryId || category;
    const resolvedCategory = await resolveCategory(categoryValue);
    if (!resolvedCategory) {
      return res.status(400).json({
        success: false,
        message: `دسته‌بندی "${categoryValue}" یافت نشد. ابتدا دسته‌بندی را در بخش مدیریت دسته‌بندی‌ها بسازید.`
      });
    }
    productData.category = resolvedCategory;
    
    if (!productData.slug) {
      const base = slugify(productData.name.fa) || 'product';
      productData.slug = `${base}-${Date.now()}`;
    }
    
    if (image) productData.mainImage = image;
    if (gallery) productData.images = Array.isArray(gallery) ? gallery : [gallery];
    
    // محصولات مرتبط
    if (relatedProducts && Array.isArray(relatedProducts)) {
      productData.relatedProducts = relatedProducts.filter(id => mongoose.Types.ObjectId.isValid(id));
    }
    
    // ساخت shortDesc خودکار اگر خالی بود
    if ((!productData.shortDesc || !productData.shortDesc.fa) && productData.description?.fa) {
      productData.shortDesc = {
        fa: productData.description.fa.substring(0, 200),
        en: productData.description.en ? productData.description.en.substring(0, 200) : ''
      };
    }
    
    const product = new Product(productData);
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { categoryId, category, image, gallery, relatedProducts, ...rest } = req.body;
    const productData = { ...rest };
    
    const categoryValue = categoryId || category;
    if (categoryValue) {
      const resolvedCategory = await resolveCategory(categoryValue);
      if (!resolvedCategory) {
        return res.status(400).json({
          success: false,
          message: `دسته‌بندی "${categoryValue}" یافت نشد.`
        });
      }
      productData.category = resolvedCategory;
    }
    
    if (image) {
      const existing = await Product.findById(req.params.id).select('mainImage');
      if (existing && existing.mainImage && existing.mainImage !== image) {
        deleteImageFiles(existing.mainImage);
      }
      productData.mainImage = image;
    }
    
    if (gallery) {
      const existing = await Product.findById(req.params.id).select('images');
      if (existing && existing.images) {
        existing.images.forEach(img => { if (!gallery.includes(img)) deleteImageFiles(img); });
      }
      productData.images = Array.isArray(gallery) ? gallery : [gallery];
    }
    
    // محصولات مرتبط
    if (Array.isArray(relatedProducts)) {
      productData.relatedProducts = relatedProducts.filter(id => mongoose.Types.ObjectId.isValid(id));
    }
    
    if ((!productData.shortDesc || !productData.shortDesc.fa) && productData.description?.fa) {
      productData.shortDesc = {
        fa: productData.description.fa.substring(0, 200),
        en: productData.description.en ? productData.description.en.substring(0, 200) : ''
      };
    }
    
    const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    deleteImageFiles(product.mainImage);
    if (product.images && product.images.length) {
      product.images.forEach(deleteImageFiles);
    }

    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const filePath = `/uploads/products/${req.file.filename}`;
    res.json({ success: true, filePath });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, uploadProductImage };