/**
 * کنترلر ادمین مقالات — سیستم رسانه‌ای جدید
 * API: /api/admin/articles/*
 *
 * امکانات نسبت به نسخه قبلی:
 *  ۱) اسلاگ مستقل هر زبان + انتقال خودکار به legacySlugs برای ۳۰۱
 *  ۲) تاریخچه نسخه‌ها (revisions) — هر ذخیره یک اسنپ‌شات؛ بازگردانی با یک کلیک
 *  ۳) ذخیره خودکار (autosave) — همان update با فلگ autosave که نسخه ثبت نمی‌کند
 *  ۴) آپلود تصویر با پایپ‌لاین sharp (WebP چندعرضی + srcset)
 *  ۵) پیش‌نمایش «چشم گوگل‌بات» — همان HTML که ربات می‌گیرد
 *  ۶) جستجوی لینک داخلی برای ادیتور (محصول + مقاله)
 */
const Article = require('../../models/Article');
const BlogCategory = require('../../models/BlogCategory');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { delByPrefix } = require('../../utils/cache');
const { processArticleImage } = require('../../utils/imagePipeline');

const slugify = (text) =>
  String(text || '').toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const invalidateArticleCache = () => {
  delByPrefix('public:articles:');
  delByPrefix('seo:articles');
};

// نرمال‌سازی تگ‌ها (آبجکت fa/en یا رشته)
const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const t of tags.slice(0, 20)) {
    const fa = typeof t === 'string' ? t : String(t.fa || '').trim();
    const en = typeof t === 'string' ? '' : String(t.en || '').trim();
    const base = fa || en;
    if (!base) continue;
    const slug = slugify(typeof t === 'object' && t.slug ? t.slug : base) || slugify(en) || `tag-${out.length + 1}`;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, fa, en });
  }
  return out;
};

// محتوای هر زبان: { tiptap, html } — html الزامی برای انتشار است
const normalizeContent = (content) => {
  const out = {};
  for (const lang of ['fa', 'en']) {
    const c = content?.[lang] || {};
    out[lang] = {
      tiptap: c.tiptap ?? null,
      html: String(c.html || '').trim()
    };
  }
  return out;
};

// FAQ: فقط آیتم‌های دارای سوال پاسخ‌دار
const normalizeFaq = (faq) => {
  if (!Array.isArray(faq)) return [];
  return faq.slice(0, 12).filter(f => f?.question?.fa || f?.question?.en).map(f => ({
    question: { fa: String(f.question?.fa || ''), en: String(f.question?.en || '') },
    answer: { fa: String(f.answer?.fa || ''), en: String(f.answer?.en || '') }
  }));
};

// لینک‌های دستی (فاز ۳): عنوان دوزبانه + مقصد دسته‌بندی/محصول/URL — حداکثر ۶
const normalizeManualLinks = (list) => {
  if (!Array.isArray(list)) return [];
  const ObjectId = require('mongoose').Types.ObjectId;
  const out = [];
  for (const item of list.slice(0, 6)) {
    const raw = item || {};
    const type = ['category', 'product', 'url'].includes(raw.type) ? raw.type : null;
    if (!type) continue;
    const link = {
      title: {
        fa: String(raw.title?.fa || '').trim().slice(0, 120),
        en: String(raw.title?.en || '').trim().slice(0, 120)
      },
      type
    };
    if (!link.title.fa && !link.title.en) continue; // حداقل یکی از عنوان‌ها الزامی
    if (type === 'category') {
      const id = String(raw.category?._id || raw.category || '');
      if (!ObjectId.isValid(id)) continue;
      link.category = id;
    } else if (type === 'product') {
      const id = String(raw.product?._id || raw.product || '');
      if (!ObjectId.isValid(id)) continue;
      link.product = id;
    } else {
      const url = String(raw.url || '').trim();
      // فقط http(s) یا مسیر نسبی داخل سایت پذیرفته می‌شود
      if (!/^https?:\/\/[^\s]+$/i.test(url) && !/^\/(?!\/)[^\s]*$/.test(url)) continue;
      link.url = url.slice(0, 500);
    }
    out.push(link);
  }
  return out;
};

// مقالات مرتبط: فقط ObjectIdهای معتبر و یکتا (حداکثر ۶) — خود مقاله هم پذیرفته نمی‌شود
const normalizeRelatedArticles = (list, selfId = null) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  const ObjectId = require('mongoose').Types.ObjectId;
  for (const item of list.slice(0, 6)) {
    const id = String(item?._id || item?.id || item || '');
    if (!ObjectId.isValid(id) || seen.has(id)) continue;
    if (selfId && String(selfId) === id) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

// قبلی/بعدی: یک ObjectId معتبر یا null (خود مقاله پذیرفته نمی‌شود) — null یعنی خودکار
const normalizeAdjacentRef = (value, selfId = null) => {
  if (value === null || value === undefined || value === '') return null;
  const ObjectId = require('mongoose').Types.ObjectId;
  const id = String(value?._id || value?.id || value || '');
  if (!ObjectId.isValid(id)) return null;
  if (selfId && String(selfId) === id) return null;
  return id;
};


// تاریخ انتشار طبق وضعیت
const resolvePublishedAt = (data, existing = null) => {
  if (data.status === 'scheduled') {
    const d = data.publishedAt ? new Date(data.publishedAt) : null;
    return d && !isNaN(d.getTime()) ? d : existing?.publishedAt || null;
  }
  if (data.status === 'published') {
    if (existing?.publishedAt) return existing.publishedAt;
    const d = data.publishedAt ? new Date(data.publishedAt) : null;
    return d && !isNaN(d.getTime()) && d <= new Date() ? d : new Date();
  }
  return existing?.publishedAt || data.publishedAt || null;
};

// ساخت اسنپ‌شات نسخه از وضعیت فعلی سند
const snapshotOf = (article, savedBy, note) => ({
  savedAt: new Date(),
  savedBy: savedBy || '',
  title: { fa: article.title?.fa || '', en: article.title?.en || '' },
  excerpt: { fa: article.excerpt?.fa || '', en: article.excerpt?.en || '' },
  content: JSON.parse(JSON.stringify({
    fa: { tiptap: article.content?.fa?.tiptap ?? null, html: article.content?.fa?.html || '' },
    en: { tiptap: article.content?.en?.tiptap ?? null, html: article.content?.en?.html || '' }
  })),
  note: note || ''
});

/* -------------------------------- لیست ادمین ------------------------------- */
// GET /api/admin/articles?search=&status=&page=&limit=
exports.getArticles = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && ['draft', 'review', 'scheduled', 'published', 'archived'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // الگوی صحیح: جستجو در $and جدا از بقیه شرط‌ها
      query.$and = query.$and || [];
      query.$and.push({ $or: [{ 'title.fa': rx }, { 'title.en': rx }] });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const [total, articles] = await Promise.all([
      Article.countDocuments(query),
      Article.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-content -revisions -manualLinks -faq')
        .populate('category', 'name slug')
    ]);

    res.json({
      success: true,
      data: articles,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------------------ جزئیات + نسخه‌ها ---------------------------- */
// GET /api/admin/articles/:id
exports.getArticleById = async (req, res) => {
  try {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    const article = await Article.findById(req.params.id)
      .populate('manualLinks.category', 'name slug status')
      .populate('manualLinks.product', 'name slug status')
      .populate('relatedArticles', 'title slug status publishedAt')
      .populate('prevArticle', 'title slug status publishedAt')
      .populate('nextArticle', 'title slug status publishedAt');
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data: article });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* --------------------------------- ایجاد --------------------------------- */
// POST /api/admin/articles
exports.createArticle = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.title || !data.title.fa) {
      return res.status(400).json({ success: false, message: 'عنوان فارسی الزامی است' });
    }

    // اسلاگ هر زبان — پیش‌فرض: از عنوان همان زبان؛ en خالی → همان fa
    const slugFa = slugify(data.slug?.fa || data.title.fa) || `article-${Date.now()}`;
    const slugEn = slugify(data.slug?.en || data.title?.en || slugFa) || slugFa;

    // یکتایی اسلاگ‌ها
    const clash = await Article.findOne({
      $or: [{ 'slug.fa': slugFa }, { 'slug.en': slugEn }, { 'slug.fa': slugEn }, { 'slug.en': slugFa }]
    }).select('_id').lean();
    if (clash) {
      return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
    }

    data.slug = { fa: slugFa, en: slugEn };
    data.content = normalizeContent(data.content);
    data.tags = normalizeTags(data.tags);
    data.faq = normalizeFaq(data.faq);
    data.manualLinks = normalizeManualLinks(data.manualLinks);
    data.relatedArticles = normalizeRelatedArticles(data.relatedArticles);
    data.prevArticle = normalizeAdjacentRef(data.prevArticle);
    data.nextArticle = normalizeAdjacentRef(data.nextArticle);
    data.publishedAt = resolvePublishedAt(data);

    if (req.user?._id) {
      data.author = req.user._id;
      if (!data.authorName) data.authorName = req.user.name || req.user.email || '';
    }

    const article = new Article(data);

    // اولین نسخه در تاریخچه
    article.revisions = [snapshotOf(article, req.user?.name || '', 'ایجاد مقاله')];

    await article.save();
    invalidateArticleCache();
    res.status(201).json({ success: true, data: article });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

/* --------------------------------- ویرایش --------------------------------- */
// PUT /api/admin/articles/:id — body.autosave=true فقط ذخیره می‌کند (بدون نسخه)
exports.updateArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    const data = { ...req.body };
    const autosave = data.autosave === true;
    delete data.autosave;
    delete data._id;
    delete data.author; // نویسنده فقط هنگام ایجاد ست می‌شود
    delete data.viewsCount;
    delete data.revisions;

    if (data.title && !data.title.fa) {
      return res.status(400).json({ success: false, message: 'عنوان فارسی الزامی است' });
    }

    // --- تغییر اسلاگ هر زبان → اسلاگ قبلی به legacySlugs برای ۳۰۱ ---
    if (data.slug) {
      const changes = [];
      for (const lang of ['fa', 'en']) {
        const incoming = slugify(data.slug[lang]);
        if (!incoming) continue;
        const current = article.slug?.[lang];
        if (incoming !== current) {
          const clash = await Article.findOne({
            $or: [{ [`slug.${lang}`]: incoming }, { legacySlugs: incoming }],
            _id: { $ne: article._id }
          }).select('_id').lean();
          if (clash) {
            return res.status(400).json({ success: false, message: `این slug (${lang}) قبلاً استفاده شده است` });
          }
          if (current) {
            changes.push(current);
            // اگر اسلاگ قدیمی در legacy بوده، دیگر دوباره اضافه نشود
            article.legacySlugs = article.legacySlugs.filter(s => s !== current);
          }
          article.slug = article.slug || {};
          article.slug[lang] = incoming;
        }
      }
      // اسلاگ‌های قدیمی که دیگر فعالی نیستند به legacy می‌روند
      for (const old of changes) {
        if (!article.legacySlugs.includes(old)) article.legacySlugs.push(old);
      }
      // اگر اسلاگ جدیدی قبلاً در legacy بود (بازگشت به اسلاگ قدیمی) حذف شود
      article.legacySlugs = article.legacySlugs.filter(
        s => s !== article.slug?.fa && s !== article.slug?.en
      );
      delete data.slug;
    }

    if (data.content !== undefined) data.content = normalizeContent(data.content);
    if (data.tags !== undefined) data.tags = normalizeTags(data.tags);
    if (data.faq !== undefined) data.faq = normalizeFaq(data.faq);
    if (data.manualLinks !== undefined) data.manualLinks = normalizeManualLinks(data.manualLinks);
    if (data.relatedArticles !== undefined) data.relatedArticles = normalizeRelatedArticles(data.relatedArticles, article._id);
    if (data.prevArticle !== undefined) data.prevArticle = normalizeAdjacentRef(data.prevArticle, article._id);
    if (data.nextArticle !== undefined) data.nextArticle = normalizeAdjacentRef(data.nextArticle, article._id);

    data.publishedAt = resolvePublishedAt(data, article);
    if (data.status === 'published' && !data.publishedAt) data.publishedAt = article.publishedAt || new Date();

    Object.assign(article, data, { slug: article.slug, legacySlugs: article.legacySlugs });

    // ذخیره دستی (نه autosave) → اسنپ‌شات نسخه جدید
    if (!autosave) {
      article.revisions.push(snapshotOf(article, req.user?.name || '', data.revisionNote || 'ویرایش'));
    }

    await article.save();
    invalidateArticleCache();
    res.json({ success: true, data: article });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

/* --------------------------------- حذف --------------------------------- */
// DELETE /api/admin/articles/:id
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    invalidateArticleCache();
    res.json({ success: true, message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ----------------------------- عملیات گروهی ----------------------------- */
// POST /api/admin/articles/bulk
exports.bulkAction = async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: 'هیچ مقاله‌ای انتخاب نشده است' });
    }
    const filter = { _id: { $in: ids } };

    let result;
    if (action === 'publish') {
      result = await Article.updateMany(filter, { $set: { status: 'published', publishedAt: new Date() } });
    } else if (action === 'review') {
      result = await Article.updateMany(filter, { $set: { status: 'review' } });
    } else if (action === 'draft') {
      result = await Article.updateMany(filter, { $set: { status: 'draft' } });
    } else if (action === 'archive') {
      result = await Article.updateMany(filter, { $set: { status: 'archived' } });
    } else if (action === 'delete') {
      result = await Article.deleteMany(filter);
    } else if (action === 'feature') {
      result = await Article.updateMany(filter, { $set: { featured: true } });
    } else if (action === 'unfeature') {
      result = await Article.updateMany(filter, { $set: { featured: false } });
    } else {
      return res.status(400).json({ success: false, message: 'عملیات نامعتبر است' });
    }

    invalidateArticleCache();
    res.json({ success: true, modified: result.modifiedCount ?? result.deletedCount ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------------- بازگردانی نسخه قبلی ------------------------- */
// POST /api/admin/articles/:id/revisions/:index/restore
exports.restoreRevision = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    const index = parseInt(req.params.index);
    const rev = article.revisions?.[index];
    if (!rev) return res.status(404).json({ success: false, message: 'نسخه یافت نشد' });

    // قبل از بازگردانی، وضعیت فعلی هم یک نسخه شود تا چیزی از دست نرود
    article.revisions.push(snapshotOf(article, req.user?.name || '', 'قبل از بازگردانی'));

    article.title = { fa: rev.title?.fa || '', en: rev.title?.en || '' };
    article.excerpt = { fa: rev.excerpt?.fa || '', en: rev.excerpt?.en || '' };
    article.content = JSON.parse(JSON.stringify(rev.content));

    await article.save();
    invalidateArticleCache();
    res.json({ success: true, data: article });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* --------------------- آپلود تصویر با پایپ‌لاین sharp --------------------- */
// POST /api/admin/articles/upload-image (multipart: image, alt)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'فایلی ارسال نشده است' });

    const alt = String(req.body.alt || '').trim();
    const result = await processArticleImage(req.file, alt);

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error('Article image upload error:', err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'خطا در پردازش تصویر' });
  }
};

/* -------------------- جستجوی لینک داخلی برای ادیتور -------------------- */
// GET /api/admin/articles/link-search?q=... — محصولات + مقالات منتشرشده
exports.linkSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const PUBLIC_STATUSES = ['active', 'out_of_stock'];

    const [products, articles, categories] = await Promise.all([
      Product.find({
        status: { $in: PUBLIC_STATUSES },
        $or: [{ 'name.fa': rx }, { 'name.en': rx }, { slug: rx }]
      }).select('name slug').limit(8).lean(),
      Article.find({
        status: 'published',
        $or: [{ 'title.fa': rx }, { 'title.en': rx }]
      }).select('title slug').limit(8).lean(),
      Category.find({
        status: 'active',
        $or: [{ 'name.fa': rx }, { 'name.en': rx }, { slug: rx }]
      }).select('name slug').limit(8).lean()
    ]);

    res.json({
      success: true,
      data: [
        ...categories.map(c => ({
          type: 'category',
          id: c._id,
          title: c.name?.fa || c.name?.en || c.slug,
          slug: c.slug,
          url: null
        })),
        ...products.map(p => ({
          type: 'product',
          id: p._id,
          title: p.name?.fa || p.name?.en || p.slug,
          slug: p.slug,
          url: null // فرانت بر اساس زبان فعلی می‌سازد
        })),
        ...articles.map(a => ({
          type: 'article',
          id: a._id,
          title: a.title?.fa || a.title?.en || '',
          slug: a.slug?.fa || a.slug?.en || '',
          url: null
        }))
      ]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------ پیش‌نمایش چشم گوگل‌بات (هم‌نتایج ربات) ------------------ */
// GET /api/admin/articles/:id/bot-preview?lang=fa
exports.botPreview = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('manualLinks.category', 'name slug status')
      .populate('manualLinks.product', 'name slug mainImage status');
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    // همان تابعی که ربات واقعی می‌بیند — منبع واحد، تضمین parity
    const { renderArticleForPreview } = require('../../controllers/articleSeoController');
    const lang = ['fa', 'en'].includes(req.query.lang) ? req.query.lang : 'fa';
    const html = renderArticleForPreview(article, lang);

    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* --------------------------------- آمار --------------------------------- */
// GET /api/admin/articles-stats
exports.getStats = async (req, res) => {
  try {
    const [published, drafts, review, scheduled, archived, totalViews] = await Promise.all([
      Article.countDocuments({ status: 'published' }),
      Article.countDocuments({ status: 'draft' }),
      Article.countDocuments({ status: 'review' }),
      Article.countDocuments({ status: 'scheduled' }),
      Article.countDocuments({ status: 'archived' }),
      Article.aggregate([{ $group: { _id: null, sum: { $sum: '$viewsCount' } } }])
    ]);
    res.json({
      success: true,
      data: { published, drafts, review, scheduled, archived, totalViews: totalViews[0]?.sum || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
