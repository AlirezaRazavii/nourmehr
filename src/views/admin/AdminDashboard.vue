<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const stats = ref(null)
const loadError = ref('')
const revenueData = ref([])
const topProducts = ref([])
const recentOrders = ref([])

const statusColors = {
  pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'در انتظار' },
  processing: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', text: 'در حال پردازش' },
  shipped: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', text: 'ارسال شده' },
  delivered: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'تحویل داده شده' },
  cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'لغو شده' },
  paid: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'پرداخت شده' },
  pending_payment: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'در انتظار پرداخت' },
  refunded: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'بازگشت وجه' },
}

onMounted(async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await adminApi.getDashboardStats()
    if (res.success) {
      stats.value = res.data
      revenueData.value = res.data.weeklyRevenue || []
      topProducts.value = res.data.topProducts || []
      recentOrders.value = res.data.recentOrders || []
    } else {
      loadError.value = res.message || 'دریافت آمار داشبورد با خطا مواجه شد'
    }
  } catch (err) {
    loadError.value = err.response?.data?.message || err.message || 'ارتباط با سرور برقرار نشد'
  } finally {
    loading.value = false
  }
})

const formatPrice = (n) => Number(n).toLocaleString('fa-IR')

// ارتفاع میله‌ها نسبت به بیشترین مقدار هفته مقیاس می‌شود و هیچ‌وقت از کادر بیرون نمی‌زند
const maxRevenue = computed(() => Math.max(1, ...revenueData.value.map(d => Number(d.value) || 0)))
const barHeight = (v) => Math.min(90, Math.round(((Number(v) || 0) / maxRevenue.value) * 90)) + '%'
</script>

<template>
  <div class="admin-dashboard">
    <div class="page-header">
      <div>
        <h1 class="page-title">داشبورد مدیریت</h1>
        <p class="page-subtitle">نمای کلی عملکرد فروشگاه نورمهر</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else-if="loadError" class="loading-state">
      <span style="font-size:2.5rem">⚠️</span>
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="stats" class="dashboard-content">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon revenue">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ formatPrice(stats.revenue.today) }}</span>
            <span class="kpi-label">درآمد امروز (تومان)</span>
          </div>
          <div class="kpi-trend up">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
            {{ stats.revenue.growth }}٪
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon orders">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ stats.orders.total }}</span>
            <span class="kpi-label">کل سفارشات</span>
          </div>
          <div class="kpi-sub">
            <span class="kpi-sub-item pending">{{ stats.orders.pending }} در انتظار</span>
            <span class="kpi-sub-item processing">{{ stats.orders.processing }} پردازش</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon users">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ stats.users.total }}</span>
            <span class="kpi-label">کل کاربران</span>
          </div>
          <div class="kpi-sub">
            <span class="kpi-sub-item up">+{{ stats.users.newToday }} امروز</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon tickets">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ stats.tickets.total }}</span>
            <span class="kpi-label">تیکت‌های پشتیبانی</span>
          </div>
          <div class="kpi-sub">
            <span class="kpi-sub-item pending">{{ stats.tickets.open }} باز</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon products">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ stats.products.total }}</span>
            <span class="kpi-label">محصولات</span>
          </div>
          <div class="kpi-sub">
            <span class="kpi-sub-item danger">{{ stats.products.outOfStock }} اتمام موجودی</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon discount">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ formatPrice(stats.revenue.month) }}</span>
            <span class="kpi-label">درآمد ماهانه (تومان)</span>
          </div>
          <div class="kpi-trend up">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
            {{ stats.revenue.growth }}٪
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="glass-card">
          <div class="card-header">
            <h3>درآمد ۷ روز گذشته</h3>
            <span class="card-badge">هفتگی</span>
          </div>
          <div class="chart-container">
            <div class="chart-bars">
              <div v-for="item in revenueData" :key="item.day" class="bar-group">
                <div class="bar-wrapper">
                  <div class="bar" :style="{ height: barHeight(item.value) }">
                    <span class="bar-value">{{ formatPrice(item.value) }}</span>
                  </div>
                </div>
                <span class="bar-label">{{ item.day }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div class="card-header">
            <h3>پرفروش‌ترین محصولات</h3>
            <span class="card-badge">ماهانه</span>
          </div>
          <div class="top-products-list">
            <div v-for="(product, idx) in topProducts" :key="product._id" class="product-rank-item">
              <span class="rank-num" :class="{ top: idx < 3 }">{{ idx + 1 }}</span>
              <div class="product-rank-info">
                <span class="product-rank-name">{{ product.name }}</span>
                <span class="product-rank-sales">{{ product.sales }} فروش</span>
              </div>
              <span class="product-rank-revenue">{{ formatPrice(product.revenue) }} ت</span>
            </div>
          </div>
        </div>

        <div class="glass-card wide">
          <div class="card-header">
            <h3>سفارشات اخیر</h3>
            <router-link to="/admin/orders" class="view-all">مشاهده همه</router-link>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>شماره سفارش</th>
                  <th>مشتری</th>
                  <th>مبلغ</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td class="font-mono">{{ order.id }}</td>
                  <td>{{ order.customer }}</td>
                  <td class="font-mono">{{ formatPrice(order.total) }} ت</td>
                  <td>
                    <span class="status-badge" :style="{ background: statusColors[order.status]?.bg, color: statusColors[order.status]?.color }">
                      {{ statusColors[order.status]?.text }}
                    </span>
                  </td>
                  <td class="text-muted">{{ order.date }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  opacity: 0.6;
  margin: 4px 0 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: rgba(255,255,255,0.5);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(197,160,89,0.2);
  border-top-color: #c5a059;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden; /* جلوگیری از بیرون زدن محتوا */
}

.kpi-card:hover {
  border-color: rgba(197,160,89,0.3);
  transform: translateY(-2px);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon.revenue { background: rgba(197,160,89,0.15); color: #facc6b; }
.kpi-icon.orders { background: rgba(59,130,246,0.15); color: #60a5fa; }
.kpi-icon.users { background: rgba(34,197,94,0.15); color: #4ade80; }
.kpi-icon.tickets { background: rgba(245,158,11,0.15); color: #fbbf24; }
.kpi-icon.products { background: rgba(139,92,246,0.15); color: #a78bfa; }
.kpi-icon.discount { background: rgba(236,72,153,0.15); color: #f472b6; }

.kpi-info {
  min-width: 0;
}

.kpi-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-label {
  font-size: 0.8rem;
  opacity: 0.6;
}

.kpi-sub {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.kpi-sub-item {
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.7);
}

.kpi-sub-item.pending { background: rgba(245,158,11,0.1); color: #fbbf24; }
.kpi-sub-item.processing { background: rgba(59,130,246,0.1); color: #60a5fa; }
.kpi-sub-item.up { background: rgba(34,197,94,0.1); color: #4ade80; }
.kpi-sub-item.danger { background: rgba(239,68,68,0.1); color: #f87171; }

.kpi-trend {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.kpi-trend.up { color: #22c55e; background: rgba(34,197,94,0.1); padding: 3px 8px; border-radius: 999px; }

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}

.glass-card {
  padding: 24px;
  border-radius: 20px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden; /* مهم برای جلوگیری از بیرون زدن جدول و چارت */
}

.glass-card.wide {
  grid-column: 1 / -1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.card-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(197,160,89,0.1);
  color: #facc6b;
}

.view-all {
  font-size: 0.85rem;
  color: #facc6b;
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.chart-container {
  height: 250px;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  width: 100%;
  height: 100%;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
  justify-content: flex-end;
  min-width: 0; /* جلوگیری از شکست گرید */
}

.bar-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  max-width: 50px;
  background: linear-gradient(to top, rgba(197,160,89,0.3), rgba(197,160,89,0.8));
  border-radius: 6px 6px 0 0;
  position: relative;
  transition: all 0.3s ease;
  min-height: 8px;
  margin: 0 auto;
}

.bar:hover {
  background: linear-gradient(to top, rgba(197,160,89,0.5), #c5a059);
}

.bar-value {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  pointer-events: none;
}

.bar-label {
  font-size: 0.75rem;
  opacity: 0.5;
  white-space: nowrap;
}

.top-products-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  transition: background 0.2s ease;
}

.product-rank-item:hover {
  background: rgba(255,255,255,0.06);
}

.rank-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}

.rank-num.top {
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
}

.product-rank-info {
  flex: 1;
  min-width: 0; /* کلید حل مشکل متن‌های طولانی در فلکس باکس */
}

.product-rank-name {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* نام محصول طولانی نقطه چین می‌شود */
}

.product-rank-sales {
  font-size: 0.75rem;
  opacity: 0.5;
}

.product-rank-revenue {
  font-size: 0.85rem;
  font-weight: 600;
  color: #facc6b;
  white-space: nowrap;
  flex-shrink: 0; /* جلوگیری از فشرده شدن این بخش */
}

.table-wrapper {
  width: 100%;
  overflow-x: auto; /* ایجاد اسکرول افقی در موبایل برای جدول */
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  min-width: 600px; /* حداقل عرض برای اینکه ستون‌ها به هم نریزند */
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
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table tbody tr {
  transition: background 0.2s ease;
}

.data-table tbody tr:hover {
  background: rgba(255,255,255,0.03);
}

.font-mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  opacity: 0.8;
}

.text-muted {
  opacity: 0.5;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* ─── Responsive Media Queries ─── */
@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .glass-card {
    padding: 16px;
  }
  
  .chart-container {
    height: 200px;
  }
  
  /* مخفی کردن اعداد روی ستون‌ها در موبایل تا از کادر بیرون نزنند */
  .bar-value {
    display: none; 
  }
  
  .data-table th,
  .data-table td {
    padding: 12px 10px;
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
  }
  
  .kpi-trend {
    position: static;
    margin-top: 5px;
    display: inline-flex;
    width: fit-content;
  }
}
</style>