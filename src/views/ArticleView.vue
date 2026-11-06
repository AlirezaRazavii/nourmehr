<template>
  <section class="nm-page">
    <!-- نوار پیشرفت مطالعه -->
    <div class="nm-progress" aria-hidden="true"><i :style="{ width: progress + '%' }"></i></div>

    <!-- دکمه تم -->
    <button class="nm-theme-btn" type="button" :title="theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'" @click="toggle">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>

    <div class="nm-container">
      <!-- اسکلتون -->
      <div v-if="loading" class="nm-article-layout">
        <div></div>
        <div>
          <div class="nm-skeleton" style="height:18px;width:45%;border-radius:999px"></div>
          <div class="nm-skeleton" style="height:38px;width:90%;margin-top:18px"></div>
          <div class="nm-skeleton" style="height:300px;margin-top:24px;border-radius:18px"></div>
          <div class="nm-skeleton" style="height:14px;margin-top:22px"></div>
          <div class="nm-skeleton" style="height:14px;margin-top:10px;width:85%"></div>
          <div class="nm-skeleton" style="height:14px;margin-top:10px;width:70%"></div>
        </div>
        <div></div>
      </div>

      <template v-else-if="article">
        <!-- مسیر راهنما -->
        <nav style="display:flex;gap:8px;flex-wrap:wrap;font-size:.85rem;color:var(--nm-text-faint);margin-bottom:20px" aria-label="breadcrumb">
          <router-link :to="{ name: 'Home', params: { lang: locale } }" style="color:var(--nm-gold-light);text-decoration:none">{{ $t('nav_home') }}</router-link>
          <span>›</span>
          <router-link :to="{ name: 'NewsCenter', params: { lang: locale } }" style="color:var(--nm-gold-light);text-decoration:none">{{ $t('news_title') }}</router-link>
          <span v-if="article.category">›</span>
          <router-link v-if="article.category" :to="{ name: 'NewsCenter', params: { lang: locale }, query: { category: article.category.slug } }" style="color:var(--nm-gold-light);text-decoration:none">{{ article.category.name }}</router-link>
          <span>›</span>
          <span style="color:var(--nm-text-dim)">{{ truncatedTitle }}</span>
        </nav>

        <div class="nm-article-layout">
          <!-- ستون ۱: فهرست مطالب -->
          <aside class="nm-toc" v-if="tocItems.length > 2">
            <p class="nm-toc-title">{{ $t('news_toc') }}</p>
            <a
              v-for="item in tocItems" :key="item.id"
              :href="'#' + item.id"
              :class="{ active: activeId === item.id, ['lvl-' + item.level]: true }"
              @click.prevent="scrollTo(item.id)"
            >{{ item.text }}</a>
          </aside>

          <!-- ستون ۲: خود مقاله -->
          <article class="nm-article">
            <header>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
                <span class="nm-badge">{{ typeLabel(article.type) }}</span>
                <span v-if="article.category" class="nm-badge blue">{{ article.category.name }}</span>
              </div>
              <h1>{{ article.title }}</h1>
              <div class="nm-article-meta">
                <span v-if="article.authorName">✍️ {{ article.authorName }}</span>
                <time :datetime="article.publishedAt || article.createdAt">{{ fmtDate(article.publishedAt || article.createdAt) }}</time>
                <span v-if="article.readingTime">⏱ {{ article.readingTime }} {{ $t('news_min_read') }}</span>
                <span>👁 {{ fmtCount(article.viewsCount) }}</span>
              </div>
            </header>

            <!-- تصویر شاخص با srcset از پایپ‌لاین sharp -->
            <figure v-if="article.image" class="nm-article-cover">
              <img
                :src="coverSrc" :srcset="coverSrcset"
                sizes="(max-width:640px) 92vw, (max-width:1100px) 100vw, 820px"
                :alt="article.imageAlt || article.title" fetchpriority="high"
              />
            </figure>

            <p v-if="article.excerpt" class="nm-article-excerpt">{{ article.excerpt }}</p>

            <!-- بدنه محتوا -->
            <div ref="contentEl" class="nm-prose" v-html="safeContent"></div>

            <!-- تگ‌ها -->
            <div v-if="article.tags?.length" class="nm-chips" style="margin-top:30px">
              <router-link
                v-for="tag in article.tags" :key="tag.slug"
                class="nm-chip" style="text-decoration:none"
                :to="{ name: 'NewsCenter', params: { lang: locale }, query: { tag: tag.slug } }"
              ># {{ tag.name }}</router-link>
            </div>

            <!-- اشتراک‌گذاری -->
            <div class="nm-share">
              <span style="font-size:.88rem;color:var(--nm-text-dim)">{{ $t('news_share') }}:</span>
              <a class="nm-share-btn" :href="shareLinks.telegram" target="_blank" rel="noopener noreferrer" aria-label="Telegram" title="Telegram">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
              <a class="nm-share-btn" :href="shareLinks.whatsapp" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>
              <a class="nm-share-btn" :href="shareLinks.twitter" target="_blank" rel="noopener noreferrer" aria-label="X" title="X">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z"/></svg>
              </a>
              <button class="nm-share-btn" type="button" :title="$t('news_share_copy')" @click="copyLink">{{ copied ? '✓' : '🔗' }}</button>
            </div>

            <!-- نویسنده -->
            <div v-if="article.authorName" class="nm-mini-product" style="margin-top:22px;padding:16px 18px">
              <div style="width:46px;height:46px;border-radius:50%;background:var(--nm-gold-soft);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">✍️</div>
              <div style="flex:1">
                <b>{{ article.authorName }}</b>
                <span style="display:block;font-size:.78rem;color:var(--nm-text-faint)">{{ $t('news_about_author') }}</span>
              </div>
            </div>

            <!-- FAQ -->
            <section v-if="article.faq?.length" class="nm-faq">
              <h2>{{ $t('news_faq') }}</h2>
              <details v-for="(f, i) in article.faq" :key="i">
                <summary>{{ f.question }}</summary>
                <div>{{ f.answer }}</div>
              </details>
            </section>

            <!-- قبلی / بعدی -->
            <div v-if="adjacent.prev || adjacent.next" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:34px">
              <router-link v-if="adjacent.prev" class="nm-mini-product" :to="articleRoute(adjacent.prev.slug)" style="align-items:flex-start">
                <div>
                  <span style="font-size:.75rem;color:var(--nm-gold-light)">‹ {{ $t('news_prev') }}</span>
                  <b>{{ adjacent.prev.title }}</b>
                </div>
              </router-link>
              <div v-else></div>
              <router-link v-if="adjacent.next" class="nm-mini-product" :to="articleRoute(adjacent.next.slug)" style="text-align:end;justify-content:flex-end">
                <div>
                  <span style="font-size:.75rem;color:var(--nm-gold-light)">{{ $t('news_next') }} ›</span>
                  <b>{{ adjacent.next.title }}</b>
                </div>
              </router-link>
            </div>
          </article>

         </div>

        <!-- لینک‌های دستی (فاز ۳) — باند ویژه -->
        <section v-if="article.manualLinks?.length" class="nm-links-band">
          <div class="nm-links-head">
            <span class="nm-links-head-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </span>
            <h2>{{ $t('news_related_links') }}</h2>
            <span class="nm-links-head-line" aria-hidden="true"></span>
          </div>
          <div class="nm-links-grid">
            <template v-for="(l, i) in article.manualLinks" :key="i">
              <a v-if="l.type === 'url' && l.external" class="nm-link-card nm-link-url" :href="l.url" target="_blank" rel="noopener noreferrer">
                <span class="nm-link-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </span>
                <span class="nm-link-body">
                  <b>{{ l.title }}</b>
                  <small>{{ $t('news_link_type_url') }}</small>
                </span>
                <span class="nm-link-arrow" aria-hidden="true">↗</span>
              </a>
              <router-link v-else class="nm-link-card" :class="l.type === 'category' ? 'nm-link-category' : 'nm-link-product'" :to="manualLinkTo(l)">
                <span class="nm-link-badge" aria-hidden="true">
                  <svg v-if="l.type === 'category'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </span>
                <span class="nm-link-body">
                  <b>{{ l.title }}</b>
                  <small>{{ l.type === 'category' ? $t('news_link_type_category') : $t('news_link_type_product') }}</small>
                </span>
                <span class="nm-link-arrow" aria-hidden="true">{{ locale === 'fa' ? '‹' : '›' }}</span>
              </router-link>
            </template>
          </div>
        </section>

        <!-- مقالات مرتبط -->
        <section v-if="related.length" style="margin-top:52px">
          <h2 style="font-size:1.35rem;margin:0 0 20px">{{ $t('news_related') }}</h2>
          <div class="nm-grid">
            <article v-for="rel in related" :key="rel._id" class="nm-card" @click="router.push(articleRoute(rel.slug))">
              <div class="nm-card-img" v-if="rel.image"><img :src="getImageUrl(rel.image)" :alt="rel.title" loading="lazy" /></div>
              <div class="nm-card-body">
                <h3>{{ rel.title }}</h3>
                <div class="nm-card-foot"><span>{{ fmtDate(rel.publishedAt || rel.createdAt) }}</span><span class="nm-readmore">{{ $t('news_read_more') }} →</span></div>
              </div>
            </article>
          </div>
        </section>
      </template>

      <!-- یافت نشد -->
      <div v-else class="nm-empty">
        <div class="icon">🔍</div>
        <p>{{ $t('news_not_found') }}</p>
        <router-link class="nm-chip" style="text-decoration:none;margin-top:12px" :to="{ name: 'NewsCenter', params: { lang: locale } }">{{ $t('news_back') }}</router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * ArticleView — صفحه مقاله سیستم رسانه‌ای جدید
 * سه‌ستونه (TOC | مقاله ~65ch | محصولات مرتبط)، نوار پیشرفت، TOC خودکار با
 * هایلایت، FAQ آکاردئونی، قبلی/بعدی، مقالات مرتبط، JSON-LD کامل سمت کلاینت.
 * سمت سرور همان محتوا با رندرر ربات سرو می‌شود — تست parity مراقب هم‌ارزی است.
 */
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import DOMPurify from 'dompurify'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { getArticleBySlug, getRelatedArticles, getAdjacentArticles } from '../services/articleApi'
import { getImageUrl } from '../utils/imageUrl'
import { useTOC, useReadingProgress } from '../composables/useMedia'
import { useTheme } from '../composables/useTheme'
import '../styles/media.css'

// لینک‌های خارجی امن + تصاویر lazy
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  }
  if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy')
})

const { t, te, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { theme, toggle } = useTheme()

const article = ref(null)
const related = ref([])
const adjacent = reactive({ prev: null, next: null })
const loading = ref(true)
const copied = ref(false)

const contentEl = ref(null)
const { items: tocItems, activeId, injectIds } = useTOC(contentEl)
const { progress } = useReadingProgress()

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin

/* ------------------------------ کمکی‌ها ------------------------------ */
const typeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  return te(key) ? t(key) : ''
}
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' } }
const fmtCount = (n) => { const num = Number(n) || 0; return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num) }
const articleRoute = (slug) => ({ name: 'ArticleView', params: { lang: locale.value, slug } })
// مقصد لینک دستی: دسته‌بندی → صفحه مجموعه، محصول → صفحه محصول، URL → همان مسیر
const manualLinkTo = (l) => {
  if (l.type === 'category') return { name: 'Collection', params: { lang: locale.value, slug: l.slug } }
  if (l.type === 'product') return { name: 'ProductDetails', params: { lang: locale.value, id: l.slug } }
  return l.url
}

const truncatedTitle = computed(() => {
  const s = article.value?.title || ''
  return s.length > 40 ? s.slice(0, 40) + '…' : s
})

const pageUrl = computed(() => `${SITE_URL}${route.path}`)

/* ---------------------- تصویر شاخص (srcset از sharp) ---------------------- */
const coverSrc = computed(() => {
  const a = article.value
  if (!a) return ''
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 1200)?.url || vs[vs.length - 1].url) : getImageUrl(a.image)
})
const coverSrcset = computed(() =>
  (article.value?.imageVariants || []).map(v => `${getImageUrl(v.url)} ${v.w}w`).join(', ')
)

/* ------------------------------ پاکسازی HTML ------------------------------ */
const safeContent = computed(() => {
  const raw = article.value?.content || ''
  if (!raw) return ''
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p','br','hr','strong','b','em','i','u','s','mark','small','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','a','img','figure','figcaption','table','thead','tbody','tr','th','td','span','div'],
    ALLOWED_ATTR: ['href','src','srcset','alt','title','class','dir','width','height','loading','sizes'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i
  })
})

/* ------------------------------ اشتراک‌گذاری ------------------------------ */
const shareLinks = computed(() => {
  const u = encodeURIComponent(pageUrl.value)
  const title = encodeURIComponent(article.value?.title || '')
  return {
    telegram: `https://t.me/share/url?url=${u}&text=${title}`,
    whatsapp: `https://wa.me/?text=${title}%20${u}`,
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${title}`
  }
})
const copyLink = async () => {
  try { await navigator.clipboard.writeText(pageUrl.value) } catch { document.execCommand('copy') }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

/* ------------------------------ بارگذاری ------------------------------ */
const load = async () => {
  loading.value = true
  try {
    const res = await getArticleBySlug(route.params.slug, locale.value)
    if (res.success) {
      article.value = res.data
      window.scrollTo({ top: 0 })
      // بعد از رندر محتوا: ساخت TOC و تزریق id تیترها
      injectIds()
      loadRelated()
      loadAdjacent()
    }
  } catch (e) {
    console.error('Error fetching article:', e)
  } finally {
    loading.value = false
  }
}

const loadRelated = async () => {
  try {
    const res = await getRelatedArticles(route.params.slug)
    if (res.success) related.value = res.data
  } catch { /* بی‌خطر */ }
}
const loadAdjacent = async () => {
  try {
    const res = await getAdjacentArticles(route.params.slug)
    if (res.success) { adjacent.prev = res.data.prev; adjacent.next = res.data.next }
  } catch { /* بی‌خطر */ }
}

const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' })
  // به‌روزرسانی URL بدون پرش
  history.replaceState(null, '', `#${id}`)
}

onMounted(load)
watch(() => route.params.slug, load)
watch(() => locale.value, load)

/* --------------------- سئوی کلاینت + JSON-LD کامل --------------------- */
const seoTitle = computed(() => article.value?.seo?.title || article.value?.title || t('news_title'))
const seoDesc = computed(() => article.value?.seo?.description || article.value?.excerpt || '')

useHead({
  title: () => `${seoTitle.value} | نورمهر`,
  meta: [
    { name: 'description', content: seoDesc },
    { name: 'robots', content: () => article.value?.seo?.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDesc },
    { property: 'og:image', content: () => article.value?.seo?.ogImage ? getImageUrl(article.value.seo.ogImage) : (article.value?.image ? getImageUrl(article.value.image) : '') },
    { property: 'og:url', content: pageUrl },
    { property: 'article:published_time', content: () => article.value?.publishedAt || article.value?.createdAt || '' }
  ],
  link: [
    { rel: 'canonical', href: () => article.value?.seo?.canonicalUrl || pageUrl.value },
    // hreflang: فقط وقتی نسخه دیگر زبان محتوای واقعی دارد
    () => {
      const a = article.value
      if (!a) return []
      const links = [{ rel: 'alternate', hreflang: locale.value, href: pageUrl.value }]
      if (a.altSlug && a.hasTranslation !== false) {
        const other = locale.value === 'fa' ? 'en' : 'fa'
        links.push({ rel: 'alternate', hreflang: other, href: `${SITE_URL}/${other}/news/${a.altSlug}` })
        links.push({ rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/fa/news/${locale.value === 'fa' ? (a.slug || route.params.slug) : (a.altSlug || a.slug)}` })
      } else {
        links.push({ rel: 'alternate', hreflang: 'x-default', href: pageUrl.value })
      }
      return links
    }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => {
        const a = article.value
        if (!a) return ''
        const graph = [
          {
            '@context': 'https://schema.org',
            '@type': a.type === 'news' ? 'NewsArticle' : 'Article',
            headline: String(a.title || '').slice(0, 110),
            description: seoDesc.value,
            image: a.image ? [getImageUrl(a.image)] : undefined,
            datePublished: a.publishedAt || a.createdAt,
            dateModified: a.updatedAt || a.publishedAt || a.createdAt,
            inLanguage: locale.value,
            author: { '@type': 'Person', name: a.authorName || 'نورمهر' },
            publisher: { '@type': 'Organization', name: 'نورمهر', logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.ico` } },
            mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl.value }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'خانه', item: `${SITE_URL}/${locale.value}` },
              { '@type': 'ListItem', position: 2, name: 'اخبار و مقالات', item: `${SITE_URL}/${locale.value}/news` },
              ...(a.category ? [{ '@type': 'ListItem', position: 3, name: a.category.name, item: `${SITE_URL}/${locale.value}/news?category=${a.category.slug}` }] : []),
              { '@type': 'ListItem', position: a.category ? 4 : 3, name: a.title, item: pageUrl.value }
            ]
          }
        ]
        // FAQPage — فقط اگر FAQ واقعی وجود داشته باشد (شانس ریچ‌ریزالت)
        if (a.faq?.length) {
          graph.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: a.faq.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer }
            }))
          })
        }
        return JSON.stringify(graph.length === 1 ? graph[0] : { '@context': 'https://schema.org', '@graph': graph })
      }
    }
  ]
})
</script>
