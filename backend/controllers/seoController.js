/**
 * سئوی سمت سرور برای بخش اخبار و مقالات:
 *  - رندر داینامیک صفحات اخبار برای ربات‌ها (بدون نیاز به اجرای جاوااسکریپت)
 *  - sitemap.xml و rss.xml و robots.txt
 *  - ریدایرکت ۳۰۱ برای slugهای قدیمی
 */
const Blog = require('../models/Blog');
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const Category = require('../models/Category');
const BlogCategory = require('../models/BlogCategory');
const { getOrSet } = require('../utils/cache');

const SITE_URL = (process.env.SITE_URL || 'https://nourmehr.ir').replace(/\/+$/, '');

const publishedFilter = () => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', publishedAt: { $lte: new Date() } }
  ]
});

// تشخیص ربات‌های موتورهای جستجو و شبکه‌های اجتماعی از روی User-Agent
const BOT_UA = /Googlebot|Googlebot-Image|Bingbot|DuckDuckBot|YandexBot|Baiduspider|Slurp|Twitterbot|facebookexternalhit|LinkedInBot|WhatsApp|TelegramBot|Applebot|SemrushBot|AhrefsBot/i;
const isBot = (ua = '') => BOT_UA.test(String(ua));

/* ------------------------------ کمکی‌های HTML ------------------------------ */
const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const escapeXml = (s = '') => escapeHtml(s);

const stripHtml = (html = '') => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const truncate = (s = '', n = 160) => {
  const t = String(s).trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + '…';
};

const pick = (value, lang) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value[lang] || value.fa || value.en || '';
  return '';
};

const absoluteUrl = (path = '') => /^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`;

const faDate = (d) => {
  try { return new Date(d).toLocaleDateString('fa-IR'); } catch { return ''; }
};

/* ------------------------------ متا مشترک ------------------------------ */
const metaTags = ({ title, description, canonical, lang, image, noIndex, type = 'website', publishedTime = null }) => {
  const fullTitle = title.includes('نورمهر') || /Nourmehr/i.test(title) ? title : `${title} | نورمهر`;
  const img = image ? absoluteUrl(image) : `${SITE_URL}/og-cover.jpg`;
  const altLang = lang === 'fa' ? 'en' : 'fa';
  const altCanonical = canonical.replace(`/${lang}/`, `/${altLang}/`);

  return `
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="alternate" hreflang="${lang}" href="${escapeHtml(canonical)}" />
  <link rel="alternate" hreflang="${altLang}" href="${escapeHtml(altCanonical)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical.replace(`/${lang}/`, '/fa/'))}" />
  <meta property="og:site_name" content="نورمهر" />
  <meta property="og:locale" content="${lang === 'fa' ? 'fa_IR' : 'en_US'}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(img)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(img)}" />
  ${publishedTime ? `<meta property="article:published_time" content="${new Date(publishedTime).toISOString()}" />` : ''}`;
};

const pageShell = (lang, head, body) => `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${head}
</head>
<body>${body}</body>
</html>`;

/* --------------------------- صفحه لیست اخبار --------------------------- */
const renderNewsList = (req, { blogs, categories, description }) => {
  const lang = req.lang || 'fa';
  const canonical = absoluteUrl(req.originalUrl.split('?')[0]);

  const head = metaTags({
    title: lang === 'fa' ? 'اخبار و مقالات' : 'News & Articles',
    description,
    canonical,
    lang,
    image: blogs[0]?.image || ''
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: lang === 'fa' ? 'اخبار و مقالات نورمهر' : 'Nourmehr News & Articles',
    url: canonical,
    blogPost: blogs.slice(0, 10).map(b => ({
      '@type': 'BlogPosting',
      headline: pick(b.title, lang),
      url: absoluteUrl(`/${lang}/news/${b.slug}`),
      datePublished: (b.publishedAt || b.createdAt),
      image: b.image ? absoluteUrl(b.image) : undefined
    }))
  };

  const items = blogs.map(b => `
    <li>
      <a href="/${lang}/news/${escapeHtml(b.slug)}">${escapeHtml(pick(b.title, lang))}</a>
      <p>${escapeHtml(truncate(pick(b.excerpt, lang), 200))}</p>
      <time datetime="${new Date(b.publishedAt || b.createdAt).toISOString()}">${escapeHtml(faDate(b.publishedAt || b.createdAt))}</time>
    </li>`).join('\n');

  const cats = categories.map(c => `<li><a href="/${lang}/news?category=${escapeHtml(c.slug)}">${escapeHtml(pick(c.name, lang))} (${c.count})</a></li>`).join('\n');

  const body = `
  <h1>${lang === 'fa' ? 'اخبار و مقالات' : 'News & Articles'}</h1>
  <p>${escapeHtml(description)}</p>
  ${cats ? `<h2>${lang === 'fa' ? 'دسته‌بندی‌ها' : 'Categories'}</h2><ul>${cats}</ul>` : ''}
  <ul>${items}</ul>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  return pageShell(lang, head, body);
};

/* -------------------------- صفحه جزئیات مقاله -------------------------- */
const renderNewsDetail = (req, blog) => {
  const lang = req.lang || 'fa';
  const title = pick(blog.seo?.title, lang) || pick(blog.title, lang);
  const description = truncate(pick(blog.seo?.description, lang) || pick(blog.excerpt, lang) || stripHtml(pick(blog.content, lang)), 160);
  const canonical = blog.seo?.canonicalUrl || absoluteUrl(req.originalUrl.split('?')[0]);
  const image = blog.seo?.ogImage || blog.image || '';
  const noIndex = !!blog.seo?.noIndex;
  const date = blog.publishedAt || blog.createdAt;

  const head = metaTags({
    title,
    description,
    canonical,
    lang,
    image,
    noIndex,
    type: 'article',
    publishedTime: date
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: truncate(pick(blog.title, lang), 110),
    description,
    image: image ? [absoluteUrl(image)] : undefined,
    datePublished: date ? new Date(date).toISOString() : undefined,
    dateModified: new Date(blog.updatedAt || date || Date.now()).toISOString(),
    inLanguage: lang,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: { '@type': 'Person', name: blog.authorName || 'نورمهر' },
    publisher: {
      '@type': 'Organization',
      name: 'نورمهر',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.ico` }
    }
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'fa' ? 'خانه' : 'Home', item: `${SITE_URL}/${lang}` },
      { '@type': 'ListItem', position: 2, name: lang === 'fa' ? 'اخبار و مقالات' : 'News', item: `${SITE_URL}/${lang}/news` },
      { '@type': 'ListItem', position: 3, name: pick(blog.title, lang), item: canonical }
    ]
  };

  const tags = (blog.tags || []).map(t => `<li><a href="/${lang}/news?tag=${escapeHtml(t.slug)}">${escapeHtml(pick(t, lang))}</a></li>`).join('\n');

  const body = `
  <article>
    <nav aria-label="breadcrumb">
      <a href="/${lang}">${lang === 'fa' ? 'خانه' : 'Home'}</a> ›
      <a href="/${lang}/news">${lang === 'fa' ? 'اخبار و مقالات' : 'News'}</a> ›
      <span>${escapeHtml(pick(blog.title, lang))}</span>
    </nav>
    <h1>${escapeHtml(pick(blog.title, lang))}</h1>
    ${blog.image ? `<img src="${escapeHtml(absoluteUrl(blog.image))}" alt="${escapeHtml(pick(blog.imageAlt, lang) || pick(blog.title, lang))}" width="1200" />` : ''}
    <p><strong>${escapeHtml(truncate(pick(blog.excerpt, lang), 300))}</strong></p>
    <time datetime="${new Date(date).toISOString()}">${escapeHtml(faDate(date))}</time>
    ${blog.readingTime ? `<span> — ${blog.readingTime} ${lang === 'fa' ? 'دقیقه مطالعه' : 'min read'}</span>` : ''}
    ${blog.authorName ? `<address>${escapeHtml(blog.authorName)}</address>` : ''}
    <div>${pick(blog.content, lang)}</div>
    ${tags ? `<ul>${tags}</ul>` : ''}
  </article>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`;

  return pageShell(lang, head, body);
};

/* --------------------------------- 404 ربات --------------------------------- */
const renderNewsNotFound = (req) => {
  const lang = req.lang || 'fa';
  const head = metaTags({
    title: lang === 'fa' ? 'مقاله یافت نشد' : 'Article not found',
    description: lang === 'fa' ? 'این مقاله یافت نشد.' : 'This article could not be found.',
    canonical: absoluteUrl(`/${lang}/news`),
    lang,
    noIndex: true
  });
  const body = `<h1>${lang === 'fa' ? 'مقاله مورد نظر یافت نشد' : 'Article not found'}</h1>
  <p><a href="/${lang}/news">${lang === 'fa' ? 'بازگشت به اخبار' : 'Back to news'}</a></p>`;
  return pageShell(lang, head, body);
};

/* -------------------------------- sitemap -------------------------------- */
const buildSitemap = async () => {
  const [blogs, categories, products, collections, blogCategories] = await Promise.all([
    Blog.find(publishedFilter())
      .select('slug updatedAt publishedAt createdAt')
      .sort({ publishedAt: -1 })
      .limit(5000)
      .lean(),
    Category.find({ status: 'active' }).select('slug updatedAt').lean(),
    Product.find({ status: 'active' })
      .select('slug updatedAt createdAt')
      .limit(5000)
      .lean(),
    Collection.find({ status: 'active' })
      .select('slug updatedAt')
      .lean(),
    BlogCategory.find({ isActive: true }).select('slug').lean()
  ]);

  const staticPaths = ['', 'products', 'about', 'contact', 'news', 'discounts'];
  const url = (path, changefreq, priority, lastmod) => `  <url>
    <loc>${escapeXml(absoluteUrl(path))}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

  const entries = [];

  // صفحات استاتیک
  for (const p of staticPaths) {
    for (const lang of ['fa', 'en']) {
      entries.push(url(`/${lang}${p ? '/' + p : ''}`, p === 'news' ? 'daily' : 'weekly', p === '' ? '1.0' : '0.7'));
    }
  }

  // دسته‌بندی‌های محصولات
  for (const c of categories) {
    for (const lang of ['fa', 'en']) {
      entries.push(url(`/${lang}/products?category=${c.slug}`, 'weekly', '0.7', c.updatedAt));
    }
  }

  // کالکشن‌ها
  for (const col of collections) {
    for (const lang of ['fa', 'en']) {
      entries.push(url(`/${lang}/collection/${col.slug}`, 'weekly', '0.8', col.updatedAt));
    }
  }

  // محصولات
  for (const p of products) {
    for (const lang of ['fa', 'en']) {
      entries.push(url(`/${lang}/product/${p.slug || p._id}`, 'weekly', '0.9', p.updatedAt || p.createdAt));
    }
  }

  // دسته‌بندی‌های اخبار
  for (const c of blogCategories) {
    for (const lang of ['fa', 'en']) {
      entries.push(url(`/${lang}/news?category=${c.slug}`, 'weekly', '0.6'));
    }
  }

  // مقالات
  for (const b of blogs) {
    for (const lang of ['fa', 'en']) {
      entries.push(url(`/${lang}/news/${b.slug}`, 'weekly', '0.8', b.updatedAt || b.publishedAt || b.createdAt));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
};

/* ---------------------------------- RSS ---------------------------------- */
const buildRss = async () => {
  const blogs = await Blog.find(publishedFilter())
    .select('title slug excerpt content image publishedAt createdAt')
    .sort({ publishedAt: -1 })
    .limit(30)
    .lean();

  const items = blogs.map(b => {
    const title = pick(b.title, 'fa') || pick(b.title, 'en');
    const desc = truncate(pick(b.excerpt, 'fa') || stripHtml(pick(b.content, 'fa')), 300);
    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(absoluteUrl(`/fa/news/${b.slug}`))}</link>
      <guid isPermaLink="true">${escapeXml(absoluteUrl(`/fa/news/${b.slug}`))}</guid>
      <pubDate>${new Date(b.publishedAt || b.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(desc)}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>نورمهر | اخبار و مقالات</title>
    <link>${SITE_URL}/fa/news</link>
    <description>آخرین اخبار، رویدادها و مقالات نورمهر</description>
    <language>fa</language>
${items}
  </channel>
</rss>`;
};

/* -------------------------------- handlers -------------------------------- */
const xmlResponse = (res, xml) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  // CSP هلمت برای پاسخ‌های XML معنا ندارد؛ حذف می‌شود تا خواننده‌های فید دچار مشکل نشوند
  res.removeHeader('Content-Security-Policy');
  res.send(xml);
};

// GET /sitemap.xml
exports.sitemap = async (req, res) => {
  try {
    const xml = await getOrSet('seo:blogs:sitemap', 600, buildSitemap);
    xmlResponse(res, xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).end();
  }
};

// GET /rss.xml
exports.rss = async (req, res) => {
  try {
    const xml = await getOrSet('seo:blogs:rss', 600, buildRss);
    xmlResponse(res, xml);
  } catch (err) {
    console.error('RSS error:', err);
    res.status(500).end();
  }
};

// GET /robots.txt
exports.robots = (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
};

/* ----------------------- رندر داینامیک صفحات اخبار ----------------------- */
// برای کاربران عادی next() می‌کند (SPA)؛ برای ربات‌ها HTML کامل سمت سرور می‌سازد
exports.newsBotRenderer = async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const lang = req.lang || 'fa';

    // صفحه جزئیات
    if (req.params.slug) {
      const slug = String(req.params.slug).toLowerCase();

      let blog = await Blog.findOne({ slug, ...publishedFilter() }).lean();
      if (!blog) {
        // ریدایرکت ۳۰۱ برای slugهای قدیمی
        const redirected = await Blog.findOne({ oldSlugs: slug }).select('slug').lean();
        if (redirected) {
          return res.redirect(301, `/${lang}/news/${redirected.slug}`);
        }
        res.setHeader('X-Robots-Tag', 'noindex');
        return res.status(404).send(renderNewsNotFound(req));
      }
      if (blog.seo?.noIndex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; font-src 'self'");
      return res.send(renderNewsDetail(req, blog));
    }

    // صفحه لیست
    const [blogs, categories] = await Promise.all([
      Blog.find(publishedFilter())
        .select('title slug excerpt image imageAlt publishedAt createdAt tags')
        .sort({ featured: -1, publishedAt: -1 })
        .limit(30)
        .lean(),
      BlogCategory.find({ isActive: true }).sort({ order: 1 }).lean()
    ]);

    // شمارش مقالات هر دسته برای لیست ربات
    const counts = await Blog.aggregate([
      { $match: { ...publishedFilter(), category: { $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));
    const cats = categories.map(c => ({ ...c, count: countMap.get(String(c._id)) || 0 }));

    const description = lang === 'fa'
      ? 'آخرین اخبار، رویدادها و مقالات نورمهر — خانه هنرهای لوکس ایرانی'
      : 'Latest news, events and articles from Nourmehr — luxury Persian art house';

    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; font-src 'self'");
    return res.send(renderNewsList(req, { blogs, categories: cats, description }));
  } catch (err) {
    console.error('Bot renderer error:', err);
    next();
  }
};

// مسیرهای اخبار برای انسان‌ها هم از این میان‌افزار عبور می‌کنند تا ریدایرکت ۳۰۱ اعمال شود
exports.newsSlugRedirect = async (req, res, next) => {
  if (!req.params.slug) return next();
  try {
    const slug = String(req.params.slug).toLowerCase();
    const exists = await Blog.exists({ slug });
    if (exists) return next();
    const redirected = await Blog.findOne({ oldSlugs: slug }).select('slug').lean();
    if (redirected) return res.redirect(301, `/${req.params.lang || 'fa'}/news/${redirected.slug}`);
    next();
  } catch (err) {
    next();
  }
};

/* ----------------------- رندر داینامیک صفحات محصول ----------------------- */
exports.productBotRenderer = async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const lang = req.params.lang || 'fa';
    const slug = String(req.params.slug || '').toLowerCase();

    const product = await Product.findOne({ slug, status: 'active' })
      .populate('category', 'slug name')
      .lean();

    if (!product) return next();

    const name = pick(product.name, lang);
    const description = truncate(
      pick(product.description, lang) || pick(product.shortDescription, lang) || name, 160
    );
    const canonical = absoluteUrl(`/${lang}/product/${product.slug}`);
    const image = product.images?.[0] || product.image || '';

    const head = metaTags({ title: name, description, canonical, lang, image, type: 'product', noIndex: lang === 'en' });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: image ? [absoluteUrl(image)] : undefined,
      url: canonical,
      offers: product.price ? {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'IRR',
        availability: 'https://schema.org/InStock',
        url: canonical
      } : undefined,
      brand: { '@type': 'Brand', name: 'نورمهر' }
    };

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: lang === 'fa' ? 'خانه' : 'Home', item: `${SITE_URL}/${lang}` },
        { '@type': 'ListItem', position: 2, name: lang === 'fa' ? 'محصولات' : 'Products', item: `${SITE_URL}/${lang}/products` },
        { '@type': 'ListItem', position: 3, name, item: canonical }
      ]
    };

    const body = `
    <article>
      <nav>
        <a href="/${lang}">${lang === 'fa' ? 'خانه' : 'Home'}</a> ›
        <a href="/${lang}/products">${lang === 'fa' ? 'محصولات' : 'Products'}</a> ›
        <span>${escapeHtml(name)}</span>
      </nav>
      <h1>${escapeHtml(name)}</h1>
      ${image ? `<img src="${escapeHtml(absoluteUrl(image))}" alt="${escapeHtml(name)}" width="800" />` : ''}
      <p>${escapeHtml(description)}</p>
      ${product.price ? `<p>${lang === 'fa' ? 'قیمت' : 'Price'}: ${Number(product.price).toLocaleString()} ${lang === 'fa' ? 'تومان' : 'IRR'}</p>` : ''}
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
    </article>`;

    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'");
    return res.send(pageShell(lang, head, body));
  } catch (err) {
    console.error('Product bot renderer error:', err);
    next();
  }
};

/* ----------------------- رندر داینامیک صفحات کالکشن ----------------------- */
exports.collectionBotRenderer = async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const lang = req.params.lang || 'fa';
    const slug = String(req.params.slug || '').toLowerCase();

    const collection = await Collection.findOne({ slug, status: 'active' }).lean();
    if (!collection) return next();

    const name = pick(collection.name, lang);
    const description = truncate(pick(collection.description, lang) || name, 160);
    const canonical = absoluteUrl(`/${lang}/collection/${collection.slug}`);
    const image = collection.image || '';

    const head = metaTags({ title: name, description, canonical, lang, image });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      description,
      url: canonical,
      image: image ? absoluteUrl(image) : undefined
    };

    const body = `
    <article>
      <nav>
        <a href="/${lang}">${lang === 'fa' ? 'خانه' : 'Home'}</a> ›
        <span>${escapeHtml(name)}</span>
      </nav>
      <h1>${escapeHtml(name)}</h1>
      ${image ? `<img src="${escapeHtml(absoluteUrl(image))}" alt="${escapeHtml(name)}" width="800" />` : ''}
      <p>${escapeHtml(description)}</p>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    </article>`;

    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'");
    return res.send(pageShell(lang, head, body));
  } catch (err) {
    console.error('Collection bot renderer error:', err);
    next();
  }
};

module.exports.SITE_URL = SITE_URL;
module.exports.isBot = isBot;
