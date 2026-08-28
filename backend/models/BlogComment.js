const mongoose = require('mongoose');

const blogCommentSchema = new mongoose.Schema({
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true }, // نام نمایشی نویسنده نظر
  comment: { type: String, required: true, maxlength: 2000 },
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

blogCommentSchema.index({ blog: 1, isApproved: 1, createdAt: -1 });

module.exports = mongoose.model('BlogComment', blogCommentSchema);
