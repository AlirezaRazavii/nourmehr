const Collection = require('../../models/Collection');
const Product = require('../../models/Product');
const { delByPrefix } = require('../../utils/cache');


const getCollections = async (req, res) => {
  try {
    const collections = await Collection.find().sort({ sortOrder: 1 });
    const counts = await Product.aggregate([
      { $unwind: '$collections' },
      { $group: { _id: '$collections', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id?.toString()] = c.count; });
    const data = collections.map(c => ({
      ...c.toObject(),
      productCount: countMap[c._id.toString()] || 0
    }));
    res.json({ success: true, data });
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

const createCollection = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name || !data.name.fa) {
      return res.status(400).json({ success: false, message: 'نام فارسی کالکشن الزامی است' });
    }
    if (!data.slug) {
      // ساخت slug بر اساس نام فارسی
      const base = slugify(data.name.fa) || 'collection';
      data.slug = `${base}-${Date.now()}`;
    }
    const collection = new Collection(data);
    await collection.save();
    delByPrefix('public:home-collections');
    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    delByPrefix('public:home-collections');
    res.json({ success: true, data: collection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    await Product.updateMany(
      { collections: req.params.id },
      { $pull: { collections: req.params.id } }
    );
    delByPrefix('public:home-collections');
    res.json({ success: true, message: 'Collection deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const setCollectionProducts = async (req, res) => {
  try {
    const { productIds = [] } = req.body;
    const collectionId = req.params.id;

    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    await Product.updateMany(
      { collections: collectionId },
      { $pull: { collections: collectionId } }
    );
    if (productIds.length > 0) {
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $addToSet: { collections: collectionId } }
      );
    }
    delByPrefix('public:home-collections');
    res.json({ success: true, message: 'محصولات کالکشن به‌روزرسانی شد' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  setCollectionProducts
};
