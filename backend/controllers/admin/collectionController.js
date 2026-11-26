const mongoose = require('mongoose');
const Collection = require('../../models/Collection');
const Product = require('../../models/Product');
const { delByPrefix, invalidateProductCache } = require('../../utils/cache');

const MAX_BATCH = 500;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// فقط ObjectIdهای معتبر، بدون تکرار
const cleanIds = (arr) => [
  ...new Set(
    (Array.isArray(arr) ? arr : [])
      .map((x) => String(x))
      .filter(isValidId)
  ),
];

// بعد از هر تغییر، کش‌های عمومی مرتبط تازه شوند
const invalidateCollectionCaches = () => {
  delByPrefix('public:home-collections');
  delByPrefix('public:collection'); // لیست/جزئیات کالکشن (اگر چنین کلیدی نباشد، بی‌اثر است)
  invalidateProductCache();         // فیلد collections داخل کش محصولات
};

const handleError = (res, error) => {
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'این slug قبلاً استفاده شده است؛ مقدار دیگری انتخاب کنید' });
  }
  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors).map((e) => e.message).join(' | '),
    });
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'شناسه ارسال‌شده نامعتبر است' });
  }
  console.error('[AdminCollection]', error);
  return res.status(500).json({ success: false, message: error.message });
};

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
    handleError(res, error);
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
      const base = slugify(data.name.fa) || 'collection';
      data.slug = `${base}-${Date.now()}`;
    }
    const collection = new Collection(data);
    await collection.save();
    invalidateCollectionCaches();
    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    handleError(res, error);
  }
};

const updateCollection = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'شناسه کالکشن نامعتبر است' });
    }
    const collection = await Collection.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    invalidateCollectionCaches();
    res.json({ success: true, data: collection });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteCollection = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'شناسه کالکشن نامعتبر است' });
    }
    const collection = await Collection.findByIdAndDelete(req.params.id);
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    await Product.updateMany(
      { collections: req.params.id },
      { $pull: { collections: req.params.id } }
    );
    invalidateCollectionCaches();
    res.json({ success: true, message: 'Collection deleted' });
  } catch (error) {
    handleError(res, error);
  }
};

// ⭐ جدید: اعضای فعلی کالکشن — منبع حقیقت برای پنل (بدون سقف ۲۰۰تایی لیست محصولات)
const getCollectionProducts = async (req, res) => {
  try {
    const collectionId = req.params.id;
    if (!isValidId(collectionId)) {
      return res.status(400).json({ success: false, message: 'شناسه کالکشن نامعتبر است' });
    }
    const exists = await Collection.exists({ _id: collectionId });
    if (!exists) return res.status(404).json({ success: false, message: 'Collection not found' });

    const products = await Product.find({ collections: collectionId })
      .select('name slug mainImage category')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: products, total: products.length });
  } catch (error) {
    handleError(res, error);
  }
};

// ⭐ بازنویسی: ذخیرهٔ diff (add/remove) به‌جای جایگزینی کامل.
// دیگر هیچ محصولی که تیک نخورده «ناخواسته» حذف نمی‌شود.
const setCollectionProducts = async (req, res) => {
  try {
    const collectionId = req.params.id;
    if (!isValidId(collectionId)) {
      return res.status(400).json({ success: false, message: 'شناسه کالکشن نامعتبر است' });
    }
    const collection = await Collection.findById(collectionId).select('_id').lean();
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

    let add = [];
    let remove = [];

    if (Array.isArray(req.body.add) || Array.isArray(req.body.remove)) {
      // فرمت جدید: فقط تغییرات
      add = cleanIds(req.body.add);
      remove = cleanIds(req.body.remove);
      remove = remove.filter((id) => !add.includes(id)); // تداخل: افزودن اولویت دارد
    } else if (Array.isArray(req.body.productIds)) {
      // سازگاری با فرانت قدیمی: لیست کامل → diff سمت سرور (نه pull سراسری)
      const desired = new Set(cleanIds(req.body.productIds));
      const current = await Product.find({ collections: collectionId }).select('_id').lean();
      const currentIds = current.map((p) => String(p._id));
      add = [...desired].filter((id) => !currentIds.includes(id));
      remove = currentIds.filter((id) => !desired.has(id));
    } else {
      return res.status(400).json({ success: false, message: 'بدنه درخواست باید شامل add/remove یا productIds باشد' });
    }

    if (add.length > MAX_BATCH || remove.length > MAX_BATCH) {
      return res.status(400).json({ success: false, message: `حداکثر ${MAX_BATCH} تغییر در هر ذخیره مجاز است` });
    }

    // فقط محصولات واقعاً موجود اضافه شوند
    if (add.length) {
      const found = await Product.find({ _id: { $in: add } }).select('_id').lean();
      const foundSet = new Set(found.map((p) => String(p._id)));
      add = add.filter((id) => foundSet.has(id));
      if (add.length) {
        await Product.updateMany(
          { _id: { $in: add } },
          { $addToSet: { collections: collection._id } }
        );
      }
    }
    if (remove.length) {
      await Product.updateMany(
        { _id: { $in: remove } },
        { $pull: { collections: collection._id } }
      );
    }

    invalidateCollectionCaches();
    res.json({
      success: true,
      added: add.length,
      removed: remove.length,
      message: 'محصولات کالکشن به‌روزرسانی شد'
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getCollections,
  getCollectionProducts,
  createCollection,
  updateCollection,
  deleteCollection,
  setCollectionProducts
};