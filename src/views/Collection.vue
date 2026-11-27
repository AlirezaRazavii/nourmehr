<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '../services/api'
import { getCollection } from '../services/collectionApi'
import { getImageUrl } from '../utils/imageUrl'
import { useCart } from '../stores/cart'
import { useProductStore } from '../stores/products'
import { useWishlist } from '../stores/wishlist'
import { useAuth } from '../stores/auth'
import { getProductPriceInfo } from '../utils/productPrice'
import CampaignCountdown from '../components/CampaignCountdown.vue'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const cartStore = useCart()
const productStore = useProductStore()
const wishlist = useWishlist()
const auth = useAuth()

const getPriceInfo = (p) => getProductPriceInfo(p)

const handleAddToCart = async (product) => {
  if (!product?._id) return
  if ((product.stock ?? 0) <= 0) return // محصول ناموجود
  // اگر کاربر لاگین نباشد، اینترسپتور axios به /login هدایت می‌کند
  await cartStore.addToCart(product._id, 1, null)
}

// علاقه‌مندی‌ها — دقیقاً مثل صفحه محصولات
const toggleWishlist = async (productId) => {
  if (!auth.isAuthenticated) {
    router.push({ name: 'Login', params: { lang: locale.value }, query: { redirect: route.fullPath } })
    return
  }
  await wishlist.toggle(productId)
}

// تصویر محصول — مثل Products.vue
const getProductImage = (product) => getImageUrl(product.mainImage || product.image)


// ─────────────────────────────────────────────────────────────
// Helper های دوزبانه و رنگ
// ─────────────────────────────────────────────────────────────
// متن دوزبانه ({fa,en}) را به رشته‌ی زبان جاری تبدیل می‌کند
const loc = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || value.en || ''
  return ''
}

// '#ffd280' → '255,210,128' (برای متغیر CSS --accent-rgb)
const hexToRgb = (hex) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex || '').trim())
  return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '197,160,89'
}

// ⚠️ این آبجکت قبلاً تعریف نشده بود و صفحه با ReferenceError کرش می‌کرد
// بازنویسی‌های اختیاری هر دسته — فعلاً خالی؛ در صورت نیاز اینجا اضافه شود
const presets = {}

const apiProducts = ref([])
const productsLoading = ref(false)
const loadError = ref('')
// وقتی slug مربوط به یک «کالکشن» باشد اینجا پر می‌شود؛ null یعنی حالت دسته‌بندی
const collectionData = ref(null)
// ⭐ تایمر کمپین به صفر رسید؟
const campaignEnded = ref(false)

/* ───────── ⭐ صفحه‌بندی / جست‌وجو / مرتب‌سازی سمت سرور ───────── */
const PAGE_SIZE = 24
const page = ref(1)
const totalPages = ref(1)
const totalProducts = ref(0)
let reqSeq = 0
let searchTimer = null
let suppressWatch = false

const SORT_MAP = {
  newest: 'newest',
  'price-low': 'price_asc',
  'price-high': 'price_desc',
  popular: 'popular',
}

const fetchProducts = async (slug, targetPage = 1) => {
  if (!slug) return
  const seq = ++reqSeq
  productsLoading.value = true
  loadError.value = ''

  const params = {
    page: targetPage,
    limit: PAGE_SIZE,
    sort: SORT_MAP[selectedSort.value] || 'newest',
  }
  const q = searchQuery.value.trim()
  if (q) params.search = q

  try {
    let list = null
    // ۱) اول تلاش به‌عنوان «کالکشن»
    try {
      const data = await getCollection(encodeURIComponent(slug), params)
      if (seq !== reqSeq) return
      if (data?.collection) {
        collectionData.value = data.collection
        campaignEnded.value = false
        list = data.products || []
        totalProducts.value = Number(data.total) || list.length
        totalPages.value = Number(data.totalPages) || 1
        page.value = Number(data.page) || targetPage
      }
    } catch { /* کالکشن نبود — به دسته‌بندی برمی‌گردیم */ }
    // ۲) اگر کالکشن نبود، به‌عنوان «دسته‌بندی»
    if (list === null) {
      const qs = new URLSearchParams(params).toString()
      const res = await api.get(`/products?category=${encodeURIComponent(slug)}&${qs}`)
      if (seq !== reqSeq) return
      collectionData.value = null
      list = res.data.data || []
      totalProducts.value = Number(res.data.total) || list.length
      totalPages.value = Number(res.data.totalPages) || 1
      page.value = Number(res.data.page) || targetPage
    }
    apiProducts.value = list
  } catch (e) {
    if (seq !== reqSeq) return
    console.error('[Collection] خطا در دریافت محصولات:', e)
    apiProducts.value = []
    totalProducts.value = 0
    totalPages.value = 1
    loadError.value = e.response?.data?.message || e.message || 'خطا در برقراری با سرور'
  } finally {
    if (seq === reqSeq) productsLoading.value = false
  }
}

const goToPage = (p) => {
  const target = Math.min(Math.max(1, p), totalPages.value || 1)
  if (target === page.value) return
  fetchProducts(currentSlug.value, target)
  document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const currentSlug = computed(() => route.params.slug)

/* ───────── ⭐ کمپین زمان‌دار این کالکشن ───────── */
const collectionCampaign = computed(() => collectionData.value?.campaign || null)
const campaignHidden = computed(() => collectionData.value?.hideWhenCampaignEnds !== false)
const campaignColor = computed(
  () => collectionCampaign.value?.themeColor || collectionData.value?.bgColor || '#c5a059'
)
const campaignTitle = computed(() => loc(collectionCampaign.value?.name))
const campaignCountdownLabel = computed(() => loc(collectionCampaign.value?.countdownLabel))

const onCampaignFinished = () => {
  campaignEnded.value = true
  // اگر کالکشن مخفی نمی‌شود، داده را تازه کن تا تخفیف کمپین از قیمت‌ها برداشته شود
  if (!campaignHidden.value && currentSlug.value) fetchProducts(currentSlug.value)
}
// دسته‌بندی‌های واقعی از دیتابیس (شامل دسته‌هایی که ادمین اضافه می‌کند)
const dbCategories = computed(() => productStore.categories || [])

// آیکون دسته‌بندی برای بج روی کارت — مثل Products.vue
const getCategoryIcon = (catSlugOrString) => {
  let slug = catSlugOrString
  if (typeof catSlugOrString === 'object' && catSlugOrString?.slug) slug = catSlugOrString.slug
  else if (typeof catSlugOrString === 'string') slug = catSlugOrString.toLowerCase().replace(/\s+/g, '-')
  const found = dbCategories.value.find(c => c.slug === slug)
  return found ? (found.icon || '◆') : '◦'
}

const currentCategory = computed(() => {
  const slug = currentSlug.value
  // حالت کالکشن: داده از /collections/:slug آمده است
  const col = collectionData.value
  if (col) {
    return {
      slug,
      title: loc(col.title) || loc(col.name) || slug,
      subtitle: loc(col.subtitle) || loc(col.name) || '',
      icon: col.icon || '✦',
      description: loc(col.description) || 'مجموعه‌ای از آثار دست‌ساز و اصیل نورمهر.',
      features: [],
      color: col.bgColor || '#c5a059',
      colorRgb: hexToRgb(col.bgColor),
    }
  }
  // حالت دسته‌بندی
  const db = dbCategories.value.find(c => c.slug === slug)
  const preset = presets[slug] || {}
  return {
    slug,
    title: loc(db?.name) || preset.title || slug,
    subtitle: preset.subtitle || loc(db?.name) || '',
    icon: db?.icon || preset.icon || '◆',
    description: loc(db?.description) || preset.description || 'مجموعه‌ای از آثار دست‌ساز و اصیل نورمهر.',
    features: preset.features || [],
    color: preset.color || '#c5a059',
    colorRgb: preset.colorRgb || '197,160,89',
  }
})

// ═══════ Search ═══════
const searchQuery = ref('')
const isSearchFocused = ref(false)
const searchInput = ref(null)

const sortOptions = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price-low', label: 'ارزان‌ترین' },
  { value: 'price-high', label: 'گران‌ترین' },
  { value: 'popular', label: 'محبوب‌ترین' }
]

const selectedSort = ref('newest')

// ⭐ جست‌وجو/مرتب‌سازی حالا سمت سرور انجام می‌شود؛ این فقط لیست صفحهٔ جاری است
const filteredProducts = computed(() => apiProducts.value)

watch(searchQuery, () => {
  if (suppressWatch) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (currentSlug.value) fetchProducts(currentSlug.value, 1)
  }, 400)
})

watch(selectedSort, () => {
  if (suppressWatch) return
  if (currentSlug.value) fetchProducts(currentSlug.value, 1)
})
const clearSearch = () => {
  searchQuery.value = ''
  searchInput.value?.focus()
}

const handleSearchShortcut = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
  }
  if (e.key === 'Escape' && isSearchFocused.value) {
    searchInput.value?.blur()
    searchQuery.value = ''
  }
}

const mouseX = ref(0)
const mouseY = ref(0)
const isLoaded = ref(false)

const handleMouseMove = (e) => {
  mouseX.value = (e.clientX / window.innerWidth) * 100
  mouseY.value = (e.clientY / window.innerHeight) * 100
}

watch(() => route.params.slug, (slug) => {
  if (!slug) return
  // تعویض کالکشن → جست‌وجو/مرتب‌سازی ریست شود (بدون درخواست اضافه)
  suppressWatch = true
  searchQuery.value = ''
  selectedSort.value = 'newest'
  nextTick(() => { suppressWatch = false })
  fetchProducts(slug, 1)
}, { immediate: false })

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('keydown', handleSearchShortcut)
  setTimeout(() => { isLoaded.value = true }, 100)
  if (!productStore.categories.length) productStore.fetchCategories()
  fetchProducts(route.params.slug)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('keydown', handleSearchShortcut)
})

const formatPrice = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const goToProduct = (target) => {
  const id = typeof target === 'string'
    ? target
    : target?.slug || target?._id || target?.id
  if (!id) return
  router.push({ name: 'ProductDetails', params: { lang: locale.value, id } })
}

const renderStars = (rating) => {
  const r = Number(rating) || 0
  const full = Math.floor(r)
  const half = r % 1 >= 0.5
  return { full, half, empty: 5 - full - (half ? 1 : 0) }
}
</script>

<template>
  <section
    class="collection-page"
    :class="{ loaded: isLoaded }"
    :style="{
      '--accent': currentCategory.color,
      '--accent-rgb': currentCategory.colorRgb,
      '--mx': mouseX + '%',
      '--my': mouseY + '%'
    }"
  >
    <!-- ═══════ Ambient Background ═══════ -->
    <div class="ambient-layer">
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="ambient-orb orb-3"></div>
      <div class="noise-overlay"></div>
    </div>

    <!-- ═══════ Hero Section ═══════ -->
    <header class="hero">
      <div class="hero-inner">
        <div class="hero-grid-lines">
          <span v-for="n in 6" :key="n"></span>
        </div>

        <nav class="breadcrumb" aria-label="breadcrumb">
          <router-link to="/">خانه</router-link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <router-link to="/products">محصولات</router-link>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" />
          </svg>
          <span class="current">{{ currentCategory.title }}</span>
        </nav>

        <div class="hero-layout">
          <div class="hero-text">
            <div class="hero-badge">
              <span class="badge-dot"></span>
              <span>{{ currentCategory.subtitle }}</span>
            </div>

            <h1 class="hero-title">
              <span class="title-line" v-for="(word, i) in currentCategory.title.split(' ')" :key="i">
                {{ word }}
              </span>
            </h1>

            <p class="hero-desc">{{ currentCategory.description }}</p>

            <!-- ⭐ بنر کمپین زمان‌دار + شمارش معکوس -->
            <div
              v-if="collectionCampaign || campaignEnded"
              class="campaign-banner"
              :class="{ ended: campaignEnded }"
              :style="{ '--cmp': campaignColor }"
            >
              <div class="cmp-head">
                <span class="cmp-dot"></span>
                <span class="cmp-name">{{ campaignTitle || currentCategory.title }}</span>
              </div>

              <CampaignCountdown
                v-if="!campaignEnded && collectionCampaign && collectionCampaign.showCountdown"
                :ends-at="collectionCampaign.endsAt"
                :starts-at="collectionCampaign.startsAt"
                :server-time="collectionCampaign.serverTime"
                :label="campaignCountdownLabel"
                :color="campaignColor"
                @finished="onCampaignFinished"
              />

              <div v-if="campaignEnded" class="cmp-ended">
                <span>{{ locale === 'fa' ? 'این کمپین به پایان رسید و تخفیف‌ها برداشته شد.' : 'This campaign has ended and discounts were removed.' }}</span>
                <router-link :to="{ name: 'Products', params: { lang: locale } }" class="cmp-link">
                  {{ locale === 'fa' ? 'مشاهده همه محصولات' : 'View all products' }}
                </router-link>
              </div>
            </div>

            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-number">{{ formatPrice(totalProducts) }}</span>
                <span class="stat-label">محصول</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-number">۱۰۰٪</span>
                <span class="stat-label">دست‌ساز</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-number">۱۸</span>
                <span class="stat-label">ماه گارانتی</span>
              </div>
            </div>

            <div class="hero-features-list">
              <div v-for="(feature, fi) in currentCategory.features" :key="fi" class="feature-item">
                <span class="feature-check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span>{{ feature }}</span>
              </div>
            </div>
          </div>

          <div class="hero-visual">
            <div class="visual-frame">
              <div class="frame-ring ring-1"></div>
              <div class="frame-ring ring-2"></div>
              <div class="frame-ring ring-3"></div>
              <div class="visual-icon">{{ currentCategory.icon }}</div>
              <div class="visual-particles">
                <span v-for="n in 12" :key="n" class="particle" :style="{ '--pi': n }"></span>
              </div>
            </div>
            <div class="visual-label">مجموعه اختصاصی نورمهر</div>
          </div>
        </div>
      </div>
    </header>

    <!-- ═══════ Products Section ═══════ -->
    <main v-if="!(campaignEnded && campaignHidden)" class="products-section">
      <div class="section-container">

        <!-- ═══════ SEARCH BAR ═══════ -->
        <div class="search-bar-wrapper" :class="{ focused: isSearchFocused, 'has-query': searchQuery.trim() }">
          <div class="search-bar">
            <div class="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>

            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              :placeholder="`جستجو در ${currentCategory.title}...`"
              class="search-input"
              @focus="isSearchFocused = true"
              @blur="isSearchFocused = false"
            />

            <!-- clear button -->
            <Transition name="fade-scale">
              <button
                v-if="searchQuery.trim()"
                class="search-clear"
                @click="clearSearch"
                title="پاک کردن"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </Transition>

            <!-- keyboard shortcut hint -->
            <div class="search-shortcut" v-if="!searchQuery.trim() && !isSearchFocused">
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>K</kbd>
            </div>

            <!-- live result count -->
            <Transition name="fade-scale">
              <div v-if="searchQuery.trim()" class="search-result-badge">
                <span>{{ formatPrice(totalProducts) }}</span> نتیجه
              </div>
            </Transition>
          </div>

          <!-- glow line -->
          <div class="search-glow-line"></div>
        </div>

        <!-- toolbar -->
        <div class="toolbar">
          <div class="toolbar-right">
            <h2 class="section-heading">
              <span class="heading-accent"></span>
              محصولات {{ currentCategory.title }}
            </h2>
            <p class="results-meta">
              نمایش <strong>{{ filteredProducts.length }}</strong> از <strong>{{ formatPrice(totalProducts) }}</strong> محصول
              <span v-if="searchQuery.trim()" class="search-hint">
                برای «<em>{{ searchQuery }}</em>»
              </span>
            </p>
          </div>

          <div class="toolbar-left">
            <div class="sort-control">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <select v-model="selectedSort">
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Grid View — کارت‌ها دقیقاً مثل صفحه محصولات -->
        <div class="products-grid">
          <article
            v-for="(product, i) in filteredProducts"
            :key="product._id"
            class="product-card"
            :style="{ '--delay': `${i * 0.05}s` }"
            @click="goToProduct(product._id)"
          >
            <div class="card-inner">
              <div class="card-image-wrapper">
                <img
                  class="card-image"
                  :src="getProductImage(product)"
                  :alt="loc(product.name)"
                  loading="lazy"
                />
                <button
                  class="wishlist-heart"
                  :class="{ active: wishlist.isInWishlist(product._id || product.id) }"
                  @click.stop.prevent="toggleWishlist(product._id || product.id)"
                  aria-label="افزودن به علاقه‌مندی‌ها"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" :fill="wishlist.isInWishlist(product._id || product.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
                <div v-if="product.discountPercent" class="discount-tag">{{ formatPrice(product.discountPercent) }}%</div>
                <div class="card-badge">
                  <span class="badge-icon">{{ getCategoryIcon(product.category?.slug || product.category) }}</span>
                  <span>{{ loc(product.category?.name || product.category) }}</span>
                </div>
              </div>

              <div class="card-content">
                <h2 class="product-title">{{ loc(product.name) }}</h2>
                <div class="title-underline"></div>

                <div class="desc-box">
                  <span class="desc-label">توضیحات</span>
                  <p class="short-desc">{{ loc(product.shortDesc) || 'بدون توضیحات' }}</p>
                </div>

                <div class="card-footer">
                  <div class="card-price-box">
                    <span v-if="getPriceInfo(product).oldPrice" class="price-old">
                      {{ formatPrice(getPriceInfo(product).oldPrice) }}
                    </span>
                    <div class="price-current-wrap">
                      <span v-if="getPriceInfo(product).hasMultipleSizes" class="price-prefix">از</span>
                      <span class="price-amount">{{ formatPrice(getPriceInfo(product).minPrice) }}</span>
                      <span class="price-currency">تومان</span>
                    </div>
                  </div>

                  <router-link
                    :to="{ name: 'ProductDetails', params: { lang: locale, id: product.slug || product._id || product.id } }"
                    class="view-btn"
                    @click.stop
                  >
                    <span class="view-text">مشاهده</span>
                    <span class="view-arrow">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  </router-link>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- ⭐ صفحه‌بندی سروری -->
        <div v-if="!productsLoading && !loadError && totalPages > 1" class="collection-pagination">
          <button type="button" class="page-nav" :disabled="page <= 1" @click="goToPage(page - 1)">قبلی</button>
          <span class="page-status">صفحه {{ formatPrice(page) }} از {{ formatPrice(totalPages) }}</span>
          <button type="button" class="page-nav" :disabled="page >= totalPages" @click="goToPage(page + 1)">بعدی</button>
        </div>

        <!-- Skeleton loading cards -->
        <div v-if="productsLoading" class="products-grid">
          <article v-for="n in 6" :key="n" class="product-card skeleton-card">
            <div class="card-inner">
              <div class="card-image-wrapper"><div class="skeleton-image skeleton-pulse"></div></div>
              <div class="card-content">
                <div class="skeleton-line skeleton-pulse" style="width:70%;height:16px;margin-bottom:8px"></div>
                <div class="skeleton-line skeleton-pulse" style="width:90%;height:11px"></div>
              </div>
            </div>
          </article>
        </div>

        <!-- Error State -->
        <div v-if="!productsLoading && loadError" class="empty-state">
          <div class="empty-visual">
            <div class="empty-circle" style="color:#ef4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.06)">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="12" cy="16.5" r="1" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <h3>دریافت محصولات با خطا مواجه شد</h3>
          <p>{{ loadError }}</p>
          <div class="empty-actions">
            <button class="empty-btn-outline" @click="fetchProducts(currentSlug)">تلاش مجدد</button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!productsLoading && !loadError && filteredProducts.length === 0" class="empty-state">
          <div class="empty-visual">
            <div class="empty-circle">
              <!-- Show different icon for search vs no products -->
              <svg v-if="searchQuery.trim()" width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M8 8l6 6M14 8l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" stroke-width="1.5"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="1.5"/>
                <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
          <h3 v-if="searchQuery.trim()">نتیجه‌ای برای «{{ searchQuery }}» یافت نشد</h3>
          <h3 v-else>محصولی یافت نشد</h3>
          <p v-if="searchQuery.trim()">عبارت دیگری را جستجو کنید یا فیلترها را تغییر دهید.</p>
          <p v-else>در حال حاضر محصولی در این دسته‌بندی موجود نیست.</p>
          <div class="empty-actions">
            <button v-if="searchQuery.trim()" class="empty-btn-outline" @click="clearSearch">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              پاک کردن جستجو
            </button>
            <router-link to="/products" class="empty-btn">مشاهده همه محصولات</router-link>
          </div>
        </div>
      </div>
    </main>

    <!-- ═══════ CTA Section ═══════ -->
    <section class="cta-section">
      <div class="section-container">
        <div class="cta-card">
          <div class="cta-bg-pattern">
            <span v-for="n in 20" :key="n" class="pattern-dot"></span>
          </div>
          <div class="cta-inner">
            <div class="cta-text">
              <span class="cta-eyebrow">سفارش اختصاصی</span>
              <h2>اثری منحصربه‌فرد برای شما بسازیم</h2>
              <p>امکان سفارش اختصاصی {{ currentCategory.title }} با طرح دلخواه، ابعاد سفارشی و بهترین متریال</p>
            </div>
            <div class="cta-action">
              <router-link to="/contact" class="cta-btn-primary">
                <span>درخواست سفارش</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </router-link>
              <a href="tel:+989132256121" class="cta-btn-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span>تماس تلفنی</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
/* ═══════════════════════════════════════
   FOUNDATION
   ═══════════════════════════════════════ */
.collection-page {
  --bg: #08090e;
  --bg-card: #0f1119;
  --bg-elevated: #151722;
  --text: #e8e6e3;
  --text-secondary: #9b99a1;
  --border: rgba(255,255,255,0.06);
  --border-hover: rgba(255,255,255,0.12);
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  direction: rtl;
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
}

.section-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 60px);
}

/* ═══════════════════════════════════════
   AMBIENT BACKGROUND
   ═══════════════════════════════════════ */
.ambient-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0;
  transition: opacity 1.5s ease;
}

.loaded .ambient-orb { opacity: 1; }

.orb-1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -100px;
  background: rgba(var(--accent-rgb), 0.08);
  animation: orbFloat 20s ease-in-out infinite;
}

.orb-2 {
  width: 500px;
  height: 500px;
  bottom: -200px;
  left: -150px;
  background: rgba(var(--accent-rgb), 0.05);
  animation: orbFloat 25s ease-in-out infinite reverse;
}

.orb-3 {
  width: 300px;
  height: 300px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(var(--accent-rgb), 0.03);
  animation: orbPulse 10s ease-in-out infinite;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

@keyframes orbPulse {
  0%, 100% { opacity: 0.03; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.06; transform: translate(-50%, -50%) scale(1.3); }
}

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 128px;
  opacity: 0.4;
}

/* ═══════════════════════════════════════
   HERO
   ═══════════════════════════════════════ */
.hero {
  position: relative;
  z-index: 1;
  padding: clamp(100px, 12vw, 160px) 0 clamp(60px, 8vw, 100px);
}

.hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 60px);
  position: relative;
}

.hero-grid-lines {
  position: absolute;
  inset: -40px 0;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  opacity: 0.04;
}

.hero-grid-lines span {
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--text), transparent);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 40px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  opacity: 0;
  animation: fadeUp 0.8s var(--ease-out) 0.1s forwards;
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb a:hover { color: var(--accent); }
.breadcrumb .current { color: var(--accent); }
.breadcrumb svg { opacity: 0.4; }

.hero-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: clamp(40px, 6vw, 80px);
  align-items: center;
}

.hero-text {
  position: relative;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px 8px 12px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  font-size: 0.82rem;
  color: var(--accent);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 24px;
  opacity: 0;
  animation: fadeUp 0.8s var(--ease-out) 0.2s forwards;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

.hero-title {
  font-size: clamp(2.8rem, 5.5vw, 4.5rem);
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 20px;
  letter-spacing: -0.02em;
}

.title-line {
  display: inline-block;
  opacity: 0;
  animation: titleReveal 1s var(--ease-out) forwards;
  background: linear-gradient(135deg, #fff 40%, var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.title-line:nth-child(1) { animation-delay: 0.3s; }
.title-line:nth-child(2) { animation-delay: 0.45s; }
.title-line:nth-child(3) { animation-delay: 0.6s; }

@keyframes titleReveal {
  from { opacity: 0; transform: translateY(30px) rotateX(20deg); }
  to { opacity: 1; transform: translateY(0) rotateX(0); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-desc {
  font-size: 1.05rem;
  line-height: 2;
  color: var(--text-secondary);
  margin: 0 0 32px;
  max-width: 520px;
  opacity: 0;
  animation: fadeUp 0.8s var(--ease-out) 0.5s forwards;
}

/* ⭐ بنر کمپین زمان‌دار */
.campaign-banner {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 18px;
  margin: 0 0 28px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--cmp, var(--accent));
  opacity: 0;
  animation: fadeUp 0.8s var(--ease-out) 0.55s forwards;
}
.campaign-banner.ended { border-style: dashed; }
.cmp-head { display: flex; align-items: center; gap: 9px; }
.cmp-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--cmp, var(--accent));
  box-shadow: 0 0 12px var(--cmp, var(--accent));
}
.cmp-name { font-size: 0.95rem; font-weight: 700; color: var(--cmp, var(--accent)); }
.cmp-ended {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 0.86rem; color: var(--text-secondary);
}
.cmp-link {
  padding: 7px 16px; border-radius: 999px; text-decoration: none;
  background: var(--cmp, var(--accent)); color: #050814;
  font-size: 0.82rem; font-weight: 600;
}
@media (max-width: 768px) {
  .campaign-banner { padding: 12px 14px; gap: 12px; }
  .cmp-name { font-size: 0.86rem; }
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  opacity: 0;
  animation: fadeUp 0.8s var(--ease-out) 0.6s forwards;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--border);
}

.hero-features-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  opacity: 0;
  animation: fadeUp 0.8s var(--ease-out) 0.7s forwards;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.feature-check {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.hero-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  opacity: 0;
  animation: fadeUp 1s var(--ease-out) 0.4s forwards;
}

.visual-frame {
  position: relative;
  width: 320px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.frame-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.ring-1 {
  width: 100%;
  height: 100%;
  animation: ringRotate 30s linear infinite;
  border-style: dashed;
}

.ring-2 {
  width: 80%;
  height: 80%;
  animation: ringRotate 20s linear infinite reverse;
}

.ring-3 {
  width: 60%;
  height: 60%;
  animation: ringRotate 15s linear infinite;
  border-color: rgba(var(--accent-rgb), 0.2);
}

@keyframes ringRotate {
  to { transform: rotate(360deg); }
}

.visual-icon {
  font-size: 5rem;
  color: var(--accent);
  text-shadow: 0 0 80px rgba(var(--accent-rgb), 0.6);
  animation: iconFloat 4s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.visual-particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  top: 50%;
  left: 50%;
  opacity: 0.3;
  animation: particleOrbit 8s linear infinite;
  animation-delay: calc(var(--pi) * -0.66s);
}

@keyframes particleOrbit {
  from {
    transform: rotate(calc(var(--pi) * 30deg)) translateX(140px) scale(0.5);
    opacity: 0;
  }
  50% { opacity: 0.6; transform: rotate(calc(var(--pi) * 30deg + 180deg)) translateX(140px) scale(1); }
  to {
    transform: rotate(calc(var(--pi) * 30deg + 360deg)) translateX(140px) scale(0.5);
    opacity: 0;
  }
}

.visual-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
  letter-spacing: 4px;
  text-transform: uppercase;
}

/* ═══════════════════════════════════════
   SEARCH BAR
   ═══════════════════════════════════════ */
.search-bar-wrapper {
  position: relative;
  margin-bottom: 32px;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border);
  transition: all 0.4s var(--ease-out);
  overflow: hidden;
}

.search-bar-wrapper.focused .search-bar {
  border-color: rgba(var(--accent-rgb), 0.4);
  background: var(--bg-elevated);
  box-shadow:
    0 0 0 4px rgba(var(--accent-rgb), 0.06),
    0 8px 32px rgba(0,0,0,0.3);
}

.search-bar-wrapper.has-query .search-bar {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color 0.3s;
}

.search-bar-wrapper.focused .search-icon {
  color: var(--accent);
}

.search-input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 0.95rem;
  font-family: inherit;
  caret-color: var(--accent);
}

.search-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
  transition: opacity 0.3s;
}

.search-bar-wrapper.focused .search-input::placeholder {
  opacity: 0.35;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s var(--ease-out);
}

.search-clear:hover {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.search-shortcut {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  pointer-events: none;
}

.search-shortcut kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 0.68rem;
  font-family: inherit;
  color: var(--text-secondary);
  line-height: 1;
}

.search-shortcut span {
  font-size: 0.65rem;
  color: var(--text-secondary);
  opacity: 0.5;
}

.search-result-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  font-size: 0.75rem;
  color: var(--accent);
  white-space: nowrap;
  flex-shrink: 0;
}

.search-result-badge span {
  font-weight: 700;
}

/* glow line under search */
.search-glow-line {
  position: absolute;
  bottom: -1px;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 2px;
  transform: translateX(-50%);
  transition: width 0.5s var(--ease-out);
}

.search-bar-wrapper.focused .search-glow-line {
  width: 60%;
}

.search-bar-wrapper.has-query .search-glow-line {
  width: 40%;
  opacity: 0.6;
}

/* transition for clear btn & badge */
.fade-scale-enter-active {
  transition: all 0.25s var(--ease-spring);
}
.fade-scale-leave-active {
  transition: all 0.2s ease;
}
.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* ═══════════════════════════════════════
   TOOLBAR
   ═══════════════════════════════════════ */
.products-section {
  position: relative;
  z-index: 1;
  padding-bottom: 80px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 36px;
  gap: 20px;
}

.section-heading {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.heading-accent {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: var(--accent);
}

.results-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.results-meta strong {
  color: var(--text);
}

.search-hint {
  margin-right: 4px;
}

.search-hint em {
  color: var(--accent);
  font-style: normal;
  font-weight: 500;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.sort-control select {
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  appearance: none;
  padding-left: 8px;
}

.sort-control select option {
  background: var(--bg-elevated);
  color: var(--text);
}

/* ═══════════════════════════════════════
   PRODUCTS GRID
   ═══════════════════════════════════════ */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: clamp(14px, 1.6vw, 22px);
}

/* ⭐ صفحه‌بندی */
.collection-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 34px 0 10px;
  flex-wrap: wrap;
}
.page-nav {
  padding: 10px 24px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #fff);
  font-family: inherit;
  font-size: 0.88rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.page-nav:hover:not(:disabled) { border-color: var(--accent); transform: translateY(-1px); }
.page-nav:disabled { opacity: 0.35; cursor: not-allowed; }
.page-status { font-size: 0.85rem; color: var(--text-secondary); }

/* ═══════════════════════════════════════
   PRODUCT CARD — دقیقاً مثل Products.vue
   ═══════════════════════════════════════ */
.product-card { position: relative; border-radius: 16px; opacity: 0; transform: translateY(30px); animation: cardReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: var(--delay); }
@keyframes cardReveal { to { opacity: 1; transform: translateY(0); } }

.card-inner { position: relative; z-index: 1; border-radius: 16px; background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98)); border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; height: 100%; transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s; }

@media (hover: hover) {
  .product-card:hover .card-inner { transform: translateY(-4px); border-color: rgba(197,160,89,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .product-card:hover .card-image { transform: scale(1.05); }
  .product-card:hover .title-underline { width: 34px; }
}

/* رسانه‌ی تصویر: نسبت ۱:۱ حفظ می‌شود ولی عکس کامل و بدون بریدگی نمایش داده می‌شود (contain) */
.card-image-wrapper {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1/1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: radial-gradient(circle at 50% 35%, rgba(197,160,89,0.06), transparent 65%);
}
.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 26px rgba(0,0,0,0.4));
  transition: transform 0.5s ease;
}

.discount-tag { position: absolute; top: 10px; left: 10px; z-index: 3; padding: 4px 9px; border-radius: 9px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; font-size: 0.7rem; font-weight: 800; box-shadow: 0 4px 14px rgba(239,68,68,0.4); }
.wishlist-heart {
  position: absolute; top: 10px; right: 10px; z-index: 4;
  width: 36px !important; height: 36px !important; border-radius: 50% !important;
  padding: 0 !important;
  background: rgba(0,0,0,0.7) !important; border: 1px solid rgba(255,255,255,0.12) !important;
  color: rgba(255,255,255,0.75) !important; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.25s ease;
}
.wishlist-heart:hover { background: rgba(239,68,68,0.2) !important; color: #ff6b6b !important; border-color: rgba(239,68,68,0.4) !important; transform: scale(1.1); filter: none !important; }
.wishlist-heart.active { color: #ef4444 !important; background: rgba(239,68,68,0.15) !important; border-color: rgba(239,68,68,0.5) !important; }
.wishlist-heart svg { display: block; }
.card-badge { position: absolute; bottom: 10px; right: 10px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9px; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.08); font-size: 0.62rem; color: #f5d78e; font-weight: 500; max-width: calc(100% - 20px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-icon { font-size: 0.7rem; flex-shrink: 0; }
.card-content {
  padding: clamp(10px, 1.2vw, 14px);
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}

.product-title {
  font-size: clamp(0.82rem, 1vw, 0.95rem);
  font-weight: 700;
  color: #f0f0f0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.title-underline {
  width: 28px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, #c5a059, transparent);
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.desc-box {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px 10px 9px;
  background: rgba(255, 255, 255, 0.02);
}

.desc-label {
  display: inline-block;
  font-size: 0.6rem;
  color: #c5a059;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.short-desc {
  font-size: clamp(0.7rem, 0.85vw, 0.78rem);
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.card-price-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.price-old {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
  line-height: 1;
}

.price-current-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1.2;
}

.price-prefix {
  font-size: 0.75rem;
  color: #c5a059;
  font-weight: 600;
}

.price-amount {
  font-size: 0.95rem;
  font-weight: 700;
  color: #facc6b;
}

.price-currency {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 11px;
  background: linear-gradient(135deg, #2bbf9e, #1a8f78);
  border: none;
  color: #fff;
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}

.view-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(43, 191, 158, 0.3);
}

.view-arrow {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  transition: transform 0.35s;
}

.view-btn:hover .view-arrow {
  transform: translateX(-3px);
}
/* ═══════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════ */
/* ── Skeleton loading ── */
@keyframes shimmer {
  0% { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
.skeleton-pulse {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 1200px 100%;
  animation: shimmer 1.4s infinite linear;
}
.skeleton-card { pointer-events: none; cursor: default; }
.skeleton-image {
  width: 100%;
  height: 100%;
  border-radius: 12px;
}
.skeleton-line { display: block; }

.empty-state {
  text-align: center;
  padding: 80px 40px;
  border-radius: var(--radius-xl);
  background: var(--bg-card);
  border: 1px solid var(--border);
  animation: fadeUp 0.6s var(--ease-out) forwards;
}

.empty-circle {
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.empty-state h3 {
  font-size: 1.4rem;
  margin: 0 0 10px;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0 0 28px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #000;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s var(--ease-out);
}

.empty-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(var(--accent-rgb), 0.4);
}

.empty-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
}

.empty-btn-outline:hover {
  border-color: rgba(239,68,68,0.4);
  color: #ef4444;
  background: rgba(239,68,68,0.05);
}

/* ═══════════════════════════════════════
   CTA SECTION
   ═══════════════════════════════════════ */
.cta-section {
  position: relative;
  z-index: 1;
  padding: 20px 0 100px;
}

.cta-card {
  position: relative;
  border-radius: var(--radius-xl);
  background: var(--bg-card);
  border: 1px solid var(--border);
  overflow: hidden;
}

.cta-bg-pattern {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 0;
  opacity: 0.03;
  pointer-events: none;
}

.pattern-dot {
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--accent);
  place-self: center;
  width: 4px;
}

.cta-inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: clamp(36px, 5vw, 60px);
}

.cta-eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
  padding: 4px 14px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
}

.cta-text h2 {
  font-size: clamp(1.4rem, 2.5vw, 1.8rem);
  font-weight: 700;
  margin: 0 0 10px;
  line-height: 1.4;
}

.cta-text p {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.8;
}

.cta-action {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.cta-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #000;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.35s var(--ease-out);
  white-space: nowrap;
}

.cta-btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(var(--accent-rgb), 0.4);
}

.cta-btn-primary svg {
  transition: transform 0.3s var(--ease-out);
}

.cta-btn-primary:hover svg {
  transform: translateX(-4px);
}

.cta-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.88rem;
  transition: all 0.3s var(--ease-out);
  white-space: nowrap;
}

.cta-btn-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.05);
}

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (max-width: 1024px) {
  .hero-layout {
    grid-template-columns: 1fr;
    text-align: center;
  }

.hero-desc { max-width: 100%; }
  .hero-stats { justify-content: center; }

  .hero-features-list {
    max-width: 400px;
    margin: 0 auto;
    text-align: right;
  }

  .hero-visual { order: -1; }

  .visual-frame {
    width: 240px;
    height: 240px;
  }

  .visual-icon { font-size: 3.5rem; }

  .particle { animation-name: particleOrbitSmall; }

  @keyframes particleOrbitSmall {
    from {
      transform: rotate(calc(var(--pi) * 30deg)) translateX(100px) scale(0.5);
      opacity: 0;
    }
    50% { opacity: 0.6; transform: rotate(calc(var(--pi) * 30deg + 180deg)) translateX(100px) scale(1); }
    to {
      transform: rotate(calc(var(--pi) * 30deg + 360deg)) translateX(100px) scale(0.5);
      opacity: 0;
    }
  }

  .cta-inner {
    flex-direction: column;
    text-align: center;
  }

  .cta-action { width: 100%; }

  .cta-btn-primary,
  .cta-btn-secondary {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 100px 0 50px;
  }

  .breadcrumb { margin-bottom: 24px; }
  .hero-title { font-size: 2.2rem; }
  .hero-stats { gap: 16px; }
  .stat-number { font-size: 1.3rem; }
  .hero-features-list { grid-template-columns: 1fr; }
  .hero-grid-lines { display: none; }

  .search-bar {
    height: 50px;
    padding: 0 16px;
    gap: 10px;
  }

  .search-shortcut { display: none; }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-left {
    width: 100%;
    justify-content: space-between;
  }

  /* موبایل: دو ستون — دقیقاً مثل صفحه محصولات */
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .hero-title { font-size: 1.8rem; }
  .hero-desc { font-size: 0.92rem; }

  .visual-frame {
    width: 180px;
    height: 180px;
  }

  .visual-icon { font-size: 2.5rem; }

  .products-grid { gap: 10px; }

  .empty-actions {
    flex-direction: column;
  }

  .empty-btn,
  .empty-btn-outline {
    width: 100%;
    justify-content: center;
  }
}

/* ═══════════════════════════════════════
   ACCESSIBILITY
   ═══════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

.cta-btn-primary:focus-visible,
.search-input:focus-visible,
.search-clear:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* استایل موبایل کارت — مثل Products.vue */
@media (max-width: 768px) {
  .card-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .card-price-box {
    width: 100%;
  }
  
  .view-btn {
    justify-content: center;
    width: 100%;
  }
  
  .product-title {
    font-size: 0.82rem;
  }
  
  .short-desc {
    font-size: 0.7rem;
  }
  
  .price-amount {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .card-content {
    padding: 9px 10px 11px;
    gap: 6px;
  }
  
  .view-btn {
    justify-content: center;
    width: 100%;
  }
}

/* موبایل/تاچ: انیمیشن ظاهرشدن کارت‌ها غیرفعال — مثل Products.vue */
@media (hover: none) and (pointer: coarse) {
  .product-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>