const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true, match: /^09\d{9}$/ },
  province: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true, minlength: 10 },
  postalCode: { type: String, required: true, match: /^\d{10}$/ },
  isDefault: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema(
  {
    // نام دیگر در ثبت‌نام اولیه الزامی نیست؛ بعد از تایید پیامک تکمیل می‌شود
    name: { type: String, default: '', trim: true },
    // ایمیل اختیاری شد. sparse تا چند کاربر بدون ایمیل تداخل نداشته باشند
    email: { type: String, unique: true, sparse: true, lowercase: true, default: undefined },
    // شماره موبایل اکنون شناسه اصلی و الزامی و یکتاست
    phone: { type: String, required: true, unique: true, match: /^09\d{9}$/ },
    // رمز عبور اختیاری شد (ورود فقط با پیامک)
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isSuperAdmin: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    isProfileComplete: { type: Boolean, default: false },
    addresses: [addressSchema],
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
