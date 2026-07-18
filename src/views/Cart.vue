<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n' 
import { useCart } from '../stores/cart'

const { t, locale } = useI18n() 

const getLocalizedText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value[locale.value] || value.fa || '';
  }
  return '';
}

const formatPrice = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const router = useRouter()
const cartStore = useCart()
const { cartItems, totalItems, totalPrice, isEmpty } = storeToRefs(cartStore)
const { updateQuantity, removeFromCart, clearCart } = cartStore

const finalPriceFormatted = computed(() => formatPrice(totalPrice.value))
const totalPriceFormatted = computed(() => formatPrice(totalPrice.value))

const goToCheckout = () => router.push('/checkout')
const goToProducts = () => router.push('/products')
const goToProduct = (id) => router.push(`/product/${id}`)
</script>

<template>
  <section class="cart-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ $t('cart_page_title') }}</h1>
        <p v-if="!isEmpty">{{ $t('cart_items_count_text', { count: totalItems }) }}</p>
        <p v-else>{{ $t('cart_empty_text') }}</p>
      </div>

      <div v-if="isEmpty" class="empty-cart glass">
        <div class="empty-icon">🛒</div>
        <h2>{{ $t('cart_empty_title') }}</h2>
        <p>{{ $t('cart_empty_desc') }}</p>
        <button class="browse-btn" @click="goToProducts">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <span>{{ $t('cart_view_products') }}</span>
        </button>
      </div>

      <div v-else class="cart-content">
        <div class="cart-items">
          <TransitionGroup name="cart-item">
            <article v-for="item in cartItems" :key="item.productId + (item.color || '') + (item.size || '')" class="cart-item glass">
              
              <div class="item-top-section">
                <div class="item-image" @click="goToProduct(item.productId)">
                  <img :src="item.image || '/products/placeholder.png'" :alt="getLocalizedText(item.name)" loading="lazy" width="80" height="80" />
                </div>
                <div class="item-info">
                  <span class="item-category">{{ $t('cart_item_label') }}</span>
                  <h3 class="item-name" @click="goToProduct(item.productId)">{{ getLocalizedText(item.name) }}</h3>
                  
                  <div class="item-variant" v-if="item.size">
                    <span class="variant-label">{{ locale === 'fa' ? 'سایز' : 'Size' }}:</span>
                    <span class="variant-value">{{ getLocalizedText(item.size) }}</span>
                  </div>

                  <div class="item-price-mobile">{{ formatPrice(item.unitPrice) }} {{ $t('products_currency') }}</div>
                </div>
                
                <button class="remove-btn desktop-remove" @click="removeFromCart(item.productId, item.color, item.size)">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2"/><line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2"/></svg>
                  <span>{{ $t('cart_remove') }}</span>
                </button>
              </div>

              <div class="item-bottom-section">
                <div class="price-wrapper">
                  <div class="item-unit-price">
                    <span class="price-label">{{ $t('cart_unit_price') }}</span>
                    <span class="price-value">{{ formatPrice(item.unitPrice) }} {{ $t('products_currency') }}</span>
                  </div>
                  <div class="item-total-price">
                    <span class="price-label">{{ $t('cart_total_price') }}</span>
                    <span class="price-value">{{ formatPrice(item.totalPrice) }} {{ $t('products_currency') }}</span>
                  </div>
                </div>

                <div class="item-quantity">
                  <span class="qty-label">{{ $t('cart_quantity') }}</span>
                  <div class="qty-controls">
                    <button @click="updateQuantity(item.productId, item.quantity - 1, item.color, item.size)" :disabled="item.quantity <= 1">−</button>
                    <span class="qty-value">{{ item.quantity }}</span>
                    <button @click="updateQuantity(item.productId, item.quantity + 1, item.color, item.size)">+</button>
                  </div>
                </div>

                <button class="remove-btn mobile-remove" @click="removeFromCart(item.productId, item.color, item.size)">
                  <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2"/><line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2"/></svg>
                </button>
              </div>

            </article>
          </TransitionGroup>

          <button class="clear-cart-btn" @click="clearCart">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span>{{ $t('cart_clear') }}</span>
          </button>
        </div>

        <aside class="cart-summary glass">
          <h2>{{ $t('cart_summary_title') }}</h2>
          <div class="summary-rows">
            <div class="summary-row">
              <span>{{ $t('cart_summary_items', { count: totalItems }) }}</span>
              <span>{{ totalPriceFormatted }} {{ $t('products_currency') }}</span>
            </div>

            <div class="summary-divider"></div>
            <div class="summary-row total">
              <span>{{ $t('cart_grand_total') }}</span>
              <span>{{ finalPriceFormatted }} {{ $t('products_currency') }}</span>
            </div>
            <div class="shipping-note">{{ $t('cart_shipping_note') }}</div>
          </div>
          <button class="checkout-btn" @click="goToCheckout">
            <span>{{ $t('cart_checkout_btn') }}</span>
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          </button>
          <div class="trust-badges">
            <div class="badge"><span class="badge-icon">🔒</span><span>{{ $t('cart_badge_secure') }}</span></div>
            <div class="badge"><span class="badge-icon">🚚</span><span>{{ $t('cart_badge_fast') }}</span></div>
            <div class="badge"><span class="badge-icon">✅</span><span>{{ $t('cart_badge_authentic') }}</span></div>
          </div>
          <router-link to="/products" class="continue-shopping">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span>{{ $t('cart_continue_shopping') }}</span>
          </router-link>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cart-page *, .cart-page *::before, .cart-page *::after { box-sizing: border-box !important; }
.cart-page { overflow-x: hidden; }

.cart-page {
  min-height: 100vh;
  padding: 120px 20px 80px;
  background: radial-gradient(circle at top, rgba(197, 160, 89, 0.12), transparent 50%), #050814;
  color: #fff;
}
.container { max-width: 1200px; margin: 0 auto; width: 100%; }
.page-header { margin-bottom: 40px; }
.page-header h1 { font-size: 2.2rem; margin: 0 0 8px; }
.page-header p { font-size: 1rem; opacity: 0.7; }

.empty-cart { text-align: center; padding: 60px 20px; border-radius: 24px; background: rgba(5, 8, 20, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); }
.empty-icon { font-size: 4rem; margin-bottom: 20px; opacity: 0.5; }
.empty-cart h2 { font-size: 1.5rem; margin: 0 0 12px; }
.empty-cart p { opacity: 0.7; margin: 0 0 24px; }
.browse-btn { display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
.browse-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(197, 160, 89, 0.4); }

.cart-content { display: grid; grid-template-columns: 1fr 380px; gap: 30px; align-items: start; }
.cart-items { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.cart-item { 
  display: flex; 
  flex-direction: column; 
  padding: 20px; 
  border-radius: 20px; 
  background: rgba(5, 8, 20, 0.9); 
  border: 1px solid rgba(255, 255, 255, 0.08); 
  transition: all 0.3s ease; 
}
.cart-item:hover { border-color: rgba(197, 160, 89, 0.3); }

.item-top-section { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 15px; }
.item-image { width: 80px; height: 80px; border-radius: 16px; background: rgba(15, 23, 42, 0.8); overflow: hidden; cursor: pointer; flex-shrink: 0; }
.item-image img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
.item-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.item-category { font-size: 0.75rem; color: #facc6b; text-transform: uppercase; letter-spacing: 1px; }
.item-name { font-size: 1.1rem; margin: 0; cursor: pointer; transition: color 0.2s; word-break: break-word; }
.item-name:hover { color: #facc6b; }

.item-variant { 
  font-size: 0.8rem; 
  color: rgba(255, 255, 255, 0.6); 
  margin-top: 6px; 
  display: flex; 
  align-items: center; 
  gap: 5px; 
}
.item-variant .variant-label { opacity: 0.8; }
.item-variant .variant-value { color: #facc6b; font-weight: 500; }

.item-price-mobile { display: none; font-size: 0.9rem; color: #facc6b; margin-top: 4px; }

.item-bottom-section { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.05); }
.price-wrapper { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
.item-unit-price, .item-total-price { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.price-label { font-size: 0.75rem; opacity: 0.6; white-space: nowrap; }
.price-value { font-size: 0.95rem; font-weight: 600; white-space: nowrap; }
.item-total-price .price-value { color: #facc6b; }

.item-quantity { display: flex; flex-direction: column; gap: 6px; align-items: center; flex-shrink: 0; }
.qty-label { font-size: 0.75rem; opacity: 0.6; }
.qty-controls { 
  display: flex; 
  align-items: center; 
  background: rgba(15, 23, 42, 0.8); 
  border: 1px solid rgba(197, 160, 89, 0.3); 
  border-radius: 12px; 
  overflow: hidden; 
}
.qty-controls button { 
  width: 40px; 
  height: 40px; 
  border: none; 
  background: transparent; 
  color: #facc6b; 
  font-size: 1.4rem; 
  cursor: pointer; 
  transition: all 0.2s; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}
.qty-controls button:hover:not(:disabled) { background: rgba(197, 160, 89, 0.15); }
.qty-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.qty-value { 
  min-width: 45px; 
  text-align: center; 
  font-weight: 700; 
  font-size: 1.1rem; 
  border-inline-end: 1px solid rgba(197, 160, 89, 0.2); 
  border-inline-start: 1px solid rgba(197, 160, 89, 0.2); 
  height: 40px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

.remove-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.25s ease; font-family: inherit; font-size: 0.85rem; flex-shrink: 0; }
.remove-btn:hover { background: #ef4444; color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
.mobile-remove { display: none; width: 40px; height: 40px; padding: 0; border-radius: 50%; }
.desktop-remove { align-self: flex-start; }

.clear-cart-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; cursor: pointer; align-self: flex-start; transition: all 0.25s ease; margin-top: 10px; }
.clear-cart-btn:hover { border-color: #ef4444; color: #ef4444; }

.cart-summary { position: sticky; top: 120px; padding: 24px; border-radius: 24px; background: rgba(5, 8, 20, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); }
.cart-summary h2 { font-size: 1.3rem; margin: 0 0 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.summary-rows { display: flex; flex-direction: column; gap: 14px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; flex-wrap: wrap; gap: 5px; }
.summary-row .free { color: #4ade80; font-weight: 600; }
.summary-row.total { font-size: 1.15rem; font-weight: 700; }
.summary-row.total span:last-child { color: #facc6b; }
.free-shipping-hint { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.8rem; color: #60a5fa; }
.summary-divider { height: 1px; background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent); margin: 8px 0; }
.shipping-note { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-align: center; margin-top: 4px; }
.checkout-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 16px; margin-top: 24px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 8px 25px rgba(197, 160, 89, 0.35); }
.checkout-btn:hover { transform: translateY(-3px); box-shadow: 0 12px 35px rgba(197, 160, 89, 0.5); }
.trust-badges { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.badge { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.badge-icon { font-size: 1.3rem; }
.badge span:last-child { font-size: 0.7rem; opacity: 0.7; }
.continue-shopping { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; padding: 10px; color: rgba(255, 255, 255, 0.7); text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
.continue-shopping:hover { color: #facc6b; }

.cart-item-enter-active, .cart-item-leave-active { transition: all 0.4s ease; }
.cart-item-enter-from { opacity: 0; transform: translateX(30px); }
.cart-item-leave-to { opacity: 0; transform: translateX(-30px); }

@media (max-width: 1024px) {
  .cart-content { grid-template-columns: 1fr; }
  .cart-summary { position: static; }
}

@media (max-width: 768px) {
  .cart-page { padding: 100px 15px 60px; }
  
  .item-top-section { gap: 12px; }
  .item-image { width: 70px; height: 70px; }
  .item-name { font-size: 1rem; }
  .item-price-mobile { display: block; }
  
  .desktop-remove { display: none; }
  .mobile-remove { display: flex; }
  
  .item-bottom-section { flex-direction: column; align-items: stretch; gap: 15px; }
  .price-wrapper { flex-direction: row; justify-content: space-between; }
  .item-unit-price, .item-total-price { flex-direction: column; gap: 2px; align-items: flex-start; }
  
  .item-quantity { flex-direction: row; justify-content: space-between; width: 100%; }
  
  .trust-badges { grid-template-columns: 1fr; gap: 8px; }
  .badge { flex-direction: row; justify-content: center; }
  .clear-cart-btn { align-self: center; }
}
</style>