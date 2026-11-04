/**
 * articleSeoController — رندرر ربات اختصاصی ماژول رسانه‌ای جدید
 *
 * چرا فایل جدا؟ seoController.js ماژول قدیمی را دست نمی‌زنیم (تا لحظه سوییچ
 * سالم بماند). این فایل فقط مقالات جدید (کالکشن Article) را برای ربات‌ها
 * رندر می‌کند و با فلگ ARTICLE_MODULE_ENABLED در server.js فعال می‌شود.
 *
 * محتوا: همان قرارداد JSON واحد — تست parity-test.js روزانه چک می‌کند که
 * خروجی این رندرر با خروجی API عمومی (آنچه کاربر واقعی می‌بیند) هم‌ارز است.
 *
 * JSON-LD: NewsArticle/Article + BreadcrumbList + FAQPage + hreflang fa/en/x-default
 */
const Article = require('../models/Article');
const BlogCategory = require('../models/BlogCategory');

const SITE_URL = (process.env.SITE_URL || 'https://nourmehr.ir').replace(/\/+$/, '');

const publishedFilter = () => ({
  $or: [
    { status: 'published' },
    { status: 'scheduled', publishedAt: { $lte: new Date() } }
  ]
});

// همان الگوی تشخیص ربات seoController (منبع واحد در آینده یکی می‌شود)
const BOT_UA = /Googlebot|Google-InspectionTool|Storebot-Google|Googlebot-Image|Bingbot|DuckDuckBot|YandexBot|Baiduspider|Slurp|Twitterbot|facebookexternalhit|LinkedInBot|WhatsApp|TelegramBot|Applebot|SemrushBot|AhrefsBot/i;
const isBot = (ua = '') => BOT_UA.test(String(ua));

/* ------------------------------ کمکی‌های HTML ------------------------------ */
const escapeHtml = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escapeXml = escapeHtml;
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
const absoluteUrl = (p = '') => /^https?:\/\//i.test(p) ? p : `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
const faDate = (d) => {
  try { return new Date(d).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ''; }
};

/* ------------------------------ متا + پوسته ------------------------------ */
const metaTags = ({ title, description, canonical, lang, image, noIndex, type = 'article', publishedTime = null, alternates = null }) => {
  const fullTitle = title.includes('نورمهر') || /Nourmehr/i.test(title) ? title : `${title} | نورمهر`;
  const img = image ? absoluteUrl(image) : `${SITE_URL}/og-cover.jpg`;

  // hreflang: fa + en + x-default فقط وقتی نسخه انگلیسی محتوای واقعی دارد
  let hreflangLinks = '';
  if (alternates === null) {
    hreflangLinks = '';
  } else {
    const list = alternates.length ? alternates : [
      { lang, url: canonical },
      { lang: lang === 'fa' ? 'en' : 'fa', url: canonical.replace(`/${lang}/`, `/${lang === 'fa' ? 'en' : 'fa'}/`) }
    ];
    const xDefault = list.find(a => a.lang === 'fa') || list[0];
    hreflangLinks = list.map(a => `  <link rel="alternate" hreflang="${a.lang}" href="${escapeHtml(a.url)}" />`).join('\n');
    hreflangLinks += `\n  <link rel="alternate" hreflang="x-default" href="${escapeHtml(xDefault.url)}" />`;
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

/* --------------------------- پیدا کردن مقاله با اسلاگ --------------------------- */
// نگاه‌به‌زبان: slug.fa / slug.en / legacySlugs (برای ۳۰۱)
const findArticle = async (slug, lang) => {
  const article = await Article.findOne({
    $or: [{ [`slug.${lang}`]: slug }, { legacySlugs: slug }],
    ...publishedFilter()
  }).populate('category', 'name slug').lean();
  return article;
};

/* ------------------------------ صفحه جزئیات ------------------------------ */
const renderArticleDetail = (article, lang, originalUrl) => {
  const seo = article.seo || {};
  const seoLang = seo[lang] || {};
  const other = lang === 'fa' ? 'en' : 'fa';

  const title = seoLang.title || pick(article.title, lang);
  const description = truncate(
    seoLang.description || pick(article.excerpt, lang) || stripHtml(pick(article.content?.[lang], 'html') ? article.content[lang].html : ''),
    160
  );
  const slug = article.slug?.[lang] || article.slug?.fa || article.slug?.en;
  const canonical = /^https?:\/\/|^\/\//i.test(seoLang.canonicalUrl || '') ? seoLang.canonicalUrl : absoluteUrl(`/${lang}/news/${slug}`);
  const image = seoLang.ogImage || article.image || '';
  const noIndex = seoLang.noIndex === true;
  const date = article.publishedAt || article.createdAt;

  // hreflang فقط وقتی نسخه دیگر زبان محتوای واقعی دارد (جلوگیری از thin-content)
  const hasEn = Boolean(article.title?.en && article.content?.en?.html);
  const hasFa = Boolean(article.title?.fa && article.content?.fa?.html);
  const alternates = hasEn && hasFa
    ? [
        { lang: 'fa', url: absoluteUrl(`/fa/news/${article.slug.fa}`) },
        { lang: 'en', url: absoluteUrl(`/en/news/${article.slug.en || article.slug.fa}`) }
      ]
    : null;

  const head = metaTags({
    title, description, canonical, lang, image, noIndex,
    type: 'article', publishedTime: date, alternates
  });

  /* ---- JSON-LD: NewsArticle/Article ---- */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': article.type === 'news' ? 'NewsArticle' : 'Article',
    headline: truncate(pick(article.title, lang), 110),
    description,
    image: image ? [absoluteUrl(image)] : undefined,
    datePublished: date ? new Date(date).toISOString() : undefined,
    dateModified: new Date(article.updatedAt || date || Date.now()).toISOString(),
    inLanguage: lang,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: { '@type': 'Person', name: article.authorName || 'نورمهر' },
    publisher: {
      '@type': 'Organization',
      name: 'نورمهر',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.ico` }
    }
  };

  /* ---- JSON-LD: BreadcrumbList ---- */
  const crumbs = [
    { name: lang === 'fa' ? 'خانه' : 'Home', item: `${SITE_URL}/${lang}` },
    { name: lang === 'fa' ? 'اخبار و مقالات' : 'News & Articles', item: `${SITE_URL}/${lang}/news` }
  ];
  if (article.category?.slug) {
    crumbs.push({ name: pick(article.category.name, lang), item: `${SITE_URL}/${lang}/news?category=${article.category.slug}` });
  }
  crumbs.push({ name: pick(article.title, lang), item: canonical });

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.item
    }))
  };

  /* ---- JSON-LD: FAQPage (اگر FAQ واقعی موجود باشد → ریچ‌ریزالت) ---- */
  const faqItems = (article.faq || [])
    .map(f => ({ q: pick(f.question, lang), a: pick(f.answer, lang) }))
    .filter(f => f.q && f.a);
  const faqLd = faqItems.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  } : null;

  /* ---- بدنه محتوایی برای ربات (content parity — نه visual parity) ---- */
  const tags = (article.tags || []).map(t =>
    `<li><a href="/${lang}/news?tag=${escapeHtml(t.slug)}">${escapeHtml(pick(t, lang))}</a></li>`
  ).join('\n');

  const faqBody = faqItems.map(f =>
    `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`
  ).join('\n');

  const body = `
  <article>
    <nav aria-label="breadcrumb">
      <a href="/${lang}">${lang === 'fa' ? 'خانه' : 'Home'}</a> ›
      <a href="/${lang}/news">${lang === 'fa' ? 'اخبار و مقالات' : 'News & Articles'}</a>${
        article.category?.slug
          ? ` › <a href="/${lang}/news?category=${escapeHtml(article.category.slug)}">${escapeHtml(pick(article.category.name, lang) || '')}</a>`
          : ''
      } › <span>${escapeHtml(pick(article.title, lang))}</span>
    </nav>
    <h1>${escapeHtml(pick(article.title, lang))}</h1>
    ${article.image ? `<img src="${escapeHtml(absoluteUrl(article.image))}" alt="${escapeHtml(pick(article.imageAlt, lang) || pick(article.title, lang))}" width="1200" />` : ''}
    <p><strong>${escapeHtml(truncate(pick(article.excerpt, lang), 300))}</strong></p>
    <time datetime="${new Date(date).toISOString()}">${escapeHtml(faDate(date))}</time>
    ${article.readingTime ? `<span> — ${article.readingTime} ${lang === 'fa' ? 'دقیقه مطالعه' : 'min read'}</span>` : ''}
    ${article.authorName ? `<address>${escapeHtml(article.authorName)}</address>` : ''}
    <div>${article.content?.[lang]?.html || ''}</div>
    ${faqBody ? `<h2>${lang === 'fa' ? 'پرسش‌های متداول' : 'FAQ'}</h2>${faqBody}` : ''}
    ${tags ? `<ul>${tags}</ul>` : ''}
  </article>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  ${faqLd ? `<script type="application/ld+json">${JSON.stringify(faqLd)}</script>` : ''}`;

  return pageShell(lang, head, body);
};

/* ------------------------------- صفحه لیست ------------------------------- */
const renderArticleList = async (lang, originalUrl) => {
  const [articles, categories] = await Promise.all([
    Article.find(publishedFilter())
      .select('title slug excerpt image imageAlt publishedAt createdAt tags')
      .sort({ featured: -1, publishedAt: -1 })
      .limit(30)
      .lean(),
    BlogCategory.find({ isActive: true }).sort({ order: 1 }).lean()
  ]);

  const counts = await Article.aggregate([
    { $match: { ...publishedFilter(), category: { $ne: null } } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map(c => [String(c._id), c.count]));

  const description = lang === 'fa'
    ? 'آخرین اخبار، رویدادها و مقالات نورمهر — خانه هنرهای لوکس ایرانی'
    : 'Latest news, events and articles from Nourmehr — luxury Persian art house';

  const head = metaTags({
    title: lang === 'fa' ? 'اخبار و مقالات' : 'News & Articles',
    description,
    canonical: absoluteUrl(`/${lang}/news`),
    lang,
    image: articles[0]?.image || '',
    type: 'website',
    alternates: [
      { lang: 'fa', url: absoluteUrl('/fa/news') },
      { lang: 'en', url: absoluteUrl('/en/news') }
    ]
  });

  const items = articles.map(a => `
    <li>
      <a href="/${lang}/news/${escapeHtml(a.slug?.[lang] || a.slug?.fa)}">${escapeHtml(pick(a.title, lang))}</a>
      <p>${escapeHtml(truncate(pick(a.excerpt, lang), 200))}</p>
      <time datetime="${new Date(a.publishedAt || a.createdAt).toISOString()}">${escapeHtml(faDate(a.publishedAt || a.createdAt))}</time>
    </li>`).join('\n');

  const cats = categories.map(c =>
    `<li><a href="/${lang}/news?category=${escapeHtml(c.slug)}">${escapeHtml(pick(c.name, lang))} (${countMap.get(String(c._id)) || 0})</a></li>`
  ).join('\n');

  const body = `
  <h1>${lang === 'fa' ? 'اخبار و مقالات' : 'News & Articles'}</h1>
  <p>${escapeHtml(description)}</p>
  ${cats ? `<h2>${lang === 'fa' ? 'دسته‌بندی‌ها' : 'Categories'}</h2><ul>${cats}</ul>` : ''}
  <ul>${items}</ul>`;

  return pageShell(lang, head, body);
};

/* ------------------------------ 404 ربات ------------------------------ */
const renderArticleNotFound = (lang) => {
  const head = metaTags({
    title: lang === 'fa' ? 'مقاله یافت نشد' : 'Article not found',
    description: lang === 'fa' ? 'این مقاله یافت نشد.' : 'This article could not be found.',
    canonical: absoluteUrl(`/${lang}/news`),
    lang,
    noIndex: true,
    alternates: null
  });
  const body = `<h1>${lang === 'fa' ? 'مقاله مورد نظر یافت نشد' : 'Article not found'}</h1>
  <p><a href="/${lang}/news">${lang === 'fa' ? 'بازگشت به اخبار' : 'Back to news'}</a></p>`;
  return pageShell(lang, head, body);
};

/* ------------------------------ هندلرها ------------------------------ */
// GET /:lang/news/:slug و /:lang/news — فقط برای ربات‌ها؛ بقیه next() به SPA
exports.articleBotRenderer = async (req, res, next) => {
  if (!isBot(req.headers['user-agent'])) return next();
  try {
    // ★ رفع الگوی B-03: زبان از پارامتر مسیر می‌آید نه هدر
    const lang = ['fa', 'en'].includes(req.params.lang) ? req.params.lang : 'fa';

    // صفحه جزئیات
    if (req.params.slug) {
      const slug = String(req.params.slug).toLowerCase();
      const article = await findArticle(slug, lang);

      if (!article) {
        // ریدایرکت ۳۰۱ برای اسلاگ‌های قدیمی (تک‌زا یا دو‌زبانه)
        const redirected = await Article.findOne({ legacySlugs: slug }).select('slug').lean();
        if (redirected) {
          const target = redirected.slug?.[lang] || redirected.slug?.fa;
          return res.redirect(301, `/${lang}/news/${target}`);
        }
        res.setHeader('X-Robots-Tag', 'noindex');
        return res.status(404).send(renderArticleNotFound(lang));
      }

      // اسلاگ قدیمی برای این زبان → ۳۰۱ به آدرس فعلی همان زبان
      const currentSlug = article.slug?.[lang] || article.slug?.fa;
      if (currentSlug && currentSlug !== slug) {
        return res.redirect(301, `/${lang}/news/${currentSlug}`);
      }

      const noIndex = article.seo?.[lang]?.noIndex === true;
      if (noIndex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; font-src 'self'");
      return res.send(renderArticleDetail(article, lang, req.originalUrl));
    }

    // صفحه لیست
    const html = await renderArticleList(lang, req.originalUrl);
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; font-src 'self'");
    return res.send(html);
  } catch (err) {
    console.error('Article bot renderer error:', err);
    next();
  }
};

// ریدایرکت ۳۰۱ اسلاگ‌های قدیمی برای کاربران عادی (همان الگوی newsSlugRedirect)
exports.articleSlugRedirect = async (req, res, next) => {
  if (!req.params.slug) return next();
  try {
    const lang = ['fa', 'en'].includes(req.params.lang) ? req.params.lang : 'fa';
    const slug = String(req.params.slug).toLowerCase();

    const exists = await Article.exists({
      $or: [{ [`slug.${lang}`]: slug }, { [`slug.${lang === 'fa' ? 'en' : 'fa'}`]: slug }]
    });
    if (exists) return next();

    const redirected = await Article.findOne({ legacySlugs: slug }).select('slug').lean();
    if (redirected) {
      const target = redirected.slug?.[lang] || redirected.slug?.fa;
      return res.redirect(301, `/${lang}/news/${target}`);
    }
    next();
  } catch {
    next();
  }
};

/**
 * پیش‌نمایش «چشم گوگل‌بات» برای پنل ادمین.
 * دقیقاً همان تابع رندر جزئیات — تضمین می‌کند ادمین همان چیزی را ببیند که ربات می‌بیند.
 * سند mongoose (نه lean) هم قبول می‌کند.
 */
exports.renderArticleForPreview = (article, lang) => {
  return renderArticleDetail(article, ['fa', 'en'].includes(lang) ? lang : 'fa', '/preview');
};

// برای تست و استفاده‌های آینده
exports.renderArticleListForPreview = renderArticleList;
