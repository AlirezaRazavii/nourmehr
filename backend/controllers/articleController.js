/**
 * کنترلر عمومی مقالات — سیستم رسانه‌ای جدید
 * API عمومی: /api/articles/*
 *
 * اصول:
 *  ۱) الگوی صحیح ترکیب فیلتر انتشار با $or جستجو (رفع الگوی باگ B-01/B-02):
 *     همیشه $and: [publishedFilter(), { $or: [...] }] — هرگز $or را بازنویسی نکن
 *  ۲) قرارداد JSON واحد: هر سه مصرف‌کننده (اپ Vue، رندرر ربات، sitemap/RSS)
 *     از همین شکل خروجی localizeArticle استفاده می‌کنند
 *  ۳) نگاه‌به‌زبان: هر زبان اسلاگ خودش را دارد + legacySlugs برای ۳۰۱
 */
const Article = require('../models/Article');
const BlogCategory = require('../models/BlogCategory');
const Product = require('../models/Product');

// وضعیت «قابل مشاهده برای عموم»
const publishedFilter = () => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', publishedAt: { $lte: new Date() } }
  ]
});

// زمان‌بندی‌شده‌های سررسیده را یک‌باره منتشر می‌کند (fire-and-forget)
const promoteScheduled = () => {
  Article.updateMany(
    { status: 'scheduled', publishedAt: { $lte: new Date() } },
    { $set: { status: 'published' } }
  ).catch(() => {});
};

const pick = (value, lang) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value[lang] || value.fa || value.en || '';
  return '';
};

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------------------- قرارداد JSON واحد (localizeArticle) ---------------------- */
/**
 * خروجی استاندارد مقاله برای فرانت.
 * full=true → محتوای کامل + FAQ + سئو (صفحه جزئیات)
 * full=false → نسخه سبک (لیست‌ها)
 */
const localizeArticle = (article, lang, { full = false } = {}) => {
  if (!article) return null;
  const a = article.toObject ? article.toObject() : { ...article };
  const other = lang === 'fa' ? 'en' : 'fa';

  const localized = {
    ...a,
    title: pick(a.title, lang),
    excerpt: pick(a.excerpt, lang),
    imageAlt: pick(a.imageAlt, lang),
    slug: a.slug?.[lang] || a.slug?.fa || a.slug?.en || '',
    // آیا نسخه زبان دیگر محتوای واقعی دارد؟ (برای hreflang سمت کلاینت)
    hasTranslation: Boolean(a.title?.[other] && a.content?.[other]?.html)
  };

  // سئو: per-language با fallback
  const seo = a.seo || {};
  const seoLang = (field) => seo[lang]?.[field] || '';
  localized.seo = {
    title: seoLang('title') || localized.title,
    description: seoLang('description') || localized.excerpt,
    canonicalUrl: seoLang('canonicalUrl') || '',
    ogImage: seoLang('ogImage') || a.image || '',
    noIndex: seo[lang]?.noIndex === true,
    focusKeyword: seoLang('focusKeyword'),
    sitemap: seo.sitemap || null
  };

  if (full) {
    localized.content = a.content?.[lang]?.html || '';
    localized.faq = (a.faq || []).map(f => ({
      question: pick(f.question, lang),
      answer: pick(f.answer, lang)
    })).filter(f => f.question);
    localized.relatedProducts = a.relatedProducts || [];
    localized.tags = (a.tags || []).map(t => ({ slug: t.slug, name: pick(t, lang) }));
  } else {
    // در لیست‌ها محتوای کامل و سئو ارسال نمی‌شود
    delete localized.content;
    delete localized.revisions;
    delete localized.seo;
    delete localized.faq;
    delete localized.relatedProducts;
  }

  return localized;
};

// جایگزینی categoryId با آبجکت سبک دسته‌بندی
const withCategory = async (articles, lang) => {
  const catIds = [...new Set(articles.map(a => a.category).filter(Boolean).map(String))];
  if (!catIds.length) return articles;
  const cats = await BlogCategory.find({ _id: { $in: catIds } }).lean();
  const map = new Map(cats.map(c => [String(c._id), c]));
  return articles.map(a => {
    const c = map.get(String(a.category));
    return { ...a, category: c ? { _id: c._id, slug: c.slug, name: pick(c.name, lang) } : null };
  });
};

/* ------------------------------- لیست عمومی ------------------------------- */
// GET /api/articles?page=1&limit=9&search=..&category=slug&tag=slug&type=news&sort=newest|oldest|popular
exports.getArticles = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const skip = (page - 1) * limit;

    // الگوی صحیح: فیلتر انتشار و فیلترهای اختیاری در $and جدا زندگی می‌کنند
    const conditions = [publishedFilter()];

    if (req.query.type && ['news', 'event', 'article'].includes(req.query.type)) {
      conditions.push({ type: req.query.type });
    }
    if (req.query.tag) {
      conditions.push({ 'tags.slug': String(req.query.tag).toLowerCase() });
    }
    if (req.query.category) {
      const cat = await BlogCategory.findOne({
        $or: [{ slug: req.query.category }, { _id: req.query.category }]
      }).lean();
      conditions.push({ category: cat ? cat._id : null });
    }
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      conditions.push({
        $or: [
          { 'title.fa': rx },
          { 'title.en': rx },
          { 'excerpt.fa': rx },
          { 'excerpt.en': rx }
        ]
      });
    }

    const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const sortMap = {
      oldest: { publishedAt: 1, createdAt: 1 },
      popular: { viewsCount: -1, publishedAt: -1 },
      newest: { publishedAt: -1, createdAt: -1 }
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;

    const [total, articles] = await Promise.all([
      Article.countDocuments(query),
      Article.find(query)
        .select('title slug excerpt image imageAlt imageVariants type category tags status publishedAt featured readingTime viewsCount createdAt updatedAt authorName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const localized = (await withCategory(articles, lang)).map(a => localizeArticle(a, lang));

    res.json({
      success: true,
      data: localized,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* -------------------------- مقالات صفحه اصلی (۳ تا) ------------------------- */
exports.getHomeAnnouncements = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    const articles = await Article.find(publishedFilter())
      .select('title slug excerpt image type publishedAt createdAt readingTime featured')
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .limit(3)
      .lean();

    res.json({ success: true, data: articles.map(a => localizeArticle(a, lang)) });
  } catch (err) {
    console.error('Error fetching home articles:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ دسته‌بندی‌ها ------------------------------ */
// GET /api/articles/categories
exports.getCategories = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const categories = await BlogCategory.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const counts = await Article.aggregate([
      { $match: { ...publishedFilter(), category: { $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));

    res.json({
      success: true,
      data: categories.map(c => ({
        _id: c._id,
        slug: c.slug,
        name: pick(c.name, lang),
        description: pick(c.description, lang),
        count: countMap.get(String(c._id)) || 0
      }))
    });
  } catch (err) {
    console.error('Error fetching article categories:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* --------------------------------- تگ‌ها --------------------------------- */
// GET /api/articles/tags — برای چیپ‌های موضوعی هاب اخبار
exports.getTags = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const groups = await Article.aggregate([
      { $match: publishedFilter() },
      { $unwind: '$tags' },
      { $group: { _id: '$tags.slug', count: { $sum: 1 }, fa: { $first: '$tags.fa' }, en: { $first: '$tags.en' } } },
      { $sort: { count: -1 } },
      { $limit: 24 }
    ]);
    res.json({
      success: true,
      data: groups.map(g => ({ slug: g._id, name: pick(g, lang) || g._id, count: g.count }))
    });
  } catch (err) {
    console.error('Error fetching article tags:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ مقاله با اسلاگ ----------------------------- */
// GET /api/articles/:slug — نگاه‌به‌زبان: slug.fa / slug.en / legacySlugs
exports.getArticleBySlug = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    const slug = String(req.params.slug || '').toLowerCase();
    const other = lang === 'fa' ? 'en' : 'fa';

    const article = await Article.findOne({
      $or: [
        { [`slug.${lang}`]: slug },
        { legacySlugs: slug }
      ],
      ...publishedFilter()
    })
      .populate('category', 'name slug')
      .populate('author', 'name')
      .populate('relatedProducts.product', 'name slug mainImage price discountPercent status shortDesc');

    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    // اسلاگ قدیمی → آدرس فعلیِ همین زبان (اطلاعات ۳۰۱ برای فرانت)
    const currentSlug = article.slug?.[lang] || article.slug?.fa;
    if (currentSlug && currentSlug !== slug) {
      res.setHeader('X-Redirect-Canonical', `/${lang}/news/${currentSlug}`);
    }

    // افزایش بازدید با $inc — بدون ذخیره کل سند (بدون رقابت نوشتن)
    Article.updateOne({ _id: article._id }, { $inc: { viewsCount: 1 } }).catch(() => {});
    article.viewsCount = (article.viewsCount || 0) + 1;
    if (article.author && !article.authorName) article.authorName = article.author.name || '';

    const localized = localizeArticle(article, lang, { full: true });
    localized.slug = currentSlug || slug;

    if (article.category) {
      localized.category = {
        _id: article.category._id,
        slug: article.category.slug,
        name: pick(article.category.name, lang)
      };
    }

    // محصولات مرتبط محلی‌شده (موتور لینک‌سازی داخلی)
    const PUBLIC_STATUSES = ['active', 'out_of_stock'];
    localized.relatedProducts = (article.relatedProducts || [])
      .filter(rp => rp.product && PUBLIC_STATUSES.includes(rp.product.status))
      .slice(0, 6)
      .map(rp => ({
        _id: rp.product._id,
        name: pick(rp.product.name, lang),
        slug: rp.product.slug,
        image: rp.product.mainImage || '',
        shortDesc: pick(rp.product.shortDesc, lang),
        price: rp.product.price,
        discountPercent: rp.product.discountPercent,
        note: pick(rp.note, lang)
      }));

    // اسلاگ نسخه دیگر زبان — برای hreflang سمت کلاینت
    localized.altSlug = (article.title?.[other] && article.content?.[other]?.html)
      ? (article.slug?.[other] || currentSlug)
      : null;

    res.json({ success: true, data: localized });
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ مقالات مرتبط ------------------------------ */
// GET /api/articles/:slug/related — الگوی صحیح (رفع B-02) + fallback جدیدترین‌ها
exports.getRelatedArticles = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const slug = String(req.params.slug || '').toLowerCase();

    const current = await Article.findOne({
      $or: [{ [`slug.${lang}`]: slug }, { legacySlugs: slug }],
      ...publishedFilter()
    }).select('category tags').lean();
    if (!current) return res.json({ success: true, data: [] });

    const tagSlugs = (current.tags || []).map(t => t.slug);

    // معیارهای شباهت — اگر خالی بود $or خالی نمی‌سازیم (رفع کرش)
    const orConditions = [
      ...(current.category ? [{ category: current.category }] : []),
      ...(tagSlugs.length ? [{ 'tags.slug': { $in: tagSlugs } }] : [])
    ];

    let related = [];
    if (orConditions.length) {
      related = await Article.find({
        $and: [
          { _id: { $ne: current._id } },
          publishedFilter(),
          { $or: orConditions }
        ]
      })
        .select('title slug excerpt image imageAlt imageVariants type publishedAt readingTime')
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean();
    }

    // اگر شباهتی پیدا نشد → جدیدترین‌ها (بدون صفحه خالی)
    if (related.length < 3) {
      const exclude = [current._id, ...related.map(r => r._id)];
      const extra = await Article.find({
        $and: [{ _id: { $nin: exclude } }, publishedFilter()]
      })
        .select('title slug excerpt image imageAlt imageVariants type publishedAt readingTime')
        .sort({ publishedAt: -1 })
        .limit(3 - related.length)
        .lean();
      related = [...related, ...extra];
    }

    res.json({ success: true, data: related.map(a => localizeArticle(a, lang)) });
  } catch (err) {
    console.error('Error fetching related articles:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ قبلی / بعدی ------------------------------- */
// GET /api/articles/:slug/adjacent
exports.getAdjacentArticles = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const slug = String(req.params.slug || '').toLowerCase();

    const current = await Article.findOne({
      $or: [{ [`slug.${lang}`]: slug }, { legacySlugs: slug }],
      ...publishedFilter()
    }).select('publishedAt').lean();
    if (!current) return res.json({ success: true, data: { prev: null, next: null } });

    const select = 'title slug image publishedAt';
    const [prev, next] = await Promise.all([
      Article.findOne({ ...publishedFilter(), publishedAt: { $lt: current.publishedAt || new Date(0) } })
        .sort({ publishedAt: -1 }).select(select).lean(),
      Article.findOne({ ...publishedFilter(), publishedAt: { $gt: current.publishedAt || new Date(0) } })
        .sort({ publishedAt: 1 }).select(select).lean()
    ]);

    const local = (a) => a ? localizeArticle(a, lang) : null;
    res.json({ success: true, data: { prev: local(prev), next: local(next) } });
  } catch (err) {
    console.error('Error fetching adjacent articles:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* -------------------------------- نویسنده -------------------------------- */
// GET /api/articles/author/:id — صفحه نویسنده (E-E-A-T)
exports.getAuthor = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const User = require('../models/User');
    const author = await User.findById(req.params.id).select('name createdAt').lean();
    if (!author) return res.status(404).json({ success: false, message: 'Author not found' });

    const articles = await Article.find({ ...publishedFilter(), author: author._id })
      .select('title slug excerpt image publishedAt readingTime viewsCount')
      .sort({ publishedAt: -1 })
      .limit(24)
      .lean();

    const totalViews = articles.reduce((s, a) => s + (a.viewsCount || 0), 0);

    res.json({
      success: true,
      data: {
        _id: author._id,
        name: author.name,
        memberSince: author.createdAt,
        articlesCount: articles.length,
        totalViews,
        articles: articles.map(a => localizeArticle(a, lang))
      }
    });
  } catch (err) {
    console.error('Error fetching author:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
