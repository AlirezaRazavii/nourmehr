<template>
  <section class="jn-page">
    <!-- دکمه تم -->
    <button class="jn-theme-btn" type="button" :title="theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'" @click="toggle">
      {{ theme === 'dark' ? '☀️' : '🌙' }}
    </button>

    <div class="jn-container">
      <!-- ═══════════════ سربرگ مجله ═══════════════ -->
      <header class="jn-head">
        <p class="jn-eyebrow"><i aria-hidden="true"></i><span>{{ $t('media_eyebrow') }}</span><i aria-hidden="true"></i></p>
        <h1>{{ $t('news_title') }}</h1>
        <p class="jn-sub">{{ $t('news_subtitle') }}</p>
      </header>

      <!-- ═══════════════ نوار ابزار (چسبان) ═══════════════ -->
      <div class="jn-toolbar">
        <div class="jn-toolbar-row">
          <label class="jn-search">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input v-model="searchInput" type="text" :placeholder="$t('news_search_placeholder')" @input="onSearchInput" />
            <button v-if="filters.search" type="button" class="jn-x" :aria-label="$t('nav_search_clear')" @click="clearSearch">✕</button>
          </label>

          <div class="jn-seg" role="tablist" :aria-label="$t('news_filter_all')">
            <button class="jn-seg-btn" :class="{ active: !filters.type }" role="tab" :aria-selected="!filters.type" @click="setType('')">{{ $t('news_filter_all') }}</button>
            <button class="jn-seg-btn" :class="{ active: filters.type === 'news' }" role="tab" :aria-selected="filters.type === 'news'" @click="setType('news')">{{ $t('news_type_news') }}</button>
            <button class="jn-seg-btn" :class="{ active: filters.type === 'event' }" role="tab" :aria-selected="filters.type === 'event'" @click="setType('event')">{{ $t('news_type_event') }}</button>
            <button class="jn-seg-btn" :class="{ active: filters.type === 'article' }" role="tab" :aria-selected="filters.type === 'article'" @click="setType('article')">{{ $t('news_type_article') }}</button>
          </div>

          <label class="jn-select">
            <select :value="filters.period" :aria-label="$t('news_period_all')" @change="setPeriod($event.target.value)">
              <option value="">{{ $t('news_period_all') }}</option>
              <option value="today">{{ $t('news_period_today') }}</option>
              <option value="week">{{ $t('news_period_week') }}</option>
              <option value="month">{{ $t('news_period_month') }}</option>
              <option value="year">{{ $t('news_period_year') }}</option>
            </select>
            <svg class="chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </label>

          <label class="jn-select">
            <select v-model="sort" :aria-label="$t('news_sort_newest')">
              <option value="newest">{{ $t('news_sort_newest') }}</option>
              <option value="oldest">{{ $t('news_sort_oldest') }}</option>
              <option value="popular">{{ $t('news_sort_popular') }}</option>
            </select>
            <svg class="chev" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </label>
        </div>

        <!-- فیلترهای فعال + حذف همه -->
        <div v-if="hasActiveFilters" class="jn-pills">
          <span class="jn-pills-label">{{ $t('news_filter_active') }}:</span>
          <button v-for="(f, i) in activeFilters" :key="i" class="jn-pill" type="button" @click="applyFilter(f.clear)">
            {{ f.label }} <span aria-hidden="true">✕</span>
          </button>
          <button class="jn-pill clear" type="button" @click="clearAllFilters">{{ $t('news_clear_all') }}</button>
        </div>
      </div>

      <!-- ═══════════════ نوار موضوعات و تگ‌ها ═══════════════ -->
      <div v-if="categories.length || (tags.length && !filters.category)" class="jn-strip">
        <span class="jn-strip-label">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          {{ $t('news_topics') }}
        </span>
        <div class="jn-strip-scroll">
          <button v-if="categories.length" class="jn-chip" :class="{ active: !filters.category && !filters.tag }" @click="setCategory('')">{{ $t('news_filter_all') }}</button>
          <button
            v-for="cat in categories" :key="cat._id"
            class="jn-chip" :class="{ active: filters.category === cat.slug }"
            @click="setCategory(cat.slug)"
          >{{ cat.name }} <span class="count">{{ cat.count }}</span></button>
          <template v-if="tags.length && !filters.category">
            <span class="jn-strip-div" aria-hidden="true"></span>
            <button
              v-for="tag in tags.slice(0, 8)" :key="tag.slug"
              class="jn-chip tag" :class="{ active: filters.tag === tag.slug }"
              @click="setTag(filters.tag === tag.slug ? '' : tag.slug)"
            ># {{ tag.name }}</button>
          </template>
        </div>
      </div>

      <!-- شمارنده نتایج -->
      <div v-if="!loading && !error && totalCount" class="jn-count">
        <span>{{ $t('news_results_found', { n: fmtNum(totalCount) }) }}</span>
        <i aria-hidden="true"></i>
      </div>

      <!-- ═══════════════ اسکلتون ═══════════════ -->
      <div v-if="loading && !articles.length" class="jn-grid" aria-busy="true">
        <div v-for="i in 6" :key="i" class="jn-cell">
          <div class="jn-card skel" aria-hidden="true">
            <div class="jn-card-img jn-shimmer"></div>
            <div class="jn-card-body">
              <div class="jn-shimmer" style="width:42%;height:12px;border-radius:99px"></div>
              <div class="jn-shimmer" style="width:88%;height:16px;margin-top:14px;border-radius:6px"></div>
              <div class="jn-shimmer" style="width:64%;height:16px;margin-top:8px;border-radius:6px"></div>
              <div class="jn-shimmer" style="width:52%;height:12px;margin-top:18px;border-radius:99px"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════ خطا ═══════════════ -->
      <div v-else-if="error" class="jn-empty">
        <div class="jn-empty-ico">⚠️</div>
        <p>{{ $t('news_error') }}</p>
        <button class="jn-btn" @click="reload">{{ $t('news_retry') }}</button>
      </div>

      <template v-else>
        <!-- ═══════════════ شبکه کارت‌ها ═══════════════ -->
        <div v-if="visibleArticles.length" class="jn-grid">
          <div
            v-for="(a, i) in visibleArticles" :key="a._id"
            class="jn-cell reveal" :style="{ '--d': (i % 3) * 80 + 'ms' }"
          >
            <article
              class="jn-card" :class="a.type"
              tabindex="0" role="link" :aria-label="loc(a.title)"
              @click="open(a)" @keydown.enter.prevent="open(a)" @mouseenter="prefetch(a.slug)"
            >
              <div class="jn-card-img">
                <img
                  v-if="a.image"
                  :src="cardImage(a)" :srcset="srcset(a)"
                  sizes="(max-width:640px) 92vw, (max-width:1100px) 45vw, 400px"
                  :alt="loc(a.imageAlt) || loc(a.title)" loading="lazy"
                />
                <span class="jn-type-chip" :class="a.type"><i aria-hidden="true"></i>{{ typeLabel(a.type) }}</span>
              </div>
              <div class="jn-card-body">
                <span v-if="a.category" class="jn-card-cat">{{ a.category.name }}</span>
                <h3>{{ loc(a.title) }}</h3>
                <p v-if="loc(a.excerpt)">{{ loc(a.excerpt) }}</p>
                <div class="jn-card-foot">
                  <span class="meta">
                    <time :datetime="a.publishedAt || a.createdAt">{{ fmtDate(a.publishedAt || a.createdAt) }}</time>
                    <span v-if="a.readingTime">· {{ a.readingTime }} {{ $t('news_min_read') }}</span>
                  </span>
                  <span class="jn-go">
                    {{ $t('news_read_more') }}
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- ═══════════════ خالی ═══════════════ -->
        <div v-else-if="!articles.length" class="jn-empty">
          <div class="jn-empty-ico">{{ hasActiveFilters ? '🔍' : '📰' }}</div>
          <p>{{ hasActiveFilters ? $t('news_no_results_filter') : $t('news_empty') }}</p>
          <button v-if="hasActiveFilters" class="jn-btn" @click="clearAllFilters">{{ $t('news_clear_all') }}</button>
        </div>

        <!-- ═══════════════ بارگذاری بی‌پایان ═══════════════ -->
        <div ref="sentinel" class="jn-sentinel" aria-hidden="true"></div>
        <div v-if="infiniteLoading" class="jn-more"><span class="jn-spin" aria-hidden="true"></span>{{ $t('loading') }}</div>
        <div v-else-if="infiniteDone && visibleArticles.length" class="jn-end"><i aria-hidden="true"></i>{{ $t('news_end_reached') }}<i aria-hidden="true"></i></div>
      </template>
    </div>
  </section>
</template>

<script setup>
/**
 * NewsCenter v3 — «ژورنال نورمهر»
 * بازطراحی کامل: سربرگ مجله‌ای وسط‌چین + مقاله برگزیده دوستونه (قاب طلایی) +
 * نوار ابزار تک‌خطی و چسبان (جستجو + نوع + بازه + مرتب‌سازی) + نوار موضوعات/تگ
 * اسکرول‌افقی + کارت‌های تمیز با انیمیشن ورود پلکانی (stagger) و هاور نرم.
 *
 * منطق داده ۱۰۰٪ همان نسخه قبل است (v2): بی‌نهایت اسکرول با AbortController،
 * همگام‌سازی فیلترها با URL (از جمله tag — رفع F-01)، debounce جستجو،
 * پیش‌واکشی در هاور، اسکلتون، سئوی کلاینت، حالت روشن/تاریک.
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
import '../styles/media.css' // فقط برای متغیرهای تم (--nm-*) — استایل‌ها scoped خودمان هستند

// انیمیشن ورود کارت‌ها — refresh بعد از هر لود داده صدا زده می‌شود
const { refresh: refreshReveal } = useReveal()

const { t, te, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { theme, toggle } = useTheme()

const articles = ref([])
const categories = ref([])
const tags = ref([])
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
const cardImage = (a) => {
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 768)?.url || vs[0].url) : getImageUrl(a.image)
}

const hasActiveFilters = computed(() => filters.search || filters.category || filters.type || filters.tag || filters.period)
const visibleArticles = computed(() => articles.value)

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

<style scoped>
/* ═══════════════ بدنه ═══════════════ */
.jn-page {
  min-height: 100vh;
  padding: 126px 20px 80px;
  background: var(--nm-bg);
  color: var(--nm-text);
  transition: background 0.35s ease, color 0.35s ease;
}
.jn-container { max-width: 1240px; margin: 0 auto; }

/* ═══════════════ دکمه تم ═══════════════ */
.jn-theme-btn {
  position: fixed; inset-inline-end: 18px; bottom: 18px; z-index: 90;
  width: 44px; height: 44px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--nm-line-strong);
  background: var(--nm-surface-solid);
  color: var(--nm-text);
  cursor: pointer; font-size: 1.05rem;
  box-shadow: var(--nm-shadow-soft);
  transition: transform 0.25s ease;
}
.jn-theme-btn:hover { transform: translateY(-3px); }
.jn-theme-btn:focus-visible { outline: 2px solid var(--nm-gold); outline-offset: 3px; }

/* ═══════════════ سربرگ ═══════════════ */
.jn-head { text-align: center; padding: 6px 0 2px; animation: jn-fade-down 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
.jn-eyebrow {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin: 0 0 16px; color: var(--nm-gold); font-size: 0.82rem; font-weight: 600;
}
.jn-eyebrow i {
  width: clamp(28px, 6vw, 64px); height: 1px;
  background: linear-gradient(to left, transparent, color-mix(in srgb, var(--nm-gold) 75%, transparent));
}
.jn-eyebrow i:last-child { transform: scaleX(-1); }
.jn-head h1 { margin: 0 0 12px; font-size: clamp(1.85rem, 4.4vw, 2.7rem); font-weight: 800; line-height: 1.45; }
.jn-sub {
  margin: 0 auto; max-width: 580px;
  color: var(--nm-text-dim); font-size: 0.95rem; line-height: 2;
}
@keyframes jn-fade-down {
  from { opacity: 0; transform: translateY(-18px); }
  to { opacity: 1; transform: none; }
}

/* ═══════════════ انیمیشن ورود (پلکانی) ═══════════════ */
.jn-cell.reveal {
  opacity: 0; transform: translateY(26px);
  transition: opacity 0.6s ease var(--d, 0ms), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms);
}
.jn-cell.reveal.revealed { opacity: 1; transform: none; }

/* ═══════════════ نوار ابزار ═══════════════ */
.jn-toolbar {
  position: sticky; top: 112px; z-index: 80;
  margin-top: 26px; padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--nm-line);
  background: color-mix(in srgb, var(--nm-bg) 84%, transparent);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}
.jn-toolbar-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.jn-search {
  flex: 1; min-width: 210px; height: 42px;
  display: flex; align-items: center; gap: 10px;
  padding: 0 14px; border-radius: 12px;
  border: 1px solid var(--nm-line);
  background: color-mix(in srgb, var(--nm-text) 4%, transparent);
  color: var(--nm-text-faint);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.jn-search:focus-within {
  border-color: color-mix(in srgb, var(--nm-gold) 55%, transparent);
  box-shadow: 0 0 0 3px var(--nm-gold-soft);
}
.jn-search input {
  flex: 1; min-width: 0; height: 100%;
  background: none; border: none; outline: none;
  color: var(--nm-text); font-family: inherit; font-size: 0.88rem;
}
.jn-search input::placeholder { color: var(--nm-text-faint); }
.jn-x {
  border: none; background: none; cursor: pointer;
  color: var(--nm-text-faint); font-size: 0.8rem; padding: 2px 4px;
  transition: color 0.2s ease;
}
.jn-x:hover { color: var(--nm-text); }

.jn-seg {
  display: flex; gap: 3px; padding: 4px;
  border-radius: 13px;
  border: 1px solid var(--nm-line);
  background: color-mix(in srgb, var(--nm-text) 4%, transparent);
}
.jn-seg-btn {
  border: none; background: none; cursor: pointer;
  padding: 7px 14px; border-radius: 9px;
  font-family: inherit; font-size: 0.8rem; font-weight: 600;
  color: var(--nm-text-dim);
  transition: color 0.25s ease, background 0.25s ease;
}
.jn-seg-btn:hover { color: var(--nm-text); }
.jn-seg-btn.active { background: var(--nm-gold-soft); color: var(--nm-gold); }
.jn-seg-btn:focus-visible { outline: 2px solid var(--nm-gold); outline-offset: 1px; }

.jn-select { position: relative; display: inline-flex; }
.jn-select select {
  appearance: none; -webkit-appearance: none;
  height: 42px; padding-inline: 14px 34px;
  border-radius: 12px; border: 1px solid var(--nm-line);
  background: color-mix(in srgb, var(--nm-text) 4%, transparent);
  color: var(--nm-text); font-family: inherit; font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.jn-select select:hover { border-color: color-mix(in srgb, var(--nm-gold) 45%, transparent); }
.jn-select select:focus-visible { outline: none; border-color: var(--nm-gold); box-shadow: 0 0 0 3px var(--nm-gold-soft); }
.jn-select .chev {
  position: absolute; inset-inline-end: 12px; top: 50%;
  transform: translateY(-50%);
  color: var(--nm-text-faint); pointer-events: none;
}

/* فیلترهای فعال */
.jn-pills {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  margin-top: 12px; padding-top: 12px;
  border-top: 1px dashed var(--nm-line);
}
.jn-pills-label { font-size: 0.75rem; color: var(--nm-text-faint); }
.jn-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px; border-radius: 99px;
  border: 1px solid color-mix(in srgb, var(--nm-gold) 45%, transparent);
  background: var(--nm-gold-soft); color: var(--nm-gold);
  font-family: inherit; font-size: 0.76rem; font-weight: 600;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
}
.jn-pill:hover { background: var(--nm-gold); color: #0b0e18; }
.jn-pill.clear { border-style: dashed; background: transparent; color: var(--nm-text-dim); }
.jn-pill.clear:hover { background: color-mix(in srgb, var(--nm-text) 8%, transparent); color: var(--nm-text); }

/* ═══════════════ نوار موضوعات/تگ ═══════════════ */
.jn-strip { display: flex; align-items: center; gap: 14px; margin: 18px 0 4px; }
.jn-strip-label {
  display: inline-flex; align-items: center; gap: 7px;
  flex-shrink: 0; font-size: 0.78rem; font-weight: 600; color: var(--nm-text-faint);
}
.jn-strip-scroll {
  display: flex; align-items: center; gap: 8px;
  overflow-x: auto; scrollbar-width: none;
  padding: 4px 2px;
}
.jn-strip-scroll::-webkit-scrollbar { display: none; }
.jn-strip-div { flex-shrink: 0; width: 1px; height: 18px; background: var(--nm-line-strong); }
.jn-chip {
  flex-shrink: 0;
  padding: 7px 14px; border-radius: 99px;
  border: 1px solid var(--nm-line);
  background: transparent; color: var(--nm-text-dim);
  font-family: inherit; font-size: 0.8rem;
  cursor: pointer;
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}
.jn-chip:hover { color: var(--nm-text); border-color: var(--nm-line-strong); }
.jn-chip .count { font-size: 0.68rem; opacity: 0.65; }
.jn-chip.tag { border-style: dashed; font-size: 0.76rem; }
.jn-chip.active {
  background: var(--nm-gold); border-color: var(--nm-gold);
  color: #0b0e18; font-weight: 700;
}
.jn-chip.active .count { opacity: 0.8; }
.jn-chip:focus-visible { outline: 2px solid var(--nm-gold); outline-offset: 2px; }

/* شمارنده */
.jn-count { display: flex; align-items: center; gap: 14px; margin: 20px 0 16px; font-size: 0.8rem; color: var(--nm-text-faint); }
.jn-count i { flex: 1; height: 1px; background: linear-gradient(to left, var(--nm-line-strong), transparent); }

/* ═══════════════ شبکه کارت‌ها ═══════════════ */
.jn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 22px;
}
.jn-card {
  display: flex; flex-direction: column; height: 100%;
  background: var(--nm-surface-solid);
  border: 1px solid var(--nm-line);
  border-radius: 20px; overflow: hidden;
  cursor: pointer;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s ease, border-color 0.45s ease;
}
.jn-card:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--nm-gold) 38%, transparent);
  box-shadow: var(--nm-shadow);
}
.jn-card:focus-visible { outline: 2px solid var(--nm-gold); outline-offset: 3px; }

.jn-card-img { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--nm-bg-soft); }
.jn-card-img img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.jn-card:hover .jn-card-img img { transform: scale(1.06); }

.jn-type-chip {
  position: absolute; top: 12px; inset-inline-end: 12px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: 99px;
  background: rgba(8, 10, 20, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff; font-size: 0.7rem; font-weight: 600;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.jn-type-chip i { width: 6px; height: 6px; border-radius: 50%; background: #fff; }
.jn-type-chip.news i { background: #7cb2ff; }
.jn-type-chip.event i { background: #4fd6b5; }
.jn-type-chip.article i { background: #f0cd82; }

.jn-card-body { display: flex; flex-direction: column; gap: 9px; padding: 20px 20px 18px; flex: 1; }
.jn-card-cat { font-size: 0.72rem; font-weight: 700; color: var(--nm-gold); }
.jn-card-body h3 {
  margin: 0; font-size: 1.05rem; font-weight: 700; line-height: 1.75;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  transition: color 0.3s ease;
}
.jn-card:hover h3 { color: var(--nm-gold-light); }
.jn-card-body > p {
  margin: 0; font-size: 0.86rem; line-height: 1.95; color: var(--nm-text-dim);
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.jn-card-foot {
  margin-top: auto; padding-top: 13px;
  border-top: 1px solid var(--nm-line);
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 0.75rem; color: var(--nm-text-faint);
}
.jn-card-foot .meta { display: inline-flex; align-items: center; gap: 6px; }
.jn-go { display: inline-flex; align-items: center; gap: 5px; color: var(--nm-gold); font-weight: 700; }
.jn-go svg { transition: transform 0.3s ease; }
.jn-card:hover .jn-go svg { transform: translateX(-4px); }

/* ═══════════════ حالت‌ها ═══════════════ */
.jn-shimmer {
  position: relative; overflow: hidden;
  background: color-mix(in srgb, var(--nm-text) 7%, transparent);
  border-radius: 8px;
}
.jn-shimmer::after {
  content: ''; position: absolute; inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--nm-text) 6%, transparent), transparent);
  animation: jn-shimmer 1.4s ease-in-out infinite;
}
@keyframes jn-shimmer { to { transform: translateX(100%); } }

.jn-empty { text-align: center; padding: 70px 20px; color: var(--nm-text-dim); }
.jn-empty-ico { font-size: 2.4rem; margin-bottom: 14px; opacity: 0.85; }
.jn-empty p { margin: 0 0 20px; }
.jn-btn {
  padding: 10px 26px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--nm-gold) 50%, transparent);
  background: transparent; color: var(--nm-gold);
  font-family: inherit; font-size: 0.85rem; font-weight: 700;
  cursor: pointer;
  transition: background 0.3s ease, color 0.3s ease;
}
.jn-btn:hover { background: var(--nm-gold); color: #0b0e18; }
.jn-btn:focus-visible { outline: 2px solid var(--nm-gold); outline-offset: 2px; }

/* ═══════════════ بی‌نهایت اسکرول ═══════════════ */
.jn-sentinel { height: 1px; }
.jn-more {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 32px; color: var(--nm-text-dim); font-size: 0.85rem;
}
.jn-spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--nm-gold-soft); border-top-color: var(--nm-gold);
  animation: jn-spin 0.8s linear infinite;
}
@keyframes jn-spin { to { transform: rotate(360deg); } }
.jn-end {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin-top: 36px; color: var(--nm-text-faint); font-size: 0.8rem;
}
.jn-end i { width: 44px; height: 1px; background: linear-gradient(to left, transparent, var(--nm-line-strong)); }
.jn-end i:last-child { transform: scaleX(-1); }

/* ═══════════════ ریسپانسیو ═══════════════ */
@media (max-width: 1024px) {
  .jn-toolbar { position: static; } /* موبایل/تبلت: نوار ابزار چسبان نمی‌ماند */
}
@media (max-width: 900px) {
}
@media (max-width: 700px) {
  .jn-page { padding: 116px 14px 64px; }
  .jn-search { min-width: 100%; order: 1; }
  .jn-seg { width: 100%; order: 2; }
  .jn-seg-btn { flex: 1; padding: 7px 4px; }
  .jn-select { flex: 1; }
  .jn-select select { width: 100%; }
  .jn-grid { grid-template-columns: 1fr; gap: 18px; }
  .jn-card-body { padding: 17px 17px 15px; }
}

/* ═══════════════ کاهش حرکت ═══════════════ */
@media (prefers-reduced-motion: reduce) {
  .jn-head { animation: none; }
  .jn-cell.reveal { opacity: 1; transform: none; transition: none; }
  .jn-card, .jn-card-img img,
  .jn-go svg, .jn-theme-btn, .jn-shimmer::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>