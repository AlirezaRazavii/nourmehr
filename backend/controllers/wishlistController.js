const User = require('../models/User');
const Product = require('../models/Product');

// @desc    دریافت لیست علاقه‌مندی‌های کاربر (با اطلاعات کامل محصول)
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      select: 'name slug price oldPrice discountPercent mainImage stock status ratingAverage ratingCount',
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
    }

    // فیلتر محصولاتی که ممکن است حذف شده باشند (null)
    const items = (user.wishlist || []).filter(Boolean);

    return res.json({ success: true, count: items.length, wishlist: items });
  } catch (err) {
    console.error('[WISHLIST] getWishlist error:', err.message);
    return res.status(500).json({ success: false, message: 'خطا در دریافت لیست علاقه‌مندی‌ها' });
  }
};

// @desc    دریافت فقط شناسه‌ها (برای همگام‌سازی سریع state در فرانت)
// @route   GET /api/wishlist/ids
// @access  Private
exports.getWishlistIds = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist');
    if (!user) {
      return res.status(404).json({ success: false, message: 'کاربر یافت نشد' });
    }
    const ids = (user.wishlist || []).map((id) => id.toString());
    return res.json({ success: true, count: ids.length, ids });
  } catch (err) {
    console.error('[WISHLIST] getWishlistIds error:', err.message);
    return res.status(500).json({ success: false, message: 'خطا در دریافت شناسه‌ها' });
  }
};

// @desc    افزودن محصول به لیست علاقه‌مندی‌ها
// @route   POST /api/wishlist/add
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'شناسه محصول الزامی است' });
    }

    // بررسی وجود محصول
    const product = await Product.findById(productId).select('_id');
    if (!product) {
      return res.status(404).json({ success: false, message: 'محصول یافت نشد' });
    }

    // $addToSet از تکراری شدن جلوگیری می‌کند
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { wishlist: productId },
    });

    return res.json({ success: true, message: 'به لیست علاقه‌مندی‌ها اضافه شد', productId });
  } catch (err) {
    console.error('[WISHLIST] addToWishlist error:', err.message);
    return res.status(500).json({ success: false, message: 'خطا در افزودن به لیست علاقه‌مندی‌ها' });
  }
};

// @desc    حذف محصول از لیست علاقه‌مندی‌ها
// @route   DELETE /api/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { wishlist: productId },
    });

    return res.json({ success: true, message: 'از لیست علاقه‌مندی‌ها حذف شد', productId });
  } catch (err) {
    console.error('[WISHLIST] removeFromWishlist error:', err.message);
    return res.status(500).json({ success: false, message: 'خطا در حذف از لیست علاقه‌مندی‌ها' });
  }
};

// @desc    تغییر وضعیت (اگر بود حذف، اگر نبود اضافه کن)
// @route   POST /api/wishlist/toggle
// @access  Private
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'شناسه محصول الزامی است' });
    }

    const product = await Product.findById(productId).select('_id');
    if (!product) {
      return res.status(404).json({ success: false, message: 'محصول یافت نشد' });
    }

    const user = await User.findById(req.user._id).select('wishlist');
    const exists = user.wishlist.some((id) => id.toString() === productId);

    if (exists) {
      user.wishlist.pull(productId);
      await user.save();
      return res.json({ success: true, added: false, message: 'از لیست علاقه‌مندی‌ها حذف شد', productId });
    } else {
      user.wishlist.push(productId);
      await user.save();
      return res.json({ success: true, added: true, message: 'به لیست علاقه‌مندی‌ها اضافه شد', productId });
    }
  } catch (err) {
    console.error('[WISHLIST] toggleWishlist error:', err.message);
    return res.status(500).json({ success: false, message: 'خطا در بروزرسانی لیست علاقه‌مندی‌ها' });
  }
};

// @desc    پاک‌سازی کامل لیست علاقه‌مندی‌ها
// @route   DELETE /api/wishlist/clear
// @access  Private
exports.clearWishlist = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { wishlist: [] } });
    return res.json({ success: true, message: 'لیست علاقه‌مندی‌ها پاک شد' });
  } catch (err) {
    console.error('[WISHLIST] clearWishlist error:', err.message);
    return res.status(500).json({ success: false, message: 'خطا در پاک‌سازی لیست' });
  }
};
