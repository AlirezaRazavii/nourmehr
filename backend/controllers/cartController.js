const Cart = require('../models/Cart');
const Product = require('../models/Product');


const getUnitPrice = (product, sizeName) => {
  let base = product.price;
  let sizeDiscount = 0;
  if (sizeName && Array.isArray(product.sizes)) {
    const s = product.sizes.find(x =>
      x && x.name && (x.name.fa === sizeName || x.name.en === sizeName)
    );
    if (s) {
      if (s.price) base = s.price;
      if (s.discountPercent && s.discountPercent > 0) sizeDiscount = s.discountPercent;
    }
  }
  // اگر سایز تخفیف مخصوص داشت، همان اعمال می‌شود
  if (sizeDiscount > 0) {
    return base * (1 - sizeDiscount / 100);
  }
  // در غیر این صورت تخفیف کلی محصول (اگر روزی تعریف شود)
  if (product.discountPercent && product.discountPercent > 0) {
    return base * (1 - product.discountPercent / 100);
  }
  return base;
};
// دریافت سبد خرید با محاسبه قیمت‌های لحظه‌ای (با احتساب تخفیف محصول)
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) {
      cart = { items: [] };
    }
    let subtotal = 0;
    const cartItems = cart.items.map(item => {
      const product = item.product;
      const unitPrice = getUnitPrice(product, item.size);
      const total = unitPrice * item.quantity;
      subtotal += total;
      return {
        _id: item._id,
        productId: product._id,
        name: product.name,
        image: product.mainImage ? product.mainImage : '/placeholder.png',
        quantity: item.quantity,
        color: item.color,
        size: item.size || '',
        unitPrice: unitPrice,
        totalPrice: total,
        stock: product.stock,
        inStock: product.stock >= item.quantity
      };
    });
    // هزینه ارسال در مرحله checkout محاسبه می‌شود، نه اینجا
    const shippingCost = 0;
    const total = subtotal;
    res.json({
      success: true,
      cart: { items: cartItems, subtotal, shippingCost, discount: 0, total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// افزودن آیتم به سبد (با بررسی موجودی و تخفیف محصول)
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, color = '', size = '' } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }
    const existingItem = cart.items.find(item => item.product.toString() === productId && item.color === color && (item.size || '') === (size || ''));
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity, color, size });
    }
    await cart.save();
    res.json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// بروزرسانی تعداد آیتم سبد
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    const product = await Product.findById(item.product);
    if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
    item.quantity = quantity;
    await cart.save();
    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// حذف آیتم از سبد
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    cart.items.pull({ _id: itemId });
    await cart.save();
    res.json({ success: true, message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// خالی کردن سبد خرید
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };