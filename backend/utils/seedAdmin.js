const mongoose = require('mongoose');
const User = require('../models/User');
const { PERMISSIONS } = require('../config/permissions');
const dotenv = require('dotenv');

dotenv.config();

// همه‌ی دسترسی‌ها (چون در permissions.js آرایه‌ی آماده نبود، اینجا می‌سازیم)
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// شماره‌های ادمین اصلی
const SUPER_ADMIN_PHONES = ['09132256122', '09132249808'];

const seedAdmin = async () => {
  try {
    if (require.main === module) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    for (const phone of SUPER_ADMIN_PHONES) {
      let user = await User.findOne({ phone });

      if (user) {
        // کاربر از قبل وجود دارد (مثلاً قبلاً با پیامک وارد شده) → ارتقا به مدیرکل
        user.role = 'admin';
        user.isSuperAdmin = true;
        user.permissions = ALL_PERMISSIONS;
        user.status = 'active';
        if (!user.isProfileComplete && !user.name) {
          user.name = 'مدیر';
          user.isProfileComplete = true;
        }
        await user.save();
        console.log(`👑 Super admin ensured: ${phone}`);
      } else {
        // کاربر هنوز نیست → همین‌جا ساخته می‌شود
        await User.create({
          name: 'مدیر',
          phone,
          role: 'admin',
          isSuperAdmin: true,
          permissions: ALL_PERMISSIONS,
          status: 'active',
          isProfileComplete: true,
        });
        console.log(`👑 Super admin created: ${phone}`);
      }
    }

    if (require.main === module) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('❌ Seed error:', error);
    if (require.main === module) process.exit(1);
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
