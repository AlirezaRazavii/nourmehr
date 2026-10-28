<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { adminApi } from '../../services/adminApi'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const orders = ref([])
const total = ref(0)
const statusFilter = ref('')
const selectedOrder = ref(null)

/* ---------- صفحه‌بندی ---------- */
const page = ref(1)
const pageSize = 20
const totalPages = ref(1)
const showDetail = ref(false)
const updatingStatus = ref(false)

/* ---------- جستجوی سفارش (شماره سفارش / کد تراکنش اسنپ‌پی / موبایل / نام) ---------- */
const searchQuery = ref('')
let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchOrders() }, 400)
})

/* ---------- اسنپ‌پی: مرجوع جزئی (Update) و مرجوع کل (Cancel) ---------- */
const refundQty = ref({})       // index آیتم → تعداد جدید
const snappayBusy = ref(false)
const confirmBox = ref({ open: false, title: '', message: '', action: null })

/* ---------- تشخیص «پس کرایه» برای سفارش‌ها ---------- */
const shippingInfoMap = ref({}) // id روش ارسال → { title, postPaid }

onMounted(async () => {
  try {
    const res = await adminApi.getSettings()
    const opts = res?.data?.shippingOptions || []
    shippingInfoMap.value = Object.fromEntries(
      opts.map(o => [o.id, { title: o.title, postPaid: o.postPaid !== false }])
    )
  } catch (e) {
    console.error('خطا در دریافت تنظیمات ارسال:', e)
  }
})

const shippingTitle = (id) => shippingInfoMap.value[id]?.title || ''

const isOrderPostPaid = (order) => {
  // سفارش‌های قدیمی که هزینه واقعی پرداخت شده بودند → همان هزینه نمایش داده می‌شود
  if (Number(order?.shippingCost || 0) > 0) return false
  const info = shippingInfoMap.value[order?.shippingInfo?.shippingMethod]
  if (info) return info.postPaid === true
  // روش نامشخص و بدون هزینه → چون فروشگاه پس‌کرایه‌ای است
  return true
}

const statusColors = {
  pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'در انتظار' },
  awaiting_payment: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'در انتظار پرداخت' },
  confirmed: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', text: 'تایید شده' },
  processing: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', text: 'در حال پردازش' },
  shipped: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', text: 'ارسال شده' },
  delivered: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'تحویل داده شده' },
  cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'لغو شده' },
  refunded: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'عودت داده شده' },
}

const tabs = [
  { label: 'همه', value: '' },
  { label: 'در انتظار', value: 'pending' },
  { label: 'تایید شده', value: 'confirmed' },
  { label: 'در حال پردازش', value: 'processing' },
  { label: 'ارسال شده', value: 'shipped' },
  { label: 'تحویل داده شده', value: 'delivered' },
  { label: 'لغو شده', value: 'cancelled' },
  { label: 'عودت داده شده', value: 'refunded' },
]

const statusOptions = [
  { value: 'pending', label: 'در انتظار' },
  { value: 'confirmed', label: 'تایید شده' },
  { value: 'processing', label: 'در حال پردازش' },
  { value: 'shipped', label: 'ارسال شده' },
  { value: 'delivered', label: 'تحویل داده شده' },
  { value: 'cancelled', label: 'لغو شده' },
  { value: 'refunded', label: 'عودت داده شده' },
]

const fetchOrders = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = { page: page.value, limit: pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    const res = await adminApi.getOrders(params)
    if (res.success) {
      orders.value = res.data || []
      total.value = res.total || 0
      totalPages.value = res.totalPages || 1
    } else {
      orders.value = []
      total.value = 0
      error.value = res.message || 'خطا در دریافت سفارشات'
    }
  } catch (err) {
    console.error(err)
    orders.value = []
    total.value = 0
    error.value = (err.response && err.response.data && err.response.data.message) || 'خطای سرور'
  } finally {
    loading.value = false
  }
}

// فیلتر وضعیت را با کوئری مسیر همگام کن (مثل /admin/orders?status=pending)
watch(() => route.query.status, () => { statusFilter.value = route.query.status || '' }, { immediate: true })
// تغییر فیلتر → برگرد به صفحه اول
watch(statusFilter, () => { page.value = 1 }, { immediate: true })
watch(statusFilter, fetchOrders, { immediate: true })

/* ---------- کنترل صفحه‌بندی ---------- */
const goToPage = (p) => {
  const target = Math.min(Math.max(1, p), totalPages.value)
  if (target === page.value) return
  page.value = target
  fetchOrders()
}

// شماره صفحه‌ها با «...»: ۱ ... ۴ ۵ ۶ ... ۹
const visiblePages = computed(() => {
  const t = totalPages.value
  const c = page.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const list = [1]
  if (c > 3) list.push('...')
  for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) list.push(i)
  if (c < t - 2) list.push('...')
  list.push(t)
  return list
})

const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize + 1))
const rangeEnd = computed(() => Math.min(page.value * pageSize, total.value))

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fa-IR') : '-'

// نام آیتم سفارش — هم رشته ساده (سفارش‌های جدید) هم آبجکت دوزبانه (سفارش‌های قدیمی)
const itemName = (name) => {
  if (!name) return '—'
  if (typeof name === 'string') return name
  return name.fa || name.en || ''
}

const openDetail = (order) => {
  selectedOrder.value = order
  // فرم رهگیری را با مقدار فعلی سفارش پر کن
  trackingForm.value = {
    code: order.tracking?.code || '',
    carrier: order.tracking?.carrier || ''
  }
  // فرم مرجوعی اسنپ‌پی را با تعداد فعلی پر کن
  refundQty.value = {}
  order.items.forEach((it, idx) => { refundQty.value[idx] = it.quantity })
  showDetail.value = true
}

/* ---------- کد رهگیری و شرکت حمل ---------- */
const trackingForm = ref({ code: '', carrier: '' })
const savingTracking = ref(false)

const canSetTracking = (order) =>
  ['confirmed', 'processing', 'shipped', 'delivered'].includes(order?.status)

const saveTracking = async () => {
  if (!trackingForm.value.code.trim()) {
    alert('کد رهگیری را وارد کنید')
    return
  }
  savingTracking.value = true
  try {
    const id = selectedOrder.value._id || selectedOrder.value.id
    const res = await adminApi.updateOrderTracking(id, {
      code: trackingForm.value.code.trim(),
      carrier: trackingForm.value.carrier.trim()
    })
    if (!res.success) throw new Error(res.message || 'خطا در ذخیره رهگیری')

    // به‌روزرسانی در جزئیات و لیست
    const tracking = res.data?.tracking || {
      code: trackingForm.value.code.trim(),
      carrier: trackingForm.value.carrier.trim()
    }
    selectedOrder.value = { ...selectedOrder.value, tracking }
    const idx = orders.value.findIndex(o => (o._id || o.id) === id)
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], tracking }

    alert('اطلاعات رهگیری ذخیره شد ✅')
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    savingTracking.value = false
  }
}

/* ---------- گارد گزینه‌های وضعیت (هماهنگ با بک‌اند گام ۵) ---------- */
const isStatusDisabled = (optionValue) => {
  const order = selectedOrder.value
  if (!order) return false
  const current = order.status

  // سفارش لغو/عودت‌شده قابل تغییر نیست
  if (['cancelled', 'refunded'].includes(current)) return optionValue !== current

  // جریان ارسال/تحویل فقط با پرداخت موفق
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(optionValue)
      && order.paymentStatus !== 'paid') return true

  // عودت فقط برای پرداخت‌شده‌ها
  if (optionValue === 'refunded' && order.paymentStatus !== 'paid') return true

  return false
}

const changeOrderStatus = async (newStatus) => {
  if (!selectedOrder.value) return
  updatingStatus.value = true
  try {
    const id = selectedOrder.value._id || selectedOrder.value.id
    const res = await adminApi.updateOrderStatus(id, newStatus)
    if (!res.success) throw new Error(res.message || 'خطا در تغییر وضعیت')
    selectedOrder.value.status = newStatus
    const idx = orders.value.findIndex(o => (o._id || o.id) === id)
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], status: newStatus }
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    updatingStatus.value = false
  }
}

/* ---------- برچسب درگاه پرداخت ---------- */
const paymentMethodLabel = (m) => ({
  online: 'زرین‌پال', cod: 'پس کرایه', wallet: 'کیف پول', torobpay: 'توروب‌پی', snappay: 'اسنپ‌پی',
}[m] || m || '—')

/* ---------- کپی (کد تراکنش / paymentToken) ---------- */
const copyText = async (t) => {
  try {
    await navigator.clipboard.writeText(t)
    alert('کپی شد ✅')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = t
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    alert('کپی شد ✅')
  }
}

/* ---------- اسنپ‌پی: مرجوع جزئی/کل ---------- */
const isSnappayPaid = (o) =>
  o?.paymentMethod === 'snappay' &&
  o?.paymentStatus === 'paid' &&
  !['cancelled', 'refunded'].includes(o?.status)

const clampedQty = (item, idx) =>
  Math.max(0, Math.min(item.quantity, Number(refundQty.value[idx] ?? item.quantity) || 0))

const computedNewTotal = computed(() => {
  const o = selectedOrder.value
  if (!o) return 0
  let sub = 0
  o.items.forEach((it, idx) => { sub += it.price * clampedQty(it, idx) })
  return sub - Math.min(Number(o.discountAmount || 0), sub) + Number(o.shippingCost || 0)
})

const askSnappayUpdate = () => {
  const o = selectedOrder.value
  if (!o.items.some((it, idx) => clampedQty(it, idx) !== it.quantity)) {
    alert('تعدادی را تغییر نداده‌اید')
    return
  }
  if (o.items.every((it, idx) => clampedQty(it, idx) === 0)) {
    alert('همه کالاها حذف می‌شوند — برای مرجوع کامل از دکمه «بازپرداخت کامل» استفاده کنید')
    return
  }
  const kept = o.items
    .map((it, idx) => ({ name: itemName(it.name), qty: clampedQty(it, idx) }))
    .filter((x) => x.qty > 0)
    .map((x) => `${x.name} × ${x.qty}`)
    .join(' | ')
  confirmBox.value = {
    open: true,
    title: 'تأیید ارسال تغییرات به اسنپ‌پی (Update)',
    message: `اقلام جدید: ${kept}\nمبلغ جدید سفارش: ${computedNewTotal.value.toLocaleString('fa-IR')} تومان\n\n⚠️ این عملیات سیستمی به اسنپ‌پی ارسال می‌شود و مبلغ قابل تسویه کاهش می‌یابد. این کار غیرقابل بازگشت است. ادامه می‌دهید؟`,
    action: applySnappayUpdate,
  }
}

const applySnappayUpdate = async () => {
  const o = selectedOrder.value
  if (!o) return
  snappayBusy.value = true
  try {
    const items = o.items.map((it, idx) => ({ index: idx, quantity: clampedQty(it, idx) }))
    const res = await adminApi.updateSnappayOrder(o._id || o.id, { items })
    if (!res.success) throw new Error(res.message || 'اسنپ‌پی تغییرات را نپذیرفت')
    if (res.data) {
      selectedOrder.value = res.data
      const idx = orders.value.findIndex((x) => (x._id || x.id) === (o._id || o.id))
      if (idx !== -1) orders.value[idx] = res.data
    }
    confirmBox.value.open = false
    alert('تغییرات با موفقیت به اسنپ‌پی ارسال شد ✅')
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    snappayBusy.value = false
  }
}

const askSnappayCancel = () => {
  const o = selectedOrder.value
  confirmBox.value = {
    open: true,
    title: 'تأیید بازپرداخت کامل اسنپ‌پی (Cancel)',
    message: `کل مبلغ ${(o.total || 0).toLocaleString('fa-IR')} تومان به مشتری در اسنپ‌پی بازگردانده می‌شود و سفارش «عودت داده شده» می‌شود.\n\n⚠️ این عملیات غیرقابل بازگشت است. ادامه می‌دهید؟`,
    action: applySnappayCancel,
  }
}

const applySnappayCancel = async () => {
  const o = selectedOrder.value
  if (!o) return
  snappayBusy.value = true
  try {
    const res = await adminApi.cancelSnappayOrder(o._id || o.id)
    if (!res.success) throw new Error(res.message || 'بازپرداخت ناموفق بود')
    if (res.data) {
      selectedOrder.value = res.data
      const idx = orders.value.findIndex((x) => (x._id || x.id) === (o._id || o.id))
      if (idx !== -1) orders.value[idx] = res.data
    }
    confirmBox.value.open = false
    alert('بازپرداخت کامل انجام شد ✅')
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    snappayBusy.value = false
  }
}
</script>

<template>
  <div class="admin-orders">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت سفارشات</h1>
        <p class="page-subtitle">مشاهده و مدیریت تمام سفارشات ثبت شده</p>
      </div>
      <div class="header-stats">
        <span class="stat-pill">{{ total || 0 }} سفارش کل</span>
      </div>
    </div>

    <div class="filters-bar">
      <div class="tabs">
        <button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: statusFilter === tab.value }" @click="statusFilter = tab.value">
          {{ tab.label }}
        </button>
      </div>
      <input v-model="searchQuery" type="search" class="search-input" placeholder="🔍 جستجو: شماره سفارش، کد تراکنش اسنپ‌پی، موبایل، نام مشتری" />
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
              <th>شماره سفارش</th>
              <th>مشتری</th>
              <th>اقلام</th>
              <th>مبلغ کل</th>
              <th>پرداخت</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order._id">
              <td class="font-mono">
                {{ order.orderRef }}
                <span v-if="order.paymentRefId" class="ref-id-chip" title="کد تراکنش — کلیک = کپی" @click="copyText(order.paymentRefId)">{{ order.paymentRefId }}</span>
              </td>
              <td>
                <div class="customer-cell">
                  <span class="customer-name">{{ order.user?.name || order.shippingInfo?.fullName || 'نامشخص' }}</span>
                  <span class="customer-phone">{{ order.user?.phone || order.shippingInfo?.phone || '-' }}</span>
                </div>
              </td>
              <td>
                <div class="items-cell">
                  <span v-for="(item, idx) in order.items" :key="idx" class="item-tag">
                    {{ itemName(item.name) }} × {{ item.quantity }}
                  </span>
                </div>
              </td>
              <td class="font-mono">{{ (order.total || 0).toLocaleString('fa-IR') }} <small>تومان</small></td>
              <td>
                <span class="payment-badge" :class="order.paymentStatus">{{ paymentMethodLabel(order.paymentMethod) }}</span>
              </td>
              <td>
                <span class="status-badge" :style="{ background: statusColors[order.status]?.bg, color: statusColors[order.status]?.color }">
                  {{ statusColors[order.status]?.text }}
                </span>
              </td>
              <td class="text-muted">{{ formatDate(order.createdAt) }}</td>
              <td>
                <button class="action-btn view" @click="openDetail(order)">جزئیات</button>
              </td>
            </tr>
            <tr v-if="orders.length === 0">
              <td colspan="8" class="empty-row">
                <span class="empty-icon">📦</span>
                <span>سفارشی یافت نشد</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- صفحه‌بندی -->
      <div v-if="total > pageSize" class="pagination-bar">
        <span class="pagination-info">
          نمایش {{ rangeStart.toLocaleString('fa-IR') }} تا {{ rangeEnd.toLocaleString('fa-IR') }} از {{ total.toLocaleString('fa-IR') }} سفارش
        </span>
        <div class="pagination-btns">
          <button class="page-btn" :disabled="page <= 1 || loading" @click="goToPage(page - 1)">قبلی</button>
          <template v-for="(p, idx) in visiblePages" :key="idx">
            <span v-if="p === '...'" class="page-dots">…</span>
            <button v-else class="page-btn" :class="{ active: p === page }" :disabled="loading" @click="goToPage(p)">
              {{ p.toLocaleString('fa-IR') }}
            </button>
          </template>
          <button class="page-btn" :disabled="page >= totalPages || loading" @click="goToPage(page + 1)">بعدی</button>
        </div>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <Transition name="modal">
      <div v-if="showDetail && selectedOrder" class="modal-overlay" @click.self="showDetail = false">
        <div class="modal-content glass">
          <div class="modal-header">
            <div>
              <h2>سفارش #{{ selectedOrder.orderRef }}</h2>
              <p class="modal-subtitle">{{ formatDate(selectedOrder.createdAt) }}</p>
            </div>
            <button class="modal-close" @click="showDetail = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="order-info-bar">
              <div class="info-chip">
                <span class="info-label">مشتری:</span>
                <span>{{ selectedOrder.user?.name || selectedOrder.shippingInfo?.fullName }}</span>
              </div>
              <div class="info-chip">
                <span class="info-label">تلفن:</span>
                <span>{{ selectedOrder.user?.phone || selectedOrder.shippingInfo?.phone }}</span>
              </div>
              <div class="info-chip" v-if="selectedOrder.paymentMethod">
                <span class="info-label">درگاه:</span>
                <span>{{ paymentMethodLabel(selectedOrder.paymentMethod) }}</span>
              </div>
              <div class="info-chip" v-if="selectedOrder.paymentRefId">
                <span class="info-label">کد تراکنش:</span>
                <span class="mono-ltr">{{ selectedOrder.paymentRefId }}</span>
                <button class="copy-mini" @click="copyText(selectedOrder.paymentRefId)">کپی</button>
              </div>
              <div class="info-chip" v-if="selectedOrder.paymentMethod === 'snappay' && selectedOrder.paymentToken">
                <span class="info-label">paymentToken:</span>
                <span class="mono-ltr token-clip">{{ selectedOrder.paymentToken }}</span>
                <button class="copy-mini" @click="copyText(selectedOrder.paymentToken)">کپی</button>
              </div>
              <div class="info-chip" v-if="shippingTitle(selectedOrder.shippingInfo?.shippingMethod)">
                <span class="info-label">روش ارسال:</span>
                <span>{{ shippingTitle(selectedOrder.shippingInfo.shippingMethod) }}</span>
                <span v-if="isOrderPostPaid(selectedOrder)" class="postpaid-mini">پس کرایه</span>
              </div>
              <div class="info-chip">
                <span class="info-label">وضعیت:</span>
                <select :value="selectedOrder.status" class="inline-select" :disabled="updatingStatus" @change="changeOrderStatus($event.target.value)">
                  <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value" :disabled="isStatusDisabled(opt.value)">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <!-- چرا بعضی گزینه‌ها خاموش‌اند؟ -->
            <div v-if="selectedOrder.paymentStatus !== 'paid' && !['cancelled', 'refunded'].includes(selectedOrder.status)" class="status-warning">
              ⚠️ این سفارش هنوز <strong>پرداخت نشده</strong> — تا تکمیل پرداخت، فقط «در انتظار» و «لغو شده» قابل انتخاب است.
            </div>

            <div class="order-address">
              <strong>آدرس ارسال:</strong>
              <span>{{ selectedOrder.shippingInfo?.province }}، {{ selectedOrder.shippingInfo?.city }}، {{ selectedOrder.shippingInfo?.address }} - کدپستی: {{ selectedOrder.shippingInfo?.postalCode }}</span>
            </div>

            <!-- فرم رهگیری -->
            <div v-if="canSetTracking(selectedOrder)" class="tracking-section">
              <strong class="tracking-title">🚚 رهگیری مرسوله</strong>
              <div class="tracking-form">
                <input v-model="trackingForm.carrier" type="text" class="tracking-input" placeholder="شرکت حمل (پست، تیپاکس، اتوبوس...)" />
                <input v-model="trackingForm.code" type="text" class="tracking-input tracking-code-input" placeholder="کد رهگیری" dir="ltr" />
                <button class="tracking-save-btn" :disabled="savingTracking" @click="saveTracking">
                  {{ savingTracking ? '...' : 'ذخیره' }}
                </button>
              </div>
              <span v-if="selectedOrder.tracking?.code" class="tracking-current">
                ثبت‌شده فعلی: {{ selectedOrder.tracking.carrier || '—' }} | {{ selectedOrder.tracking.code }}
              </span>
              <span class="tracking-hint">پیشنهاد: همزمان وضعیت را «ارسال شده» بگذارید تا مشتری ببیند</span>
            </div>

            <!-- اسنپ‌پی: مرجوع جزئی / بازپرداخت کامل (الزامات پشتیبانی) -->
            <div v-if="isSnappayPaid(selectedOrder)" class="snappay-actions">
              <strong class="tracking-title">💳 بازگشت کالا و بازپرداخت اسنپ‌پی</strong>
              <span class="snappay-hint">تعداد جدید هر کالا را وارد کنید (۰ = حذف کامل). تغییرات به‌صورت سیستمی به اسنپ‌پی ارسال می‌شود.</span>
              <div v-for="(item, idx) in selectedOrder.items" :key="idx" class="refund-row">
                <span class="item-name">{{ itemName(item.name) }} <small v-if="item.size">({{ item.size }})</small></span>
                <span class="refund-current">فعلی: × {{ item.quantity }}</span>
                <input v-model.number="refundQty[idx]" type="number" min="0" :max="item.quantity" class="refund-input" />
              </div>
              <div class="snappay-new-total">
                مبلغ جدید: <strong>{{ computedNewTotal.toLocaleString('fa-IR') }} تومان</strong>
                (فعلی: {{ selectedOrder.total?.toLocaleString('fa-IR') }})
              </div>
              <div class="snappay-btns">
                <button class="snappay-update-btn" :disabled="snappayBusy" @click="askSnappayUpdate">
                  {{ snappayBusy ? 'در حال ارسال...' : 'ارسال تغییرات (Update)' }}
                </button>
                <button class="snappay-cancel-btn" :disabled="snappayBusy" @click="askSnappayCancel">بازپرداخت کامل (Cancel)</button>
              </div>
            </div>

            <div class="order-items-list">
              <div v-for="(item, idx) in selectedOrder.items" :key="idx" class="order-item-row">
                <span class="item-name">{{ itemName(item.name) }}</span>
                <span v-if="item.size" class="item-size-tag">سایز: {{ item.size }}</span>
                <span class="item-qty">× {{ item.quantity }}</span>
                <span class="item-price">{{ (item.price * item.quantity).toLocaleString('fa-IR') }} تومان</span>
              </div>
            </div>

            <div class="order-totals">
              <div class="total-row"><span>جمع جزئی:</span><span>{{ selectedOrder.subtotal?.toLocaleString('fa-IR') }} تومان</span></div>
              <div class="total-row" v-if="selectedOrder.discountAmount"><span>تخفیف:</span><span>-{{ selectedOrder.discountAmount.toLocaleString('fa-IR') }} تومان</span></div>
              <div class="total-row">
                <span>هزینه ارسال:</span>
                <span v-if="isOrderPostPaid(selectedOrder)" class="postpaid-text">پس کرایه (با گیرنده)</span>
                <span v-else>{{ selectedOrder.shippingCost?.toLocaleString('fa-IR') }} تومان</span>
              </div>
              <div class="total-row final"><span>مبلغ نهایی:</span><span>{{ selectedOrder.total?.toLocaleString('fa-IR') }} تومان</span></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- پاپ‌آپ تأییدیه مجدد (الزام اسنپ‌پی — عملیات غیرقابل بازگشت) -->
    <Transition name="modal">
      <div v-if="confirmBox.open" class="modal-overlay" @click.self="confirmBox.open = false">
        <div class="modal-content glass confirm-box">
          <h3 class="confirm-title">{{ confirmBox.title }}</h3>
          <p class="confirm-message">{{ confirmBox.message }}</p>
          <div class="confirm-btns">
            <button class="confirm-no" :disabled="snappayBusy" @click="confirmBox.open = false">انصراف</button>
            <button class="confirm-yes" :disabled="snappayBusy" @click="confirmBox.action && confirmBox.action()">
              {{ snappayBusy ? 'در حال انجام...' : 'بله، تأیید می‌کنم' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-orders {
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

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-weight: 500;
}

.customer-phone {
  font-size: 0.8rem;
  opacity: 0.5;
}

.items-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 200px;
}

.item-tag {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.8);
}

.font-mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  opacity: 0.8;
}

.payment-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.payment-badge.paid { background: rgba(34,197,94,0.15); color: #22c55e; }
.payment-badge.pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
.payment-badge.refunded { background: rgba(156,163,175,0.15); color: #9ca3af; }

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

.action-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.view {
  background: rgba(197,160,89,0.15);
  color: #facc6b;
}

.action-btn.view:hover {
  background: rgba(197,160,89,0.25);
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

/* هشدار وضعیت پرداخت‌نشده */
.status-warning {
  font-size: 0.82rem;
  line-height: 1.8;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.3);
  color: #fbbf24;
}

/* ---------- صفحه‌بندی ---------- */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.pagination-info { font-size: 0.82rem; opacity: 0.6; }
.pagination-btns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
}
.page-btn:hover:not(:disabled) { border-color: rgba(197,160,89,0.4); color: #facc6b; }
.page-btn.active {
  background: rgba(197,160,89,0.15);
  border-color: rgba(197,160,89,0.5);
  color: #facc6b;
  font-weight: 600;
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-dots { padding: 0 4px; opacity: 0.4; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 20px;
  padding: 0;
  background: rgba(5,8,20,0.97);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.modal-header h2 {
  font-size: 1.2rem;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.85rem;
  opacity: 0.5;
  margin: 4px 0 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255,255,255,0.1);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.order-info-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.info-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  font-size: 0.9rem;
}

.info-label {
  opacity: 0.5;
  font-size: 0.85rem;
}

.inline-select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
}

.inline-select option {
  background: #0a0d14;
  color: #fff;
}

.order-address {
  font-size: 0.9rem;
  line-height: 1.8;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
}

.order-address strong {
  display: block;
  margin-bottom: 4px;
  color: #facc6b;
  font-size: 0.85rem;
}

/* فرم رهگیری */
.tracking-section {
  font-size: 0.9rem;
  padding: 14px;
  border-radius: 12px;
  background: rgba(197,160,89,0.06);
  border: 1px dashed rgba(197,160,89,0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tracking-title { color: #facc6b; font-size: 0.85rem; }
.tracking-form { display: flex; gap: 8px; flex-wrap: wrap; }
.tracking-input {
  flex: 1;
  min-width: 140px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}
.tracking-input:focus { border-color: rgba(197,160,89,0.5); }
.tracking-code-input { direction: ltr; font-family: ui-monospace, monospace; }
.tracking-save-btn {
  padding: 9px 20px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}
.tracking-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tracking-current { font-size: 0.8rem; color: #facc6b; }
.tracking-hint { font-size: 0.75rem; opacity: 0.5; }

.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  font-size: 0.88rem;
  gap: 10px;
}

.item-name { flex: 1; }
.item-size-tag {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(197,160,89,0.12);
  border: 1px solid rgba(197,160,89,0.3);
  color: #facc6b;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}
.item-qty { opacity: 0.6; }
.item-price { color: #facc6b; font-weight: 600; white-space: nowrap; }

.order-totals {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  opacity: 0.8;
}

.total-row .postpaid-text { color: #facc6b; font-weight: 600; }
.postpaid-mini {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(197,160,89,0.15);
  border: 1px solid rgba(197,160,89,0.4);
  color: #facc6b;
  font-size: 0.72rem;
  font-weight: 600;
  margin-inline-start: 6px;
}

.total-row.final {
  font-size: 1rem;
  font-weight: 700;
  color: #facc6b;
  opacity: 1;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ---------- نوار فیلتر + جستجو ---------- */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.search-input {
  flex: 0 1 340px;
  min-width: 220px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}
.search-input:focus { border-color: rgba(197,160,89,0.5); }
.search-input::placeholder { color: rgba(255,255,255,0.35); }

/* بج کد تراکنش زیر شماره سفارش */
.ref-id-chip {
  display: block;
  margin-top: 4px;
  direction: ltr;
  font-size: 0.7rem;
  color: #facc6b;
  opacity: 0.85;
  cursor: pointer;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ref-id-chip:hover { opacity: 1; text-decoration: underline; }

.mono-ltr {
  direction: ltr;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.token-clip { max-width: 120px; }
.copy-mini {
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(197,160,89,0.4);
  background: rgba(197,160,89,0.12);
  color: #facc6b;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
}
.copy-mini:hover { background: rgba(197,160,89,0.25); }

/* ---------- اسنپ‌پی: مرجوع جزئی/کل ---------- */
.snappay-actions {
  padding: 14px;
  border-radius: 12px;
  background: rgba(59,130,246,0.06);
  border: 1px dashed rgba(59,130,246,0.35);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.snappay-hint { font-size: 0.78rem; opacity: 0.6; }
.refund-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  font-size: 0.85rem;
}
.refund-current { font-size: 0.75rem; opacity: 0.5; flex-shrink: 0; }
.refund-input {
  width: 74px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  text-align: center;
}
.refund-input:focus { border-color: rgba(59,130,246,0.6); }
.snappay-new-total { font-size: 0.85rem; opacity: 0.8; }
.snappay-new-total strong { color: #facc6b; }
.snappay-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.snappay-update-btn {
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.snappay-update-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.snappay-cancel-btn {
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid rgba(239,68,68,0.5);
  background: rgba(239,68,68,0.12);
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.snappay-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- پاپ‌آپ تأیید ---------- */
.confirm-box {
  max-width: 440px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.confirm-title { margin: 0; font-size: 1.05rem; color: #facc6b; }
.confirm-message {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.9;
  opacity: 0.9;
  white-space: pre-line;
}
.confirm-btns { display: flex; gap: 10px; justify-content: flex-end; }
.confirm-no {
  padding: 9px 18px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}
.confirm-yes {
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
.confirm-yes:disabled { opacity: 0.5; cursor: not-allowed; }

</style>
