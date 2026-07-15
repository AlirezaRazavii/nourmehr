const Category = require('../../models/Category');
const Product = require('../../models/Product');
const { del } = require('../../utils/cache');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 });
    const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id?.toString()] = c.count; });
    const data = categories.map(c => ({ ...c.toObject(), productCount: countMap[c._id.toString()] || 0 }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    // اطمینان از اینکه نام فارسی حتماً وارد شده است
    if (!req.body.name || !req.body.name.fa) {
      return res.status(400).json({ success: false, message: 'نام فارسی دسته‌بندی الزامی است' });
    }
    const category = new Category(req.body);
    await category.save();
    del('public:categories');
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    del('public:categories');
    res.json({ success: true, data: category });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `این دسته‌بندی دارای ${productCount} محصول است و قابل حذف نیست. ابتدا محصولات را حذف یا دسته‌بندی آنها را تغییر دهید.`
      });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    del('public:categories');
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };