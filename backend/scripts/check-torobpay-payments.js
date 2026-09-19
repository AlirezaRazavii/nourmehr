require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const payments = await Payment.find({ provider: 'torobpay' }).sort({ createdAt: -1 }).limit(10);
  if (payments.length === 0) console.log('هیچ پرداخت ترب‌پی ثبت نشده است!');
  for (const p of payments) {
    const order = await Order.findById(p.order).select('orderRef status paymentStatus total');
    console.log(
      p.createdAt.toISOString(),
      '| payment:', p.status,
      '| amount:', p.amount,
      '| refId:', p.refId || '-',
      '| reason:', p.failureReason || '-',
      '| order:', order ? (order.orderRef + ' / ' + order.status + ' / ' + order.paymentStatus) : 'NOT FOUND'
    );
  }
  await mongoose.disconnect();
  process.exit(0);
})();
