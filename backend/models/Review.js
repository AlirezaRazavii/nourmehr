const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true }, // نام کاربری که نظر داده است
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  isApproved: { type: Boolean, default: false } // آیا ادمین نظر را تایید کرده؟
}, { timestamps: true });

reviewSchema.index({ product: 1, isApproved: 1 });

module.exports = mongoose.model('Review', reviewSchema);