<template>
  <section class="nm-page">
    <!-- دکمه تم -->
    <button class="nm-theme-btn" type="button" :title="theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'" @click="toggle">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>

    <div class="nm-container">
      <!-- کاور سینمایی — مقاله منتخب، فقط نمای اول بدون فیلتر -->
      <template v-if="featured.length && page === 1 && !hasActiveFilters">
        <article
          v-for="(f, i) in featured" :key="f._id"
          class="nm-cover-hero reveal" :class="{ 'nm-cover-noimg': !f.image }"
          tabindex="0" role="link" :aria-label="loc(f.title)"
          @click="open(f)" @keydown.enter.prevent="open(f)" @mouseenter="prefetch(f.slug)"
        >
          <img
            v-if="f.image"
            :src="heroSrc(f)" :srcset="srcset(f)"
            sizes="(max-width:640px) 96vw, 1240px"
            :alt="loc(f.imageAlt) || loc(f.title)"
            :loading="i === 0 ? 'eager' : 'lazy'" :fetchpriority="i === 0 ? 'high' : undefined"
          />
          <div class="nm-cover-overlay">
            <div class="nm-cover-badges">
              <span class="nm-badge" :class="f.type">{{ typeLabel(f.type) }}</span>
              <span v-if="f.category" class="nm-badge cat">{{ f.category.name }}</span>
            </div>
            <h2 class="nm-cover-title">{{ loc(f.title) }}</h2>
            <p v-if="loc(f.excerpt)" class="nm-cover-excerpt">{{ loc(f.excerpt) }}</p>
            <div class="nm-cover-meta">
              <time :datetime="f.publishedAt || f.createdAt">{{ fmtDate(f.publishedAt || f.createdAt) }}</time>
              <span v-if="f.readingTime" class="sep">·</span>
              <span v-if="f.readingTime">⏱ {{ f.readingTime }} {{ $t('news_min_read') }}</span>
              <span class="nm-cover-cta">
                {{ $t('news_read_more') }}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </span>
            </div>
          </div>
        </article>
      </template>

      <!-- سربرگ هاب -->
      <header class="nm-hero">
        <p class="nm-eyebrow">{{ $t('media_eyebrow') }}</p>
        <h1>{{ $t('news_title') }}</h1>
        <p>{{ $t('news_subtitle') }}</p>
      </header>

      <!-- نوار فیلتر پیشرفته — چسبان هنگام اسکرول -->
      <div class="nm-filterbar">
        <!-- ردیف ۱: جستجو + مرتب‌سازی + شمارنده نتایج -->
        <div class="nm-filterbar-top">
          <div class="nm-search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input v-model="searchInput" type="text" :placeholder="$t('news_search_placeholder')" @input="onSearchInput" />
            <button v-if="filters.search" type="button" style="background:none;border:none;color:inherit;cursor:pointer" @click="clearSearch">✕</button>
          </div>
          <select v-model="sort" class="nm-sort" :aria-label="$t('news_sort_newest')">
            <option value="newest">{{ $t('news_sort_newest') }}</option>
            <option value="oldest">{{ $t('news_sort_oldest') }}</option>
            <option value="popular">{{ $t('news_sort_popular') }}</option>
          </select>
          <span v-if="!loading && !error && totalCount" class="nm-count-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h12"/></svg>
            {{ $t('news_results_found', { n: fmtNum(totalCount) }) }}
          </span>
        </div>

        <!-- ردیف ۲: نوع مطلب (کنترل قطعه‌ای) + بازه زمانی -->
        <div class="nm-filterbar-row">
          <div class="nm-seg" role="tablist" :aria-label="$t('news_filter_all')">
            <button class="nm-seg-btn" :class="{ active: !filters.type }" role="tab" :aria-selected="!filters.type" @click="setType('')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
              {{ $t('news_filter_all') }}
            </button>
            <button class="nm-seg-btn news" :class="{ active: filters.type === 'news' }" role="tab" :aria-selected="filters.type === 'news'" @click="setType('news')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
              {{ $t('news_type_news') }}
            </button>
            <button class="nm-seg-btn event" :class="{ active: filters.type === 'event' }" role="tab" :aria-selected="filters.type === 'event'" @click="setType('event')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {{ $t('news_type_event') }}
            </button>
            <button class="nm-seg-btn article" :class="{ active: filters.type === 'article' }" role="tab" :aria-selected="filters.type === 'article'" @click="setType('article')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              {{ $t('news_type_article') }}
            </button>
          </div>

          <!-- بازه زمانی انتشار -->
          <div class="nm-chips" role="tablist">
            <button class="nm-chip" :class="{ active: !filters.period }" @click="setPeriod('')">{{ $t('news_period_all') }}</button>
            <button class="nm-chip" :class="{ active: filters.period === 'today' }" @click="setPeriod('today')">{{ $t('news_period_today') }}</button>
            <button class="nm-chip" :class="{ active: filters.period === 'week' }" @click="setPeriod('week')">{{ $t('news_period_week') }}</button>
            <button class="nm-chip" :class="{ active: filters.period === 'month' }" @click="setPeriod('month')">{{ $t('news_period_month') }}</button>
            <button class="nm-chip" :class="{ active: filters.period === 'year' }" @click="setPeriod('year')">{{ $t('news_period_year') }}</button>
          </div>
        </div>

        <!-- ردیف ۳: موضوعات (دسته‌ها) — فقط وقتی دسته‌ای تعریف شده باشد -->
        <div v-if="categories.length" class="nm-chips" role="tablist">
          <button class="nm-chip" :class="{ active: !filters.category && !filters.tag }" @click="setCategory('')">{{ $t('news_filter_all') }}</button>
          <button v-for="cat in categories" :key="cat._id" class="nm-chip" :class="{ active: filters.category === cat.slug }" @click="setCategory(cat.slug)">
            {{ cat.name }} <span class="count">{{ cat.count }}</span>
          </button>
        </div>

        <!-- ردیف ۴: تگ‌های پرتکرار -->
        <div v-if="tags.length && !filters.category" class="nm-chips">
          <button
            v-for="tag in tags.slice(0, 10)" :key="tag.slug"
            class="nm-chip" :class="{ active: filters.tag === tag.slug }"
            @click="setTag(filters.tag === tag.slug ? '' : tag.slug)"
          ># {{ tag.name }}</button>
        </div>

        <!-- فیلترهای فعال + حذف همه -->
        <div v-if="hasActiveFilters" class="nm-active">
          <span class="nm-active-label">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            {{ $t('news_filter_active') }}:
          </span>
          <button v-for="(f, i) in activeFilters" :key="i" class="nm-pill" type="button" @click="applyFilter(f.clear)">
            {{ f.label }} <span class="x" aria-hidden="true">✕</span>
          </button>
          <button class="nm-clear-all" type="button" @click="clearAllFilters">{{ $t('news_clear_all') }}</button>
        </div>
      </div>

      <!-- اسکلتون -->
      <div v-if="loading && !articles.length" class="nm-grid" aria-busy="true">
        <div v-for="i in 6" :key="i" class="nm-card" style="pointer-events:none">
          <div class="nm-skeleton" style="height:195px;border-radius:0"></div>
          <div class="nm-card-body">
            <div class="nm-skeleton" style="width:34%;height:22px;border-radius:999px"></div>
            <div class="nm-skeleton" style="width:88%;height:16px;margin-top:12px"></div>
            <div class="nm-skeleton" style="width:62%;height:16px;margin-top:8px"></div>
          </div>
        </div>
      </div>

      <!-- خطا -->
      <div v-else-if="error" class="nm-empty">
        <div class="icon">⚠️</div>
        <p>{{ $t('news_error') }}</p>
        <button class="nm-chip" style="margin-top:10px" @click="reload">{{ $t('news_retry') }}</button>
      </div>

      <template v-else>
        <!-- شبکه کارت‌ها — کارت اول در نمای بدون فیلتر، پهن (مجله‌ای) -->
        <div v-if="visibleArticles.length" class="nm-grid">
          <article
            v-for="(a, i) in visibleArticles" :key="a._id"
            class="nm-card reveal" :class="[a.type, { wide: i === 0 && firstWide }]"
            tabindex="0" role="link" :aria-label="loc(a.title)"
            @click="open(a)" @keydown.enter.prevent="open(a)" @mouseenter="prefetch(a.slug)"
          >
            <div class="nm-card-img">
              <img v-if="a.image" :src="cardImage(a)" :srcset="srcset(a)" sizes="(max-width:640px) 92vw, (max-width:1100px) 45vw, 380px" :alt="loc(a.imageAlt) || loc(a.title)" loading="lazy" />
            </div>
            <div class="nm-card-body">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="nm-badge" :class="a.type">{{ typeLabel(a.type) }}</span>
                <span v-if="a.category" class="nm-badge cat">{{ a.category.name }}</span>
              </div>
              <h3>{{ loc(a.title) }}</h3>
              <p>{{ loc(a.excerpt) }}</p>
              <div class="nm-card-foot">
                <span>{{ fmtDate(a.publishedAt || a.createdAt) }}</span>
                <span class="nm-readmore">{{ $t('news_read_more') }} →</span>
              </div>
            </div>
          </article>
        </div>

        <!-- خالی: پیام متفاوت برای «بدون فیلتر» و «با فیلتر» -->
        <div v-else-if="!articles.length" class="nm-empty">
          <div class="icon">{{ hasActiveFilters ? '🔍' : '📰' }}</div>
          <p>{{ hasActiveFilters ? $t('news_no_results_filter') : $t('news_empty') }}</p>
          <button v-if="hasActiveFilters" class="nm-chip" style="margin-top:12px" @click="clearAllFilters">{{ $t('news_clear_all') }}</button>
        </div>

        <!-- بی‌نهایت اسکرول -->
        <div ref="sentinel" class="nm-sentinel" aria-hidden="true"></div>
        <div v-if="infiniteLoading" class="nm-loading-more">{{ $t('loading') }}…</div>
        <div v-else-if="infiniteDone && visibleArticles.length" class="nm-loading-more">— {{ $t('news_end_reached') }} —</div>
      </template>
    </div>
  </section>
</template>

<script setup>
/**
 * NewsCenter v2 — هاب رسانه‌ای «مجله لوکس» با امکانات کامل
 * کاور سینمایی مقاله منتخب + نوار فیلتر پیشرفته و چسبان:
 *   جستجوی لحظه‌ای (debounce)، نوع مطلب (کنترل قطعه‌ای)، بازه زمانی،
 *   دسته، تگ، مرتب‌سازی، شمارنده نتایج، قرص‌های فیلتر فعال + حذف همه.
 * بارگذاری بی‌پایان، پیش‌واکشی در هاور، اسکلتون، حالت روشن/تاریک.
 *
 * نکته F-01: پارامتر tag از URL خوانده می‌شود (باگ ماژول قدیمی اینجا وجود ندارد)
 */
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { getArticles, getArticleCategories, getArticleTags, getArticleBySlug } from '../services/articleApi'
import { getImageUrl } from '../utils/imageUrl'
import { useReveal, useInfiniteScroll, useHoverPrefetch } from '../composables/useMedia'
import { useTheme } from '../composables/useTheme'
import { NEWS } from '../config/media'
import '../styles/media.css'

// انیمیشن ورود کارت‌ها — refresh بعد از هر لود داده صدا زده می‌شود
const { refresh: refreshReveal } = useReveal()

const { t, te, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { theme, toggle } = useTheme()

const articles = ref([])
const categories = ref([])
const tags = ref([])
const featured = ref([])
const totalCount = ref(0)
const loading = ref(true)
const error = ref(false)
const searchInput = ref('')

const page = ref(1)
const sort = ref('newest')
const filters = reactive({ search: '', category: '', type: '', tag: '', period: '' })

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin

/* ------------------------------ کمکی‌ها ------------------------------ */
const loc = (v) => (!v ? '' : typeof v === 'string' ? v : (v[locale.value] || v.fa || v.en || ''))
const typeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  return te(key) ? t(key) : (te('news_type_general') ? t('news_type_general') : '')
}
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' } }
const fmtNum = (n) => { try { return Number(n).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return String(n) } }
const periodLabel = (p) => {
  const map = { today: 'news_period_today', week: 'news_period_week', month: 'news_period_month', year: 'news_period_year' }
  return te(map[p]) ? t(map[p]) : p
}

// srcset از variants پایپ‌لاین sharp
const srcset = (a) => (a.imageVariants || []).map(v => `${getImageUrl(v.url)} ${v.w}w`).join(', ')
const heroSrc = (a) => {
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 1200)?.url || vs[vs.length - 1].url) : getImageUrl(a.image)
}
const cardImage = (a) => {
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 768)?.url || vs[0].url) : getImageUrl(a.image)
}

const hasActiveFilters = computed(() => filters.search || filters.category || filters.type || filters.tag || filters.period)
// کارت‌های لیست = همه به‌جز featuredها (در نمای اول)
const visibleArticles = computed(() => {
  if (page.value === 1 && !hasActiveFilters.value && featured.value.length) {
    const fIds = new Set(featured.value.map(f => f._id))
    return articles.value.filter(a => !fIds.has(a._id))
  }
  return articles.value
})
// کارت اول گرید فقط در نمای اولِ بدون فیلتر پهن می‌شود (ریتم مجله‌ای)
const firstWide = computed(() => page.value === 1 && !hasActiveFilters.value && featured.value.length > 0)

/* -------------------- قرص‌های فیلتر فعال + حذف همه -------------------- */
const activeFilters = computed(() => {
  const out = []
  if (filters.search) out.push({ label: `«${filters.search}»`, clear: () => { searchInput.value = ''; filters.search = '' } })
  if (filters.type) out.push({ label: typeLabel(filters.type), clear: () => { filters.type = '' } })
  if (filters.category) {
    const c = categories.value.find(x => x.slug === filters.category)
    out.push({ label: c ? c.name : filters.category, clear: () => { filters.category = ''; filters.tag = '' } })
  }
  if (filters.tag) {
    const tg = tags.value.find(x => x.slug === filters.tag)
    out.push({ label: '# ' + (tg ? tg.name : filters.tag), clear: () => { filters.tag = '' } })
  }
  if (filters.period) out.push({ label: periodLabel(filters.period), clear: () => { filters.period = '' } })
  return out
})
const applyFilter = (clearFn) => { clearFn(); syncUrl() }
const clearAllFilters = () => {
  searchInput.value = ''
  filters.search = ''; filters.category = ''; filters.type = ''; filters.tag = ''; filters.period = ''
  syncUrl()
}

/* ------------------------------ بارگذاری ------------------------------ */
let searchTimer = null

const buildParams = (p) => {
  const params = { page: p, limit: NEWS.PAGE_SIZE, sort: sort.value }
  if (filters.search) params.search = filters.search
  if (filters.category) params.category = filters.category
  if (filters.type) params.type = filters.type
  if (filters.tag) params.tag = filters.tag
  if (filters.period) params.period = filters.period
  return params
}

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await getArticles(buildParams(1))
    if (res.success) {
      articles.value = res.data
      page.value = 1
      totalCount.value = res.meta?.total ?? res.data.length
      // کاور سینمایی: یک مقاله ویژه فقط در نمای بدون فیلتر
      if (!hasActiveFilters.value) {
        const feats = res.data.filter(a => a.featured)
        featured.value = (feats.length ? feats : res.data).slice(0, 1)
      } else {
        featured.value = []
      }
      await nextTick()
      refreshReveal()
    } else error.value = true
  } catch { error.value = true } finally { loading.value = false }
}

// صفحه بعد برای بی‌نهایت اسکرول — پاسخ به لیست اضافه می‌شود
const loadMore = async (signal) => {
  const next = page.value + 1
  // signal از طریق config به axios می‌رسد (نه داخل params)
  const res = await getArticles(buildParams(next), { signal })
  // سیگنال لغو شده؟ نادیده بگیر (پاسخ دیرهنگاب قبلی)
  if (signal?.aborted) return true
  if (res.success) {
    const existing = new Set(articles.value.map(a => a._id))
    articles.value.push(...res.data.filter(a => !existing.has(a._id)))
    page.value = next
    if (res.meta?.total) totalCount.value = res.meta.total
    await nextTick()
    refreshReveal()
    return page.value < (res.meta?.pages || 1)
  }
  return false
}

const { sentinel, loading: infiniteLoading, done: infiniteDone } = useInfiniteScroll(loadMore)

const reload = () => { infiniteDone.value = false; load() }

/* ------------------------------ پیش‌واکشی ------------------------------ */
const { prefetch } = useHoverPrefetch((slug) => getArticleBySlug(slug, locale.value))

/* ------------------------------ فیلترها → URL ------------------------------ */
const setCategory = (slug) => { filters.category = slug; filters.tag = ''; syncUrl() }
const setTag = (slug) => { filters.tag = slug; syncUrl() }
const setType = (type) => { filters.type = type; syncUrl() }
const setPeriod = (p) => { filters.period = p; syncUrl() }
const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { filters.search = searchInput.value; syncUrl() }, NEWS.SEARCH_DEBOUNCE)
}
const clearSearch = () => { searchInput.value = ''; filters.search = ''; syncUrl() }

const syncUrl = () => {
  const q = {}
  if (filters.category) q.category = filters.category
  if (filters.tag) q.tag = filters.tag
  if (filters.type) q.type = filters.type
  if (filters.search) q.search = filters.search
  if (filters.period) q.period = filters.period
  if (sort.value !== 'newest') q.sort = sort.value
  router.replace({ query: q })
  load()
}

watch(() => route.query, (q) => {
  const next = { category: q.category || '', tag: q.tag || '', type: q.type || '', search: q.search || '', period: q.period || '' }
  const changed = JSON.stringify(next) !== JSON.stringify({ search: filters.search, category: filters.category, type: filters.type, tag: filters.tag, period: filters.period })
  if (!changed) return
  Object.assign(filters, next)
  searchInput.value = next.search
  infiniteDone.value = false
  load()
})

watch(sort, () => syncUrl())

onMounted(() => {
  // خواندن وضعیت اولیه از URL — از جمله tag (رفع F-01)
  filters.category = route.query.category || ''
  filters.tag = route.query.tag || ''
  filters.type = route.query.type || ''
  filters.search = route.query.search || ''
  filters.period = route.query.period || ''
  searchInput.value = filters.search
  sort.value = route.query.sort || 'newest'
  load()
  getArticleCategories().then(r => { if (r.success) categories.value = r.data }).catch(() => {})
  getArticleTags().then(r => { if (r.success) tags.value = r.data }).catch(() => {})
})

/* ------------------------------ سئوی کلاینت ------------------------------ */
useHead({
  title: () => `${t('news_title')} | نورمهر`,
  meta: [
    { name: 'description', content: () => t('news_subtitle') },
    // نتایج جستجو/تگ/بازه زمانی → noindex,follow (محتوای فیلترشده ایندکس‌پذیر نیست)
    { name: 'robots', content: () => (filters.search || filters.tag || filters.period) ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: () => `${t('news_title')} | نورمهر` },
    { property: 'og:description', content: () => t('news_subtitle') }
  ],
  link: [
    { rel: 'canonical', href: () => `${SITE_URL}/${locale.value}/news` },
    { rel: 'alternate', hreflang: 'fa', href: `${SITE_URL}/fa/news` },
    { rel: 'alternate', hreflang: 'en', href: `${SITE_URL}/en/news` },
    { rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/fa/news` }
  ]
})

const open = (a) => router.push({ name: 'ArticleView', params: { lang: locale.value, slug: a.slug } })
</script>