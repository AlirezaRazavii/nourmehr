const Review = require('../models/Review');

// گرفتن نظرات تایید شده یک محصول خاص
exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId, isApproved: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ثبت نظر جدید توسط کاربر (نیاز به لاگین دارد)
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'برای ثبت نظر باید وارد حساب شوید' });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      name: req.user.name || req.user.email,
      rating: Number(rating),
      comment
    });

    await review.save();

    // ایجاد اعلان برای ادمین
    const Notification = require('../models/Notification');
    await Notification.create({
      type: 'review',
      title: 'نظر جدید',
      message: `نظر جدیدی توسط ${req.user.name || req.user.email} ثبت شد و نیاز به تایید دارد.`,
      link: '/admin/reviews'
    });

    res.status(201).json({ success: true, message: 'نظر شما با موفقیت ثبت شد و پس از تایید ادمین نمایش داده خواهد شد.' });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};