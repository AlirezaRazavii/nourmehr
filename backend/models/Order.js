const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  price: Number,
  quantity: { type: Number, required: true, min: 1 },
  color: String,
  size: String,
  image: String
});

const shippingInfoSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true, match: /^09\d{9}$/ },
  email: String,
  province: String,
  city: String,
  address: { type: String, required: true, minlength: 10 },
  postalCode: { type: String, required: true, match: /^\d{10}$/ },
  note: String,
  shippingMethod: { type: String, enum: ['express', 'normal', 'free'], default: 'normal' }
});

const orderSchema = new mongoose.Schema({
  orderRef: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  shippingInfo: shippingInfoSchema,
  paymentMethod: { type: String, enum: ['online', 'cod', 'wallet'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], default: 'pending' },
  subtotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  discountCode: { type: String, default: null, trim: true, uppercase: true },
  discountConsumed: { type: Boolean, default: false },
  shippingCost: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  tracking: { code: String, carrier: String },
  paymentAuthority: String,
  paymentRefId: String
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
