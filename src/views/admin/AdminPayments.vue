<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const payments = ref([])
const statusFilter = ref('all')
const processingId = ref(null)

const statusColors = {
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'پرداخت شده' },
  pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'در انتظار' },
  processing: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', text: 'در حال پردازش' },
  failed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'ناموفق' },
  refunded: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'بازگشت وجه' },
}

const methodLabels = {
  online: 'آنلاین',
  cod: 'پرداخت در محل',
  wallet: 'کیف پول',
}

const tabs = [
  { label: 'همه', value: 'all' },
  { label: 'پرداخت شده', value: 'paid' },
  { label: 'در انتظار', value: 'pending' },
  { label: 'بازگشت وجه', value: 'refunded' },
]

const fetchPayments = async () => {
  loading.value = true
  try {
    const res = await adminApi.getPayments()
    if (res.success) payments.value = res.data
  } catch (err) {
    console.error('خطا در دریافت پرداخت‌ها:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchPayments)

const filteredPayments = computed(() => {
  if (statusFilter.value === 'all') return payments.value
  return payments.value.filter(p => p.status === statusFilter.value)
})

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fa-IR') : '-'

const verifyPayment = async (pay) => {
  const id = pay._id || pay.id
  processingId.value = id
  try {
    const res = await adminApi.verifyPayment(id)
    if (!res.success) throw new Error(res.message)
    pay.status = 'paid'
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    processingId.value = null
  }
}

const refundPayment = async (pay) => {
  if (!confirm('آیا از بازگشت وجه این تراکنش مطمئن هستید؟')) return
  const id = pay._id || pay.id
  processingId.value = id
  try {
    const res = await adminApi.refundPayment(id)
    if (!res.success) throw new Error(res.message)
    pay.status = 'refunded'
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="admin-payments">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت پرداخت‌ها</h1>
        <p class="page-subtitle">پیگیری و تایید تراکنش‌های پرداختی</p>
      </div>
      <div class="header-stats">
        <span class="stat-pill">{{ payments.length }} تراکنش</span>
      </div>
    </div>

    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: statusFilter === tab.value }" @click="statusFilter = tab.value">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="glass-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>شناسه پرداخت</th>
              <th>شماره سفارش</th>
              <th>مشتری</th>
              <th>مبلغ</th>
              <th>روش پرداخت</th>
              <th>ارائه‌دهنده</th>
              <th>وضعیت</th>
              <th>کد مرجع</th>
              <th>تاریخ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pay in filteredPayments" :key="pay._id">
              <td class="font-mono">{{ (pay._id || '').toString().slice(-8) }}</td>
              <td class="font-mono">{{ pay.order?.orderRef || '-' }}</td>
              <td>{{ pay.user?.name || 'نامشخص' }}</td>
              <td class="font-mono">{{ pay.amount.toLocaleString('fa-IR') }} <small>تومان</small></td>
              <td>{{ methodLabels[pay.method] || pay.method }}</td>
              <td>{{ pay.provider || '-' }}</td>
              <td>
                <span class="status-badge" :style="{ background: statusColors[pay.status]?.bg, color: statusColors[pay.status]?.color }">
                  {{ statusColors[pay.status]?.text || pay.status }}
                </span>
              </td>
              <td class="font-mono">{{ pay.refId || '-' }}</td>
              <td class="text-muted">{{ formatDate(pay.createdAt) }}</td>
              <td>
                <div class="action-btns">
                  <button v-if="pay.status === 'pending'" class="action-btn verify" :disabled="processingId === (pay._id || pay.id)" @click="verifyPayment(pay)">تایید</button>
                  <button v-if="pay.status === 'paid'" class="action-btn refund" :disabled="processingId === (pay._id || pay.id)" @click="refundPayment(pay)">بازگشت وجه</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPayments.length === 0">
              <td colspan="10" class="empty-row">
                <span class="empty-icon">💳</span>
                <span>تراکنشی یافت نشد</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-payments {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  opacity: 0.5;
  margin: 4px 0 0;
}

.header-stats {
  display: flex;
  gap: 8px;
}

.stat-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(197,160,89,0.1);
  color: #facc6b;
  font-size: 0.85rem;
  font-weight: 500;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  background: rgba(255,255,255,0.06);
}

.tab.active {
  background: rgba(197,160,89,0.15);
  border-color: rgba(197,160,89,0.5);
  color: #facc6b;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: rgba(255,255,255,0.5);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(197,160,89,0.2);
  border-top-color: #c5a059;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.glass-card {
  border-radius: 16px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06);
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  text-align: right;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  white-space: nowrap;
}

.data-table th {
  font-size: 0.8rem;
  opacity: 0.5;
  font-weight: 500;
}

.data-table tbody tr:hover {
  background: rgba(255,255,255,0.02);
}

.font-mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  opacity: 0.8;
}

.status-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.text-muted {
  opacity: 0.5;
  font-size: 0.85rem;
}

.action-btns {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.action-btn.verify {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
}

.action-btn.verify:hover {
  background: rgba(34,197,94,0.25);
}

.action-btn.refund {
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
}

.action-btn.refund:hover {
  background: rgba(245,158,11,0.25);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-row {
  text-align: center;
  padding: 60px !important;
  color: rgba(255,255,255,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 2.5rem;
}
</style>
