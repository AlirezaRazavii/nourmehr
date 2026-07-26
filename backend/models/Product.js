const mongoose = require('mongoose');

const localizedShort = (max) => ({
  fa: { type: String, trim: true, maxlength: max, default: '' },
  en: { type: String, trim: true, maxlength: max, default: '' },
});

const colorSchema = new mongoose.Schema({
  name: {
    fa: { type: String, trim: true, default: '' },
    en: { type: String, trim: true, default: '' },
  },
  // اعتبارسنجی کد رنگ تا مقدار خراب وارد استایل فرانت نشود
  value: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: (v) => !v || /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([\d\s,.%]+\))$/.test(v),
      message: 'کد رنگ نامعتبر است',
    },
  },
});

const sizeSchema = new mongoose.Schema(
  {
    name: {
      fa: { type: String, trim: true, default: '' },
      en: { type: String, trim: true, default: '' },
    },
    price: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      fa: { type: String, required: [true, 'نام فارسی محصول الزامی است'], trim: true, maxlength: 200 },
      en: { type: String, trim: true, default: '', maxlength: 200 },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'انتخاب دسته‌بندی الزامی است'],
    },
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],

    price: { type: Number, required: [true, 'قیمت الزامی است'], min: 0 },
    oldPrice: { type: Number, min: 0, default: null },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },

    stock: { type: Number, required: true, min: 0, default: 0 },

    mainImage: { type: String, trim: true, default: '' },
    images: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'حداکثر ۲۰ تصویر برای هر محصول مجاز است',
      },
    },

    shortDesc: localizedShort(200),
    description: {
      fa: { type: String, default: '' },
      en: { type: String, default: '' },
    },

    weight: { type: String, trim: true, default: '' },
    dimensions: { type: String, trim: true, default: '' },
    material: localizedShort(120),
    craftsman: localizedShort(120),
    warranty: localizedShort(120),

    // '' باعث خطای duplicate key در ایندکس unique/sparse می‌شد؛
    // با این setter مقدار خالی اصلاً ذخیره نمی‌شود.
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      default: undefined,
      set: (v) => (v && String(v).trim() ? String(v).trim() : undefined),
    },

    features: [
      {
        _id: false,
        fa: { type: String, trim: true, default: '' },
        en: { type: String, trim: true, default: '' },
      },
    ],

    colors: { type: [colorSchema], default: [] },
    sizes: { type: [sizeSchema], default: [] },

    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'out_of_stock'],
        message: 'وضعیت محصول نامعتبر است',
      },
      default: 'active',
      index: true,
    },
    isFeatured: { type: Boolean, default: false },

    viewsCount: { type: Number, default: 0, min: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    relatedProducts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 12,
        message: 'حداکثر ۱۲ محصول مرتبط مجاز است',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ---------------------------------- Virtuals -------------------------------- */
productSchema.virtual('finalPrice').get(function () {
  const price = Number(this.price) || 0;
  const d = Number(this.discountPercent) || 0;
  return d > 0 && d < 100 ? Math.round(price * (1 - d / 100)) : price;
});

productSchema.virtual('inStock').get(function () {
  return this.status === 'active' && Number(this.stock) > 0;
});

/* ----------------------------------- Hooks ---------------------------------- */
// همگام‌سازی خودکار وضعیت با موجودی، تا فروش محصول ناموجود جلوگیری شود
productSchema.pre('save', function (next) {
  if (this.isModified('stock') || this.isNew) {
    if (this.stock <= 0 && this.status === 'active') this.status = 'out_of_stock';
    if (this.stock > 0 && this.status === 'out_of_stock') this.status = 'active';
  }
  if (this.oldPrice !== null && this.oldPrice !== undefined && this.oldPrice <= this.price) {
    this.oldPrice = null;
  }
  next();
});

/* ---------------------------------- Indexes --------------------------------- */
productSchema.index({ category: 1, status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1, price: 1 });
productSchema.index({ collections: 1, status: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ status: 1, viewsCount: -1 });
productSchema.index({ stock: 1 });
productSchema.index({ relatedProducts: 1 });

module.exports = mongoose.model('Product', productSchema);
