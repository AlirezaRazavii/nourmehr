<template>
  <section class="nm-page">
    <!-- نوار پیشرفت + دکمه تم -->
    <button class="nm-theme-btn" type="button" :title="theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'" @click="toggle">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>

    <div class="nm-container">
      <!-- هیرو -->
      <header class="nm-hero">
        <h1>{{ $t('news_title') }}</h1>
        <p>{{ $t('news_subtitle') }}</p>
      </header>

      <!-- نوار فیلتر -->
      <div class="nm-filterbar">
        <div class="nm-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input v-model="searchInput" type="text" :placeholder="$t('news_search_placeholder')" @input="onSearchInput" />
          <button v-if="filters.search" type="button" style="background:none;border:none;color:inherit;cursor:pointer" @click="clearSearch">✕</button>
        </div>

        <!-- موضوعات (دسته‌ها) -->
        <div class="nm-chips" role="tablist">
          <button class="nm-chip" :class="{ active: !filters.category && !filters.tag }" @click="setCategory('')">{{ $t('news_filter_all') }}</button>
          <button v-for="cat in categories" :key="cat._id" class="nm-chip" :class="{ active: filters.category === cat.slug }" @click="setCategory(cat.slug)">
            {{ cat.name }} <span class="count">{{ cat.count }}</span>
          </button>
        </div>

        <!-- تگ‌های پرتکرار -->
        <div v-if="tags.length && !filters.category" class="nm-chips">
          <button
            v-for="tag in tags.slice(0, 10)" :key="tag.slug"
            class="nm-chip" :class="{ active: filters.tag === tag.slug }"
            @click="setTag(filters.tag === tag.slug ? '' : tag.slug)"
          ># {{ tag.name }}</button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap">
          <div class="nm-chips">
            <button class="nm-chip" :class="{ active: !filters.type }" @click="setType('')">{{ $t('news_filter_all') }}</button>
            <button class="nm-chip" :class="{ active: filters.type === 'news' }" @click="setType('news')">{{ $t('news_type_news') }}</button>
            <button class="nm-chip" :class="{ active: filters.type === 'event' }" @click="setType('event')">{{ $t('news_type_event') }}</button>
            <button class="nm-chip" :class="{ active: filters.type === 'article' }" @click="setType('article')">{{ $t('news_type_article') }}</button>
          </div>
          <select v-model="sort" class="nm-sort">
            <option value="newest">{{ $t('news_sort_newest') }}</option>
            <option value="oldest">{{ $t('news_sort_oldest') }}</option>
            <option value="popular">{{ $t('news_sort_popular') }}</option>
          </select>
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
        <!-- پست‌های ویژه — فقط نمای اول بدون فیلتر -->
        <template v-if="featured.length && page === 1 && !hasActiveFilters">
          <article v-for="(f, i) in featured" :key="f._id" class="nm-featured reveal" @click="open(f)" @mouseenter="prefetch(f.slug)">
            <div class="nm-featured-img"><img v-if="f.image" :src="imgUrl(f.image)" :alt="loc(f.imageAlt) || loc(f.title)" :loading="i === 0 ? 'eager' : 'lazy'" :fetchpriority="i === 0 ? 'high' : undefined" /></div>
            <div class="nm-featured-body">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="nm-badge">{{ typeLabel(f.type) }}</span>
                <span v-if="f.category" class="nm-badge blue">{{ f.category.name }}</span>
              </div>
              <h2>{{ loc(f.title) }}</h2>
              <p>{{ loc(f.excerpt) }}</p>
              <div class="nm-card-foot" style="border:none;padding:0">
                <span>{{ fmtDate(f.publishedAt || f.createdAt) }}</span>
                <span v-if="f.readingTime">⏱ {{ f.readingTime }} {{ $t('news_min_read') }}</span>
              </div>
            </div>
          </article>
        </template>

        <!-- شبکه کارت‌ها -->
        <div v-if="visibleArticles.length" class="nm-grid">
          <article
            v-for="a in visibleArticles" :key="a._id"
            class="nm-card reveal"
            @click="open(a)" @mouseenter="prefetch(a.slug)"
          >
            <div class="nm-card-img">
              <img v-if="a.image" :src="cardImage(a)" :srcset="srcset(a)" sizes="(max-width:640px) 92vw, (max-width:1100px) 45vw, 380px" :alt="loc(a.imageAlt) || loc(a.title)" loading="lazy" />
            </div>
            <div class="nm-card-body">
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <span class="nm-badge">{{ typeLabel(a.type) }}</span>
                <span v-if="a.category" class="nm-badge blue">{{ a.category.name }}</span>
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

        <!-- خالی -->
        <div v-else class="nm-empty">
          <div class="icon">📰</div>
          <p>{{ $t('news_empty') }}</p>
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
 * NewsCenter — هاب اخبار سیستم رسانه‌ای جدید
 * ویژگی‌ها: جستجوی لحظه‌ای (debounce)، فیلتر دسته/تگ/نوع از URL،
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
const loading = ref(true)
const error = ref(false)
const searchInput = ref('')

const page = ref(1)
const sort = ref('newest')
const filters = reactive({ search: '', category: '', type: '', tag: '' })

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin

/* ------------------------------ کمکی‌ها ------------------------------ */
const loc = (v) => (!v ? '' : typeof v === 'string' ? v : (v[locale.value] || v.fa || v.en || ''))
const typeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  return te(key) ? t(key) : (te('news_type_general') ? t('news_type_general') : '')
}
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' } }
const imgUrl = (p) => getImageUrl(p)

// srcset از variants پایپ‌لاین sharp
const srcset = (a) => (a.imageVariants || []).map(v => `${getImageUrl(v.url)} ${v.w}w`).join(', ')
const cardImage = (a) => {
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 768)?.url || vs[0].url) : getImageUrl(a.image)
}

const hasActiveFilters = computed(() => filters.search || filters.category || filters.type || filters.tag)
// کارت‌های لیست = همه به‌جز featuredها (در نمای اول)
const visibleArticles = computed(() => {
  if (page.value === 1 && !hasActiveFilters.value && featured.value.length) {
    const fIds = new Set(featured.value.map(f => f._id))
    return articles.value.filter(a => !fIds.has(a._id))
  }
  return articles.value
})

/* ------------------------------ بارگذاری ------------------------------ */
let searchTimer = null

const buildParams = (p) => {
  const params = { page: p, limit: NEWS.PAGE_SIZE, sort: sort.value }
  if (filters.search) params.search = filters.search
  if (filters.category) params.category = filters.category
  if (filters.type) params.type = filters.type
  if (filters.tag) params.tag = filters.tag
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
      // دو پست ویژه فقط در نمای بدون فیلتر
      if (!hasActiveFilters.value) {
        const feats = res.data.filter(a => a.featured)
        featured.value = (feats.length ? feats : res.data).slice(0, 2)
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
  // سیگنال لغو شده؟ نادیده بگیر (پاسخ دیرهنگام قبلی)
  if (signal?.aborted) return true
  if (res.success) {
    const existing = new Set(articles.value.map(a => a._id))
    articles.value.push(...res.data.filter(a => !existing.has(a._id)))
    page.value = next
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
  if (sort.value !== 'newest') q.sort = sort.value
  router.replace({ query: q })
  load()
}

watch(() => route.query, (q) => {
  const next = { category: q.category || '', tag: q.tag || '', type: q.type || '', search: q.search || '' }
  const changed = JSON.stringify(next) !== JSON.stringify({ ...filters })
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
    // نتایج جستجو/تگ → noindex,follow (محتوای فیلترشده ایندکس‌پذیر نیست)
    { name: 'robots', content: () => (filters.search || filters.tag) ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
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
