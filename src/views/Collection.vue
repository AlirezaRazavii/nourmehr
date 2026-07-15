<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { getImageUrl } from '../utils/imageUrl'
import { useCart } from '../stores/cart'
import { useProductStore } from '../stores/products'

const route = useRoute()
const router = useRouter()
const cartStore = useCart()
const productStore = useProductStore()

const handleAddToCart = async (product) => {
  if (!product?._id) return
  if ((product.stock ?? 0) <= 0) return // محصول ناموجود
  // اگر کاربر لاگین نباشد، اینترسپتور axios به /login هدایت می‌کند
  await cartStore.addToCart(product._id, 1, null)
}


const apiProducts = ref([])
const productsLoading = ref(false)
const loadError = ref('')

const fetchProducts = async (slug) => {
  productsLoading.value = true
  loadError.value = ''
  try {
    const res = await api.get(`/products?category=${slug}&limit=50`)
    apiProducts.value = res.data.data || []
  } catch (e) {
    console.error('[Collection] خطا در دریافت محصولات:', e)
    apiProducts.value = []
    loadError.value = e.response?.data?.message || e.message || 'خطا در برقراری با سرور'
  } finally {
    productsLoading.value = false
  }
}

const currentSlug = computed(() => route.params.slug)
// دسته‌بندی‌های واقعی از دیتابیس (شامل دسته‌هایی که ادمین اضافه می‌کند)
const dbCategories = computed(() => productStore.categories || [])
const tabCategories = computed(() => dbCategories.value.map(c => ({ slug: c.slug, title: c.name, icon: c.icon || '◆' })))

const currentCategory = computed(() => {
  const slug = currentSlug.value
  const db = dbCategories.value.find(c => c.slug === slug)
  const preset = presets[slug] || {}
  return {
    slug,
    title: db?.name || preset.title || slug,
    subtitle: preset.subtitle || db?.name || '',
    icon: db?.icon || preset.icon || '◆',
    description: db?.description || preset.description || 'مجموعه‌ای از آثار دست‌ساز و اصیل نورمهر.',
    features: preset.features || [],
    color: preset.color || '#c5a059',
    colorRgb: preset.colorRgb || '197,160,89',
  }
})

// ═══════ Search ═══════
const searchQuery = ref('')
const isSearchFocused = ref(false)
const searchInput = ref(null)

const filteredProducts = computed(() => {
  let products = apiProducts.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    products = products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.shortDesc || '').toLowerCase().includes(q)
    )
  }

  return products
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

const sortOptions = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price-low', label: 'ارزان‌ترین' },
  { value: 'price-high', label: 'گران‌ترین' },
  { value: 'popular', label: 'محبوب‌ترین' }
]

const selectedSort = ref('newest')
const viewMode = ref('grid')
const mouseX = ref(0)
const mouseY = ref(0)
const isLoaded = ref(false)
const activeCardIndex = ref(-1)

const handleMouseMove = (e) => {
  mouseX.value = (e.clientX / window.innerWidth) * 100
  mouseY.value = (e.clientY / window.innerHeight) * 100
}

watch(() => route.params.slug, (slug) => {
  if (slug) fetchProducts(slug)
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

const formatPrice = (n) => Number(n || 0).toLocaleString('fa-IR')

const goToProduct = (id) => {
  if (!id) return
  router.push(`/product/${id}`)
}

const goToCategory = (slug) => {
  router.push(`/collection/${slug}`)
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

            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-number">{{ filteredProducts.length }}</span>
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

    <!-- ═══════ Category Tabs ═══════ -->
    <div class="tabs-wrapper">
      <div class="tabs-container">
        <div class="tabs-track">
          <button
            v-for="cat in tabCategories"
            :key="cat.slug"
            class="tab-item"
            :class="{ active: currentSlug === cat.slug }"
            @click="goToCategory(cat.slug)"
          >
            <span class="tab-icon">{{ cat.icon }}</span>
            <span class="tab-text">{{ cat.title }}</span>
            <span class="tab-count">{{ cat.slug === currentSlug ? apiProducts.length : '' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ Products Section ═══════ -->
    <main class="products-section">
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
                <span>{{ filteredProducts.length }}</span> نتیجه
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
              نمایش <strong>{{ filteredProducts.length }}</strong> محصول
              <span v-if="searchQuery.trim()" class="search-hint">
                برای «<em>{{ searchQuery }}</em>»
              </span>
            </p>
          </div>

          <div class="toolbar-left">
            <div class="view-toggle">
              <button
                :class="{ active: viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                aria-label="نمایش شبکه‌ای"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
              <button
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
                aria-label="نمایش لیستی"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

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

        <!-- Grid View -->
        <div class="products-grid" :class="{ 'list-mode': viewMode === 'list' }">
          <article
            v-for="(product, i) in filteredProducts"
            :key="product._id"
            class="product-card"
            :style="{ '--i': i }"
            @click="goToProduct(product._id)"
            @mouseenter="activeCardIndex = i"
            @mouseleave="activeCardIndex = -1"
          >
            <div v-if="product.discountPercent" class="ribbon">
              <span>{{ product.discountPercent }}٪ تخفیف</span>
            </div>

            <div class="card-visual">
              <div class="visual-bg"></div>
              <div class="card-img-wrap">
                <img :src="getImageUrl(product.mainImage || product.image)" :alt="product.name" loading="lazy" />
              </div>
            </div>

            <div class="card-body">
              <div class="card-meta">
                <span class="meta-cat">{{ product.category?.name || product.category }}</span>
              </div>

              <h3 class="card-title">{{ product.name }}</h3>
              <p class="card-desc">{{ product.shortDesc }}</p>

              <div class="card-bottom">
                <div class="price-group">
                  <span v-if="product.oldPrice" class="price-old">{{ formatPrice(product.oldPrice) }}</span>
                  <span class="price-current">{{ formatPrice(product.finalPrice ?? product.price) }}<small> تومان</small></span>
                </div>
                <button
                  class="add-cart-btn"
                  :disabled="(product.stock ?? 0) <= 0"
                  :style="(product.stock ?? 0) <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
                  @click.stop="handleAddToCart(product)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>{{ (product.stock ?? 0) > 0 ? 'افزودن' : 'ناموجود' }}</span>
                </button>
              </div>
            </div>
          </article>
        </div>

        <!-- Skeleton loading cards -->
        <div v-if="productsLoading" class="products-grid">
          <article v-for="n in 6" :key="n" class="product-card skeleton-card">
            <div class="card-visual">
              <div class="skeleton-image skeleton-pulse"></div>
            </div>
            <div class="card-body">
              <div class="skeleton-line skeleton-pulse" style="width:60%;height:16px;margin-bottom:10px;border-radius:4px"></div>
              <div class="skeleton-line skeleton-pulse" style="width:90%;height:12px;margin-bottom:6px;border-radius:4px"></div>
              <div class="skeleton-line skeleton-pulse" style="width:45%;height:12px;border-radius:4px"></div>
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
              <a href="tel:+989123456789" class="cta-btn-secondary">
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
   CATEGORY TABS
   ═══════════════════════════════════════ */
.tabs-wrapper {
  position: relative;
  z-index: 5;
  padding: 0 clamp(20px, 4vw, 60px);
  margin-bottom: 60px;
}

.tabs-container {
  max-width: 1280px;
  margin: 0 auto;
}

.tabs-track {
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs-track::-webkit-scrollbar { display: none; }

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: calc(var(--radius-lg) - 4px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.35s var(--ease-out);
  white-space: nowrap;
  position: relative;
}

.tab-item:hover {
  color: var(--text);
  background: rgba(255,255,255,0.03);
}

.tab-item.active {
  background: rgba(var(--accent-rgb), 0.1);
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
  font-weight: 600;
}

.tab-icon {
  font-size: 1.15rem;
}

.tab-count {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
}

.tab-item.active .tab-count {
  background: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
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

.view-toggle {
  display: flex;
  padding: 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.view-toggle button {
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.view-toggle button.active {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.products-grid.list-mode {
  grid-template-columns: 1fr;
}

.products-grid.list-mode .product-card {
  display: grid;
  grid-template-columns: 280px 1fr;
}

.products-grid.list-mode .card-visual {
  height: 100%;
  min-height: 220px;
}

/* ═══════════════════════════════════════
   PRODUCT CARD
   ═══════════════════════════════════════ */
.product-card {
  position: relative;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border);
  overflow: hidden;
  cursor: pointer;
  opacity: 0;
  transform: translateY(40px);
  animation: cardReveal 0.7s var(--ease-out) forwards;
  animation-delay: calc(var(--i) * 0.12s);
  transition: transform 0.5s var(--ease-out), border-color 0.3s, box-shadow 0.5s var(--ease-out);
}

@keyframes cardReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.product-card:hover {
  transform: translateY(-8px);
  border-color: rgba(var(--accent-rgb), 0.3);
  box-shadow:
    0 30px 60px -12px rgba(0,0,0,0.5),
    0 0 0 1px rgba(var(--accent-rgb), 0.1),
    0 0 80px -20px rgba(var(--accent-rgb), 0.15);
}

.ribbon {
  position: absolute;
  top: 16px;
  right: -8px;
  z-index: 3;
}

.ribbon span {
  display: block;
  padding: 6px 16px 6px 12px;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 6px 0 0 6px;
  box-shadow: 0 4px 20px rgba(239,68,68,0.4);
  position: relative;
}

.ribbon span::after {
  content: '';
  position: absolute;
  top: 100%;
  right: 0;
  border: 4px solid transparent;
  border-top-color: #7f1d1d;
  border-right-color: #7f1d1d;
}

.card-visual {
  position: relative;
  height: 260px;
  overflow: hidden;
}

.visual-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.03) 0%, transparent 100%);
  transition: opacity 0.4s;
}

.product-card:hover .visual-bg {
  opacity: 1;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.08) 0%, transparent 100%);
}

.card-img-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card-img-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.6s var(--ease-out);
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.2));
}

.product-card:hover .card-img-wrap img {
  transform: scale(1.08) translateY(-4px);
}

.card-actions {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.4s var(--ease-out);
}

.product-card:hover .card-actions {
  opacity: 1;
  transform: translateX(0);
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(15,17,25,0.9);
  backdrop-filter: blur(12px);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
}

.action-btn:hover {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
  transform: scale(1.1);
}

.heart-btn svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.heart-btn:hover svg {
  stroke: #ef4444;
  fill: #ef4444;
}

.card-body {
  padding: 20px 24px 24px;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.meta-cat {
  font-size: 0.75rem;
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  font-weight: 500;
}

.meta-rating {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stars {
  display: flex;
  gap: 2px;
}

.rating-count {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 650;
  margin: 0 0 8px;
  color: var(--text);
  transition: color 0.2s;
}

.product-card:hover .card-title {
  color: var(--accent);
}

.card-desc {
  font-size: 0.84rem;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 20px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.price-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-old {
  font-size: 0.78rem;
  color: var(--text-secondary);
  text-decoration: line-through;
}

.price-current {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text);
}

.price-current small {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin-right: 2px;
}

.add-cart-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
  font-size: 0.82rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
  white-space: nowrap;
}

.add-cart-btn:hover {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(var(--accent-rgb), 0.3);
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
  height: 200px;
  border-radius: 12px 12px 0 0;
}
.skeleton-line { display: block; }
.skeleton-card .card-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }

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

  .tabs-track {
    gap: 4px;
    padding: 4px;
  }

  .tab-item {
    padding: 10px 14px;
    font-size: 0.82rem;
  }

  .tab-text { display: none; }
  .tab-icon { font-size: 1.3rem; }

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

  .products-grid {
    grid-template-columns: 1fr;
  }

  .products-grid.list-mode .product-card {
    grid-template-columns: 1fr;
  }

  .card-actions {
    opacity: 1;
    transform: translateX(0);
    flex-direction: row;
    top: auto;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
  }

  .ribbon { right: -4px; }
}

@media (max-width: 480px) {
  .hero-title { font-size: 1.8rem; }
  .hero-desc { font-size: 0.92rem; }

  .visual-frame {
    width: 180px;
    height: 180px;
  }

  .visual-icon { font-size: 2.5rem; }
  .card-visual { height: 220px; }
  .card-body { padding: 16px 18px 20px; }

  .card-bottom {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .add-cart-btn { justify-content: center; }

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

.tab-item:focus-visible,
.action-btn:focus-visible,
.add-cart-btn:focus-visible,
.cta-btn-primary:focus-visible,
.view-toggle button:focus-visible,
.search-input:focus-visible,
.search-clear:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>