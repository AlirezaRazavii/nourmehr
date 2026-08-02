const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const { PERMISSIONS } = require('../config/permissions');

const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const IS_STANDALONE = require.main === module;

// شماره‌ها فقط از env خوانده می‌شوند و اعتبارسنجی می‌شوند
const parsePhones = () =>
  String(process.env.SUPER_ADMIN_PHONES || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^09\d{9}$/.test(s));

// در لاگ شماره کامل چاپ نشود
const maskPhone = (p) => `${p.slice(0, 4)}***${p.slice(-2)}`;

const seedAdmin = async () => {
  // بدون فلگ صریح هرگز اجرا نمی‌شود
  if (process.env.RUN_SEED_ADMIN !== 'true') {
    console.log('ℹ️ Admin seeding skipped (RUN_SEED_ADMIN !== "true")');
    return;
  }

  const phones = parsePhones();
  if (!phones.length) {
    console.warn('⚠️ SUPER_ADMIN_PHONES تعریف نشده یا نامعتبر است — seed انجام نشد');
    return;
  }

  try {
    if (IS_STANDALONE) {
      if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI تعریف نشده است');
      await mongoose.connect(process.env.MONGODB_URI);
    }

    for (const phone of phones) {
      const existing = await User.findOne({ phone });

      if (existing) {
        existing.role = 'admin';
        existing.isSuperAdmin = true;
        existing.permissions = ALL_PERMISSIONS;
        existing.status = 'active';
        if (!existing.name) {
          existing.name = 'مدیر';
          existing.isProfileComplete = true;
        }
        await existing.save();
        console.log(`👑 Super admin ensured: ${maskPhone(phone)}`);
      } else {
        await User.create({
          name: 'مدیر',
          phone,
          role: 'admin',
          isSuperAdmin: true,
          permissions: ALL_PERMISSIONS,
          status: 'active',
          isProfileComplete: true,
        });
        console.log(`👑 Super admin created: ${maskPhone(phone)}`);
      }
    }
  } catch (error) {
    console.error('❌ Seed admin error:', error.message);
    if (IS_STANDALONE) process.exitCode = 1;
  } finally {
    if (IS_STANDALONE) await mongoose.disconnect();
  }
};

if (IS_STANDALONE) seedAdmin();

module.exports = seedAdmin;
