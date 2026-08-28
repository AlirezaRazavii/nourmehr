const Blog = require('../models/Blog');
const BlogCategory = require('../models/BlogCategory');
const BlogComment = require('../models/BlogComment');
const Notification = require('../models/Notification');

// وضعیت «قابل مشاهده برای عموم»: منتشرشده یا زمان‌بندی‌شده‌ای که وقتش رسیده
const publishedFilter = () => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', publishedAt: { $lte: new Date() } }
  ]
});

// زمان‌بندی‌شده‌های سررسیده را یک‌باره منتشر می‌کند (fire-and-forget)
const promoteScheduled = () => {
  Blog.updateMany(
    { status: 'scheduled', publishedAt: { $lte: new Date() } },
    { $set: { status: 'published' } }
  ).catch(() => {});
};

// فل‌کردن آبجکت‌های دوزبانه به زبان درخواستی با fallback به fa و en
const pick = (value, lang) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value[lang] || value.fa || value.en || '';
  return '';
};

const localizeBlog = (blog, lang, { full = false } = {}) => {
  if (!blog) return null;
  const b = blog.toObject ? blog.toObject() : { ...blog };

  const localized = {
    ...b,
    title: pick(b.title, lang),
    excerpt: pick(b.excerpt, lang),
    imageAlt: pick(b.imageAlt, lang)
  };

  // سئو: اول فیلد اختصاصی، بعد fallback به عنوان/خلاصه
  const seo = b.seo || {};
  localized.seo = {
    title: pick(seo.title, lang) || localized.title,
    description: pick(seo.description, lang) || localized.excerpt,
    keywords: pick(seo.keywords, lang),
    canonicalUrl: seo.canonicalUrl || '',
    ogImage: seo.ogImage || b.image || '',
    noIndex: !!seo.noIndex,
    focusKeyword: seo.focusKeyword || ''
  };

  if (full) {
    localized.content = pick(b.content, lang);
    localized.tags = (b.tags || []).map(t => ({ slug: t.slug, name: pick(t, lang) }));
  } else {
    // در لیست‌ها محتوای کامل و متن سئو ارسال نمی‌شود تا پاسخ سبک بماند
    delete localized.content;
    delete localized.seo;
  }

  return localized;
};

// جایگزینی categoryId با آبجکت سبک دسته‌بندی در پاسخ لیست
const withCategory = async (blogs, lang) => {
  const catIds = [...new Set(blogs.map(b => b.category).filter(Boolean).map(String))];
  if (!catIds.length) return blogs;
  const cats = await BlogCategory.find({ _id: { $in: catIds } }).lean();
  const map = new Map(cats.map(c => [String(c._id), c]));
  return blogs.map(b => {
    const c = map.get(String(b.category));
    return { ...b, category: c ? { _id: c._id, slug: c.slug, name: pick(c.name, lang) } : null };
  });
};

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------- لیست عمومی ------------------------------- */
// GET /api/blogs?page=1&limit=9&search=..&category=slug&tag=slug&type=news&sort=newest|oldest|popular
exports.getBlogs = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const skip = (page - 1) * limit;

    const query = publishedFilter();

    if (req.query.type && ['news', 'event', 'article'].includes(req.query.type)) {
      query.type = req.query.type;
    }
    if (req.query.tag) {
      query['tags.slug'] = String(req.query.tag).toLowerCase();
    }
    if (req.query.category) {
      const cat = await BlogCategory.findOne({
        $or: [{ slug: req.query.category }, { _id: req.query.category }]
      }).lean();
      query.category = cat ? cat._id : null;
    }
    if (req.query.search) {
      const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
      query.$or = [
        { 'title.fa': rx },
        { 'title.en': rx },
        { 'excerpt.fa': rx },
        { 'excerpt.en': rx }
      ];
    }

    const sortMap = {
      oldest: { publishedAt: 1, createdAt: 1 },
      popular: { viewsCount: -1, publishedAt: -1 },
      newest: { publishedAt: -1, createdAt: -1 }
    };
    const sort = sortMap[req.query.sort] || sortMap.newest;

    const [total, blogs] = await Promise.all([
      Blog.countDocuments(query),
      Blog.find(query)
        .select('title slug excerpt image imageAlt type category tags status publishedAt featured readingTime viewsCount createdAt updatedAt authorName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.json({
      success: true,
      data: await withCategory(blogs, lang),
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------- مقالات صفحه اصلی (۳ مورد) ------------------------ */
exports.getHomeAnnouncements = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    const blogs = await Blog.find(publishedFilter())
      .select('title slug excerpt image type publishedAt createdAt readingTime featured')
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .limit(3)
      .lean();

    res.json({ success: true, data: blogs.map(b => localizeBlog(b, lang)) });
  } catch (err) {
    console.error('Error fetching home blogs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ دسته‌بندی‌ها ------------------------------ */
// GET /api/blogs/categories
exports.getCategories = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const categories = await BlogCategory.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const counts = await Blog.aggregate([
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
    console.error('Error fetching blog categories:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ مقاله با slug ----------------------------- */
// GET /api/blogs/:slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    promoteScheduled();

    const blog = await Blog.findOne({ slug: req.params.slug, ...publishedFilter() })
      .populate('category', 'name slug')
      .populate('author', 'name');

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    // افزایش بازدید — بدون ذخیره کل سند تا از رقابت نوشتن جلوگیری شود
    Blog.updateOne({ _id: blog._id }, { $inc: { viewsCount: 1 } }).catch(() => {});
    blog.viewsCount = (blog.viewsCount || 0) + 1;
    if (blog.author && !blog.authorName) blog.authorName = blog.author.name || '';

    res.json({ success: true, data: localizeBlog(blog, lang, { full: true }) });
  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ مقالات مرتبط ------------------------------ */
// GET /api/blogs/:slug/related
exports.getRelatedBlogs = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const current = await Blog.findOne({ slug: req.params.slug, ...publishedFilter() })
      .select('category tags')
      .lean();
    if (!current) return res.json({ success: true, data: [] });

    const tagSlugs = (current.tags || []).map(t => t.slug);

    const related = await Blog.find({
      _id: { $ne: current._id },
      ...publishedFilter(),
      $or: [
        ...(current.category ? [{ category: current.category }] : []),
        ...(tagSlugs.length ? [{ 'tags.slug': { $in: tagSlugs } }] : [])
      ]
    })
      .select('title slug excerpt image imageAlt type publishedAt readingTime')
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean();

    res.json({ success: true, data: related.map(b => localizeBlog(b, lang)) });
  } catch (err) {
    console.error('Error fetching related blogs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* ------------------------------ قبلی / بعدی ------------------------------- */
// GET /api/blogs/:slug/adjacent
exports.getAdjacentBlogs = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const current = await Blog.findOne({ slug: req.params.slug, ...publishedFilter() })
      .select('publishedAt')
      .lean();
    if (!current) return res.json({ success: true, data: { prev: null, next: null } });

    const base = publishedFilter();
    const select = 'title slug image publishedAt';
    const [prev, next] = await Promise.all([
      Blog.findOne({ ...base, publishedAt: { $lt: current.publishedAt || new Date(0) } })
        .sort({ publishedAt: -1 }).select(select).lean(),
      Blog.findOne({ ...base, publishedAt: { $gt: current.publishedAt || new Date(0) } })
        .sort({ publishedAt: 1 }).select(select).lean()
    ]);

    res.json({
      success: true,
      data: {
        prev: prev ? localizeBlog(prev, lang) : null,
        next: next ? localizeBlog(next, lang) : null
      }
    });
  } catch (err) {
    console.error('Error fetching adjacent blogs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/* --------------------------------- نظرات --------------------------------- */
// GET /api/blogs/:slug/comments — فقط تاییدشده‌ها
exports.getComments = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).select('_id').lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const comments = await BlogComment.find({ blog: blog._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('name comment createdAt')
      .lean();

    res.json({ success: true, data: comments });
  } catch (err) {
    console.error('Error fetching blog comments:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /api/blogs/:slug/comments — فقط کاربر لاگین‌شده؛ در انتظار تایید ادمین
exports.createComment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'برای ثبت نظر باید وارد حساب شوید' });
    }
    const text = String(req.body.comment || '').trim();
    if (text.length < 3) {
      return res.status(400).json({ success: false, message: 'متن نظر خیلی کوتاه است' });
    }

    const blog = await Blog.findOne({ slug: req.params.slug, ...publishedFilter() }).select('_id title').lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    await BlogComment.create({
      blog: blog._id,
      user: req.user._id,
      name: req.user.name || req.user.email,
      comment: text
    });

    await Notification.create({
      type: 'comment',
      title: 'نظر جدید در مقاله',
      message: `نظر جدیدی توسط ${req.user.name || req.user.email} روی «${blog.title?.fa || ''}» ثبت شد و نیاز به تایید دارد.`,
      link: '/admin/blogs/comments'
    });

    res.status(201).json({
      success: true,
      message: 'نظر شما ثبت شد و پس از تایید ادمین نمایش داده خواهد شد.'
    });
  } catch (err) {
    console.error('Error creating blog comment:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
