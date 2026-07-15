<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useOrders } from '../../stores/orders'
import { getImageUrl } from '../../utils/imageUrl'

const { t, locale } = useI18n()
const ordersStore = useOrders()
const { orders, isLoading } = storeToRefs(ordersStore)
const { getStatusStyle, fetchOrders, cancelOrder } = ordersStore

const selectedOrder = ref(null)

const formatDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}
const formatPrice = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const goToOrderDetail = (orderId) => {
  selectedOrder.value = orders.value.find(o => (o._id || o.id) === orderId)
}

const closeOrderDetail = () => {
  selectedOrder.value = null
}

const handleCancelOrder = async (orderId) => {
  if (!confirm(t('user_orders_cancel_confirm'))) return

  const result = await cancelOrder(orderId)
  if (result.success) {
    alert(t('user_orders_cancel_success'))
    await fetchOrders()
    selectedOrder.value = null
  } else {
    alert(result.error || t('user_orders_cancel_error'))
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="user-orders">
    <div v-if="!selectedOrder" class="orders-list">
      <h3>{{ $t('user_orders_title') }}</h3>
      
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ $t('loading') }}</span>
      </div>
      
      <div v-else-if="(orders || []).length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <h4>{{ $t('user_orders_empty') }}</h4>
        <router-link :to="{ name: 'Products', params: { lang: locale } }" class="browse-btn">{{ $t('user_orders_view_products') }}</router-link>
      </div>
      
      <TransitionGroup v-else name="orders" tag="div" class="orders-grid">
        <article
          v-for="order in orders"
          :key="order._id"
          class="order-card glass"
          @click="goToOrderDetail(order._id)"
        >
          <div class="order-header">
            <div class="order-id">{{ $t('user_orders_order') }} {{ order.orderRef || order._id }}</div>
            <div
              class="order-status"
              :style="{
                background: getStatusStyle(order.status).bg,
                color: getStatusStyle(order.status).color
              }"
            >
              <span>{{ getStatusStyle(order.status).icon }}</span>
              <span>{{ getStatusStyle(order.status).text }}</span>
            </div>
          </div>

          <div class="order-date">{{ formatDate(order.createdAt) }}</div>

          <div class="order-items-preview">
            <div
              v-for="item in order.items.slice(0, 3)"
              :key="item._id"
              class="order-item-thumb"
            >
              <img :src="getImageUrl(item.image)" :alt="item.name" />
            </div>
            <span v-if="order.items.length > 3" class="more-items">+{{ order.items.length - 3 }}</span>
          </div>

          <div class="order-footer">
            <div class="order-total">{{ formatPrice(order.total) }} {{ $t('products_currency') }}</div>
            <button
              v-if="['pending', 'awaiting_payment'].includes(order.status)"
              class="cancel-btn"
              @click.stop="handleCancelOrder(order._id)"
            >
              {{ $t('user_orders_cancel') }}
            </button>
          </div>
        </article>
      </TransitionGroup>
    </div>
    
    <Transition name="slide">
      <div v-if="selectedOrder" class="order-detail">
        <button class="back-btn" @click="closeOrderDetail">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          {{ $t('user_orders_back_to_list') }}
        </button>
        
        <div class="detail-card glass">
          <div class="detail-header">
            <div>
              <h3>{{ $t('user_orders_order') }} {{ selectedOrder.orderRef || selectedOrder._id }}</h3>
              <p class="detail-date">{{ formatDate(selectedOrder.createdAt) }}</p>
            </div>
            <div
              class="status-badge"
              :style="{
                background: getStatusStyle(selectedOrder.status).bg,
                color: getStatusStyle(selectedOrder.status).color
              }"
            >
              <span>{{ getStatusStyle(selectedOrder.status).icon }}</span>
              <span>{{ getStatusStyle(selectedOrder.status).text }}</span>
            </div>
          </div>

          <div v-if="selectedOrder.shippingInfo" class="detail-section">
            <h4>📍 {{ $t('user_orders_shipping_address') }}</h4>
            <div class="shipping-info">
              <p><strong>{{ selectedOrder.shippingInfo.fullName }}</strong></p>
              <p>{{ selectedOrder.shippingInfo.province }}، {{ selectedOrder.shippingInfo.city }} - {{ selectedOrder.shippingInfo.address }}</p>
              <p>{{ $t('checkout_label_phone') }}: {{ selectedOrder.shippingInfo.phone }}</p>
            </div>
          </div>
          
          <div v-if="selectedOrder.tracking" class="detail-section">
            <h4>📦 {{ $t('user_orders_tracking_code') }}</h4>
            <div class="tracking-info">
              <span class="tracking-code">{{ selectedOrder.tracking.code }}</span>
              <span class="tracking-carrier">{{ selectedOrder.tracking.carrier }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>🛒 {{ $t('user_orders_products') }} ({{ $t('user_order_items_count', { count: selectedOrder.items.length }) }})</h4>
            <div class="detail-items">
              <div v-for="item in selectedOrder.items" :key="item._id" class="detail-item">
                <img :src="getImageUrl(item.image)" :alt="item.name" />
                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-qty">{{ $t('user_orders_quantity') }}: {{ item.quantity }}</span>
                </div>
                <span class="item-price">{{ formatPrice(item.price) }} {{ $t('products_currency') }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-total">
            <span>{{ $t('user_orders_total_amount') }}</span>
            <span class="total-price">{{ formatPrice(selectedOrder.total) }} {{ $t('products_currency') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-orders { display: flex; flex-direction: column; gap: 24px; box-sizing: border-box; }
.orders-list h3 { font-size: 1.4rem; margin: 0 0 20px; }
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px; }
.loading-spinner { width: 50px; height: 50px; border: 3px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; }
.empty-icon { font-size: 4rem; display: block; margin-bottom: 16px; }
.empty-state h4 { margin: 0 0 16px; }
.browse-btn { display: inline-block; padding: 12px 24px; border-radius: 999px; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; text-decoration: none; font-weight: 600; }
.orders-grid { display: flex; flex-direction: column; gap: 16px; }
.order-card { padding: 20px; border-radius: 16px; background: rgba(5, 8, 20, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.3s ease; box-sizing: border-box; }
.order-card:hover { transform: translateY(-4px); border-color: rgba(197, 160, 89, 0.5); }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; }
.order-id { font-weight: 600; word-break: break-word; }
.order-status { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 0.85rem; flex-shrink: 0; }
.order-date { font-size: 0.85rem; opacity: 0.7; margin-bottom: 16px; }
.order-items-preview { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.order-item-thumb { width: 45px; height: 45px; border-radius: 10px; background: rgba(15, 23, 42, 0.8); overflow: hidden; flex-shrink: 0; }
.order-item-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
.more-items { font-size: 0.8rem; opacity: 0.7; }
.order-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); gap: 10px; flex-wrap: wrap; }
.order-total { font-weight: 600; color: #facc6b; }
.cancel-btn { padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1); color: #ef4444; font-size: 0.85rem; cursor: pointer; transition: all 0.25s ease; flex-shrink: 0; }
.cancel-btn:hover { background: #ef4444; color: #fff; }

.order-detail { flex: 1; box-sizing: border-box; }
.back-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #fff; cursor: pointer; margin-bottom: 20px; }
.back-btn:hover { background: rgba(255, 255, 255, 0.1); }
.detail-card { padding: 30px; border-radius: 20px; box-sizing: border-box; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); gap: 15px; flex-wrap: wrap; }
.detail-header h3 { margin: 0 0 4px; font-size: 1.3rem; word-break: break-word; }
.detail-date { opacity: 0.7; font-size: 0.9rem; }
.status-badge { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px; font-size: 0.9rem; font-weight: 600; flex-shrink: 0; }
.detail-section { margin-bottom: 24px; }
.detail-section h4 { font-size: 1rem; margin: 0 0 12px; color: #facc6b; }
.shipping-info p, .tracking-info { font-size: 0.9rem; line-height: 1.8; margin: 0; word-break: break-word; }
.tracking-info { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.tracking-code { display: inline-block; padding: 6px 12px; border-radius: 8px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-family: monospace; }
.tracking-carrier { opacity: 0.8; }
.detail-items { display: flex; flex-direction: column; gap: 12px; }
.detail-item { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 12px; background: rgba(15, 23, 42, 0.5); box-sizing: border-box; flex-wrap: wrap; }
.detail-item img { width: 55px; height: 55px; border-radius: 10px; object-fit: contain; background: rgba(15, 23, 42, 0.8); padding: 6px; flex-shrink: 0; }
.item-info { flex: 1; min-width: 120px; }
.item-name { display: block; font-weight: 600; margin-bottom: 4px; word-break: break-word; }
.item-qty { font-size: 0.85rem; opacity: 0.7; }
.item-price { font-weight: 600; color: #facc6b; margin-inline-start: auto; }
.detail-total { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 1.1rem; flex-wrap: wrap; gap: 10px; }
.total-price { font-weight: 700; color: #facc6b; font-size: 1.3rem; }

.orders-enter-active, .orders-leave-active { transition: all 0.4s ease; }
.orders-enter-from { opacity: 0; transform: translateY(20px); }
.orders-leave-active { position: absolute; }
.orders-leave-to { opacity: 0; transform: translateX(-30px); }
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from { opacity: 0; transform: translateX(30px); }
.slide-leave-to { opacity: 0; transform: translateX(-30px); }

/* ریسپانسیو مخصوص موبایل */
@media (max-width: 768px) {
  .orders-grid { gap: 12px; }
  .order-card { padding: 16px; }
  .detail-card { padding: 20px; }
  .detail-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  
  /* در موبایل، عکس محصول می‌رود کنار نام، و قیمت می‌رود خط پایین */
  .detail-item {
    flex-direction: row;
    align-items: center;
  }
  .item-info {
    flex: 1;
    min-width: 0; /* این خط باعث میشه متن نام محصول توی موبایل بشکنه و بیرون نزنه */
  }
  .item-price {
    width: 100%;
    text-align: left;
    margin-inline-start: 0;
  }
}
</style>