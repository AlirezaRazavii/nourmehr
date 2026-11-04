/**
 * اسکریپت مهاجرت: Blog → Article (سیستم رسانه‌ای جدید)
 *
 * اجرا:  node backend/scripts/migrate-blog-to-article.js [--dry-run]
 *
 * اصول ایمن:
 *  ۱) _id حفظ می‌شود → هیچ ارجاع بیرونی نمی‌شکند
 *  ۲) URL هیچ مقاله‌ای عوض نمی‌شود: slug.fa = slug.en = slug قدیمی
 *     (اسلاگ‌های فارسی/لاتین مستقل بعداً توسط ادمین تنظیم می‌شوند؛
 *      تغییر بعدی خودکار به legacySlugs → ۳۰۱ می‌رود)
 *  ۳) idempotent — اجرای دوباره فقط رکوردهای جدید را منتقل می‌کند
 *  ۴) Blog دست‌نخورده می‌ماند؛ ماژول قدیمی تا لحظه سوییچ سالم است
 *
 * بعد از سوییچ نهایی (فاز ۳) می‌توانید Blogها را آرشیو/حذف کنید.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/noormehr';

async function run() {
  console.log('اتصال به دیتابیس...');
  await mongoose.connect(MONGO_URI);
  console.log('متصل شد:', MONGO_URI.replace(/\/\/.*@/, '//***@'));

  const Blog = require('../models/Blog');
  const Article = require('../models/Article');

  const blogs = await Blog.find({}).lean();
  console.log(`تعداد Blogهای موجود: ${blogs.length}`);

  if (!blogs.length) {
    console.log('چیزی برای انتقال نیست. خروج.');
    await mongoose.disconnect();
    return;
  }

  const existingIds = new Set(
    (await Article.find({}, '_id').lean()).map(a => String(a._id))
  );

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const b of blogs) {
    if (existingIds.has(String(b._id))) {
      skipped++;
      continue;
    }

    const doc = {
      _id: b._id, // حفظ شناسه — ارجاع‌ها سالم می‌مانند
      title: {
        fa: b.title?.fa || '',
        en: b.title?.en || ''
      },
      slug: {
        fa: b.slug, // همان اسلاگ قدیمی → URL عوض نمی‌شود
        en: b.slug
      },
      legacySlugs: (b.oldSlugs || []).slice(),
      excerpt: {
        fa: b.excerpt?.fa || '',
        en: b.excerpt?.en || ''
      },
      content: {
        fa: { tiptap: null, html: b.content?.fa || '' },
        en: { tiptap: null, html: b.content?.en || '' }
      },
      image: b.image || '',
      imageAlt: {
        fa: b.imageAlt?.fa || '',
        en: b.imageAlt?.en || ''
      },
      imageVariants: [],
      type: b.type || 'news',
      category: b.category || null,
      tags: (b.tags || []).map(t => ({ slug: t.slug, fa: t.fa || '', en: t.en || '' })),
      author: b.author || null,
      authorName: b.authorName || '',
      status: b.status === 'draft' ? 'draft' : b.status, // review وضعیت جدید است و معادل قدیمی ندارد
      publishedAt: b.publishedAt || null,
      featured: Boolean(b.featured),
      readingTime: b.readingTime || 0,
      viewsCount: b.viewsCount || 0,
      faq: [],
      relatedProducts: [],
      revisions: [{
        savedAt: new Date(),
        savedBy: 'migration',
        title: { fa: b.title?.fa || '', en: b.title?.en || '' },
        excerpt: { fa: b.excerpt?.fa || '', en: b.excerpt?.en || '' },
        content: {
          fa: { tiptap: null, html: b.content?.fa || '' },
          en: { tiptap: null, html: b.content?.en || '' }
        },
        note: 'انتقال از ماژول قدیمی'
      }],
      seo: b.seo || undefined
    };

    if (DRY_RUN) {
      console.log(`[dry-run] منتقل خواهد شد: ${b.slug} («${b.title?.fa || ''}»)`);
      created++;
      continue;
    }

    try {
      await Article.create(doc);
      created++;
    } catch (err) {
      if (err.code === 11000) {
        // تداخل اسلاگ با مقاله موجود — پسوند یکتا اضافه می‌کنیم
        try {
          doc.slug = { fa: `${b.slug}-fa`, en: `${b.slug}-en` };
          doc.legacySlugs.push(b.slug); // اسلاگ قدیمی هم ۳۰۱ می‌شود
          await Article.create(doc);
          created++;
          console.warn(`  ⚠ تداخل اسلاگ برای «${b.title?.fa}» — با پسوند -fa/-en منتقل شد + ۳۰۱`);
        } catch (err2) {
          errors.push({ slug: b.slug, error: err2.message });
        }
      } else {
        errors.push({ slug: b.slug, error: err.message });
      }
    }
  }

  console.log('\n---------- نتیجه ----------');
  console.log(`منتقل‌شده: ${created}`);
  console.log(`ردشده (قبلاً موجود): ${skipped}`);
  console.log(`خطا: ${errors.length}`);
  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2));
  }

  if (DRY_RUN) {
    console.log('\nحالت dry-run — هیچ تغییری در دیتابیس نوشته نشد.');
  } else {
    // راستی‌آزمایی نهایی
    const [blogCount, articleCount] = await Promise.all([
      Blog.countDocuments({}),
      Article.countDocuments({})
    ]);
    console.log(`\nراستی‌آزمایی: Blog=${blogCount} | Article=${articleCount}`);
    if (articleCount < blogCount) {
      console.log('⚠ تعداد Article کمتر از Blog است — لاگ خطاها را ببینید.');
    } else {
      console.log('✓ همه رکوردها منتقل شدند.');
    }
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('خطای مهلک:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
