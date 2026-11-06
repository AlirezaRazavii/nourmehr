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
// GET /api/articles?page=1&limit=9&search=..&category=slug&tag=slug&type=news&period=today|week|month|year&sort=newest|oldest|popular
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
    // بازه زمانی انتشار — امروز / ۷ روز / ۳۰ روز / یک سال اخیر
    const PERIOD_DAYS = { today: 1, week: 7, month: 30, year: 365 };
    if (req.query.period && PERIOD_DAYS[req.query.period]) {
      const from = new Date(Date.now() - PERIOD_DAYS[req.query.period] * 24 * 60 * 60 * 1000);
      conditions.push({
        $or: [
          { publishedAt: { $gte: from } },
          { publishedAt: { $exists: false }, createdAt: { $gte: from } }
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

/* ---------------- مقالات صفحه اصلی (هیرو + کارت‌های بخش رسانه) ---------------- */
exports.getHomeAnnouncements = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    // ۶ مقاله: اولی هیروی سینمایی بخش رسانه، سه تای بعدی کارت‌های کناری
    const articles = await Article.find(publishedFilter())
      .select('title slug excerpt image imageAlt imageVariants type category publishedAt createdAt readingTime featured')
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .limit(6)
      .lean();

    const localized = await withCategory(articles, lang);
    res.json({ success: true, data: localized.map(a => localizeArticle(a, lang)) });
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

    // اولویت با تطابق دقیق اسلاگ زبان فعلی است؛ legacySlugs فقط fallback
    const POPULATE = 'category name slug | author name | relatedProducts.product name slug mainImage price discountPercent status shortDesc';
    const [exactLang, exactOther, legacy] = await Promise.all([
      Article.findOne({ [`slug.${lang}`]: slug, ...publishedFilter() }),
      Article.findOne({ [`slug.${other}`]: slug, ...publishedFilter() }),
      Article.findOne({ legacySlugs: slug, ...publishedFilter() })
    ]);
    const article = exactLang || exactOther || legacy;
    if (article) {
      await article.populate([
        { path: 'category', select: 'name slug' },
        { path: 'author', select: 'name' },
        { path: 'relatedProducts.product', select: 'name slug mainImage price discountPercent status shortDesc' }
      ]);
    }

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

/* --------------------- مقالات مرتبط (فقط انتخاب دستی ادمین) --------------------- */
// GET /api/articles/:slug/related — بدون fallback خودکار؛ اگر ادمین خالی گذاشته باشد → []
exports.getRelatedArticles = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const slug = String(req.params.slug || '').toLowerCase();

    const other = lang === 'fa' ? 'en' : 'fa';

    // اولویت با تطابق دقیق اسلاگ (همان الگوی getArticleBySlug)
    // هشدار: publishedFilter() خودش $or دارد؛ اگر روی کوئریِ دارای $or اسپرد شود،
    // $or اسلاگ را بازنویسی می‌کند و کوئری به «هر مقاله‌ی منتشرشده» تبدیل می‌شود.
    const [exactLang, exactOther, legacy] = await Promise.all([
      Article.findOne({ [`slug.${lang}`]: slug, ...publishedFilter() }).select('relatedArticles').lean(),
      Article.findOne({ [`slug.${other}`]: slug, ...publishedFilter() }).select('relatedArticles').lean(),
      Article.findOne({ legacySlugs: slug, ...publishedFilter() }).select('relatedArticles').lean()
    ]);
    const current = exactLang || exactOther || legacy;
    if (!current) return res.json({ success: true, data: [] });

    const ids = current.relatedArticles || [];
    if (!ids.length) return res.json({ success: true, data: [] });

    // فقط مقالات منتشرشده (اگر ادمین مقاله‌ای را بعداً پیش‌نویس کرده باشد نمایش داده نمی‌شود)
    const docs = await Article.find({
      _id: { $in: ids, $ne: current._id },
      ...publishedFilter()
    })
      .select('title slug excerpt image imageAlt imageVariants type category publishedAt readingTime')
      .lean();

    // حفظ ترتیب انتخابی ادمین
    const order = new Map(ids.map((id, i) => [String(id), i]));
    docs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));

    res.json({ success: true, data: docs.map(a => localizeArticle(a, lang)) });
  } catch (err) {
    console.error('Error fetching related articles:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ قبلی / بعدی ------------------------------- */
// GET /api/articles/:slug/adjacent — اورراید دستی ادمین؛ سمتِ خالی = خودکار (تاریخ انتشار)
exports.getAdjacentArticles = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const slug = String(req.params.slug || '').toLowerCase();

    const other = lang === 'fa' ? 'en' : 'fa';

    // همان الگوی getArticleBySlug — بدون بازنویسی $or
    const [exactLang, exactOther, legacy] = await Promise.all([
      Article.findOne({ [`slug.${lang}`]: slug, ...publishedFilter() }).select('publishedAt prevArticle nextArticle').lean(),
      Article.findOne({ [`slug.${other}`]: slug, ...publishedFilter() }).select('publishedAt prevArticle nextArticle').lean(),
      Article.findOne({ legacySlugs: slug, ...publishedFilter() }).select('publishedAt prevArticle nextArticle').lean()
    ]);
    const current = exactLang || exactOther || legacy;
    if (!current) return res.json({ success: true, data: { prev: null, next: null } });

    const select = 'title slug image publishedAt';

    // ۱) اورراید دستی — فقط اگر مقاله‌ی انتخاب‌شده منتشر شده باشد نمایش داده می‌شود؛
    //    در غیر این صورت (پیش‌نویس/آرشیو) همان سمت به حالت خودکار برمی‌گردد
    const manualIds = [current.prevArticle, current.nextArticle].filter(Boolean).map(String);
    const manualDocs = manualIds.length
      ? await Article.find({ _id: { $in: manualIds }, ...publishedFilter() }).select(select).lean()
      : [];
    const manualMap = new Map(manualDocs.map(d => [String(d._id), d]));

    let prev = current.prevArticle ? (manualMap.get(String(current.prevArticle)) || null) : null;
    let next = current.nextArticle ? (manualMap.get(String(current.nextArticle)) || null) : null;

    // ۲) خودکار — فقط برای سمت‌هایی که دستی ست نشده‌اند
    const [autoPrev, autoNext] = await Promise.all([
      !prev
        ? Article.findOne({ ...publishedFilter(), publishedAt: { $lt: current.publishedAt || new Date(0) } })
            .sort({ publishedAt: -1 }).select(select).lean()
        : null,
      !next
        ? Article.findOne({ ...publishedFilter(), publishedAt: { $gt: current.publishedAt || new Date(0) } })
            .sort({ publishedAt: 1 }).select(select).lean()
        : null
    ]);
    if (!prev) prev = autoPrev;
    if (!next) next = autoNext;

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
