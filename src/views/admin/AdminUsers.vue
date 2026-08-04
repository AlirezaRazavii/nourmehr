<script setup>
import { ref, computed, onMounted } from 'vue'
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

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await adminApi.getUsers()
    if (res.success) users.value = res.data
  } catch (err) {
    console.error('خطا در دریافت کاربران:', err)
  }
  loading.value = false
}

onMounted(fetchUsers)

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const q = searchQuery.value
    const matchSearch = !q ||
      u.name?.includes(q) ||
      u.email?.includes(q) ||
      u.phone?.includes(q)
    const matchRole = roleFilter.value === 'all' || u.role === roleFilter.value
    const matchStatus = statusFilter.value === 'all' || u.status === statusFilter.value
    return matchSearch && matchRole && matchStatus
  })
})

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
        <span class="stat-pill">{{ users.length }} کاربر</span>
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
            <tr v-for="user in filteredUsers" :key="user._id">
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
            <tr v-if="filteredUsers.length === 0">
              <td colspan="9" class="empty-row">
                <span class="empty-icon">👥</span>
                <span>کاربری یافت نشد</span>
              </td>
            </tr>
          </tbody>
        </table>
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



</style>
