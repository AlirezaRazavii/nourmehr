<template>
  <section class="wishlist-page">
    <div class="wishlist-header">
      <h1>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        {{ $t('wishlist_title') }}
      </h1>
      <span class="wishlist-count">{{ formatNumber(wishlist.totalItems) }} {{ $t('wishlist_items') }}</span>
    </div>

    <!-- لودینگ -->
    <div v-if="wishlist.isLoading" class="products-grid-inner">
      <div v-for="n in 4" :key="n" class="product-card skeleton-card">
        <div class="card-inner">
          <div class="card-image-wrapper"><div class="skeleton-image skeleton-pulse"></div></div>
          <div class="card-content">
            <div class="skeleton-line skeleton-pulse" style="width:70%;height:16px;margin-bottom:8px"></div>
            <div class="skeleton-line skeleton-pulse" style="width:90%;height:11px"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- حالت خالی -->
    <div v-else-if="wishlist.isEmpty" class="empty-state">
      <div class="empty-icon">♡</div>
      <p>{{ $t('wishlist_empty') }}</p>
      <router-link :to="{ name: 'Products', params: { lang: locale } }" class="browse-btn">
        {{ $t('wishlist_browse_products') }}
      </router-link>
    </div>

    <!-- لیست محصولات -->
    <div v-else>
      <div class="wishlist-actions">
        <button class="clear-all-btn" @click="handleClearAll">
          {{ $t('wishlist_clear_all') }}
        </button>
      </div>

      <div class="products-grid-inner">
        <article
          v-for="(product, i) in wishlist.items"
          :key="product._id"
          class="product-card"
          :style="{ '--delay': `${i * 0.05}s` }"
        >
          <div class="card-inner">
            <div class="card-image-wrapper">
              <img class="card-image" :src="product.image" :alt="getLocalizedText(product.name)" loading="lazy" />
              <div v-if="product.discountPercent" class="discount-tag">{{ formatNumber(product.discountPercent) }}%</div>

              <!-- دکمه حذف از علاقه‌مندی -->
              <button class="wishlist-remove-btn" @click="handleRemove(product._id)" :aria-label="$t('wishlist_remove')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>

            <div class="card-content">
              <h2 class="product-title">{{ getLocalizedText(product.name) }}</h2>
              <div class="title-underline"></div>

              <div class="price-box">
                <span v-if="product.oldPrice" class="old-price">{{ formatNumber(product.oldPrice) }}</span>
                <span class="current-price">{{ product.priceFormatted }} {{ $t('products_currency') }}</span>
              </div>

              <div class="stock-line" :class="{ 'out': !product.inStock }">
                <span class="stock-dot"></span>
                <span>{{ product.inStock ? $t('product_in_stock') : $t('product_out_of_stock') }}</span>
              </div>

              <div class="card-footer">
                <router-link
                  :to="{ name: 'ProductDetails', params: { lang: locale, id: product._id } }"
                  class="view-btn"
                >
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
  </section>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWishlist } from '../../stores/wishlist'

const { locale } = useI18n()
const wishlist = useWishlist()

const formatNumber = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || ''
  return ''
}

const handleRemove = async (productId) => {
  await wishlist.remove(productId)
}

const handleClearAll = async () => {
  await wishlist.clear()
}

onMounted(() => {
  wishlist.fetchWishlist()
})
</script>

<style scoped>
.wishlist-page { min-height: 60vh; color: #fff; font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif; }

.wishlist-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
.wishlist-header h1 { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; margin: 0; color: #c5a059; }
.wishlist-header h1 svg { color: #ef4444; }
.wishlist-count { font-size: 0.85rem; color: rgba(255,255,255,0.5); }

.wishlist-actions { display: flex; justify-content: flex-end; margin-bottom: 18px; }
.clear-all-btn { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 8px 16px; border-radius: 10px; font-family: inherit; font-size: 0.82rem; cursor: pointer; transition: all 0.25s; }
.clear-all-btn:hover { background: rgba(239,68,68,0.2); color: #fff; }

.products-grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: clamp(14px, 1.6vw, 22px); }

.product-card { position: relative; border-radius: 16px; opacity: 0; transform: translateY(30px); animation: cardReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards; animation-delay: var(--delay); }
@keyframes cardReveal { to { opacity: 1; transform: translateY(0); } }

.card-inner { position: relative; z-index: 1; border-radius: 16px; background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98)); border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; height: 100%; transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s; }
@media (hover: hover) {
  .product-card:hover .card-inner { transform: translateY(-6px); border-color: rgba(197,160,89,0.15); box-shadow: 0 18px 50px rgba(0,0,0,0.5); }
  .product-card:hover .card-image { transform: scale(1.08); }
  .product-card:hover .title-underline { width: 34px; }
}

.card-image-wrapper { position: relative; overflow: hidden; aspect-ratio: 1/1; width: 100%; display: flex; align-items: center; justify-content: center; padding: 14px; background: radial-gradient(circle at 50% 35%, rgba(197,160,89,0.06), transparent 65%); }
.card-image { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 12px 26px rgba(0,0,0,0.4)); transition: transform 0.5s ease; }

.discount-tag { position: absolute; top: 10px; left: 10px; z-index: 3; padding: 4px 9px; border-radius: 9px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; font-size: 0.7rem; font-weight: 800; }

.wishlist-remove-btn { position: absolute; top: 10px; right: 10px; z-index: 4; width: 34px; height: 34px; border-radius: 50%; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.1); color: #fca5a5; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s; }
.wishlist-remove-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

.card-content { padding: clamp(10px,1.2vw,14px); display: flex; flex-direction: column; gap: 7px; flex: 1; }
.product-title { font-size: clamp(0.82rem,1vw,0.95rem); font-weight: 700; color: #f0f0f0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
.title-underline { width: 28px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, #c5a059, transparent); transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }

.price-box { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.old-price { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-decoration: line-through; }
.current-price { font-size: 0.9rem; font-weight: 700; color: #facc6b; }

.stock-line { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: rgba(255,255,255,0.55); }
.stock-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; }
.stock-line.out { color: #fca5a5; }
.stock-line.out .stock-dot { background: #ef4444; }

.card-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }
.view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 11px; background: linear-gradient(135deg, #2bbf9e, #1a8f78); border: none; color: #fff; text-decoration: none; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.35s cubic-bezier(0.16,1,0.3,1); }
.view-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.view-arrow { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.18); transition: transform 0.35s; }
.view-btn:hover .view-arrow { transform: translateX(-3px); }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 3.5rem; color: rgba(239,68,68,0.4); margin-bottom: 12px; }
.empty-state p { color: rgba(255,255,255,0.4); margin-bottom: 20px; }
.browse-btn { display: inline-block; padding: 10px 24px; border-radius: 10px; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; text-decoration: none; font-weight: 600; font-size: 0.85rem; }

.skeleton-image { width: 100%; height: 100%; }
.skeleton-line { border-radius: 4px; }
.skeleton-pulse { background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04)); background-size: 200% 100%; animation: skeletonPulse 1.5s infinite; }
@keyframes skeletonPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 768px) {
  .products-grid-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
}
</style>
