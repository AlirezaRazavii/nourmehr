<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../../stores/auth'
import { useOrders } from '../../stores/orders'
import { useAddresses } from '../../stores/addresses'
import { ticketApi } from '../../services/ticketApi'


const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuth()
const { userName } = storeToRefs(authStore)
const ordersStore = useOrders()
const { orders } = storeToRefs(ordersStore)
const { fetchOrders, getStatusStyle } = ordersStore
const addressesStore = useAddresses()
const { addresses } = storeToRefs(addressesStore)

const isLoading = ref(true)
const recentOrders = ref([])
const supportTickets = ref([])
const isLoadingTickets = ref(false)

const stats = computed(() => [
  { label: t('user_stat_orders'), value: (orders.value || []).length, icon: '📦', color: '#3b82f6' },
  { label: t('user_stat_addresses'), value: (addresses.value || []).length, icon: '📍', color: '#10b981' },
  { label: t('user_stat_tickets'), value: supportTickets.value.length, icon: '💬', color: '#f59e0b' }
])

const quickActions = computed(() => [
  { label: t('user_action_products'), icon: '🛍️', routeName: 'Products' },
  { label: t('user_action_orders'), icon: '📦', routeName: 'UserOrders' },
  { label: t('user_action_profile'), icon: '✏️', routeName: 'UserProfile' },
  { label: t('user_action_ticket'), icon: '💬', routeName: 'UserTickets' }
])

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  try { return new Date(dateStr).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return dateStr }
}

const formatPrice = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

const fetchSupportTickets = async () => {
  isLoadingTickets.value = true
  try {
    const res = await ticketApi.getMyTickets()
    if (res.success) supportTickets.value = res.data || []
  } catch (e) {
    supportTickets.value = []
  } finally {
    isLoadingTickets.value = false
  }
}

const statusLabels = {
  open: t('ticket_status_open'),
  in_progress: t('ticket_status_in_progress'),
  resolved: t('ticket_status_resolved'),
  closed: t('ticket_status_closed'),
}



onMounted(async () => {
  await fetchOrders()
  recentOrders.value = (orders.value || []).slice(0, 3)
  
  try {
    await addressesStore.fetchAddresses()
  } catch (e) { /* ignore */ }
  
  await fetchSupportTickets()
  isLoading.value = false
})

const goToOrder = () => {
  router.push({ name: 'UserOrders', params: { lang: locale.value } })
}
</script>

<template>
  <div class="user-dashboard">
    <div class="welcome-card glass">
      <div class="welcome-content">
        <h2>{{ $t('user_welcome', { name: userName }) }} 👋</h2>
        <p>{{ $t('user_welcome_desc') }}</p>
      </div>
      <div class="welcome-art">
        <span class="art-icon">✨</span>
      </div>
    </div>

    <div class="stats-grid">
      <div 
        v-for="stat in stats" 
        :key="stat.label" 
        class="stat-card glass"
        :style="{ '--accent': stat.color }"
      >
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="recent-orders glass">
        <div class="section-header">
          <h3>{{ $t('user_recent_orders') }}</h3>
          <router-link :to="{ name: 'UserOrders', params: { lang: locale } }" class="view-all">{{ $t('user_view_all') }}</router-link>
        </div>

        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>{{ $t('loading') }}</span>
        </div>

        <div v-else-if="recentOrders.length === 0" class="empty-state">
          <span class="empty-icon">📦</span>
          <p>{{ $t('user_no_orders') }}</p>
          <router-link :to="{ name: 'Products', params: { lang: locale } }" class="browse-btn">{{ $t('user_browse_products') }}</router-link>
        </div>

        <div v-else class="orders-list">
          <div v-for="order in recentOrders" 
            :key="order._id || order.id"
            class="order-item"
            @click="goToOrder"
          >
            <div class="order-info">
              <span class="order-id">{{ order.orderRef || order._id }}</span>
              <span class="order-date">{{ formatDate(order.createdAt || order.date) }}</span>
            </div>
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
            <div class="order-total">{{ formatPrice(order.total) }} {{ $t('products_currency') }}</div>
            <svg class="order-arrow" viewBox="0 0 24 24" width="20" height="20">
              <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="quick-actions glass">
        <div class="section-header">
          <h3>{{ $t('user_quick_actions') }}</h3>
        </div>
        
        <div class="actions-grid">
          <router-link 
            v-for="action in quickActions" 
            :key="action.routeName"
            :to="{ name: action.routeName, params: { lang: locale } }"
            class="action-card"
          >
            <span class="action-icon">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </router-link>
        </div>
      </div>
    </div>

        <div class="support-tickets glass">
      <div class="section-header">
        <h3>💬 {{ $t('user_support_tickets') }}</h3>
        <router-link :to="{ name: 'UserTickets', params: { lang: locale } }" class="view-all">{{ $t('user_view_all') }}</router-link>
      </div>

      <div v-if="isLoadingTickets" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ $t('loading') }}</span>
      </div>

      <div v-else-if="supportTickets.length === 0" class="empty-state">
        <span class="empty-icon">💬</span>
        <p>{{ $t('user_no_tickets') }}</p>
        <router-link :to="{ name: 'UserTickets', params: { lang: locale } }" class="browse-btn">{{ $t('user_new_ticket') }}</router-link>
      </div>

      <div v-else class="tickets-preview">
        <router-link
          v-for="ticket in supportTickets.slice(0, 3)"
          :key="ticket._id"
          :to="{ name: 'UserTickets', params: { lang: locale } }"
          class="ticket-preview-item"
        >
          <div class="tp-main">
            <span class="tp-subject">{{ ticket.subject }}</span>
            <span class="tp-date">{{ formatDate(ticket.updatedAt) }}</span>
          </div>
          <span class="tp-status" :class="ticket.status">{{ statusLabels[ticket.status] || ticket.status }}</span>
        </router-link>
      </div>
    </div>

  </div>
</template>

<style scoped>
.user-dashboard { display: flex; flex-direction: column; gap: 24px; }
.welcome-card { display: flex; justify-content: space-between; align-items: center; padding: 30px; border-radius: 20px; background: linear-gradient(135deg, rgba(197, 160, 89, 0.15), rgba(5, 8, 20, 0.9)); border: 1px solid rgba(197, 160, 89, 0.3); }
.welcome-content h2 { font-size: 1.5rem; margin: 0 0 8px; }
.welcome-content p { font-size: 0.9rem; opacity: 0.8; margin: 0; max-width: 500px; line-height: 1.7; }
.welcome-art { font-size: 4rem; opacity: 0.8; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.stat-card { display: flex; align-items: center; gap: 16px; padding: 24px; border-radius: 16px; background: rgba(5, 8, 20, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; }
.stat-card:hover { border-color: var(--accent); transform: translateY(-4px); }
.stat-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 0.85rem; opacity: 0.7; }
.dashboard-content { display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; }
.recent-orders, .quick-actions, .support-tickets { padding: 24px; border-radius: 20px; background: rgba(5, 8, 20, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header h3 { font-size: 1.1rem; margin: 0; }
.view-all { font-size: 0.85rem; color: #facc6b; text-decoration: none; }
.view-all:hover { text-decoration: underline; }
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5); }
.empty-icon { font-size: 3rem; margin-bottom: 12px; display: block; }
.browse-btn { display: inline-block; margin-top: 12px; padding: 8px 16px; background: linear-gradient(135deg, #c5a059, #8f7032); border-radius: 8px; color: #000; text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: all 0.2s ease; }
.browse-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197, 160, 89, 0.5); }
.orders-list { display: flex; flex-direction: column; gap: 12px; }
.order-item { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; background: rgba(30, 41, 59, 0.5); transition: all 0.2s ease; cursor: pointer; }
.order-item:hover { background: rgba(30, 41, 59, 0.8); }
.order-info { flex: 1; }
.order-id { display: block; font-size: 0.95rem; font-weight: 600; margin-bottom: 2px; }
.order-date { font-size: 0.8rem; opacity: 0.6; }
.order-status { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 0.8rem; }
.order-total { font-size: 0.9rem; font-weight: 600; color: #fbbf24; }
.order-arrow { opacity: 0.4; }
.actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.action-card { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; background: rgba(30, 41, 59, 0.5); text-decoration: none; transition: all 0.2s ease; }
.action-card:hover { background: rgba(30, 41, 59, 0.8); transform: translateY(-2px); }
.action-icon { font-size: 1.5rem; }
.action-label { font-size: 0.9rem; color: #e0e0e0; }

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-content { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .welcome-card { flex-direction: column; text-align: center; gap: 16px; }
  .actions-grid { grid-template-columns: 1fr; }
}

.tickets-preview { display: flex; flex-direction: column; gap: 10px; }
.ticket-preview-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 12px; background: rgba(30, 41, 59, 0.5); text-decoration: none; color: #fff; transition: all 0.2s ease; }
.ticket-preview-item:hover { background: rgba(30, 41, 59, 0.8); }
.tp-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.tp-subject { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tp-date { font-size: 0.78rem; opacity: 0.6; }
.tp-status { font-size: 0.75rem; padding: 4px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.tp-status.open { background: rgba(245,158,11,0.15); color: #f59e0b; }
.tp-status.in_progress { background: rgba(59,130,246,0.15); color: #3b82f6; }
.tp-status.resolved { background: rgba(34,197,94,0.15); color: #22c55e; }
.tp-status.closed { background: rgba(156,163,175,0.15); color: #9ca3af; }
</style>