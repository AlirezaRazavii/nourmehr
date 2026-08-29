<template>
  <section class="news-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ $t('news_title') }}</h1>
        <p>{{ $t('news_subtitle') }}</p>
      </div>

      <!-- نوار فیلتر -->
      <div class="filter-bar glass">
        <div class="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input v-model.trim="searchInput" type="text" :placeholder="$t('news_search_placeholder')" @keyup.enter="applySearch" />
          <button v-if="filters.search" class="clear-search" @click="clearSearch">✕</button>
        </div>
        <div class="chips">
          <button class="chip" :class="{ active: !filters.category }" @click="setCategory('')">{{ $t('news_filter_all') }}</button>
          <button v-for="cat in categories" :key="cat._id" class="chip" :class="{ active: filters.category === cat.slug }" @click="setCategory(cat.slug)">
            {{ cat.name }} <span class="chip-count">{{ cat.count }}</span>
          </button>
        </div>
        <div class="sort-row">
          <div class="type-chips">
            <button class="chip small" :class="{ active: !filters.type }" @click="setType('')">{{ $t('news_type_general') }}</button>
            <button class="chip small" :class="{ active: filters.type === 'news' }" @click="setType('news')">{{ $t('news_type_news') }}</button>
            <button class="chip small" :class="{ active: filters.type === 'event' }" @click="setType('event')">{{ $t('news_type_event') }}</button>
            <button class="chip small" :class="{ active: filters.type === 'article' }" @click="setType('article')">{{ $t('news_type_article') }}</button>
          </div>
          <select v-model="sort" class="sort-select">
            <option value="newest">{{ $t('news_sort_newest') }}</option>
            <option value="oldest">{{ $t('news_sort_oldest') }}</option>
            <option value="popular">{{ $t('news_sort_popular') }}</option>
          </select>
        </div>
      </div>

      <!-- اسکلتون لودینگ -->
      <div v-if="loading" class="news-grid" aria-busy="true">
        <div v-for="i in 6" :key="i" class="news-card skeleton-card">
          <div class="skeleton sk-img"></div>
          <div class="news-body">
            <div class="skeleton sk-line w-30"></div>
            <div class="skeleton sk-line w-90"></div>
            <div class="skeleton sk-line w-70"></div>
          </div>
        </div>
      </div>

      <!-- خطا -->
      <div v-else-if="error" class="error-state">
        <div class="empty-icon">⚠️</div>
        <p>{{ $t('news_error') }}</p>
        <button class="retry-btn" @click="load">{{ $t('news_retry') }}</button>
      </div>

      <template v-else>
        <!-- پست ویژه -->
        <article v-if="featuredPost && page === 1 && !filters.search && !filters.category && !filters.type" class="featured glass" @click="goToBlog(featuredPost.slug)">
          <div class="featured-img" v-if="featuredPost.image">
            <img :src="getImageUrl(featuredPost.image)" :alt="getLocalizedText(featuredPost.imageAlt) || getLocalizedText(featuredPost.title)" loading="eager" />
          </div>
          <div class="featured-body">
            <div class="featured-badges">
              <span class="news-type">{{ getTypeLabel(featuredPost.type) }}</span>
              <span v-if="featuredPost.category" class="cat-badge">{{ getLocalizedText(featuredPost.category.name) }}</span>
            </div>
            <h2>{{ getLocalizedText(featuredPost.title) }}</h2>
            <p>{{ getLocalizedText(featuredPost.excerpt) }}</p>
            <div class="news-footer">
              <span class="news-date">{{ formatDate(featuredPost.publishedAt || featuredPost.createdAt) }}</span>
              <span v-if="featuredPost.readingTime" class="reading-time">⏱ {{ featuredPost.readingTime }} {{ $t('news_min_read') }}</span>
            </div>
          </div>
        </article>

        <!-- شبکه کارت‌ها -->
        <div v-if="blogs.length" class="news-grid">
          <article v-for="blog in blogs" :key="blog._id" class="news-card glass" @click="goToBlog(blog.slug)">
            <div class="news-img" v-if="blog.image">
              <img :src="getImageUrl(blog.image)" :alt="getLocalizedText(blog.imageAlt) || getLocalizedText(blog.title)" loading="lazy" />
            </div>
            <div class="news-body">
              <div class="badges">
                <span class="news-type">{{ getTypeLabel(blog.type) }}</span>
                <span v-if="blog.category" class="cat-badge">{{ getLocalizedText(blog.category.name) }}</span>
              </div>
              <h3>{{ getLocalizedText(blog.title) }}</h3>
              <p>{{ getLocalizedText(blog.excerpt) }}</p>
              <div class="news-footer">
                <span class="news-date">{{ formatDate(blog.publishedAt || blog.createdAt) }}</span>
                <span class="news-read-more">{{ $t('news_read_more') }} →</span>
              </div>
            </div>
          </article>
        </div>

        <!-- حالت خالی -->
        <div v-else class="empty-state">
          <div class="empty-icon">📰</div>
          <p>{{ emptyMessage }}</p>
        </div>

        <!-- صفحه‌بندی -->
        <nav v-if="meta.pages > 1" class="pagination" aria-label="pagination">
          <button class="page-btn" :disabled="page <= 1" @click="goToPage(page - 1)">‹</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            class="page-btn"
            :class="{ active: p === page, ellipsis: p === '…' }"
            :disabled="p === '…'"
            @click="p !== '…' && goToPage(p)"
          >{{ p }}</button>
          <button class="page-btn" :disabled="page >= meta.pages" @click="goToPage(page + 1)">›</button>
        </nav>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import { getBlogs, getBlogCategories } from '../services/blogApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, te, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const blogs = ref([])
const categories = ref([])
const featuredPost = ref(null)
const loading = ref(true)
const error = ref(false)
const searchInput = ref('')

const page = ref(1)
const sort = ref('newest')
const meta = reactive({ page: 1, limit: 9, total: 0, pages: 1 })
const filters = reactive({ search: '', category: '', type: '' })

// پیام حالت خالی بر اساس تب فعال (خبر/رویداد/مقاله)
const emptyMessage = computed(() => {
  if (filters.type === 'event' && te('news_empty_events')) return t('news_empty_events')
  if (filters.type === 'news' && te('news_empty_news')) return t('news_empty_news')
  return t('news_empty')
})

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || value.en || ''
  return ''
}

const getTypeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  if (te(key)) return t(key)
  return te('news_type_general') ? t('news_type_general') : ''
}

const formatDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}

const pageNumbers = computed(() => {
  const pages = meta.pages
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out = [1]
  if (page.value > 3) out.push('…')
  for (let p = Math.max(2, page.value - 1); p <= Math.min(pages - 1, page.value + 1); p++) out.push(p)
  if (page.value < pages - 2) out.push('…')
  out.push(pages)
  return out
})

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const params = {
      page: page.value,
      limit: 9,
      sort: sort.value
    }
    if (filters.search) params.search = filters.search
    if (filters.category) params.category = filters.category
    if (filters.type) params.type = filters.type

    const res = await getBlogs(params)
    if (res.success) {
      blogs.value = res.data
      Object.assign(meta, res.meta || {})
      // پست ویژه فقط در نمای اول صفحه
      if (page.value === 1 && !filters.search && !filters.category && !filters.type) {
        featuredPost.value = res.data.find(b => b.featured) || res.data[0] || null
        blogs.value = res.data.filter(b => featuredPost.value && b._id !== featuredPost.value._id)
      } else {
        featuredPost.value = null
      }
    } else {
      error.value = true
    }
  } catch (e) {
    console.error('Error fetching blogs:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const res = await getBlogCategories()
    if (res.success) categories.value = res.data
  } catch (e) {
    console.error('Error fetching blog categories:', e)
  }
}

const setCategory = (slug) => {
  filters.category = slug
  page.value = 1
  load()
}
const setType = (type) => {
  filters.type = type
  page.value = 1
  load()
}
const applySearch = () => {
  filters.search = searchInput.value
  page.value = 1
  load()
}
const clearSearch = () => {
  searchInput.value = ''
  filters.search = ''
  page.value = 1
  load()
}
const goToPage = (p) => {
  page.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const goToBlog = (slug) => {
  router.push({ name: 'NewsDetails', params: { lang: locale.value, slug } })
}

// همگام‌سازی فیلترها با URL (قابل اشتراک‌گذاری و ایندکس‌پذیر)
watch(() => route.query, (q) => {
  filters.category = q.category || ''
  filters.type = q.type || ''
  filters.search = q.search || ''
  searchInput.value = q.search || ''
  page.value = Math.max(1, parseInt(q.page) || 1)
  load()
}, { immediate: false })

watch([page, sort], () => {
  router.replace({ query: buildQuery() })
  load()
})

const buildQuery = () => {
  const q = {}
  if (page.value > 1) q.page = page.value
  if (filters.category) q.category = filters.category
  if (filters.type) q.type = filters.type
  if (filters.search) q.search = filters.search
  if (sort.value !== 'newest') q.sort = sort.value
  return q
}

onMounted(() => {
  if (route.query.category) filters.category = route.query.category
  if (route.query.type) filters.type = route.query.type
  if (route.query.search) { filters.search = route.query.search; searchInput.value = route.query.search }
  if (route.query.page) page.value = Math.max(1, parseInt(route.query.page) || 1)
  if (route.query.sort) sort.value = route.query.sort
  load()
  loadCategories()
})

// متاهای سئوی صفحه لیست
useHead({
  title: () => `${t('news_title')} | نورمهر`,
  meta: [
    { name: 'description', content: () => t('news_subtitle') },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: () => `${t('news_title')} | نورمهر` },
    { property: 'og:description', content: () => t('news_subtitle') }
  ],
  link: [
    { rel: 'canonical', href: () => `${SITE_URL}/${locale.value}/news` },
    { rel: 'alternate', hreflang: 'fa', href: `${SITE_URL}/fa/news` },
    { rel: 'alternate', hreflang: 'en', href: `${SITE_URL}/en/news` }
  ]
})
</script>

<style scoped>
.news-page { min-height: 100vh; padding: 120px 40px 80px; background: #050814; color: #fff; }
.container { max-width: 1200px; margin: 0 auto; }
.page-header { text-align: center; margin-bottom: 40px; }
.page-header h1 { font-size: 2.5rem; margin: 0 0 10px; background: linear-gradient(135deg, #fff, #c5a059); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.page-header p { opacity: 0.7; font-size: 1.1rem; }

/* فیلتر */
.filter-bar { border-radius: 20px; padding: 20px; margin-bottom: 32px; background: rgba(5, 8, 20, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 14px; }
.search-box { position: relative; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 16px; }
.search-box input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-family: inherit; font-size: 0.95rem; }
.clear-search { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 0.9rem; }
.chips, .type-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 7px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.75); font-size: 0.85rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.chip:hover { border-color: rgba(197,160,89,0.5); color: #fff; }
.chip.active { background: rgba(197,160,89,0.18); border-color: #c5a059; color: #facc6b; }
.chip.small { padding: 5px 12px; font-size: 0.78rem; }
.chip-count { opacity: 0.6; font-size: 0.75rem; margin-inline-start: 4px; }
.sort-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.sort-select { padding: 8px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-family: inherit; font-size: 0.85rem; outline: none; cursor: pointer; }
.sort-select option { background: #0a0d14; }

/* اسکلتون */
.skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
.skeleton-card { pointer-events: none; }
.sk-img { height: 200px; border-radius: 0; margin-bottom: 4px; }
.sk-line { height: 14px; margin: 10px 0; }
.w-30 { width: 30%; } .w-70 { width: 70%; } .w-90 { width: 90%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* پست ویژه */
.featured { display: grid; grid-template-columns: 1.2fr 1fr; border-radius: 24px; overflow: hidden; background: rgba(5, 8, 20, 0.85); border: 1px solid rgba(197,160,89,0.25); cursor: pointer; margin-bottom: 28px; transition: all 0.3s ease; }
.featured:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
.featured-img { min-height: 320px; overflow: hidden; }
.featured-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.featured:hover .featured-img img { transform: scale(1.04); }
.featured-body { padding: 36px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
.featured-body h2 { font-size: 1.8rem; margin: 0; line-height: 1.4; }
.featured-body p { font-size: 1rem; opacity: 0.75; line-height: 1.8; margin: 0; }
.featured-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.cat-badge { padding: 4px 12px; border-radius: 999px; background: rgba(59,130,246,0.15); color: #60a5fa; font-size: 0.75rem; }

/* شبکه کارت‌ها */
.news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
.news-card { border-radius: 20px; overflow: hidden; background: rgba(5, 8, 20, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; }
.news-card:hover { transform: translateY(-6px); border-color: rgba(197, 160, 89, 0.4); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.news-img { height: 200px; width: 100%; overflow: hidden; }
.news-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.news-card:hover .news-img img { transform: scale(1.05); }
.news-body { padding: 24px; display: flex; flex-direction: column; flex: 1; gap: 4px; }
.badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.news-type { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-size: 0.75rem; }
.news-body h3 { font-size: 1.2rem; margin: 0 0 10px; line-height: 1.4; }
.news-body p { font-size: 0.9rem; opacity: 0.7; line-height: 1.7; margin: 0 0 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
.news-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
.news-date { font-size: 0.8rem; opacity: 0.5; }
.reading-time { font-size: 0.8rem; opacity: 0.5; }
.news-read-more { font-size: 0.85rem; color: #2bbf9e; font-weight: 600; }

/* صفحه‌بندی */
.pagination { display: flex; justify-content: center; gap: 8px; margin-top: 40px; flex-wrap: wrap; }
.page-btn { min-width: 40px; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.75); font-family: inherit; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; }
.page-btn:hover:not(:disabled) { border-color: rgba(197,160,89,0.5); color: #fff; }
.page-btn.active { background: #c5a059; border-color: #c5a059; color: #000; font-weight: 700; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-btn.ellipsis { border: none; }

.empty-state, .error-state { text-align: center; padding: 80px; }
.empty-icon { font-size: 4rem; margin-bottom: 16px; }
.retry-btn { margin-top: 8px; padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(197, 160, 89, 0.5); background: transparent; color: #facc6b; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
.retry-btn:hover { background: rgba(197, 160, 89, 0.15); }

@media (max-width: 900px) {
  .featured { grid-template-columns: 1fr; }
  .featured-img { min-height: 220px; }
}
@media (max-width: 768px) {
  .news-page { padding: 100px 20px 60px; }
  .news-grid { grid-template-columns: 1fr; }
  .sort-row { flex-direction: column; align-items: stretch; }
}
</style>
