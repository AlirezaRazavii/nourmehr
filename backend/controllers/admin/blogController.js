const Blog = require('../../models/Blog');
const BlogCategory = require('../../models/BlogCategory');
const BlogComment = require('../../models/BlogComment');
const { delByPrefix } = require('../../utils/cache');

const slugify = (text) =>
  String(text || '').toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// پاکسازی کش صفحات عمومی بلاگ و فیدهای سئو پس از هر تغییر
const invalidateBlogCache = () => {
  delByPrefix('public:blogs:');
  delByPrefix('seo:blogs');
};

// تگ‌های ورودی ادمین (آبجکت fa/en یا رشته) را به شکل ذخیره‌سازی استاندارد می‌کند
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

// تاریخ انتشار: برای published که هنوز publishedAt ندارد همین حالا؛ برای scheduled تاریخ انتخابی
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

// GET /api/admin/blogs?search=&status=&page=&limit=
exports.getBlogs = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && ['draft', 'scheduled', 'published', 'archived'].includes(req.query.status)) {
      query.status = req.query.status;
    }
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ 'title.fa': rx }, { 'title.en': rx }];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    const [total, blogs] = await Promise.all([
      Blog.countDocuments(query),
      Blog.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-content')
        .populate('category', 'name slug')
    ]);

    res.json({
      success: true,
      data: blogs,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/blogs/:id
exports.getBlogById = async (req, res) => {
  try {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    res.json({ success: true, data: blog });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/blogs
exports.createBlog = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.title || !data.title.fa) {
      return res.status(400).json({ success: false, message: 'عنوان فارسی الزامی است' });
    }
    if (!data.slug) {
      data.slug = `${slugify(data.title.fa) || 'blog'}-${Date.now()}`;
    }
    data.slug = String(data.slug).toLowerCase();
    data.tags = normalizeTags(data.tags);
    if (req.user?._id) {
      data.author = req.user._id;
      if (!data.authorName) data.authorName = req.user.name || req.user.email || '';
    }
    if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
    data.publishedAt = resolvePublishedAt(data);

    const blog = new Blog(data);
    await blog.save();
    invalidateBlogCache();
    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.slug) {
      return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/blogs/:id
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    const data = { ...req.body };
    if (data.title && !data.title.fa) {
      return res.status(400).json({ success: false, message: 'عنوان فارسی الزامی است' });
    }

    // تغییر slug: slug قبلی برای ریدایرکت ۳۰۱ نگه داشته می‌شود
    if (data.slug && data.slug !== blog.slug) {
      const newSlug = String(data.slug).toLowerCase();
      const clash = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } }).select('_id').lean();
      if (clash) {
        return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
      }
      if (!blog.oldSlugs.includes(blog.slug)) blog.oldSlugs.push(blog.slug);
      blog.slug = newSlug;
      delete data.slug;
    }

    if (data.tags !== undefined) data.tags = normalizeTags(data.tags);
    data.publishedAt = resolvePublishedAt(data, blog);
    if (data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();

    Object.assign(blog, data, { slug: blog.slug, oldSlugs: blog.oldSlugs });
    await blog.save();
    invalidateBlogCache();
    res.json({ success: true, data: blog });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.slug) {
      return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/blogs/:id
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    // نظرات یتیم حذف شوند
    await BlogComment.deleteMany({ blog: blog._id });
    invalidateBlogCache();
    res.json({ success: true, message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/blogs/bulk — عملیات گروهی
exports.bulkAction = async (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: 'هیچ مقاله‌ای انتخاب نشده است' });
    }
    const filter = { _id: { $in: ids } };

    let result;
    if (action === 'publish') {
      result = await Blog.updateMany(filter, { $set: { status: 'published', publishedAt: new Date() } });
    } else if (action === 'unpublish') {
      result = await Blog.updateMany(filter, { $set: { status: 'draft' } });
    } else if (action === 'archive') {
      result = await Blog.updateMany(filter, { $set: { status: 'archived' } });
    } else if (action === 'delete') {
      result = await Blog.deleteMany(filter);
      await BlogComment.deleteMany({ blog: { $in: ids } });
    } else if (action === 'feature') {
      result = await Blog.updateMany(filter, { $set: { featured: true } });
    } else if (action === 'unfeature') {
      result = await Blog.updateMany(filter, { $set: { featured: false } });
    } else {
      return res.status(400).json({ success: false, message: 'عملیات نامعتبر است' });
    }

    invalidateBlogCache();
    res.json({ success: true, modified: result.modifiedCount ?? result.deletedCount ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/blogs/upload-image
exports.uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'فایلی ارسال نشده است' });
    const filePath = `/uploads/blogs/${req.file.filename}`;
    res.status(201).json({
      success: true,
      filePath,
      url: filePath,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------------------ دسته‌بندی‌ها ------------------------------ */
// GET /api/admin/blog-categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/blog-categories
exports.createCategory = async (req, res) => {
  try {
    const { name, description = {}, order = 0, isActive = true } = req.body;
    if (!name?.fa) return res.status(400).json({ success: false, message: 'نام فارسی الزامی است' });
    const slug = slugify(req.body.slug || name.fa) || `cat-${Date.now()}`;
    const category = new BlogCategory({ name, slug, description, order, isActive });
    await category.save();
    invalidateBlogCache();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'دسته‌بندی با این slug وجود دارد' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/blog-categories/:id
exports.updateCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const { name, description, order, isActive } = req.body;
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;
    if (req.body.slug && req.body.slug !== category.slug) {
      const newSlug = slugify(req.body.slug);
      const clash = await BlogCategory.findOne({ slug: newSlug, _id: { $ne: category._id } }).lean();
      if (clash) return res.status(400).json({ success: false, message: 'این slug قبلاً استفاده شده است' });
      category.slug = newSlug;
    }

    await category.save();
    invalidateBlogCache();
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/blog-categories/:id — مقالات به بدون دسته منتقل می‌شوند
exports.deleteCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    await Blog.updateMany({ category: category._id }, { $set: { category: null } });
    invalidateBlogCache();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------------------- نظرات -------------------------------- */
// GET /api/admin/blogs-comments?status=pending|approved|all&blog=
exports.getComments = async (req, res) => {
  try {
    const query = {};
    if (req.query.status === 'pending') query.isApproved = false;
    if (req.query.status === 'approved') query.isApproved = true;
    if (req.query.blog) query.blog = req.query.blog;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));

    const [total, comments] = await Promise.all([
      BlogComment.countDocuments(query),
      BlogComment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('blog', 'title slug')
    ]);

    res.json({
      success: true,
      data: comments,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/blogs-comments/:id/approve
exports.approveComment = async (req, res) => {
  try {
    const comment = await BlogComment.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    invalidateBlogCache();
    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/blogs-comments/:id/unapprove — برگرداندن به حالت در انتظار
exports.unapproveComment = async (req, res) => {
  try {
    const comment = await BlogComment.findByIdAndUpdate(
      req.params.id,
      { isApproved: false },
      { new: true }
    );
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    invalidateBlogCache();
    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/blogs-comments/:id
exports.deleteComment = async (req, res) => {
  try {
    const comment = await BlogComment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    invalidateBlogCache();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/blogs-stats — خلاصه آمار برای هدر پنل
exports.getStats = async (req, res) => {
  try {
    const [published, drafts, scheduled, archived, pendingComments, totalViews] = await Promise.all([
      Blog.countDocuments({ status: 'published' }),
      Blog.countDocuments({ status: 'draft' }),
      Blog.countDocuments({ status: 'scheduled' }),
      Blog.countDocuments({ status: 'archived' }),
      BlogComment.countDocuments({ isApproved: false }),
      Blog.aggregate([{ $group: { _id: null, sum: { $sum: '$viewsCount' } } }])
    ]);
    res.json({
      success: true,
      data: {
        published,
        drafts,
        scheduled,
        archived,
        pendingComments,
        totalViews: totalViews[0]?.sum || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
