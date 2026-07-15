const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const SUPER_ADMIN_EMAIL = 'ali@gmail.com';

const seedSuperAdmin = async () => {
  try {
    if (require.main === module) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const user = await User.findOne({ email: SUPER_ADMIN_EMAIL });

    if (!user) {
      console.log(`⚠️ Super admin user not found: ${SUPER_ADMIN_EMAIL} (skipped). لطفاً ابتدا این کاربر را بسازید.`);
    } else {
      let changed = false;
      if (user.role !== 'admin') { user.role = 'admin'; changed = true; }
      if (!user.isSuperAdmin) { user.isSuperAdmin = true; changed = true; }
      if (user.status !== 'active') { user.status = 'active'; changed = true; }

      if (changed) {
        await user.save();
        console.log(`✅ Super admin set: ${SUPER_ADMIN_EMAIL}`);
      } else {
        console.log(`ℹ️ Super admin already configured: ${SUPER_ADMIN_EMAIL} (skipped)`);
      }
    }

    if (require.main === module) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('❌ Seed super admin error:', error);
    if (require.main === module) process.exit(1);
  }
};

if (require.main === module) {
  seedSuperAdmin();
}

module.exports = seedSuperAdmin;
