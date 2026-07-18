<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useCart } from '../stores/cart'
import { useProductStore } from '../stores/products'
import { useAuth } from '../stores/auth'
import { getProductImages, getImageUrl } from '../utils/imageUrl'
import api from '../services/api'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { addToCart } = useCart()
const productStore = useProductStore()
const authStore = useAuth()
const { isAuthenticated } = storeToRefs(authStore)

const activeImage = ref(0)
const selectedColor = ref(null)
const selectedSize = ref('')
const quantity = ref(1)
const isZoomed = ref(false)
const isLoading = ref(true)
const activeTab = ref('details')
const addedToCart = ref(false)
const addError = ref('')

const reviews = ref([])
const isLoadingReviews = ref(true)
const reviewForm = ref({ rating: 5, comment: '' })
const isSubmittingReview = ref(false)
const reviewSubmitMsg = ref('')

const formatPrice = (n) =>
  Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || ''
  return ''
}

// تابع متمرکز برای هدایت به صفحه لاگین با حفظ زبان و مسیر بازگشت
const redirectToLogin = () => {
  router.push({
    name: 'Login',
    params: { lang: locale.value },
    query: { redirect: route.fullPath }
  })
}

const allProducts = computed(() => productStore.products)

const product = computed(() =>
  productStore.currentProduct ||
  allProducts.value.find((p) => p._id === route.params.id || p.slug === route.params.id) ||
  null
)

const inStock = computed(() => (product.value?.stock ?? 0) > 0)
const maxQty = computed(() => product.value?.stock || 10)

const sizeList = computed(() =>
  (product.value?.sizes || []).map((s) => ({
    name: typeof s.name === 'string' ? s.name : getLocalizedText(s.name),
    price: s.price || 0,
    discountPercent: s.discountPercent || 0
  }))
)

const displayUnitPrice = computed(() => {
  const p = product.value
  if (!p) return 0
  let base = p.price
  let sizeDiscount = 0
  const s = sizeList.value.find((x) => x.name === selectedSize.value)
  if (s) {
    if (s.price) base = s.price
    if (s.discountPercent > 0) sizeDiscount = s.discountPercent
  }
  if (sizeDiscount > 0) return base * (1 - sizeDiscount / 100)
  if (p.discountPercent > 0) return base * (1 - p.discountPercent / 100)
  return base
})

const originalUnitPrice = computed(() => {
  const p = product.value
  if (!p) return 0
  const s = sizeList.value.find((x) => x.name === selectedSize.value)
  return s && s.price ? s.price : p.price
})

const selectedSizeDiscount = computed(() => {
  const s = sizeList.value.find((x) => x.name === selectedSize.value)
  return s && s.discountPercent ? s.discountPercent : 0
})

const productImages = computed(() => getProductImages(product.value))

const relatedProducts = computed(() => {
  if (!product.value) return []
  if (product.value.relatedProducts?.length > 0) {
    return product.value.relatedProducts.slice(0, 6)
  }
  return allProducts.value
    .filter((p) => {
      const catA = p.category?._id || p.category?.slug || p.category
      const catB = product.value.category?._id || product.value.category?.slug || product.value.category
      return catA === catB && p._id !== product.value._id
    })
    .slice(0, 6)
})

const hasSpecs = computed(() => {
  const p = product.value
  if (!p) return false
  return !!(p.weight || p.dimensions || getLocalizedText(p.material) ||
    getLocalizedText(p.craftsman) || getLocalizedText(p.warranty) || p.sku)
})

const fetchReviews = async (productId) => {
  isLoadingReviews.value = true
  try {
    const res = await api.get(`/reviews/${productId}`)
    if (res.data?.success) {
      reviews.value = Array.isArray(res.data.data) ? res.data.data : []
    }
  } catch (err) {
    console.error('Error fetching reviews:', err)
  } finally {
    isLoadingReviews.value = false
  }
}

const submitReview = async () => {
  // چک لاگین قبل از هر درخواست
  if (!isAuthenticated.value) {
    redirectToLogin()
    return
  }
  if (!reviewForm.value.comment.trim()) {
    reviewSubmitMsg.value = t('review_err_comment')
    return
  }
  isSubmittingReview.value = true
  reviewSubmitMsg.value = ''
  try {
    const res = await api.post('/reviews', {
      productId: product.value._id,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment
    })
    if (res.data?.success) {
      reviewSubmitMsg.value = t('review_success_msg')
      reviewForm.value = { rating: 5, comment: '' }
    } else {
      throw new Error(res.data?.message)
    }
  } catch (err) {
    // اگر توکن نامعتبر بود، به لاگین برو
    if (err.response?.status === 401 || err.response?.status === 403) {
      redirectToLogin()
      return
    }
    reviewSubmitMsg.value = err.response?.data?.message || t('review_err_submit')
  } finally {
    isSubmittingReview.value = false
  }
}

const loadProduct = async (idOrSlug) => {
  isLoading.value = true
  activeImage.value = 0
  await productStore.fetchProduct(idOrSlug)
  if (productStore.products.length === 0) productStore.fetchProducts()
  isLoading.value = false

  if (product.value?.colors?.length > 0) selectedColor.value = product.value.colors[0]
  if (product.value?.sizes?.length > 0) {
    const first = product.value.sizes[0]
    selectedSize.value = typeof first === 'string' ? first : getLocalizedText(first?.name)
  }
  if (product.value?._id || product.value?.id) {
    fetchReviews(product.value._id || product.value.id)
  } else {
    isLoadingReviews.value = false
  }
}

const changeImage = (index) => { activeImage.value = index }
const changeQuantity = (delta) => {
  const next = quantity.value + delta
  if (next >= 1 && next <= maxQty.value) quantity.value = next
}
const selectColor = (color) => { selectedColor.value = color }

const handleAddToCart = async () => {
  // مهم‌ترین تغییر: قبل از فرستادن درخواست، لاگین را چک کن
  if (!isAuthenticated.value) {
    redirectToLogin()
    return
  }
  if (!product.value?._id) return
  addError.value = ''
  if (!inStock.value) {
    addError.value = t('product_out_of_stock')
    return
  }
  const colorName = selectedColor.value ? getLocalizedText(selectedColor.value.name) : null
  const res = await addToCart(
    product.value._id,
    quantity.value,
    colorName,
    selectedSize.value || null
  )
  // لایه دوم دفاعی: اگر باز هم خطای دسترسی برگشت
  if (res && res.success === false) {
    if (res.status === 401 || res.status === 403) {
      redirectToLogin()
      return
    }
    addError.value = res.error || t('product_add_to_cart_error')
    return
  }
  addedToCart.value = true
  setTimeout(() => { addedToCart.value = false }, 2000)
}

const toggleZoom = () => { isZoomed.value = !isZoomed.value }
const closeZoom = () => { isZoomed.value = false }
const goBack = () => { router.push({ name: 'Products', params: { lang: locale.value } }) }
const goToCart = () => { router.push({ name: 'Cart', params: { lang: locale.value } }) }

const formatDate = (d) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US')
  } catch {
    return ''
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && isZoomed.value) closeZoom()
}

onMounted(() => {
  loadProduct(route.params.id)
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
watch(() => route.params.id, (id) => { if (id) loadProduct(id) })
</script>


<template>
  <section class="product-detail-page">
    <!-- لودینگ -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loader">
          <div class="loader-ring"></div>
          <span>{{ $t('loading') }}</span>
        </div>
      </div>
    </Transition>

    <!-- Not found state -->
    <div v-if="!isLoading && !product" class="not-found-state">
      <div class="not-found-icon">✧</div>
      <h2>{{ $t('product_not_found') }}</h2>
      <p>{{ $t('product_not_found_desc') }}</p>
      <router-link :to="{ name: 'Products', params: { lang: locale } }" class="back-btn" style="display:inline-flex;margin-top:1rem">{{ $t('product_back_to_products') }}</router-link>
    </div>

    <div v-if="product" class="container">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <router-link :to="{ name: 'Home', params: { lang: locale } }" class="bc-link">{{ $t('nav_home') }}</router-link>
        <span class="bc-sep">/</span>
        <router-link :to="{ name: 'Products', params: { lang: locale } }" class="bc-link">{{ $t('nav_products') }}</router-link>
        <span class="bc-sep">/</span>
        <span class="bc-link">{{ getLocalizedText(product.category?.name || product.category) }}</span>
        <span class="bc-sep">/</span>
        <span class="bc-current">{{ getLocalizedText(product.name) }}</span>
      </nav>

      <!-- دکمه بازگشت -->
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>{{ $t('product_back_to_products') }}</span>
      </button>

      <!-- محتوای اصلی -->
      <div class="main-content">
        <!-- ستون چپ: گالری -->
        <div class="gallery-section">
          <div class="main-image-wrapper glass" @click="toggleZoom">
            <div class="image-glow"></div>
            <span v-if="product.discountPercent" class="discount-badge">
              {{ formatPrice(product.discountPercent) }}% {{ $t('product_discount') }}
            </span>
            <Transition name="image-fade" mode="out-in">
              <img
                :key="activeImage"
                :src="productImages[activeImage] || productImages[0]"
                :alt="getLocalizedText(product.name)"
                class="main-image"
                width="1000"
                height="1000"
                fetchpriority="high"
              />
            </Transition>
            <div class="zoom-hint">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
              </svg>
            </div>
          </div>

          <div class="thumbnails">
            <button
              v-for="(img, index) in productImages"
              :key="index"
              class="thumb glass"
              :class="{ active: activeImage === index }"
              @click="changeImage(index)"
            >
              <img :src="img" :alt="`${$t('product_image')} ${index + 1}`" loading="lazy" width="80" height="80" />
            </button>
          </div>
        </div>

        <!-- ستون راست: اطلاعات -->
        <div class="info-section">
          <div class="product-header">
            <span class="category-badge">{{ getLocalizedText(product.category?.name || product.category) }}</span>
            <span class="sku" v-if="product.sku">{{ $t('product_sku') }}: {{ product.sku }}</span>
          </div>

          <h1 class="product-title">{{ getLocalizedText(product.name) }}</h1>
          <p class="product-subtitle">{{ getLocalizedText(product.shortDesc) }}</p>

          <div class="rating-stock">
            <div class="stock" :class="{ 'low-stock': product.stock > 0 && product.stock <= 3, 'out-stock': product.stock <= 0 }">
              <span class="stock-dot"></span>
              <span v-if="product.stock > 3">{{ $t('product_in_stock') }}</span>
              <span v-else-if="product.stock > 0">{{ $t('product_low_stock', { count: product.stock }) }}</span>
              <span v-else>{{ $t('product_out_of_stock') }}</span>
            </div>
          </div>

          <div class="price-section glass">
            <div class="price-row">
              <div class="prices">
                <span v-if="selectedSizeDiscount > 0" class="old-price">{{ formatPrice(originalUnitPrice) }} {{ $t('products_currency') }}</span>
                <span class="current-price">{{ formatPrice(displayUnitPrice) }} {{ $t('products_currency') }}</span>
              </div>
              <span v-if="selectedSizeDiscount > 0" class="save-badge">
                {{ $t('product_save') }} {{ formatPrice(selectedSizeDiscount) }}٪
              </span>
            </div>
          </div>

          <div v-if="product.colors?.length > 0" class="color-selector">
            <label>{{ $t('product_select_color') }}</label>
            <div class="colors">
              <button
                v-for="color in product.colors"
                :key="color.value"
                class="color-btn"
                :class="{ active: selectedColor?.value === color.value }"
                :style="{ '--color': color.value }"
                @click="selectColor(color)"
              >
                <span class="color-check">✓</span>
              </button>
            </div>
            <span v-if="selectedColor" class="selected-color-name">{{ getLocalizedText(selectedColor.name) }}</span>
          </div>

          <div v-if="sizeList.length" class="size-selector">
            <label>{{ $t('product_select_size') }}</label>
            <div class="sizes-list">
              <button
                v-for="s in sizeList"
                :key="s.name"
                type="button"
                @click="selectedSize = s.name"
                :class="{ active: selectedSize === s.name }"
              >{{ s.name }}<span v-if="s.price" class="size-price"> — {{ formatPrice(s.price) }} {{ $t('products_currency') }}</span><span v-if="s.discountPercent > 0" class="size-discount-tag">{{ $t('product_discount_off', { percent: formatPrice(s.discountPercent) }) }}</span></button>
            </div>
          </div>

          <div class="purchase-section">
            <div class="quantity-selector">
              <label>{{ $t('product_quantity') }}</label>
              <div class="qty-controls">
                <button @click="changeQuantity(-1)" :disabled="quantity <= 1">−</button>
                <span class="qty-value">{{ quantity }}</span>
                <button @click="changeQuantity(1)" :disabled="quantity >= maxQty">+</button>
              </div>
            </div>

            <button
              class="add-to-cart-btn"
              :class="{ added: addedToCart }"
              :disabled="!inStock"
              @click="handleAddToCart"
            >
              <Transition name="btn-fade" mode="out-in">
                <span v-if="addedToCart" key="added" class="btn-content">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>{{ $t('product_added_to_cart') }}</span>
                </span>
                <span v-else key="add" class="btn-content">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span>{{ inStock ? $t('product_add_to_cart') : $t('product_out_of_stock') }}</span>
                </span>
              </Transition>
            </button>
          </div>

          <p v-if="addError" class="add-error">{{ addError }}</p>

          <Transition name="slide-up">
            <button v-if="addedToCart" class="view-cart-btn" @click="goToCart">
              {{ $t('product_view_cart') }}
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </Transition>

          <div class="quick-features">

            <div class="feature-item" v-if="getLocalizedText(product.warranty)">
              <div class="feature-icon">🛡️</div>
              <div>
                <strong>{{ $t('product_warranty_authenticity') }}</strong>
                <span>{{ getLocalizedText(product.warranty) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- تب‌های اطلاعات -->
      <div class="tabs-section glass">
        <div class="tabs-header">
          <button class="tab-btn" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">
            {{ $t('product_details_tab') }}
          </button>
          <button v-if="hasSpecs" class="tab-btn" :class="{ active: activeTab === 'specs' }" @click="activeTab = 'specs'">
            {{ $t('product_specs_tab') }}
          </button>
        </div>

        <div class="tabs-content">
          <Transition name="tab-fade" mode="out-in">
            <div v-if="activeTab === 'details'" key="details" class="tab-pane">
              <p>{{ getLocalizedText(product.description) || getLocalizedText(product.shortDesc) }}</p>
            </div>

            <div v-else-if="activeTab === 'specs'" key="specs" class="tab-pane">
              <div class="specs-grid">
                <div class="spec-item" v-if="product.weight">
                  <span class="spec-label">{{ $t('spec_weight') }}</span>
                  <span class="spec-value">{{ product.weight }}</span>
                </div>
                <div class="spec-item" v-if="product.dimensions">
                  <span class="spec-label">{{ $t('spec_dimensions') }}</span>
                  <span class="spec-value">{{ product.dimensions }}</span>
                </div>
                <div class="spec-item" v-if="getLocalizedText(product.material)">
                  <span class="spec-label">{{ $t('spec_material') }}</span>
                  <span class="spec-value">{{ getLocalizedText(product.material) }}</span>
                </div>
                <div class="spec-item" v-if="getLocalizedText(product.craftsman)">
                  <span class="spec-label">{{ $t('spec_craftsman') }}</span>
                  <span class="spec-value">{{ getLocalizedText(product.craftsman) }}</span>
                </div>
                <div class="spec-item" v-if="getLocalizedText(product.warranty)">
                  <span class="spec-label">{{ $t('spec_warranty') }}</span>
                  <span class="spec-value">{{ getLocalizedText(product.warranty) }}</span>
                </div>
                <div class="spec-item" v-if="product.sku">
                  <span class="spec-label">{{ $t('spec_sku') }}</span>
                  <span class="spec-value">{{ product.sku }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- بخش نظرات کاربران -->
      <div class="reviews-section">
        <h2 class="reviews-title">
          <span class="title-line"></span>
          {{ $t('reviews_title') }}
          <span class="title-line"></span>
        </h2>

        <div v-if="isLoadingReviews" class="loading-reviews">
          <div class="loading-spinner small"></div>
          <span>{{ $t('loading') }}</span>
        </div>

        <div v-else-if="reviews.length === 0" class="empty-reviews">
          <div class="empty-icon">💬</div>
          <p>{{ $t('reviews_empty') }}</p>
        </div>

        <div v-else class="reviews-list">
          <div v-for="rev in reviews" :key="rev._id" class="review-item glass">
            <div class="review-header">
              <div class="reviewer-avatar">{{ rev.name?.charAt(0).toUpperCase() }}</div>
              <div class="reviewer-info">
                <strong>{{ rev.name }}</strong>
                <span class="review-date">{{ formatDate(rev.createdAt) }}</span>
              </div>
              <div class="review-stars">
                <span v-for="n in 5" :key="n" :class="{ filled: n <= rev.rating }">★</span>
              </div>
            </div>
            <p class="review-text">{{ rev.comment }}</p>
          </div>
        </div>

        <div class="review-form-wrapper glass">
          <h3>{{ $t('reviews_write_title') }}</h3>

          <div v-if="!isAuthenticated" class="login-prompt">
            <p>{{ $t('reviews_login_first') }}</p>
            <router-link :to="{ name: 'Login', params: { lang: locale }, query: { redirect: route.fullPath } }" class="login-link-btn">{{ $t('login') }}</router-link>
          </div>

          <form v-else @submit.prevent="submitReview" class="review-form">
            <div class="form-row">
              <div class="form-group">
                <label>{{ $t('reviews_rating') }}</label>
                <div class="star-rating">
                  <button
                    type="button"
                    v-for="star in 5"
                    :key="star"
                    @click="reviewForm.rating = star"
                    :class="{ active: reviewForm.rating >= star }"
                  >★</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>{{ $t('reviews_comment_label') }}</label>
              <textarea v-model="reviewForm.comment" :placeholder="$t('reviews_placeholder')" rows="4" required></textarea>
            </div>

            <button type="submit" class="submit-review-btn" :disabled="isSubmittingReview">
              <span v-if="isSubmittingReview">{{ $t('loading') }}</span>
              <span v-else>{{ $t('reviews_submit') }}</span>
            </button>

            <p v-if="reviewSubmitMsg" :class="['review-msg', reviewSubmitMsg.includes(t('review_success_msg')) ? 'success' : 'error']">
              {{ reviewSubmitMsg }}
            </p>
          </form>
        </div>
      </div>

      <!-- محصولات مرتبط -->
      <div v-if="relatedProducts.length > 0" class="related-section">
        <h2 class="section-title">
          <span class="title-line"></span>
          <span>{{ $t('product_related') }}</span>
          <span class="title-line"></span>
        </h2>

        <div class="products-grid-inner">
          <article
            v-for="(item, i) in relatedProducts"
            :key="item._id"
            class="product-card"
            :style="{ '--delay': `${i * 0.05}s` }"
          >
            <div class="card-inner">
              <div class="card-image-wrapper">
                <img
                  class="card-image"
                  :src="getImageUrl(item.mainImage || (item.images && item.images[0]))"
                  :alt="getLocalizedText(item.name)"
                  loading="lazy"
                />
                <div v-if="item.discountPercent" class="discount-tag">{{ formatPrice(item.discountPercent) }}%</div>
                <div class="card-badge">
                  <span>{{ getLocalizedText(item.category?.name || item.category) }}</span>
                </div>
              </div>

              <div class="card-content">
                <h2 class="product-title">{{ getLocalizedText(item.name) }}</h2>
                <div class="title-underline"></div>

                <div class="desc-box">
                  <span class="desc-label">{{ $t('products_description') }}</span>
                  <p class="short-desc">{{ getLocalizedText(item.shortDesc) || $t('products_no_description') }}</p>
                </div>

                <div class="card-footer">
                  <router-link :to="{ name: 'ProductDetails', params: { lang: locale, id: item._id || item.id || item.slug } }" class="view-btn" @click.stop>
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
      </div>
    </div>

    <!-- مودال زوم -->
    <Transition name="zoom">
      <div v-if="isZoomed && product" class="zoom-modal" @click="closeZoom">
        <div class="zoom-content">
          <img :src="productImages[activeImage] || productImages[0]" :alt="getLocalizedText(product?.name)" />
          <button type="button" class="zoom-close" @click.stop="closeZoom" aria-label="بستن">✕</button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.product-detail-page { min-height: 100vh; padding: 100px 40px 80px; background: radial-gradient(circle at top, rgba(197, 160, 89, 0.12), transparent 50%), radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.08), transparent 50%), #050814; color: #fff; position: relative; }
.container { max-width: 1200px; margin: 0 auto; }
.not-found-state { max-width: 480px; margin: 120px auto 0; text-align: center; padding: 60px 40px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
.not-found-icon { font-size: 3rem; color: rgba(197,160,89,0.4); margin-bottom: 20px; animation: emptyPulse 2s ease-in-out infinite; }
.not-found-state h2 { font-size: 1.5rem; margin: 0 0 12px; color: #fff; }
.not-found-state p { color: rgba(255,255,255,0.5); margin: 0 0 24px; line-height: 1.6; }
@keyframes emptyPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
.loading-overlay { position: fixed; inset: 0; background: rgba(5, 8, 20, 0.95); display: flex; align-items: center; justify-content: center; z-index: 100; }
.loader { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.loader-ring { width: 50px; height: 50px; border: 3px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-spinner.small { width: 24px; height: 24px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin-bottom: 16px; flex-wrap: wrap; }
.bc-link { color: rgba(255, 255, 255, 0.7); text-decoration: none; transition: color 0.2s; }
.bc-link:hover { color: #facc6b; }
.bc-sep { opacity: 0.4; }
.bc-current { color: #facc6b; }
.back-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px !important; border-radius: 999px !important; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(15, 23, 42, 0.8) !important; color: #e5e7eb; font-size: 0.9rem; cursor: pointer; margin-bottom: 24px; transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease, border-color 0.25s ease; text-decoration: none; }
.back-btn:hover { background: #c5a059 !important; color: #000 !important; border-color: #c5a059; transform: translateX(4px); }
.main-content { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 40px; margin-bottom: 50px; }
.gallery-section { display: flex; flex-direction: column; gap: 16px; }
.main-image-wrapper { position: relative; border-radius: 24px; overflow: hidden; background: rgba(5, 8, 20, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); cursor: zoom-in; aspect-ratio: 1; }
.image-glow { position: absolute; inset: -50%; background: radial-gradient(circle at center, rgba(197, 160, 89, 0.3), transparent 50%); animation: glowPulse 4s ease-in-out infinite; pointer-events: none; }
@keyframes glowPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
.main-image { width: 100%; height: 100%; object-fit: contain; padding: 20px; position: relative; z-index: 1; }
.discount-badge { position: absolute; top: 16px; inset-inline-end: 16px; padding: 6px 14px; border-radius: 999px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-size: 0.85rem; font-weight: 600; z-index: 2; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }
.zoom-hint { position: absolute; bottom: 16px; inset-inline-start: 16px; width: 40px; height: 40px; border-radius: 50%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; color: #fff; opacity: 0.7; transition: opacity 0.2s; z-index: 2; }
.main-image-wrapper:hover .zoom-hint { opacity: 1; }
.thumbnails { display: flex; gap: 12px; justify-content: center; }
.thumb { width: 80px; height: 80px; border-radius: 16px; overflow: hidden; border: 2px solid transparent; background: rgba(5, 8, 20, 0.8) !important; cursor: pointer; transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; padding: 0 !important; }
.thumb img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
.thumb:hover { transform: translateY(-4px); border-color: rgba(197, 160, 89, 0.5); }
.thumb.active { border-color: #c5a059; box-shadow: 0 0 20px rgba(197, 160, 89, 0.4); }
.info-section { display: flex; flex-direction: column; gap: 20px; }
.product-header { display: flex; justify-content: space-between; align-items: center; }
.category-badge { padding: 6px 14px; border-radius: 999px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-size: 0.85rem; border: 1px solid rgba(197, 160, 89, 0.3); }
.sku { font-size: 0.8rem; opacity: 0.6; }
.product-title { font-size: 2rem; font-weight: 700; margin: 0; line-height: 1.3; }
.product-subtitle { font-size: 1rem; opacity: 0.85; line-height: 1.7; margin: 0; }
.rating-stock { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.stock { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
.stock-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 10px rgba(74, 222, 128, 0.6); }
.stock.low-stock .stock-dot { background: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.6); animation: blink 1s infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.price-section { padding: 20px; border-radius: 18px; background: rgba(5, 8, 20, 0.8); border: 1px solid rgba(197, 160, 89, 0.2); }
.price-row { display: flex; justify-content: space-between; align-items: center; }
.prices { display: flex; flex-direction: column; gap: 4px; }
.old-price { font-size: 0.95rem; color: rgba(255, 255, 255, 0.5); text-decoration: line-through; }
.current-price { font-size: 1.6rem; font-weight: 700; color: #facc6b; }
.save-badge { padding: 6px 12px; border-radius: 999px; background: rgba(74, 222, 128, 0.15); color: #4ade80; font-size: 0.85rem; border: 1px solid rgba(74, 222, 128, 0.3); }
.color-selector { display: flex; flex-direction: column; gap: 10px; }
.color-selector label { font-size: 0.9rem; opacity: 0.9; }
.colors { display: flex; gap: 10px; }
.color-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid transparent; background: var(--color) !important; cursor: pointer; position: relative; transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; padding: 0 !important; }
.color-btn:hover { transform: scale(1.1); }
.color-btn.active { border-color: #fff; box-shadow: 0 0 15px var(--color); }
.color-check { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1rem; opacity: 0; transition: opacity 0.2s; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.color-btn.active .color-check { opacity: 1; }
.selected-color-name { font-size: 0.85rem; opacity: 0.7; }
.size-selector { display: flex; flex-direction: column; gap: 10px; }
.size-selector label { font-size: 0.9rem; opacity: 0.9; }
.sizes-list { display: flex; gap: 10px; flex-wrap: wrap; }
.sizes-list button { padding: 8px 18px !important; border-radius: 10px !important; cursor: pointer; border: 1px solid rgba(255,255,255,0.2) !important; background: rgba(15,23,42,0.8) !important; color: #fff !important; font-family: inherit; font-size: 0.9rem; transition: border-color 0.2s, background 0.2s, color 0.2s; }
.sizes-list button.active { border: 2px solid #c5a059 !important; background: rgba(197,160,89,0.15) !important; color: #facc6b !important; }
.size-price { opacity: 0.7; font-size: 0.8rem; }
.size-discount-tag { display: inline-block; margin-inline-start: 6px; padding: 2px 8px; border-radius: 999px; background: rgba(239,68,68,0.15); color: #fca5a5; font-size: 0.7rem; font-weight: 600; }

.purchase-section { display: flex; gap: 16px; align-items: flex-end; margin-top: 10px; }
.quantity-selector { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.quantity-selector label { font-size: 0.9rem; opacity: 0.9; }
.qty-controls { display: flex; align-items: center; border-radius: 12px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; height: 48px; }
.qty-controls button { width: 40px; height: 100%; border: none; background: transparent !important; padding: 0 !important; color: #fff; font-size: 1.2rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
.qty-controls button:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); }
.qty-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.qty-value { width: 40px; text-align: center; font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.add-to-cart-btn { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 20px !important; height: 48px; border-radius: 12px !important; border: none; background: linear-gradient(135deg, #c5a059, #8f7032) !important; color: #000 !important; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease; box-shadow: 0 8px 25px rgba(197, 160, 89, 0.35); }
.add-to-cart-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 35px rgba(197, 160, 89, 0.5); }
.add-to-cart-btn.added { background: linear-gradient(135deg, #4ade80, #22c55e) !important; }
.btn-content { display: flex; align-items: center; gap: 10px; }
.btn-fade-enter-active, .btn-fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.btn-fade-enter-from, .btn-fade-leave-to { opacity: 0; transform: scale(0.9); }
.add-error { color: #fca5a5; font-size: 0.85rem; margin-top: 10px; }
.view-cart-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px !important; border-radius: 999px !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; background: rgba(15, 23, 42, 0.9) !important; color: #fff !important; font-size: 0.95rem; cursor: pointer; transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease; }
.view-cart-btn:hover { background: rgba(255, 255, 255, 0.1) !important; border-color: #facc6b !important; color: #facc6b !important; }
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(10px); }
.quick-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
.feature-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.06); }
.feature-icon { font-size: 1.4rem; }
.feature-item strong { display: block; font-size: 0.85rem; margin-bottom: 2px; }
.feature-item span { font-size: 0.75rem; opacity: 0.7; }
.tabs-section { border-radius: 24px; background: rgba(5, 8, 20, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; margin-bottom: 50px; }
.tabs-header { display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.tab-btn { flex: 1; padding: 16px !important; border: none !important; background: transparent !important; color: rgba(255, 255, 255, 0.7) !important; font-size: 0.95rem; cursor: pointer; transition: color 0.25s ease, background 0.25s ease; position: relative; }
.tab-btn:hover { color: #fff !important; background: rgba(255, 255, 255, 0.03) !important; }
.tab-btn.active { color: #facc6b !important; }
.tab-btn.active::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #c5a059, transparent); }
.tabs-content { padding: 24px; }
.tab-pane p { font-size: 0.95rem; line-height: 2; opacity: 0.9; }
.specs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.spec-item { display: flex; justify-content: space-between; padding: 12px 16px; border-radius: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.06); }
.spec-label { opacity: 0.7; }
.spec-value { font-weight: 600; }
.related-section { margin-top: 20px; }
.section-title { display: flex; align-items: center; justify-content: center; gap: 20px; font-size: 1.5rem; margin-bottom: 30px; }
.title-line { flex: 1; max-width: 100px; height: 1px; background: linear-gradient(to right, transparent, rgba(197, 160, 89, 0.5), transparent); }
.products-grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: clamp(14px, 1.6vw, 22px); }

.product-card { position: relative; border-radius: 16px; opacity: 0; transform: translateY(30px); animation: cardReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: var(--delay); }
@keyframes cardReveal { to { opacity: 1; transform: translateY(0); } }

.card-inner { position: relative; z-index: 1; border-radius: 16px; background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98)); border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; height: 100%; transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s; }

@media (hover: hover) {
  .product-card:hover .card-inner { transform: translateY(-6px); border-color: rgba(197,160,89,0.15); box-shadow: 0 18px 50px rgba(0,0,0,0.5), 0 0 30px rgba(197,160,89,0.05); }
  .product-card:hover .card-image { transform: scale(1.08); }
  .product-card:hover .title-underline { width: 34px; }
}

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
.card-badge { position: absolute; bottom: 10px; right: 10px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9px; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); font-size: 0.62rem; color: #f5d78e; font-weight: 500; max-width: calc(100% - 20px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.card-content { padding: clamp(10px,1.2vw,14px); display: flex; flex-direction: column; gap: 7px; flex: 1; }
.product-title { font-size: clamp(0.82rem,1vw,0.95rem); font-weight: 700; color: #f0f0f0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
.title-underline { width: 28px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, #c5a059, transparent); transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }

.desc-box { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 10px 9px; background: rgba(255,255,255,0.02); }
.desc-label { display: inline-block; font-size: 0.6rem; color: #c5a059; letter-spacing: 1px; margin-bottom: 4px; }
.short-desc { font-size: clamp(0.7rem,0.85vw,0.78rem); color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.card-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }

.view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 11px; background: linear-gradient(135deg, #2bbf9e, #1a8f78); border: none; color: #fff; text-decoration: none; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.35s cubic-bezier(0.16,1,0.3,1); flex-shrink: 0; }
.view-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(43,191,158,0.3); }
.view-arrow { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.18); transition: transform 0.35s; }
.view-btn:hover .view-arrow { transform: translateX(-3px); }
.zoom-modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.95); display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: zoom-out; }
.zoom-content { position: relative; max-width: 90vw; max-height: 90vh; }
.zoom-content img { max-width: 100%; max-height: 90vh; object-fit: contain; }
.zoom-close { position: absolute; top: -40px; inset-inline-end: 0; width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 1.2rem; cursor: pointer; transition: background 0.2s, color 0.2s; }
.zoom-close:hover { background: #c5a059; color: #000; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.image-fade-enter-active, .image-fade-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.image-fade-enter-from { opacity: 0; transform: scale(0.95); }
.image-fade-leave-to { opacity: 0; transform: scale(1.05); }
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.tab-fade-enter-from { opacity: 0; transform: translateY(10px); }
.tab-fade-leave-to { opacity: 0; transform: translateY(-10px); }
.zoom-enter-active, .zoom-leave-active { transition: opacity 0.3s ease; }
.zoom-enter-from, .zoom-leave-to { opacity: 0; }
.zoom-enter-from .zoom-content, .zoom-leave-to .zoom-content { transform: scale(0.9); }

/* افکت شیشه‌ای — مشروط برای دیوایس‌های ضعیف */
.glass { background: rgba(255, 255, 255, 0.05); }
@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  @media (min-width: 769px) {
    .glass { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  }
}

/* استایل‌های پیشرفته بخش نظرات */
.reviews-section { margin-bottom: 50px; }
.reviews-title { display: flex; align-items: center; justify-content: center; gap: 20px; font-size: 1.5rem; margin-bottom: 30px; }
.loading-reviews, .empty-reviews { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1); margin-bottom: 30px; }
.empty-icon { font-size: 2.5rem; }
.reviews-list { display: flex; flex-direction: column; gap: 20px; margin-bottom: 40px; }
.review-item { border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; transition: transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease; background: rgba(5, 8, 20, 0.6); }
.review-item:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.review-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.reviewer-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #c5a059, #8f7032); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #000; font-size: 1.2rem; box-shadow: 0 4px 12px rgba(197,160,89,0.3); flex-shrink: 0; }
.reviewer-info { display: flex; flex-direction: column; flex: 1; min-width: 120px; }
.reviewer-info strong { font-size: 1rem; color: #fff; }
.review-date { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
.review-stars { display: inline-flex; gap: 2px; color: #444; font-size: 1.2rem; background: rgba(0,0,0,0.2); padding: 6px 12px; border-radius: 999px; }
.review-stars .filled { color: #facc6b; filter: drop-shadow(0 0 4px rgba(250,204,21,0.4)); }
.review-text { margin: 0; font-size: 0.95rem; line-height: 1.9; color: rgba(255,255,255,0.8); padding-inline-start: 62px; }
.review-form-wrapper { border: 1px solid rgba(255,255,255,0.08); padding: 28px; border-radius: 20px; background: linear-gradient(145deg, rgba(15,18,32,0.6), rgba(5,8,20,0.8)); }
.review-form-wrapper h3 { margin: 0 0 24px; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
.review-form-wrapper h3::before { content: '✏️'; }
.login-prompt { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; padding: 30px; background: rgba(197,160,89,0.05); border-radius: 16px; border: 1px solid rgba(197,160,89,0.1); }
.login-link-btn { padding: 12px 28px !important; background: linear-gradient(135deg, #c5a059, #8f7032) !important; color: #000 !important; border-radius: 999px !important; text-decoration: none; font-weight: 600; transition: transform 0.2s, box-shadow 0.2s; border: none !important; }
.login-link-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(197,160,89,0.3); }
.review-form .form-row { display: flex; gap: 20px; margin-bottom: 20px; }
.review-form .form-group { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.review-form label { font-size: 0.9rem; font-weight: 500; color: rgba(255,255,255,0.7); }
.star-rating { display: flex; gap: 8px; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); padding: 10px 16px; border-radius: 12px; width: fit-content; max-width: 100%; box-sizing: border-box; flex-wrap: nowrap; }
.star-rating button { background: none !important; border: none !important; color: #444 !important; font-size: 1.4rem; cursor: pointer; transition: color 0.2s, transform 0.2s; line-height: 1; padding: 0 !important; margin: 0; display: flex; align-items: center; justify-content: center; }
.star-rating button.active, .star-rating button:hover { color: #facc6b !important; transform: scale(1.1); }
.review-form textarea { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(5,8,20,0.6); color: #fff; font-family: inherit; font-size: 0.95rem; resize: vertical; outline: none; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; box-sizing: border-box; min-height: 120px; }
.review-form textarea:focus { border-color: rgba(197,160,89,0.6); background: rgba(5,8,20,0.8); box-shadow: 0 0 0 3px rgba(197,160,89,0.1); }
.submit-review-btn { padding: 14px 32px !important; border-radius: 999px !important; border: none !important; background: linear-gradient(135deg, #c5a059, #8f7032) !important; color: #000 !important; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: transform 0.3s, box-shadow 0.3s; display: inline-flex; align-items: center; gap: 8px; }
.submit-review-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(197,160,89,0.4); }
.submit-review-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.review-msg { margin-top: 16px; font-size: 0.9rem; padding: 12px 16px; border-radius: 8px; }
.review-msg.success { color: #4ade80; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); }
.review-msg.error { color: #fca5a5; background: rgba(252, 165, 165, 0.1); border: 1px solid rgba(252, 165, 165, 0.2); }

/* ریسپانسیو */
@media (max-width: 900px) {
  .product-detail-page { padding: 100px 20px 60px; }
  .main-content { grid-template-columns: 1fr; gap: 30px; }
  .quick-features { grid-template-columns: 1fr; }
  .purchase-section { flex-direction: row; align-items: flex-end; gap: 12px; }
  .add-to-cart-btn { width: auto; flex: 1; }
}
@media (max-width: 768px) {
  .review-text { padding-inline-start: 0; margin-top: 8px; }
  .review-form .form-row { flex-direction: column; gap: 16px; }
  .review-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .review-stars { font-size: 1rem; }
  .reviewer-info { width: 100%; }
}
@media (max-width: 600px) {
  .product-title { font-size: 1.5rem; }
  .thumbnails { flex-wrap: wrap; }
  .thumb { width: 60px; height: 60px; }
  .tabs-header { flex-direction: column; }
  .tab-btn { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
  .tab-btn.active::after { display: none; }
  .specs-grid { grid-template-columns: 1fr; }
  .review-item { padding: 16px; }
  .review-form-wrapper { padding: 20px; }
  .reviews-title { font-size: 1.2rem; gap: 10px; }
  .star-rating button { font-size: 1.4rem; }
  .products-grid-inner { gap: 10px; }
  .card-content { padding: 9px 10px 11px; gap: 6px; }
  .view-btn { justify-content: center; width: 100%; }
}

/* احترام به تنظیمات کاهش انیمیشن */
@media (prefers-reduced-motion: reduce) {
  .image-glow,
  .stock.low-stock .stock-dot,
  .not-found-icon,
  .loader-ring,
  .loading-spinner { animation: none !important; }
  .product-card:hover .card-inner,
  .product-card:hover .card-image,
  .product-card:hover .title-underline,
  .add-to-cart-btn:hover,
  .back-btn:hover,
  .review-item:hover,
  .thumb:hover,
  .color-btn:hover { transform: none; }
}

/* ═══════ بهینه‌سازی موبایل: جلوگیری از سفید شدن و باگ اسکرول ═══════ */
@media (max-width: 860px) {
  /* حذف backdrop-filter سنگین که روی GPU موبایل باگ اسکرول ایجاد می‌کند */
  .search-bar,
  .card-badge,
  .related-dropdown {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  .search-bar { background: rgba(10, 13, 20, 0.96) !important; }
  .card-badge { background: rgba(0, 0, 0, 0.7) !important; }

  /* خاموش کردن گوی‌های بلوردار متحرک که موقع اسکرول باعث پرش می‌شوند */
  .bg-orb {
    display: none !important;
  }

  /* ثابت نگه‌داشتن بلور drawer فقط وقتی باز است، ولی سبک‌تر */
  .filter-drawer.is-mobile {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}

/* روی دستگاه‌های لمسی، انیمیشن ورود کارت‌ها را ساده کن تا موقع اسکرول پرش نکند */
@media (hover: none) and (pointer: coarse) {
  .product-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .bg-grid { display: none !important; }
}

</style>
