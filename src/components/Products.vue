<template>
  <section class="products-page" id="products" ref="sectionRef">
    <div class="bg-effects">
      <div class="bg-orb bg-orb-1"></div>
      <div class="bg-orb bg-orb-2"></div>
      <div class="bg-orb bg-orb-3"></div>
      <div class="bg-grid"></div>
      <div class="bg-vignette"></div>
    </div>

    <div class="products-header" :class="{ visible: headerVisible }">
      <div class="header-badge">
        <span class="badge-dot"></span>
        <span>{{ $t('products_badge') }}</span>
        <span class="badge-dot"></span>
      </div>
      <h1>{{ $t('products_title') }}</h1>
      <p class="subtitle">
        <span class="subtitle-inner">{{ $t('products_subtitle') }}</span>
      </p>
    </div>

    <div class="search-bar" :class="{ visible: filterVisible }">
      <div class="search-input-wrap">
        <svg class="search-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input v-model="searchQuery" type="text" :placeholder="$t('products_search_placeholder')" />
      </div>

      <div class="sort-select">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M6 12h12M10 18h4"/>
        </svg>
        <select v-model="sortBy">
          <option value="default">{{ $t('products_sort_default') }}</option>
          <option value="cheap">{{ $t('products_sort_cheap') }}</option>
          <option value="expensive">{{ $t('products_sort_expensive') }}</option>
          <option value="newest">{{ $t('products_sort_newest') }}</option>
        </select>
      </div>
    </div>

    <div class="products-layout">

      <Teleport to="body" :disabled="!isMobile">
        <transition name="fade">
          <div v-if="isMobile && mobileFilterOpen" class="filter-overlay-global" @click="mobileFilterOpen = false"></div>
        </transition>

        <aside class="filter-drawer" :class="{ open: mobileFilterOpen, 'is-mobile': isMobile }">
          <div class="sidebar-head">
            <span class="sidebar-title">{{ $t('products_advanced_search') }}</span>
            <span class="sidebar-diamond">◆</span>
            <button class="sidebar-close" @click="mobileFilterOpen = false" :aria-label="$t('products_close')">✕</button>
          </div>

          <div class="filter-group">
            <div class="filter-group-head"><span>{{ $t('products_categories') }}</span></div>
            <button
              v-for="cat in categories"
              :key="cat.value"
              :class="['cat-pill', { active: selectedCategory === cat.value }]"
              @click="selectedCategory = cat.value"
            >
              <span>{{ cat.label }}</span>
              <span v-if="cat.value !== 'all'" class="cat-count">{{ getCount(cat.value) }}</span>
            </button>
          </div>

          <div class="filter-divider"><span>◆</span></div>

          <div class="filter-group">
            <label class="stock-toggle">
              <span class="stock-label">{{ $t('products_only_in_stock') }}</span>
              <span class="switch">
                <input type="checkbox" v-model="onlyInStock" />
                <span class="slider"></span>
              </span>
            </label>
          </div>

          <button class="reset-btn" @click="resetFilters">{{ $t('products_clear_filters') }}</button>
        </aside>
      </Teleport>

      <div class="products-area">
        <div class="results-bar">
          <span class="results-count">{{ formatNumber(filteredProducts.length) }} {{ $t('products_found') }}</span>
          <button class="mobile-filter-toggle" @click="mobileFilterOpen = true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
            {{ $t('products_filters') }}
          </button>
        </div>

        <div v-if="isLoading" class="products-grid-inner">
          <div v-for="n in 8" :key="n" class="product-card skeleton-card">
            <div class="card-inner">
              <div class="card-image-wrapper"><div class="skeleton-image skeleton-pulse"></div></div>
              <div class="card-content">
                <div class="skeleton-line skeleton-pulse" style="width:70%;height:16px;margin-bottom:8px"></div>
                <div class="skeleton-line skeleton-pulse" style="width:90%;height:11px"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="products-grid-inner">
          <article
            v-for="(product, i) in paginatedProducts"
            :key="product._id || product.id"
            class="product-card"
            :style="{ '--delay': `${i * 0.05}s` }"
          >
            <div class="card-inner">
              <div class="card-image-wrapper">
                <img
                  class="card-image"
                  :src="getProductImage(product)"
                  :alt="getLocalizedText(product.name)"
                  loading="lazy"
                />
                <button
                  class="wishlist-heart"
                  :class="{ active: wishlist.isInWishlist(product._id || product.id) }"
                  @click.stop.prevent="toggleWishlist(product._id || product.id)"
                  :aria-label="$t('wishlist_toggle')"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" :fill="wishlist.isInWishlist(product._id || product.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
                <div v-if="product.discountPercent" class="discount-tag">{{ formatNumber(product.discountPercent) }}%</div>
                <div class="card-badge">
                  <span class="badge-icon">{{ getCategoryIcon(product.category?.slug || product.category) }}</span>
                  <span>{{ getLocalizedText(product.category?.name || product.category) }}</span>
                </div>
              </div>

              <div class="card-content">
                <h2 class="product-title">{{ getLocalizedText(product.name) }}</h2>
                <div class="title-underline"></div>

                <div class="desc-box">
                  <span class="desc-label">{{ $t('products_description') }}</span>
                  <p class="short-desc">{{ getLocalizedText(product.shortDesc) || $t('products_no_description') }}</p>
                </div>

                <div class="card-footer">
                  <router-link :to="{ name: 'ProductDetails', params: { lang: locale, id: product._id || product.id || product.slug } }" class="view-btn" @click.stop>
                    <span class="view-text">{{ $t('products_view') }}</span>
                    <span class="view-arrow">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </router-link>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div v-if="totalPages > 1" class="products-pagination">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span v-for="p in totalPages" :key="p" @click="changePage(p)" :class="{ active: p === currentPage }">{{ p }}</span>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>

        <transition name="fade">
          <div v-if="!isLoading && filteredProducts.length === 0" class="empty-state">
            <div class="empty-icon">✧</div>
            <p>{{ $t('products_no_products_found') }}</p>
            <button class="reset-btn inline" @click="resetFilters">{{ $t('products_clear_filters') }}</button>
          </div>
        </transition>
      </div>
    </div>

    <div class="section-bottom-fade"></div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProductStore } from '../stores/products'
import { useWishlist } from '../stores/wishlist'
import { useAuth } from '../stores/auth'
import { useRouter } from 'vue-router'
import { getImageUrl } from '../utils/imageUrl'

const { t, locale } = useI18n()
const productStore = useProductStore()
const wishlist = useWishlist()
const auth = useAuth()
const router = useRouter()

// تغییر وضعیت علاقه‌مندی با بررسی لاگین
const toggleWishlist = async (productId) => {
  if (!auth.isAuthenticated) {
    router.push({ name: 'Login', params: { lang: locale.value }, query: { redirect: route.fullPath } })
    return
  }
  await wishlist.toggle(productId)
}

const route = useRoute()
const categories = computed(() => [
  { value: 'all', label: t('products_all_categories'), icon: '◦' },
  ...productStore.categories.map(c => ({ value: c.slug, label: getLocalizedText(c.name), icon: c.icon || '◆' }))
])

const products = computed(() => productStore.products)
const isLoading = computed(() => productStore.isLoading)

const selectedCategory = ref('all')

watch(
  () => route.query.category,
  (newCategory) => {
    if (newCategory) {
      selectedCategory.value = newCategory
    } else {
      selectedCategory.value = 'all'
    }
  },
  { immediate: true }
)

const searchQuery = ref('')
const onlyInStock = ref(false)
const sortBy = ref('default')
const mobileFilterOpen = ref(false)
const isMobile = ref(false)

const currentPage = ref(1)
const perPage = 20

const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 860
  if (!isMobile.value) mobileFilterOpen.value = false
}

const headerVisible = ref(false)
const filterVisible = ref(false)
const sectionRef = ref(null)

const formatNumber = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[locale.value] || value.fa || ''
  }
  return ''
}

const catSlugOf = (p) =>
  p.category?.slug || (typeof p.category === 'string' ? p.category.toLowerCase().replace(/\s+/g, '-') : null)

const isInStock = (p) => {
  if (typeof p.inStock === 'boolean') return p.inStock
  if (typeof p.stock === 'number') return p.stock > 0
  if (typeof p.countInStock === 'number') return p.countInStock > 0
  return true
}

const filteredProducts = computed(() => {
  let list = [...products.value]

  if (selectedCategory.value !== 'all') {
    list = list.filter(p => catSlugOf(p) === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(p =>
      (getLocalizedText(p.name) || '').toLowerCase().includes(q) ||
      (getLocalizedText(p.shortDesc) || '').toLowerCase().includes(q)
    )
  }
  if (onlyInStock.value) {
    list = list.filter(isInStock)
  }

  if (sortBy.value === 'cheap') list.sort((a, b) => Number(a.price) - Number(b.price))
  else if (sortBy.value === 'expensive') list.sort((a, b) => Number(b.price) - Number(a.price))
  else if (sortBy.value === 'newest') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  return list
})

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return filteredProducts.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredProducts.value.length / perPage)
})

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    const grid = document.querySelector('.products-grid-inner')
    if (grid) {
      window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' })
    }
  }
}

watch([searchQuery, selectedCategory, onlyInStock, sortBy], () => {
  currentPage.value = 1
})

const getCount = (catValue) => {
  if (catValue === 'all') return products.value.length
  return products.value.filter(p => catSlugOf(p) === catValue).length
}

const getCategoryIcon = (catSlugOrString) => {
  let slug = catSlugOrString
  if (typeof catSlugOrString === 'object' && catSlugOrString?.slug) slug = catSlugOrString.slug
  else if (typeof catSlugOrString === 'string') slug = catSlugOrString.toLowerCase().replace(/\s+/g, '-')
  const found = categories.value.find(c => c.value === slug)
  return found ? found.icon : '◦'
}

const resetFilters = () => {
  selectedCategory.value = 'all'
  searchQuery.value = ''
  onlyInStock.value = false
  sortBy.value = 'default'
  currentPage.value = 1
}

const getProductImage = (product) => getImageUrl(product.mainImage || product.image)

watch(mobileFilterOpen, (open) => {
  document.body.style.overflow = (open && isMobile.value) ? 'hidden' : ''
})

onMounted(async () => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  await productStore.fetchProducts()
  if (!productStore.categories.length) productStore.fetchCategories()
  setTimeout(() => { headerVisible.value = true }, 200)
  setTimeout(() => { filterVisible.value = true }, 450)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<style scoped>
.products-page *, .products-page *::before, .products-page *::after { box-sizing: border-box; }

.products-page {
  min-height: 100vh;
  padding: clamp(40px, 6vw, 80px) clamp(12px, 4vw, 48px) clamp(60px, 8vw, 100px);
  background: #040609;
  color: #fff;
  position: relative;
  overflow-x: hidden;
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
}

.bg-effects { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.bg-orb { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.3; animation: orbFloat 25s ease-in-out infinite; }
.bg-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(197,160,89,0.4), transparent 70%); top: -10%; right: -5%; }
.bg-orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(56,189,248,0.2), transparent 70%); bottom: 10%; left: -8%; animation-delay: -8s; }
.bg-orb-3 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%); top: 50%; left: 40%; animation-delay: -16s; }
@keyframes orbFloat { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(30px,-40px) scale(1.1); } 50% { transform: translate(-20px,30px) scale(0.95); } 75% { transform: translate(40px,20px) scale(1.05); } }
.bg-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px); background-size: 80px 80px; mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%); }
.bg-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 40%, rgba(4,6,9,0.8) 100%); }

.products-header { text-align: center; margin-bottom: clamp(20px, 3vw, 32px); position: relative; z-index: 2; }
.products-header.visible .header-badge, .products-header.visible .subtitle-inner { opacity: 1; transform: translateY(0); }
.header-badge { display: inline-flex; align-items: center; gap: 10px; padding: 8px 22px; border-radius: 999px; background: rgba(197,160,89,0.08); border: 1px solid rgba(197,160,89,0.2); font-size: clamp(0.6rem,1.5vw,0.7rem); letter-spacing: 4px; color: #c5a059; text-transform: uppercase; margin-bottom: clamp(16px,2.5vw,24px); opacity: 0; transform: translateY(-20px); transition: all 0.8s cubic-bezier(0.16,1,0.3,1); transition-delay: 0.1s; }
.badge-dot { width: 4px; height: 4px; border-radius: 50%; background: #c5a059; animation: dotPulse 2s ease-in-out infinite; }
@keyframes dotPulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }
.products-header h1 { font-size: clamp(1.7rem, 4vw, 3rem); font-weight: 800; line-height: 1.15; margin: 0; background: linear-gradient(135deg, #fff 30%, #c5a059 70%, #fff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: #c5a059; }
.subtitle { margin-top: 14px; overflow: hidden; }
.subtitle-inner { display: inline-block; max-width: 600px; font-size: clamp(0.82rem,2vw,0.95rem); color: rgba(255,255,255,0.5); line-height: 1.8; opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.16,1,0.3,1); transition-delay: 0.5s; }

.search-bar { position: relative; z-index: 2; max-width: 1400px; margin: 0 auto clamp(20px,3vw,28px); display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 8px; backdrop-filter: blur(20px); opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.16,1,0.3,1); }
.search-bar.visible { opacity: 1; transform: translateY(0); }
.search-input-wrap { flex: 1; display: flex; align-items: center; gap: 10px; padding: 0 14px; min-width: 0; }
.search-ico { color: rgba(255,255,255,0.4); flex-shrink: 0; }
.search-input-wrap input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #fff; font-size: 0.9rem; font-family: inherit; padding: 10px 0; }
.search-input-wrap input::placeholder { color: rgba(255,255,255,0.35); }
.sort-select { display: flex; align-items: center; gap: 8px; padding: 0 14px; flex-shrink: 0; border-inline-end: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }
.sort-select select { background: transparent; border: none; outline: none; color: #fff; font-family: inherit; font-size: 0.85rem; padding: 10px 4px; cursor: pointer; }
.sort-select select option { background: #0a0d16; color: #fff; }

.products-layout { position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: clamp(16px, 2vw, 28px); align-items: start; }
.products-area { min-width: 0; grid-column: 2; }

.filter-drawer {
  grid-column: 1; position: sticky; top: 100px; align-self: start;
  background: linear-gradient(165deg, rgba(18,22,36,0.85), rgba(8,10,18,0.92));
  border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 18px;
  backdrop-filter: blur(20px); display: flex; flex-direction: column; gap: 16px;
  max-height: calc(100vh - 120px); overflow-y: auto;
}
.filter-drawer .sidebar-close { display: none; }
.sidebar-head { display: flex; align-items: center; gap: 8px; justify-content: center; padding-bottom: 6px; }
.sidebar-title { font-weight: 700; font-size: 0.95rem; }
.sidebar-diamond { color: #c5a059; font-size: 0.6rem; animation: spin 7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.filter-group { display: flex; flex-direction: column; gap: 8px; }
.filter-group-head { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.85); margin-bottom: 2px; }
.cat-pill { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.65); font-family: inherit; font-size: 0.82rem; cursor: pointer; transition: all 0.3s ease; text-align: start; }
.cat-pill:hover { background: rgba(255,255,255,0.06); color: #fff; }
.cat-pill.active { background: linear-gradient(135deg, rgba(197,160,89,0.25), rgba(197,160,89,0.1)); border-color: rgba(197,160,89,0.4); color: #f5d78e; }
.cat-count { font-size: 0.68rem; padding: 1px 7px; border-radius: 999px; background: rgba(255,255,255,0.08); flex-shrink: 0; }
.cat-pill.active .cat-count { background: rgba(197,160,89,0.3); }
.filter-divider { display: flex; align-items: center; justify-content: center; }
.filter-divider span { color: rgba(197,160,89,0.5); font-size: 0.55rem; padding: 0 10px; }
.filter-divider::before, .filter-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); }
.stock-toggle { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.stock-label { font-size: 0.82rem; color: rgba(255,255,255,0.85); }
.switch { position: relative; width: 42px; height: 22px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: rgba(255,255,255,0.12); border-radius: 999px; transition: 0.3s; }
.slider::before { content: ''; position: absolute; width: 16px; height: 16px; right: 3px; top: 3px; background: #fff; border-radius: 50%; transition: 0.3s; }
.switch input:checked + .slider { background: #2bbf9e; }
.switch input:checked + .slider::before { transform: translateX(-20px); }

.results-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
.results-count { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
.mobile-filter-toggle { display: none; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: rgba(197,160,89,0.12); border: 1px solid rgba(197,160,89,0.25); color: #f5d78e; font-family: inherit; font-size: 0.8rem; cursor: pointer; flex-shrink: 0; }

.products-grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: clamp(14px, 1.6vw, 22px); }

.product-card { position: relative; border-radius: 16px; opacity: 0; transform: translateY(30px); animation: cardReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: var(--delay); }
@keyframes cardReveal { to { opacity: 1; transform: translateY(0); } }

.card-inner { position: relative; z-index: 1; border-radius: 16px; background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98)); border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; height: 100%; transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s; }

@media (hover: hover) {
  .product-card:hover .card-inner { transform: translateY(-6px); border-color: rgba(197,160,89,0.15); box-shadow: 0 18px 50px rgba(0,0,0,0.5), 0 0 30px rgba(197,160,89,0.05); }
  .product-card:hover .card-image { transform: scale(1.08); }
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
  background: rgba(0,0,0,0.5) !important; border: 1px solid rgba(255,255,255,0.12) !important;
  color: rgba(255,255,255,0.75) !important; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.25s ease; backdrop-filter: blur(6px);
}
.wishlist-heart:hover { background: rgba(239,68,68,0.2) !important; color: #ff6b6b !important; border-color: rgba(239,68,68,0.4) !important; transform: scale(1.1); filter: none !important; }
.wishlist-heart.active { color: #ef4444 !important; background: rgba(239,68,68,0.15) !important; border-color: rgba(239,68,68,0.5) !important; }
.wishlist-heart svg { display: block; }.card-badge { position: absolute; bottom: 10px; right: 10px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9px; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); font-size: 0.62rem; color: #f5d78e; font-weight: 500; max-width: calc(100% - 20px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-icon { font-size: 0.7rem; flex-shrink: 0; }

.card-content { padding: clamp(10px,1.2vw,14px); display: flex; flex-direction: column; gap: 7px; flex: 1; }
.product-title { font-size: clamp(0.82rem,1vw,0.95rem); font-weight: 700; color: #f0f0f0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.title-underline { width: 28px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, #c5a059, transparent); transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }

.desc-box { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 10px 9px; background: rgba(255,255,255,0.02); }
.desc-label { display: inline-block; font-size: 0.6rem; color: #c5a059; letter-spacing: 1px; margin-bottom: 4px; }
.short-desc { font-size: clamp(0.7rem,0.85vw,0.78rem); color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.card-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }

.view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 11px; background: linear-gradient(135deg, #2bbf9e, #1a8f78); border: none; color: #fff; text-decoration: none; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.35s cubic-bezier(0.16,1,0.3,1); flex-shrink: 0; }
.view-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(43,191,158,0.3); }
.view-arrow { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.18); transition: transform 0.35s; }
.view-btn:hover .view-arrow { transform: translateX(-3px); }

.products-pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 50px; flex-wrap: wrap; }
.products-pagination button, .products-pagination span { min-width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.8); color: #fff; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; padding: 0 10px; }
.products-pagination span.active { background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; border-color: transparent; }
.products-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 3rem; color: rgba(197,160,89,0.3); margin-bottom: 12px; animation: emptyPulse 2s ease-in-out infinite; }
@keyframes emptyPulse { 0%,100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.1); opacity: 0.6; } }
.empty-state p { color: rgba(255,255,255,0.4); }
.reset-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); padding: 10px; border-radius: 10px; font-family: inherit; font-size: 0.8rem; cursor: pointer; transition: all 0.25s; width: 100%; }
.reset-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.reset-btn.inline { margin-top: 16px; display: inline-block; width: auto; padding: 10px 20px; }

.section-bottom-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to bottom, transparent, rgba(4,6,9,1)); pointer-events: none; z-index: 1; }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1100px) {
  .products-layout { grid-template-columns: 230px minmax(0, 1fr); }
  .products-grid-inner { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
}

@media (max-width: 860px) {
  .products-layout { display: block; }
  .products-area { width: 100%; grid-column: auto; }
  .mobile-filter-toggle { display: inline-flex; }

  .filter-drawer.is-mobile {
    grid-column: auto !important;
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    left: auto !important;
    width: 300px !important;
    max-width: 85vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
    border-radius: 0 !important;
    z-index: 100000 !important;
    transform: translateX(100%) !important;
    transition: transform 0.4s cubic-bezier(0.4,0,0.2,1) !important;
    background: linear-gradient(165deg, rgba(18,22,36,0.98), rgba(8,10,18,0.99)) !important;
  }
  .filter-drawer.is-mobile.open { transform: translateX(0) !important; }
  .filter-drawer.is-mobile .sidebar-close {
    display: block !important;
    margin-right: auto !important;
    background: transparent !important;
    color: rgba(255,255,255,0.8) !important;
    border: none !important;
    padding: 4px !important;
    cursor: pointer !important;
    font-size: 1.2rem !important;
  }
  .filter-drawer.is-mobile .cat-pill,
  .filter-drawer.is-mobile .apply-btn,
  .filter-drawer.is-mobile .reset-btn {
    width: 100% !important;
  }
}

@media (max-width: 768px) {
  .search-bar { flex-direction: column; align-items: stretch; gap: 8px; }
  .sort-select { border-right: none; border-top: 1px solid rgba(255,255,255,0.08); padding: 6px 14px 0; justify-content: space-between; }
  .products-grid-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .products-pagination button, .products-pagination span { min-width: 32px; height: 32px; font-size: 0.8rem; }
}

@media (max-width: 480px) {
  .products-header h1 { font-size: 1.5rem; }
  .products-grid-inner { gap: 10px; }
  .card-content { padding: 9px 10px 11px; gap: 6px; }
  .view-btn { justify-content: center; width: 100%; }
}


/* ═══════ بهینه‌سازی موبایل: رفع باگ سفید شدن و پرش اسکرول ═══════ */
@media (max-width: 860px) {
  .bg-orb { display: none !important; }
  .bg-grid { display: none !important; }

  .search-bar {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(12, 15, 24, 0.95) !important;
  }
  .card-badge {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: rgba(0, 0, 0, 0.72) !important;
  }
  .filter-drawer.is-mobile {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}

@media (hover: none) and (pointer: coarse) {
  .product-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .badge-dot,
  .sidebar-diamond,
  .empty-icon {
    animation: none !important;
  }
}
</style>
