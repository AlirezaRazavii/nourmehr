require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { rollbackDiscount } = require('../utils/discountEngine');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const payments = await Payment.find({ provider: 'torobpay', status: 'failed' });
  let n = 0;
  for (const p of payments) {
    const order = await Order.findById(p.order);
    if (!order || order.status !== 'pending') continue;
    order.status = 'cancelled';
    if (order.discountCode && order.discountConsumed) {
      await rollbackDiscount(order.discountCode);
      order.discountConsumed = false;
    }
    await order.save();
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    n++;
    console.log('لغو شد:', order.orderRef);
  }
  console.log('تعداد کل:', n);
  await mongoose.disconnect();
  process.exit(0);
})();
