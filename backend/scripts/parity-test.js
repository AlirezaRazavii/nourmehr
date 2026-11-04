/**
 * تست پاریتی (هم‌ارزی) رندر ربات ↔ API — نگهبان دائمی در برابر باگ‌های نوع B-03
 *
 * اجرا:  node backend/scripts/parity-test.js
 * متغیر محیطی: SITE_TARGET (پیش‌فرض https://nourmehr.ir)
 *
 * چه می‌کند:
 *  ۱) چند URL نمونه (لیست اخبار + جزئیات مقاله) را با User-Agent گوگل‌بات می‌گیرد
 *  ۲) همان‌ها را با UA معمولی می‌گیرد (باید پوسته SPA باشد — فقط 200 بودن چک می‌شود)
 *  ۳) متاهای رندر ربات (title, h1, canonical, hreflang, JSON-LD) را استخراج می‌کند
 *  ۴) با خروجی API عمومی همان مقاله مقایسه می‌کند (عنوان/اسلاگ/زبان)
 *  ۵) اگر اختلافی باشد با کد ۱ خارج می‌شود → مناسب cron روزانه + آلارم
 *
 * پیشنهاد cron (روزانه ۸ صبح):
 *   0 8 * * * cd /path/to/nourmehr && node backend/scripts/parity-test.js >> /var/log/parity.log 2>&1
 */
const SITE = (process.env.SITE_TARGET || 'https://nourmehr.ir').replace(/\/+$/, '');

const GOOGLEBOT_UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/116.0.0.0 Safari/537.36';
const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/116.0.0.0 Safari/537.36';

let failures = 0;
let checks = 0;

const ok = (label, cond, detail = '') => {
  checks++;
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` → ${detail}` : ''}`);
  }
};

const fetchWith = async (url, ua) => {
  const res = await fetch(url, {
    headers: { 'User-Agent': ua, 'Accept-Language': 'fa,en' },
    redirect: 'manual',
    signal: AbortSignal.timeout(20000)
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
};

const extract = (html) => ({
  title: (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '',
  h1: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]*>/g, '').trim() || '',
  canonical: (html.match(/<link rel="canonical" href="([^"]+)"/i) || [])[1] || '',
  hreflang: [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m => ({ lang: m[1], href: m[2] })),
  jsonLdCount: (html.match(/application\/ld\+json/g) || []).length,
  robots: (html.match(/<meta name="robots" content="([^"]+)"/i) || [])[1] || '',
  lang: (html.match(/<html lang="([^"]+)"/i) || [])[1] || ''
});

const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

async function getSampleSlugs() {
  console.log(`\n[1] گرفتن نمونه‌ها از API …  ${SITE}/api/articles?limit=5`);
  const res = await fetch(`${SITE}/api/articles?limit=5`, {
    headers: { 'User-Agent': HUMAN_UA },
    signal: AbortSignal.timeout(20000)
  });
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error('API مقالات پاسخ معتبر نداد — ماژول جدید فعال است؟');
  }
  return json.data.slice(0, 3);
}

async function checkListPage() {
  console.log('\n[2] صفحه لیست اخبار (/fa/news و /en/news) — چشم گوگل‌بات');
  for (const lang of ['fa', 'en']) {
    const r = await fetchWith(`${SITE}/${lang}/news`, GOOGLEBOT_UA);
    ok(`${lang}: status 200`, r.status === 200, `status=${r.status}`);
    const m = extract(r.text);
    ok(`${lang}: <html lang="${lang}">`, m.lang === lang, `got=${m.lang}`);
    ok(`${lang}: تگ h1 موجود`, m.h1.length > 0);
    ok(`${lang}: canonical موجود`, m.canonical.length > 0);
    ok(`${lang}: hreflang >= 2`, m.hreflang.length >= 2, `count=${m.hreflang.length}`);
  }
}

async function checkArticlePage(article, lang) {
  const slug = article.slug;
  const url = `${SITE}/${lang}/news/${slug}`;
  console.log(`\n[3] مقاله «${decode(article.title).slice(0, 40)}» → /${lang}/news/${slug}`);

  // رندر ربات
  const bot = await fetchWith(url, GOOGLEBOT_UA);
  ok('بات: status 200', bot.status === 200, `status=${bot.status}`);
  const m = extract(bot.text);

  // انسان → پوسته SPA (یا همان رندر بات اگر همه را رندر کنیم) — فقط سلامت
  const human = await fetchWith(url, HUMAN_UA);
  ok('کاربر عادی: status 200', human.status === 200, `status=${human.status}`);

  // پاریتی با API همان زبان
  const apiRes = await fetch(`${SITE}/api/articles/${slug}`, {
    headers: { 'User-Agent': HUMAN_UA, 'Accept-Language': lang },
    signal: AbortSignal.timeout(20000)
  });
  const apiJson = await apiRes.json();

  if (apiJson.success && apiJson.data) {
    const apiTitle = decode(apiJson.data.title);
    ok('پاریتی: h1 بات == عنوان API', m.h1 === apiTitle, `bot="${m.h1.slice(0, 50)}" api="${apiTitle.slice(0, 50)}"`);
    ok('پاریتی: title بات شامل عنوان API', m.title.includes(apiTitle.slice(0, 30)), `title="${m.title.slice(0, 60)}"`);
  } else {
    // شاید مقاله فقط در ماژول قدیمی است — هشدار بده نه خطا
    console.log('  ⚠ API جدید این slug را ندارد (احتمالاً هنوز روی ماژول قدیمی است) — فقط ساختار چک شد');
  }

  ok('بات: canonical همان URL است', m.canonical === url, `canonical=${m.canonical}`);
  ok('بات: JSON-LD حداقل ۱ (Article)', m.jsonLdCount >= 1, `count=${m.jsonLdCount}`);
  ok('بات: زبان سند درست', m.lang === lang, `got=${m.lang}`);
  const hasFa = m.hreflang.some(h => h.lang === 'fa');
  const hasDefault = m.hreflang.some(h => h.lang === 'x-default');
  ok('بات: hreflang fa + x-default', hasFa && hasDefault, JSON.stringify(m.hreflang.map(h => h.lang)));
}

async function checkRedirects() {
  console.log('\n[4] ریدایرکت‌های ۳۰۱');
  const r1 = await fetchWith(`${SITE}/fa/news/این-اسلاگ-وجود-ندارد-12345`, GOOGLEBOT_UA);
  ok('اسلاگ ناموجود: 404 (نه soft-200)', r1.status === 404, `status=${r1.status}`);

  const r2 = await fetchWith(`${SITE}/fa/blog`, HUMAN_UA);
  ok('/fa/blog → 301 به /fa/news', r2.status === 301 || r2.status === 308, `status=${r2.status}`);
}

(async () => {
  console.log('================ تست پاریتی سیستم رسانه‌ای نورمهر ================');
  console.log(`هدف: ${SITE}`);

  let samples = [];
  try {
    samples = await getSampleSlugs();
  } catch (e) {
    console.error('خطا در گرفتن نمونه‌ها:', e.message);
    console.log('→ احتمالاً ماژول جدید (Article) هنوز فعال نیست؛ فقط صفحات عمومی چک می‌شوند.');
  }

  await checkListPage();
  for (const a of samples) {
    await checkArticlePage(a, 'fa');
  }
  if (samples.length) {
    // یک نمونه انگلیسی — مقاله اول
    await checkArticlePage(samples[0], 'en');
  }
  await checkRedirects();

  console.log('\n------------------ نتیجه نهایی ------------------');
  console.log(`چک‌ها: ${checks} | خطاها: ${failures}`);
  if (failures > 0) {
    console.error('❌ پاریتی برقرار نیست — قبل از ادامه بررسی کنید!');
    process.exit(1);
  } else {
    console.log('✅ همه چک‌ها سبز است.');
    process.exit(0);
  }
})().catch((err) => {
  console.error('خطای مهلک:', err.message);
  process.exit(1);
});
