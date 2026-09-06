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

const PUBLIC_PRODUCT_STATUSES = ['active', 'out_of_stock'];

const isEnIndexable = (doc) => {
  const en = doc.seo?.en;
  return Boolean(en && (en.title || en.description) && en.noIndex !== true);
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
/**
 * alternates:
 *   undefined → رفتار پیش‌فرض قبلی (جفت fa/en)
 *   null      → بدون hreflang (وقتی نسخه‌ی زبان دیگر noindex است)
 *   [{lang, url}] → hreflang دقیق و کنترل‌شده
 */
const metaTags = ({ title, description, canonical, lang, image, noIndex, type = 'website', publishedTime = null, alternates }) => {
  const fullTitle = title.includes('نورمهر') || /Nourmehr/i.test(title) ? title : `${title} | نورمهر`;
  const img = image ? absoluteUrl(image) : `${SITE_URL}/og-cover.jpg`;

  let hreflangLinks = '';
  if (alternates === null) {
    hreflangLinks = '';
  } else if (Array.isArray(alternates) && alternates.length > 0) {
    const xDefault = alternates.find((a) => a.lang === 'fa') || alternates[0];
    hreflangLinks = alternates
      .map((a) => `  <link rel="alternate" hreflang="${a.lang}" href="${escapeHtml(a.url)}" />`)
      .join('\n');
    hreflangLinks += `\n  <link rel="alternate" hreflang="x-default" href="${escapeHtml(xDefault.url)}" />`;
  } else {
    const altLang = lang === 'fa' ? 'en' : 'fa';
    const altCanonical = canonical.replace(`/${lang}/`, `/${altLang}/`);
    hreflangLinks = `  <link rel="alternate" hreflang="${lang}" href="${escapeHtml(canonical)}" />
  <link rel="alternate" hreflang="${altLang}" href="${escapeHtml(altCanonical)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical.replace(`/${lang}/`, '/fa/'))}" />`;
  }

  return `
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
 ${hreflangLinks}
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
    Blog.find({ ...publishedFilter(), 'seo.noIndex': { $ne: true } })
      .select('slug updatedAt publishedAt createdAt')
      .sort({ publishedAt: -1 })
      .limit(5000)
      .lean(),
    Category.find({ status: 'active' }).select('slug updatedAt').lean(),
    Product.find({
      status: { $in: PUBLIC_PRODUCT_STATUSES },
      'seo.fa.noIndex': { $ne: true },
      'seo.sitemap.include': { $ne: false },
    })
      .select('slug updatedAt createdAt seo')
      .limit(5000)
      .lean(),
    Collection.find({ status: 'active' }).select('slug updatedAt').lean(),
    BlogCategory.find({ isActive: true }).select('slug').lean(),
  ]);

  const entries = [];

  const urlEntry = (path, { changefreq = 'weekly', priority = 0.7, lastmod = null, alternates = [] } = {}) => {
    const lines = [`    <loc>${escapeXml(absoluteUrl(path))}</loc>`];
    alternates.forEach((a) => {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${escapeXml(absoluteUrl(a.path))}" />`);
    });
    if (lastmod) lines.push(`    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`);
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  };

  // یک جفت fa/en با hreflang متقابل
  const pushBothLangs = (buildPath, opts = {}) => {
    const alternates = [
      { lang: 'fa', path: buildPath('fa') },
      { lang: 'en', path: buildPath('en') },
    ];
    entries.push(urlEntry(alternates[0].path, { ...opts, alternates }));
    entries.push(urlEntry(alternates[1].path, { ...opts, alternates }));
  };

  // صفحات استاتیک
  const staticPaths = ['', 'products', 'about', 'contact', 'news', 'discounts'];
  for (const p of staticPaths) {
    pushBothLangs((l) => `/${l}${p ? '/' + p : ''}`, {
      changefreq: p === 'news' ? 'daily' : 'weekly',
      priority: p === '' ? '1.0' : '0.7',
    });
  }

  // دسته‌بندی‌های محصولات
  for (const c of categories) {
    pushBothLangs((l) => `/${l}/products?category=${c.slug}`, { priority: '0.7', lastmod: c.updatedAt });
  }

  // کالکشن‌ها
  for (const col of collections) {
    pushBothLangs((l) => `/${l}/collection/${col.slug}`, { priority: '0.8', lastmod: col.updatedAt });
  }

  // محصولات — اولویت/تناوب از seo.sitemap + آدرس en فقط وقتی ایندکس‌پذیر باشد
  for (const p of products) {
    const sm = p.seo?.sitemap || {};
    const opts = {
      changefreq: sm.changefreq || 'weekly',
      priority: sm.priority ?? 0.9,
      lastmod: p.updatedAt || p.createdAt,
    };
    const faPath = `/fa/product/${p.slug || p._id}`;
    const enOk = isEnIndexable(p);
    const alternates = enOk
      ? [{ lang: 'fa', path: faPath }, { lang: 'en', path: `/en/product/${p.slug}` }]
      : [];
    entries.push(urlEntry(faPath, { ...opts, alternates }));
    if (enOk) {
      entries.push(urlEntry(`/en/product/${p.slug}`, { ...opts, alternates }));
    }
  }

  // دسته‌بندی‌های اخبار
  for (const c of blogCategories) {
    pushBothLangs((l) => `/${l}/news?category=${c.slug}`, { priority: '0.6' });
  }

  // مقالات
  for (const b of blogs) {
    pushBothLangs((l) => `/${l}/news/${b.slug}`, {
      priority: '0.8',
      lastmod: b.updatedAt || b.publishedAt || b.createdAt,
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
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

const renderProductNotFound = (lang) => {
  const head = metaTags({
    title: lang === 'fa' ? 'محصول یافت نشد' : 'Product not found',
    description: lang === 'fa' ? 'این محصول یافت نشد.' : 'This product could not be found.',
    canonical: absoluteUrl(`/${lang}/products`),
    lang,
    noIndex: true,
    alternates: null,
  });
  const body = `<h1>${lang === 'fa' ? 'محصول مورد نظر یافت نشد' : 'Product not found'}</h1>
  <p><a href="/${lang}/products">${lang === 'fa' ? 'بازگشت به محصولات' : 'Back to products'}</a></p>`;
  return pageShell(lang, head, body);
};

exports.productBotRenderer = async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    const lang = ['fa', 'en'].includes(req.params.lang) ? req.params.lang : (req.lang || 'fa');
    const slug = String(req.params.slug || '').toLowerCase();

    const product = await Product.findOne({ slug, status: { $in: PUBLIC_PRODUCT_STATUSES } })
      .populate('category', 'name slug')
      .lean();

    if (!product) {
      // ریدایرکت ۳۰۱ برای اسلاگ‌های قدیمی
      const redirected = await Product.findOne({ oldSlugs: slug }).select('slug').lean();
      if (redirected) return res.redirect(301, `/${lang}/product/${redirected.slug}`);
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(404).send(renderProductNotFound(lang));
    }

    const seo = product.seo || {};
    const seoLang = seo[lang] || {};
    const enIndexable = isEnIndexable(product);
    const noIndex = lang === 'en' ? !enIndexable : seoLang.noIndex === true;

    const name = pick(product.name, lang);
    const metaTitle = seoLang.title || name;
    const metaDescription = truncate(
      seoLang.description || pick(product.shortDesc, lang) || stripHtml(pick(product.description, lang)) || name,
      175
    );

    const canonicalOverride =
      typeof seoLang.canonicalUrl === 'string' && /^(https?:\/\/|\/)/i.test(seoLang.canonicalUrl)
        ? seoLang.canonicalUrl
        : '';
    const canonical = canonicalOverride || absoluteUrl(`/${lang}/product/${product.slug}`);

    // hreflang فقط وقتی معنا دارد که هر دو زبان ایندکس‌پذیر باشند و canonical دستی/خارجی تعیین نشده باشد
    const alternates = canonicalOverride || !enIndexable
      ? null
      : [
          { lang: 'fa', url: absoluteUrl(`/fa/product/${product.slug}`) },
          { lang: 'en', url: absoluteUrl(`/en/product/${product.slug}`) },
        ];

    const ogImage = seoLang.ogImage || product.mainImage || product.images?.[0] || '';

    // قیمت نهایی با تخفیف + موجودی واقعی
    const basePrice = Number(product.price) || 0;
    const discount = Number(product.discountPercent) || 0;
    const finalPrice = discount > 0 && discount < 100 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
    const inStock = product.status === 'active' && Number(product.stock || 0) > 0;

    const head = metaTags({
      title: metaTitle,
      description: metaDescription,
      canonical,
      lang,
      image: ogImage,
      noIndex,
      type: 'product',
      alternates,
    });

    const allImages = [...new Set([product.mainImage, ...(product.images || [])].filter(Boolean))];

    /* ---- JSON-LD: Product ---- */
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: metaDescription || undefined,
      image: allImages.length ? allImages.slice(0, 6).map(absoluteUrl) : undefined,
      url: canonical,
      sku: product.sku || undefined,
      category: product.category ? pick(product.category.name, lang) || undefined : undefined,
      material: pick(product.material, lang) || undefined,
      brand: { '@type': 'Brand', name: 'نورمهر' },
      offers: basePrice > 0 ? {
        '@type': 'Offer',
        url: canonical,
        price: finalPrice,
        priceCurrency: 'IRR',
        itemCondition: 'https://schema.org/NewCondition',
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: 'نورمهر' },
      } : undefined,
      ...(product.ratingCount > 0 && product.ratingAverage > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.ratingAverage,
              bestRating: 5,
              worstRating: 1,
              reviewCount: product.ratingCount,
            },
          }
        : {}),
    };

    /* ---- JSON-LD: BreadcrumbList ---- */
    const crumbs = [
      { name: lang === 'fa' ? 'خانه' : 'Home', item: `${SITE_URL}/${lang}` },
      { name: lang === 'fa' ? 'محصولات' : 'Products', item: `${SITE_URL}/${lang}/products` },
    ];
    if (product.category?.slug) {
      crumbs.push({
        name: pick(product.category.name, lang) || product.category.slug,
        item: `${SITE_URL}/${lang}/products?category=${product.category.slug}`,
      });
    }
    crumbs.push({ name, item: canonical });

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    };

    /* ---- بدنه‌ی غنی برای ربات ---- */
    const altMap = new Map((product.imageAlts || []).map((a) => [a.image, pick(a.alt, lang)]));
    const altFor = (img) => altMap.get(img) || name;
    const num = (n) => Number(n).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US');

    const priceBlock = basePrice > 0
      ? `<p>${lang === 'fa' ? 'قیمت' : 'Price'}: <strong>${num(finalPrice)} ${lang === 'fa' ? 'تومان' : 'IRR'}</strong>${discount > 0 ? ` <s>${num(basePrice)}</s> (-${discount}%)` : ''}</p>`
      : '';

    const specRow = (label, value) =>
      value ? `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>` : '';

    const specsTable = [
      specRow(lang === 'fa' ? 'جنس' : 'Material', pick(product.material, lang)),
      specRow(lang === 'fa' ? 'وزن' : 'Weight', product.weight),
      specRow(lang === 'fa' ? 'ابعاد' : 'Dimensions', product.dimensions),
      specRow(lang === 'fa' ? 'استادکار' : 'Craftsman', pick(product.craftsman, lang)),
      specRow(lang === 'fa' ? 'ضمانت' : 'Warranty', pick(product.warranty, lang)),
    ].filter(Boolean).join('');

    const features = (product.features || []).map((f) => pick(f, lang)).filter(Boolean);

    const body = `
    <article>
      <nav aria-label="breadcrumb">
        <a href="/${lang}">${lang === 'fa' ? 'خانه' : 'Home'}</a> ›
        <a href="/${lang}/products">${lang === 'fa' ? 'محصولات' : 'Products'}</a>${
          product.category?.slug
            ? ` › <a href="/${lang}/products?category=${escapeHtml(product.category.slug)}">${escapeHtml(pick(product.category.name, lang) || '')}</a>`
            : ''
        } › <span>${escapeHtml(name)}</span>
      </nav>
      <h1>${escapeHtml(name)}</h1>
      ${allImages.slice(0, 8)
        .map((img) => `<img src="${escapeHtml(absoluteUrl(img))}" alt="${escapeHtml(altFor(img))}" width="800" />`)
        .join('\n      ')}
      ${pick(product.shortDesc, lang) ? `<p><strong>${escapeHtml(pick(product.shortDesc, lang))}</strong></p>` : ''}
      ${priceBlock}
      ${features.length ? `<h2>${lang === 'fa' ? 'ویژگی‌ها' : 'Features'}</h2><ul>${features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>` : ''}
      ${specsTable ? `<h2>${lang === 'fa' ? 'مشخصات' : 'Specifications'}</h2><table>${specsTable}</table>` : ''}
      <h2>${lang === 'fa' ? 'توضیحات' : 'Description'}</h2>
      <div>${pick(product.description, lang)}</div>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
    </article>`;

    if (noIndex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'");
    return res.send(pageShell(lang, head, body));
  } catch (err) {
    console.error('Product bot renderer error:', err);
    next();
  }
};

// مسیر محصول برای کاربران عادی هم از این میان‌افزار عبور می‌کند تا ریدایرکت ۳۰۱ اسلاگ قدیمی اعمال شود
exports.productSlugRedirect = async (req, res, next) => {
  if (!req.params.slug) return next();
  try {
    const slug = String(req.params.slug).toLowerCase();
    const exists = await Product.exists({ slug });
    if (exists) return next();
    const redirected = await Product.findOne({ oldSlugs: slug }).select('slug').lean();
    if (redirected) return res.redirect(301, `/${req.params.lang || 'fa'}/product/${redirected.slug}`);
    next();
  } catch (err) {
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
