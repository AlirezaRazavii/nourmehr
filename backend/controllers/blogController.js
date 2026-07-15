const Blog = require('../models/Blog');

// تابع کمکی برای استخراج متن‌ها به زبان کاربر
const localizeBlog = (blog, lang) => {
  if (!blog) return null;
  const b = blog.toObject ? blog.toObject() : { ...blog };
  return {
    ...b,
    title: b.title?.[lang] || b.title?.fa || '',
    excerpt: b.excerpt?.[lang] || b.excerpt?.fa || '',
    content: b.content?.[lang] || b.content?.fa || ''
  };
};

// گرفتن ۳ مقاله اخیر برای صفحه اصلی (Home)
exports.getHomeAnnouncements = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const blogs = await Blog.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(3);
    
    const localizedBlogs = blogs.map(b => localizeBlog(b, lang));
    res.json({ success: true, data: localizedBlogs });
  } catch (err) {
    console.error('Error fetching home blogs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// گرفتن لیست تمام مقالات برای صفحه اخبار
exports.getBlogs = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const blogs = await Blog.find({ status: 'active' }).sort({ createdAt: -1 });
    const localizedBlogs = blogs.map(b => localizeBlog(b, lang));
    res.json({ success: true, data: localizedBlogs });
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// گرفتن یک مقاله با Slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const lang = req.lang || 'fa';
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'active' });
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
    
    // افزایش بازدید
    blog.viewsCount = (blog.viewsCount || 0) + 1;
    await blog.save();

    res.json({ success: true, data: localizeBlog(blog, lang) });
  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};