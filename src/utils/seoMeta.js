/**
 * مدیریت متا تگ‌های سمت کلاینت (SPA)
 *
 * نکته: ربات‌ها HTML رندرشده از بک‌اند می‌گیرند (seoController)؛
 * این ابزار برای کاربران واقعی است: عنوان تب مرورگر و متاها
 * همگام با صفحه فعلی می‌مانند (به‌خصوص هنگام چرخش داخل SPA).
 */
const SITE_URL = 'https://nourmehr.ir'

const DEFAULT_TITLE = 'نورمهر | خانه هنرهای لوکس ایرانی'
const DEFAULT_DESCRIPTION = 'خرید آنلاین صنایع دستی اصل ایرانی با ضمانت اصالت.'

const absolute = (url) => {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url}`
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

/** متاهای صفحه محصول */
export function setProductSeo(product, lang = 'fa') {
  if (!product) return resetSeoMeta()

  const seo = product.seo?.[lang] || {}
  const name = pick(product.name, lang)
  const title = seo.title || (name ? `${name} | نورمهر` : DEFAULT_TITLE)
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
  setName('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large')
  setLink('canonical', canonical)

  setProp('og:type', 'product')
  setProp('og:title', title)
  setProp('og:description', description)
  setProp('og:url', canonical)
  setProp('og:image', image)

  setName('twitter:card', 'summary_large_image')
  setName('twitter:title', title)
  setName('twitter:description', description)
  setName('twitter:image', image)
}

/** برگرداندن متاها به پیش‌فرض سایت — هنگام ترک صفحه محصول */
export function resetSeoMeta() {
  document.title = DEFAULT_TITLE
  setName('description', DEFAULT_DESCRIPTION)
  setName('robots', 'index, follow, max-image-preview:large')

  document.head.querySelector('link[rel="canonical"]')?.remove()

  setProp('og:type', 'website')
  setProp('og:title', DEFAULT_TITLE)
  setProp('og:description', DEFAULT_DESCRIPTION)
  setProp('og:url', `${SITE_URL}/fa`)
  setProp('og:image', `${SITE_URL}/og-cover.jpg`)

  setName('twitter:title', DEFAULT_TITLE)
  setName('twitter:description', DEFAULT_DESCRIPTION)
  setName('twitter:image', `${SITE_URL}/og-cover.jpg`)
}