/**
 * مدیریت متا تگ‌های سمت کلاینت (SPA)
 *
 * نکته: ربات‌ها HTML رندرشده از بک‌اند می‌گیرند (seoController)؛
 * این ابزار برای کاربران واقعی و رندر JS گوگل است: عنوان تب مرورگر و متاها
 * همگام با صفحه فعلی می‌مانند (به‌خصوص هنگام چرخش داخل SPA).
 *
 * تغییرات این نسخه:
 *  - applyRouteSeo: از router.afterEach صدا زده می‌شود؛ noindex صفحات خصوصی را اعمال می‌کند
 *  - setPageSeo: متاهای هر صفحه SPA (اخبار/کالکشن/درباره/تماس) — قبلاً فقط محصول پشتیبانی می‌شد
 *  - resetSeoMeta: زبان‌آگاه شد و canonical حذف نمی‌شود بلکه به مسیر فعلی ست می‌شود
 */
const SITE_URL = 'https://nourmehr.ir'

const DEFAULT_TITLE = {
  fa: 'صنایع دستی نورمهر | خرید آنلاین صنایع دستی لوکس ایرانی',
  en: 'Nourmehr Handicrafts | Buy Authentic Luxury Persian Handicrafts',
}
const DEFAULT_DESCRIPTION = {
  fa: 'خرید آنلاین صنایع دستی اصل ایرانی با ضمانت اصالت از نورمهر اصفهان.',
  en: 'Buy authentic Persian handicrafts online with authenticity guarantee from Nourmehr, Isfahan.',
}

const absolute = (url) => {
  if (!url) return ''
  return /^https?:\/\///i.test(url) ? url : `${SITE_URL}${url}`
}

const pick = (value, lang) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[lang] || value.fa || value.en || ''
  return ''
}

const truncate = (s, n) => {
  const t = String(s || '').trim()
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + '…'
}

const stripHtml = (html) =>
  String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

/** زبان فعلی از مسیر مرورگر (fa پیش‌فرض) */
const currentLang = () => {
  const m = String(typeof location !== 'undefined' ? location.pathname : '').match(/^\/(fa|en)/)
  return m ? m[1] : 'fa'
}

const setName = (name, content) => {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const setProp = (prop, content) => {
  let el = document.head.querySelector(`meta[property="${prop}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', prop)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/* ---------- robots متا (noindex صفحات خصوصی) ---------- */
/**
 * از router.afterEach صدا زده می‌شود.
 * اگر هر رکورد مسیر meta.noindex داشته باشد، تگ robots کلاینت noindex می‌شود.
 * لایه اصلی X-Robots-Tag سمت سرور (spaSeoGuard) است — این برای رندر JS گوگل ایمنی اضافی است.
 */
export function applyRouteSeo(to) {
  if (!to) return
  const noindex = to.matched.some((r) => r.meta && r.meta.noindex === true)
  setRobots(noindex)
}

export function setRobots(noindex) {
  setName('robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
}

/* ---------- متاهای عمومی هر صفحه SPA ---------- */
/**
 * برای صفحات غیر محصول (لیست اخبار، جزئیات مقاله، کالکشن، درباره، تماس و…)
 * نمونه:
 *   setPageSeo({ title: 'اخبار و مقالات', description: '…', image: blog.image })
 * canonical خودکار از مسیر فعلی ساخته می‌شود.
 */
export function setPageSeo({ title = '', description = '', image = '', type = 'website', noindex = false, lang } = {}) {
  const l = lang || currentLang()
  const t = title || DEFAULT_TITLE[l]
  const d = description || DEFAULT_DESCRIPTION[l]
  const path = String(typeof location !== 'undefined' ? location.pathname : `/${l}`)
  const canonical = `${SITE_URL}${path}`
  const img = absolute(image) || `${SITE_URL}/og-cover.jpg`

  document.title = t
  setName('description', d)
  setRobots(noindex)
  setLink('canonical', canonical)

  setProp('og:type', type)
  setProp('og:title', t)
  setProp('og:description', d)
  setProp('og:url', canonical)
  setProp('og:image', img)
  setProp('og:locale', l === 'fa' ? 'fa_IR' : 'en_US')

  setName('twitter:card', 'summary_large_image')
  setName('twitter:title', t)
  setName('twitter:description', d)
  setName('twitter:image', img)
}

/** متاهای صفحه محصول */
export function setProductSeo(product, lang = 'fa') {
  if (!product) return resetSeoMeta()

  const seo = product.seo?.[lang] || {}
  const name = pick(product.name, lang)
  const title = seo.title || (name ? `${name} | نورمهر` : DEFAULT_TITLE[lang])
  const description = truncate(
    seo.description || pick(product.shortDesc, lang) || stripHtml(pick(product.description, lang)) || name,
    170
  )
  const slug = product.slug || product._id || ''
  const canonical = `${SITE_URL}/${lang}/product/${encodeURIComponent(slug)}`
  const image = absolute(seo.ogImage || product.mainImage || product.images?.[0] || '')
  const noIndex = seo.noIndex === true

  document.title = title
  setName('description', description)
  setRobots(noIndex)
  setLink('canonical', canonical)

  setProp('og:type', 'product')
  setProp('og:title', title)
  setProp('og:description', description)
  setProp('og:url', canonical)
  setProp('og:image', image)
  setProp('og:locale', lang === 'fa' ? 'fa_IR' : 'en_US')

  setName('twitter:card', 'summary_large_image')
  setName('twitter:title', title)
  setName('twitter:description', description)
  setName('twitter:image', image)
}

/** برگرداندن متاها به پیش‌فرض سایت — هنگام ترک صفحه محصول یا ورود به صفحات عمومی */
export function resetSeoMeta(lang) {
  const l = lang || currentLang()
  const path = String(typeof location !== 'undefined' ? location.pathname : `/${l}`)

  document.title = DEFAULT_TITLE[l]
  setName('description', DEFAULT_DESCRIPTION[l])
  setRobots(false)

  // قبلاً canonical به‌کلی حذف می‌شد؛ حالا به canonical واقعی مسیر فعلی ست می‌شود
  setLink('canonical', `${SITE_URL}${path}`)

  setProp('og:type', 'website')
  setProp('og:title', DEFAULT_TITLE[l])
  setProp('og:description', DEFAULT_DESCRIPTION[l])
  setProp('og:url', `${SITE_URL}${path}`)
  setProp('og:image', `${SITE_URL}/og-cover.jpg`)
  setProp('og:locale', l === 'fa' ? 'fa_IR' : 'en_US')

  setName('twitter:title', DEFAULT_TITLE[l])
  setName('twitter:description', DEFAULT_DESCRIPTION[l])
  setName('twitter:image', `${SITE_URL}/og-cover.jpg`)
}
