const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const KEEP_PHONES = ['09132256122', '09132249808'];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // هر کاربری که ادمین است ولی شماره‌اش در لیست مجاز نیست → عادی شود
  const res = await User.updateMany(
    { role: 'admin', phone: { $nin: KEEP_PHONES } },
    { $set: { role: 'user', isSuperAdmin: false, permissions: [] } }
  );
  console.log('Downgraded old admins:', res.modifiedCount);

  await mongoose.disconnect();
  process.exit(0);
})();
