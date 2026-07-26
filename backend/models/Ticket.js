const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, enum: ['customer', 'admin'], required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  // user اختیاری است تا پیام‌های فرم تماس (مهمان) هم به‌صورت تیکت ثبت شوند
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  subject: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  messages: [messageSchema],
  adminResponse: { type: Boolean, default: false }
}, { timestamps: true });


ticketSchema.index({ status: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);