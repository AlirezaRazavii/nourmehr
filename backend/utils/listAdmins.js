require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admins = await User.find({ $or: [{ role: 'admin' }, { isSuperAdmin: true }] })
      .select('name phone role isSuperAdmin status permissions')
      .lean();

    if (!admins.length) {
      console.log('⚠️ هیچ ادمینی در دیتابیس نیست!');
    } else {
      console.table(admins.map((a) => ({
        name: a.name || '-',
        phone: a.phone,
        role: a.role,
        superAdmin: a.isSuperAdmin === true,
        status: a.status,
        permissions: (a.permissions || []).length,
      })));
    }
  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await mongoose.disconnect();
  }
})();
