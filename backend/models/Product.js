const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
  name: { 
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  value: String
});

const sizeSchema = new mongoose.Schema({
  name: { 
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  price: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, trim: true, default: '' }
  },
  slug: { type: String, required: true, unique: true, lowercase: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0, default: null },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  mainImage: { type: String },
  images: [{ type: String }],
  shortDesc: {
    fa: { type: String, maxlength: 200, default: '' },
    en: { type: String, maxlength: 200, default: '' }
  },
  description: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  weight: String,
  dimensions: String,
  material: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  craftsman: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  warranty: {
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  },
  sku: { type: String, unique: true, sparse: true },
  features: [{
    fa: { type: String, default: '' },
    en: { type: String, default: '' }
  }],
  colors: [colorSchema],
  sizes: [sizeSchema],
  status: { type: String, enum: ['active', 'inactive', 'out_of_stock'], default: 'active' },
  isFeatured: { type: Boolean, default: false },
  viewsCount: { type: Number, default: 0 },
  ratingAverage: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

productSchema.index({ category: 1, status: 1 });
productSchema.index({ collections: 1, status: 1 });

module.exports = mongoose.model('Product', productSchema);