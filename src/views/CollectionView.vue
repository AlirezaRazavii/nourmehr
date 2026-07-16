<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getCollection } from '../services/collectionApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, locale } = useI18n()

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[locale.value] || value.fa || value.en || ''
  }
  return ''
}

const route = useRoute()
const router = useRouter()

const collection = ref(null)
const products = ref([])
const loading = ref(false)
const loadError = ref('')

const currentPage = ref(1)
const perPage = 20

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return products.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(products.value.length / perPage))

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    const grid = document.querySelector('.cv-grid')
    if (grid) {
      window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' })
    }
  }
}

const formatNumber = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

// آیکون دسته سازگار با آبجکت یا رشته
const getCategoryIcon = (category) => {
  if (category && typeof category === 'object' && category.icon) return category.icon
  return '◆'
}

// شناسه‌ی محصول را از هر ساختاری استخراج می‌کند
const productId = (p) => p?._id || p?.id || p?.slug || ''

const goToProduct = (p) => {
  const id = productId(p)
  if (id) router.push({ name: 'ProductDetails', params: { lang: locale.value, id } })
}

// نرمال‌سازی پاسخ سرور تا در برابر ساختارهای مختلف مقاوم باشد
const extractCollectionAndProducts = (data) => {
  // حالت استاندارد: data = { collection, products, total }
  if (data && typeof data === 'object' && ('collection' in data || 'products' in data)) {
    return {
      collection: data.collection || null,
      products: Array.isArray(data.products) ? data.products : []
    }
  }
  // حالت جایگزین: data خودش آبجکت کالکشن است و محصولات داخل آن
  if (data && typeof data === 'object') {
    return {
      collection: data,
      products: Array.isArray(data.products) ? data.products : []
    }
  }
  return { collection: null, products: [] }
}

const load = async () => {
  loading.value = true
  loadError.value = ''
  currentPage.value = 1
  try {
    const data = await getCollection(route.params.slug, { limit: 100 })
    const { collection: col, products: prods } = extractCollectionAndProducts(data)
    collection.value = col
    products.value = prods

    // دیباگ کمکی — در صورت نیاز کنسول را ببینید
    if (!prods.length) {
      console.warn('[CollectionView] هیچ محصولی برای این کالکشن برنگشت. پاسخ سرور:', data)
    }
  } catch (e) {
    console.error('[CollectionView] خطا:', e)
    loadError.value = e.response?.data?.message || e.message || t('cv_error_server')
    collection.value = null
    products.value = []
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, (slug) => { if (slug) load() })
onMounted(load)
</script>

<template>
  <section class="collection-view">
    <div class="cv-container">
      <!-- هدر کالکشن -->
      <header v-if="collection" class="cv-header" :style="{ '--cv-bg': collection.bgColor || '#c5a059' }">
        <nav class="cv-breadcrumb">
          <router-link :to="{ name: 'Home', params: { lang: locale } }">{{ $t('nav_home') }}</router-link>
          <span>/</span>
          <span class="current">{{ getLocalizedText(collection.title || collection.name) }}</span>
        </nav>
        <div class="cv-head-icon">{{ collection.icon || '✦' }}</div>
        <h1>{{ getLocalizedText(collection.title || collection.name) }}</h1>
        <p v-if="getLocalizedText(collection.subtitle)" class="cv-subtitle">{{ getLocalizedText(collection.subtitle) }}</p>
        <p v-if="getLocalizedText(collection.description)" class="cv-desc">{{ getLocalizedText(collection.description) }}</p>
      </header>

      <!-- وضعیت بارگذاری -->
      <div v-if="loading" class="cv-loading">{{ $t('loading') }}</div>

      <!-- خطا -->
      <div v-else-if="loadError" class="cv-empty">
        <h3>{{ $t('cv_error_title') }}</h3>
        <p>{{ loadError }}</p>
        <button class="cv-btn" @click="load">{{ $t('retry') }}</button>
      </div>

      <!-- محصولات -->
      <div v-else-if="products.length" class="cv-grid">
        <article
          v-for="(product, i) in paginatedProducts"
          :key="productId(product) || i"
          class="product-card"
          :style="{ '--i': i }"
          @click="goToProduct(product)"
        >
          <div class="card-inner">
            <div class="card-image-wrapper">
              <img
                class="card-image"
                :src="getImageUrl(product.mainImage || product.image || (product.images && product.images[0]))"
                :alt="getLocalizedText(product.name)"
                loading="lazy"
              />
              <div v-if="product.discountPercent" class="discount-tag">{{ formatNumber(product.discountPercent) }}%</div>
              <div v-if="product.category" class="card-badge">
                <span class="badge-icon">{{ getCategoryIcon(product.category) }}</span>
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
                <router-link
                  :to="{ name: 'ProductDetails', params: { lang: locale, id: productId(product) } }"
                  class="view-btn"
                  @click.stop
                >
                  <span class="view-text">{{ $t('products_view') }}</span>
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

      <!-- صفحه‌بندی -->
      <div v-if="products.length > 0 && totalPages > 1" class="cv-pagination">
        <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1">{{ $t('pagination_prev') }}</button>
        <span v-for="p in totalPages" :key="p" @click="changePage(p)" :class="{ active: p === currentPage }">{{ p }}</span>
        <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages">{{ $t('pagination_next') }}</button>
      </div>

      <!-- خالی -->
      <div v-if="!loading && !loadError && products.length === 0" class="cv-empty">
        <div class="cv-empty-icon">✧</div>
        <h3>{{ $t('cv_empty_title') }}</h3>
        <router-link :to="{ name: 'Products', params: { lang: locale } }" class="cv-btn">{{ $t('cv_view_all') }}</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.collection-view {
  min-height: 100vh;
  background: #040609;
  color: #fff;
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
  padding-bottom: 80px;
}

.cv-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 48px);
}

.cv-header {
  text-align: center;
  padding: clamp(80px, 10vw, 130px) 20px 60px;
  position: relative;
}
.cv-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center top, var(--cv-bg), transparent 60%);
  opacity: 0.15;
  pointer-events: none;
}

.cv-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  margin-bottom: 24px;
  position: relative;
  flex-wrap: wrap;
}
.cv-breadcrumb a { color: rgba(255,255,255,0.5); text-decoration: none; }
.cv-breadcrumb a:hover { color: #f5d78e; }
.cv-breadcrumb .current { color: #f5d78e; }

.cv-head-icon { font-size: 3rem; margin-bottom: 12px; position: relative; }

.cv-header h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  margin: 0 0 12px;
  position: relative;
  background: linear-gradient(135deg, #fff 40%, #c5a059);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: #c5a059; /* fallback */
}
.cv-subtitle { font-size: 1.05rem; color: #c5a059; margin: 0 0 16px; position: relative; }
.cv-desc {
  max-width: 600px;
  margin: 0 auto;
  color: rgba(255,255,255,0.55);
  line-height: 2;
  font-size: 0.95rem;
  position: relative;
}

.cv-loading { text-align: center; padding: 80px; color: rgba(255,255,255,0.5); }

.cv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: clamp(14px, 1.6vw, 22px);
}

/* ===== کارت محصول استاندارد (همان صفحه‌ی محصولات) ===== */
.product-card {
  position: relative;
  border-radius: 16px;
  cursor: pointer;
  opacity: 0;
  transform: translateY(30px);
  animation: cvReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
  animation-delay: calc(var(--i) * 0.05s);
}
@keyframes cvReveal { to { opacity: 1; transform: translateY(0); } }

.card-inner {
  position: relative; z-index: 1; border-radius: 16px;
  background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98));
  border: 1px solid rgba(255,255,255,0.05); overflow: hidden;
  display: flex; flex-direction: column; height: 100%;
  transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s;
}

@media (hover: hover) and (pointer: fine) {
  .product-card:hover .card-inner { transform: translateY(-6px); border-color: rgba(197,160,89,0.15); box-shadow: 0 18px 50px rgba(0,0,0,0.5), 0 0 30px rgba(197,160,89,0.05); }
  .product-card:hover .card-image { transform: scale(1.08); }
  .product-card:hover .title-underline { width: 34px; }
}

.card-image-wrapper {
  position: relative; overflow: hidden; aspect-ratio: 1/1; width: 100%;
  display: flex; align-items: center; justify-content: center; padding: 14px;
  background: radial-gradient(circle at 50% 35%, rgba(197,160,89,0.06), transparent 65%);
}
.card-image {
  width: 100%; height: 100%; object-fit: contain;
  filter: drop-shadow(0 12px 26px rgba(0,0,0,0.4));
  transition: transform 0.5s ease;
}

.discount-tag { position: absolute; top: 10px; left: 10px; z-index: 3; padding: 4px 9px; border-radius: 9px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; font-size: 0.7rem; font-weight: 800; box-shadow: 0 4px 14px rgba(239,68,68,0.4); }
.card-badge { position: absolute; bottom: 10px; right: 10px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9px; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); font-size: 0.62rem; color: #f5d78e; font-weight: 500; max-width: calc(100% - 20px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

/* صفحه‌بندی */
.cv-pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 50px; flex-wrap: wrap; }
.cv-pagination button, .cv-pagination span {
  min-width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15,23,42,0.8);
  color: #fff; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; padding: 0 10px;
}
.cv-pagination span.active { background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; border-color: transparent; }
.cv-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

.cv-empty { text-align: center; padding: 80px 20px; }
.cv-empty-icon { font-size: 3rem; color: rgba(197,160,89,0.3); margin-bottom: 16px; }
.cv-empty h3 { margin: 0 0 20px; }

.cv-btn {
  display: inline-block; padding: 12px 28px; border-radius: 14px;
  background: linear-gradient(135deg, #c5a059, #f5d78e); color: #000;
  text-decoration: none; font-weight: 700; border: none; cursor: pointer; font-family: inherit;
}

@media (max-width: 1100px) {
  .cv-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
}

@media (max-width: 768px) {
  .cv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .card-content { padding: 9px 10px 11px; gap: 6px; }
  .cv-pagination button, .cv-pagination span { min-width: 32px; height: 32px; font-size: 0.8rem; }
}

@media (max-width: 480px) {
  .cv-grid { gap: 10px; }
  .view-btn { justify-content: center; width: 100%; }
}

@media (hover: none) {
  .product-card:hover .card-inner { transform: none; box-shadow: none; }
  .product-card:hover .card-image { transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .product-card { animation: none !important; opacity: 1 !important; transform: none !important; }
  .product-card .card-inner, .card-image { transition: none !important; }
}
</style>
