<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const payments = ref([])
const statusFilter = ref('all')
const processingId = ref(null)
const searchQuery = ref('')
const total = ref(0)
const refundBox = ref({ open: false, step: 1, payment: null, agreed: false })

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
    const params = { limit: 50 }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    const res = await adminApi.getPayments(params)
    if (res.success) {
      payments.value = res.data
      total.value = res.total ?? res.data.length
    }
  } catch (err) {
    console.error('خطا در دریافت پرداخت‌ها:', err)
  } finally {
    loading.value = false
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  fetchPayments()
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

/* ---------- بازگشت وجه با تأیید دو مرحله‌ای (الزام اسنپ‌پی) ---------- */
const askRefund = (pay) => {
  refundBox.value = { open: true, step: 1, payment: pay, agreed: false }
}

const doRefund = async () => {
  const pay = refundBox.value.payment
  if (!pay) return
  const id = pay._id || pay.id
  processingId.value = id
  try {
    const res = await adminApi.refundPayment(id)
    if (!res.success) throw new Error(res.message)
    pay.status = 'refunded'
    refundBox.value.open = false
    alert('بازگشت وجه با موفقیت ثبت شد ✅')
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
        <span class="stat-pill">{{ total || payments.length }} تراکنش</span>
      </div>
    </div>

    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: statusFilter === tab.value }" @click="statusFilter = tab.value; fetchPayments()">
        {{ tab.label }}
      </button>
    </div>

    <!-- جستجوی پرداخت بر اساس کد مرجع / شماره سفارش / توکن -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="کد مرجع، شماره سفارش (NM-…) یا توکن پرداخت…"
        @keyup.enter="fetchPayments"
      />
      <button class="search-btn" :disabled="loading" @click="fetchPayments">جستجو</button>
      <button v-if="searchQuery" class="search-clear" @click="clearSearch">✕ پاک‌کردن</button>
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
                  <button v-if="pay.status === 'paid'" class="action-btn refund" :disabled="processingId === (pay._id || pay.id)" @click="askRefund(pay)">بازگشت وجه</button>
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

    <!-- پاپ‌آپ تأیید دو مرحله‌ای بازگشت وجه (الزام اسنپ‌پی) -->
    <div v-if="refundBox.open" class="modal-overlay" @click.self="refundBox.open = false">
      <div class="modal-content">
        <div class="confirm-steps">
          <span class="step" :class="{ active: refundBox.step === 1, done: refundBox.step === 2 }">۱. بررسی</span>
          <span class="step" :class="{ active: refundBox.step === 2 }">۲. تأیید نهایی</span>
        </div>
        <h3 class="modal-title">بازگشت وجه پرداخت</h3>

        <!-- مرحله ۱: بررسی اطلاعات -->
        <template v-if="refundBox.step === 1">
          <div class="refund-summary">
            <div class="row"><span>شماره سفارش:</span><strong class="font-mono">{{ refundBox.payment?.order?.orderRef || '-' }}</strong></div>
            <div class="row"><span>کد مرجع:</span><strong class="font-mono">{{ refundBox.payment?.refId || '-' }}</strong></div>
            <div class="row"><span>مبلغ:</span><strong>{{ refundBox.payment?.amount?.toLocaleString('fa-IR') }} تومان</strong></div>
            <div class="row"><span>درگاه:</span><strong>{{ refundBox.payment?.provider || '-' }}</strong></div>
          </div>
          <p class="modal-note">
            با ثبت بازگشت وجه، وضعیت پرداخت و سفارش «عودت داده شده» می‌شود، تخفیف مصرف‌شده برمی‌گردد و موجودی کالاها به انبار برمی‌گردد.
          </p>
          <div class="modal-btns">
            <button class="btn-ghost" @click="refundBox.open = false">انصراف</button>
            <button class="btn-gold" @click="refundBox.step = 2">ادامه به تأیید نهایی ←</button>
          </div>
        </template>

        <!-- مرحله ۲: تأیید نهایی -->
        <template v-else>
          <label class="confirm-check">
            <input v-model="refundBox.agreed" type="checkbox" />
            <span>می‌دانم این عملیات <strong>بازگشت وجه قطعی</strong> است و پس از انجام، قابل لغو نیست.</span>
          </label>
          <div class="modal-btns">
            <button class="btn-ghost" @click="refundBox.step = 1">→ بازگشت</button>
            <button class="btn-danger" :disabled="processingId !== null || !refundBox.agreed" @click="doRefund">
              {{ processingId !== null ? 'در حال انجام...' : 'بله، بازگشت وجه نهایی شود' }}
            </button>
          </div>
        </template>
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

/* ---------- جستجو ---------- */
.search-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.search-input {
  flex: 1;
  min-width: 220px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(5,8,20,0.6);
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
}
.search-input:focus { border-color: rgba(197,160,89,0.5); }
.search-input::placeholder { color: rgba(255,255,255,0.35); }
.search-btn {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: #c5a059;
  color: #1a1408;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}
.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.search-clear {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}

/* ---------- پاپ‌آپ تأیید دو مرحله‌ای ---------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-content {
  width: 100%;
  max-width: 460px;
  border-radius: 16px;
  background: rgba(5,8,20,0.95);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal-title { margin: 0; font-size: 1.05rem; color: #facc6b; }
.confirm-steps { display: flex; gap: 8px; }
.confirm-steps .step {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  border-radius: 8px;
  font-size: 0.78rem;
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.4);
}
.confirm-steps .step.active {
  border-color: rgba(250,204,107,0.6);
  color: #facc6b;
  background: rgba(197,160,89,0.1);
}
.confirm-steps .step.done {
  border-color: rgba(34,197,94,0.5);
  color: #22c55e;
}
.refund-summary { display: flex; flex-direction: column; gap: 8px; }
.refund-summary .row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  font-size: 0.88rem;
}
.modal-note { margin: 0; font-size: 0.85rem; line-height: 1.9; opacity: 0.75; }
.confirm-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.3);
  font-size: 0.85rem;
  line-height: 1.8;
  cursor: pointer;
}
.confirm-check input { margin-top: 6px; accent-color: #ef4444; cursor: pointer; }
.modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
.btn-ghost {
  padding: 9px 18px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}
.btn-gold {
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #a8823f);
  color: #1a1408;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.btn-danger {
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
