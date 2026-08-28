/**
 * مایگریشن یک‌باره بخش اخبار و مقالات:
 *   - status قدیمی: active → published (با publishedAt = createdAt)
 *   -                inactive → draft
 * اجرا:  cd backend && node utils/migrateBlogs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogCategory = require('../models/BlogCategory');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('🔴 MONGO_URI تعریف نشده است.');
    process.exit(1);
  }
  await mongoose.connect(uri);

  // ۱) تبدیل وضعیت‌های قدیمی
  const activated = await Blog.updateMany(
    { status: 'active' },
    [
      {
        $set: {
          status: 'published',
          publishedAt: { $ifNull: ['$publishedAt', '$createdAt'] }
        }
      }
    ]
  );
  console.log(`✅ active → published: ${activated.modifiedCount}`);

  const deactivated = await Blog.updateMany(
    { status: 'inactive' },
    { $set: { status: 'draft' } }
  );
  console.log(`✅ inactive → draft: ${deactivated.modifiedCount}`);

  // ۲) slug دسته‌بندی‌های بدون slug (ایمنی)
  const cats = await BlogCategory.find({ slug: { $in: [null, ''] } });
  for (const cat of cats) {
    cat.slug = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await cat.save();
  }
  if (cats.length) console.log(`✅ slug دسته‌بندی‌ها ساخته شد: ${cats.length}`);

  // ۳) محاسبه readingTime برای مقالات موجود
  const blogs = await Blog.find({ readingTime: 0 });
  for (const b of blogs) {
    b.readingTime = undefined; // اجبار به اجرای هوک pre('validate')
    await b.save();
  }
  if (blogs.length) console.log(`✅ readingTime محاسبه شد: ${blogs.length}`);

  // ۴) ایندکس متن جستجو
  try {
    await Blog.collection.createIndex({ 'title.fa': 'text', 'title.en': 'text', 'content.fa': 'text', 'content.en': 'text' });
    console.log('✅ ایندکس متنی ساخته شد.');
  } catch (e) {
    if (!/already exists|IndexOptionsConflict/i.test(e.message)) throw e;
  }

  await mongoose.disconnect();
  console.log('🎉 مایگریشن کامل شد.');
}

main().catch((err) => {
  console.error('🔴 Migration error:', err);
  process.exit(1);
});
