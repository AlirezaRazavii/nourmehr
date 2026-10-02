<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../stores/auth'

const authStore = useAuth()
const { user: currentUser } = storeToRefs(authStore)
const isSuperAdmin = computed(() => currentUser.value?.isSuperAdmin === true)

const loading = ref(true)
const users = ref([])
const revokingId = ref(null)
const revokingAll = ref(false)
const searchQuery = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')

/* ---------- صفحه‌بندی ---------- */
const page = ref(1)
const pageSize = 20          // تعداد کاربر در هر صفحه
const total = ref(0)
const totalPages = ref(1)

const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit: pageSize,
      role: roleFilter.value,
      status: statusFilter.value
    }
    // فقط وقتی چیزی تایپ شده search بفرست
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()

    const res = await adminApi.getUsers(params)
    if (res.success) {
      users.value = res.data || []
      total.value = res.total || 0
      totalPages.value = res.totalPages || 1
    }
  } catch (err) {
    console.error('خطا در دریافت کاربران:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

/* ---------- جستجو با تاخیر + فیلترها (سمت سرور) ---------- */
let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1          // جستجوی جدید → برگرد به صفحه اول
    fetchUsers()
  }, 400)
})

watch([roleFilter, statusFilter], () => {
  page.value = 1
  fetchUsers()
})

onUnmounted(() => clearTimeout(searchTimer))

/* ---------- کنترل صفحه‌بندی ---------- */
const goToPage = (p) => {
  const target = Math.min(Math.max(1, p), totalPages.value)
  if (target === page.value) return
  page.value = target
  fetchUsers()
}

// شماره صفحه‌ها با «...» برای صفحات زیاد: ۱ ... ۴ ۵ ۶ ... ۹
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

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'فعال' },
  inactive: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'غیرفعال' },
  blocked: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'مسدود' },
}

const roleLabels = {
  user: 'کاربر',
  admin: 'مدیر',
}

const toggleStatus = async (user) => {
  const newStatus = user.status === 'blocked' ? 'active' : 'blocked'
  try {
    const id = user._id || user.id
    const res = await adminApi.updateUserStatus(id, newStatus)
    if (!res.success) throw new Error(res.message || 'خطا در تغییر وضعیت')
    const idx = users.value.findIndex(u => (u._id || u.id) === id)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], status: newStatus }
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}

const revokeSessions = async (user) => {
  const id = user._id || user.id
  const label = user.name || user.phone

  if (!confirm(
    `همه‌ی نشست‌های «${label}» بسته شود؟\n\n` +
    'این کاربر روی تمام دستگاه‌هایش از حساب خارج می‌شود و باید دوباره وارد شود.'
  )) return

  revokingId.value = id
  try {
    const res = await adminApi.revokeUserSessions(id)
    if (!res.success) throw new Error(res.message)

    alert(res.message)

    // اگر ادمین نشست خودش را بست، توکن فعلی باطل شده
    if (res.self) {
      await authStore.logout({ callApi: false })
      window.location.href = '/fa/login'
    }
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    revokingId.value = null
  }
}

const revokeAll = async () => {
  if (!confirm(
    '⚠️ هشدار جدی\n\n' +
    'نشست تمام کاربران سایت بسته می‌شود و همه باید دوباره وارد شوند.\n' +
    'این کار فقط در مواقع اضطراری (نشت اطلاعات، تعویض کلید) انجام می‌شود.\n\n' +
    'ادامه می‌دهید؟'
  )) return

  const typed = prompt('برای تأیید نهایی، عبارت زیر را دقیقاً تایپ کنید:\n\nخروج همه')
  if (typed !== 'خروج همه') {
    alert('عملیات لغو شد.')
    return
  }

  revokingAll.value = true
  try {
    // includeSelf = false تا خود شما از پنل بیرون نیفتید
    const res = await adminApi.revokeAllSessions(false)
    if (!res.success) throw new Error(res.message)
    alert(res.message)
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  } finally {
    revokingAll.value = false
  }
}


</script>

<template>
  <div class="admin-users">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت کاربران</h1>
        <p class="page-subtitle">مشاهده و مدیریت حساب‌های کاربری</p>
      </div>
      <div class="header-stats">
        <span class="stat-pill">{{ total.toLocaleString('fa-IR') }} کاربر</span>
        <button
          v-if="isSuperAdmin"
          class="danger-pill"
          :disabled="revokingAll"
          title="بستن نشست تمام کاربران — فقط در مواقع اضطراری"
          @click="revokeAll"
        >
          {{ revokingAll ? 'در حال اجرا...' : '🚪 خروج اجباری همه' }}
        </button>
      </div>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="جستجوی نام، ایمیل یا شماره..." />
      </div>
      <select v-model="roleFilter" class="filter-select">
        <option value="all">همه نقش‌ها</option>
        <option value="user">کاربر</option>
        <option value="admin">مدیر</option>
      </select>
      <select v-model="statusFilter" class="filter-select">
        <option value="all">همه وضعیت‌ها</option>
        <option value="active">فعال</option>
        <option value="inactive">غیرفعال</option>
        <option value="blocked">مسدود</option>
      </select>
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
              <th>کاربر</th>
              <th>ایمیل</th>
              <th>تلفن</th>
              <th>نقش</th>
              <th>وضعیت</th>
              <th>تعداد سفارش</th>
              <th>مجموع خرید</th>
              <th>تاریخ ثبت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user._id">
              <td>
                <div class="user-cell">
                  <div class="user-avatar-sm">{{ (user.name || '?').charAt(0) }}</div>
                  <span class="user-name-cell">{{ user.name }}</span>
                </div>
              </td>
              <td class="text-muted">{{ user.email }}</td>
              <td class="font-mono">{{ user.phone }}</td>
              <td>
                <span class="role-badge" :class="user.role">{{ roleLabels[user.role] }}</span>
              </td>
              <td>
                <span class="status-badge" :style="{ background: statusColors[user.status]?.bg, color: statusColors[user.status]?.color }">
                  {{ statusColors[user.status]?.text }}
                </span>
              </td>
              <td class="text-center">{{ user.ordersCount }}</td>
              <td class="font-mono">{{ (user.totalSpent || 0).toLocaleString('fa-IR') }} <small>تومان</small></td>
              <td class="text-muted">{{ user.createdAt ? new Date(user.createdAt).toLocaleDateString('fa-IR') : '-' }}</td>
              <td>
                <div class="action-btns">
                  <button class="action-btn" :class="user.status === 'blocked' ? 'unblock' : 'block'" @click="toggleStatus(user)">
                    {{ user.status === 'blocked' ? 'رفع مسدودی' : 'مسدود کن' }}
                  </button>
                  <button
                    class="action-btn revoke"
                    :disabled="revokingId === (user._id || user.id)"
                    title="خروج اجباری از تمام دستگاه‌ها"
                    @click="revokeSessions(user)"
                  >
                    {{ revokingId === (user._id || user.id) ? '...' : 'خروج اجباری' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="9" class="empty-row">
                <span class="empty-icon">👥</span>
                <span>کاربری یافت نشد</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- صفحه‌بندی -->
      <div v-if="total > pageSize" class="pagination-bar">
        <span class="pagination-info">
          نمایش {{ rangeStart.toLocaleString('fa-IR') }} تا {{ rangeEnd.toLocaleString('fa-IR') }} از {{ total.toLocaleString('fa-IR') }} کاربر
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
  </div>
</template>

<style scoped>
.admin-users {
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

.filters-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
}

.search-box svg {
  opacity: 0.4;
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  background: none;
  border: none;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
}

.search-box input::placeholder {
  color: rgba(255,255,255,0.3);
}

.filter-select {
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

.filter-select option {
  background: #0a0d14;
  color: #fff;
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-sm {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #000;
  flex-shrink: 0;
}

.user-name-cell {
  font-weight: 500;
}

.font-mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  opacity: 0.8;
}

.role-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-badge.user { background: rgba(59,130,246,0.15); color: #60a5fa; }
.role-badge.admin { background: rgba(197,160,89,0.15); color: #facc6b; }

.status-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
}

.text-center {
  text-align: center;
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

.action-btn.block {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.action-btn.block:hover {
  background: rgba(239,68,68,0.25);
}

.action-btn.unblock {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
}

.action-btn.unblock:hover {
  background: rgba(34,197,94,0.25);
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


.danger-pill {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(239,68,68,0.4);
  background: rgba(239,68,68,0.1);
  color: #f87171;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s ease;
}
.danger-pill:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
.danger-pill:disabled { opacity: 0.5; cursor: not-allowed; }

.action-btn.revoke {
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  white-space: nowrap;
}
.action-btn.revoke:hover:not(:disabled) { background: rgba(245,158,11,0.25); }
.action-btn.revoke:disabled { opacity: 0.5; cursor: not-allowed; }

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

</style>
