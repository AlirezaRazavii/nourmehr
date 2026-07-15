<script setup>
import { ref, onMounted, computed } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const users = ref([])
const permissionList = ref([])
const searchQuery = ref('')
const showModal = ref(false)
const selectedUser = ref(null)
const editPermissions = ref([])
const saving = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const [usersRes, permRes] = await Promise.all([
      adminApi.getUsers(),
      adminApi.getPermissionList()
    ])
    if (usersRes.success) users.value = usersRes.data
    if (permRes.success) permissionList.value = permRes.data
  } catch (err) {
    console.error('خطا در دریافت اطلاعات:', err)
    alert('خطا در دریافت اطلاعات: ' + (err.response?.data?.message || err.message))
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return users.value
  return users.value.filter(u =>
    u.name?.includes(q) || u.email?.includes(q) || u.phone?.includes(q)
  )
})

const openModal = (user) => {
  selectedUser.value = user
  editPermissions.value = Array.isArray(user.permissions) ? [...user.permissions] : []
  showModal.value = true
}

const togglePermission = (key) => {
  const idx = editPermissions.value.indexOf(key)
  if (idx === -1) editPermissions.value.push(key)
  else editPermissions.value.splice(idx, 1)
}

const savePermissions = async () => {
  if (!selectedUser.value) return
  saving.value = true
  try {
    const id = selectedUser.value._id
    const res = await adminApi.updateUserPermissions(id, editPermissions.value)
    if (!res.success) throw new Error(res.message)
    const idx = users.value.findIndex(u => u._id === id)
    if (idx !== -1) {
      users.value[idx] = { ...users.value[idx], permissions: res.data.permissions, role: res.data.role }
    }
    showModal.value = false
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}

const permLabel = (key) => permissionList.value.find(p => p.key === key)?.label || key
</script>

<template>
  <div class="admin-admins">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت ادمین‌ها</h1>
        <p class="page-subtitle">تعیین سطح دسترسی کاربران به بخش‌های پنل مدیریت</p>
      </div>
    </div>

    <div class="search-box">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input v-model="searchQuery" type="text" placeholder="جستجوی نام، ایمیل یا شماره..." />
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="users-list">
      <div v-for="user in filteredUsers" :key="user._id" class="user-card">
        <div class="user-avatar">{{ (user.name || '?').charAt(0) }}</div>
        <div class="user-info">
          <span class="user-name">
            {{ user.name }}
            <span v-if="user.isSuperAdmin" class="super-badge">مدیر کل</span>
            <span v-else-if="user.role === 'admin'" class="admin-badge">ادمین</span>
          </span>
          <span class="user-email">{{ user.email }}</span>
          <div v-if="!user.isSuperAdmin && user.permissions?.length" class="perms-preview">
            <span v-for="p in user.permissions" :key="p" class="perm-chip">{{ permLabel(p) }}</span>
          </div>
          <span v-else-if="user.isSuperAdmin" class="perms-note">دسترسی کامل به همه بخش‌ها</span>
          <span v-else class="perms-note muted">بدون دسترسی مدیریتی</span>
        </div>
        <button v-if="!user.isSuperAdmin" class="edit-btn" @click="openModal(user)">تنظیم دسترسی</button>
        <span v-else class="locked-note">🔒 قابل تغییر نیست</span>
      </div>

      <div v-if="filteredUsers.length === 0" class="empty-state">
        <span class="empty-icon">👥</span>
        <span>کاربری یافت نشد</span>
      </div>
    </div>

    <!-- مودال تنظیم دسترسی -->
    <Transition name="modal">
      <div v-if="showModal && selectedUser" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h2>تنظیم دسترسی</h2>
              <p class="modal-subtitle">{{ selectedUser.name }} — {{ selectedUser.email }}</p>
            </div>
            <button class="modal-close" @click="showModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="hint">بخش‌هایی که این کاربر می‌تواند مدیریت کند را انتخاب کنید. با انتخاب حداقل یک دسترسی، کاربر به ادمین تبدیل می‌شود.</p>
            <div class="perms-grid">
              <label v-for="perm in permissionList" :key="perm.key" class="perm-item" :class="{ checked: editPermissions.includes(perm.key) }">
                <input type="checkbox" :checked="editPermissions.includes(perm.key)" @change="togglePermission(perm.key)" />
                <span>{{ perm.label }}</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="showModal = false">انصراف</button>
            <button class="save-btn" :disabled="saving" @click="savePermissions">{{ saving ? 'در حال ذخیره...' : 'ذخیره دسترسی‌ها' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-admins { display: flex; flex-direction: column; gap: 20px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }

.search-box { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #fff; max-width: 400px; }
.search-box svg { opacity: 0.4; flex-shrink: 0; }
.search-box input { flex: 1; background: none; border: none; color: #fff; font-size: 0.9rem; outline: none; font-family: inherit; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.users-list { display: flex; flex-direction: column; gap: 12px; }
.user-card { display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 16px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); }
.user-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #c5a059, #8f7032); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; color: #000; flex-shrink: 0; }
.user-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.user-name { font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.super-badge { padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; background: rgba(197,160,89,0.2); color: #facc6b; }
.admin-badge { padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; background: rgba(59,130,246,0.15); color: #60a5fa; }
.user-email { font-size: 0.85rem; opacity: 0.6; }
.perms-preview { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.perm-chip { padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); }
.perms-note { font-size: 0.8rem; color: #facc6b; margin-top: 4px; }
.perms-note.muted { color: rgba(255,255,255,0.4); }
.edit-btn { padding: 8px 18px; border-radius: 999px; border: 1px solid rgba(197,160,89,0.4); background: rgba(197,160,89,0.1); color: #facc6b; font-size: 0.85rem; cursor: pointer; font-family: inherit; flex-shrink: 0; }
.edit-btn:hover { background: rgba(197,160,89,0.2); }
.locked-note { font-size: 0.8rem; opacity: 0.5; flex-shrink: 0; }

.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-icon { font-size: 2.5rem; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 560px; max-height: 85vh; overflow-y: auto; border-radius: 20px; background: #0a0d14; border: 1px solid rgba(255,255,255,0.1); }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-subtitle { font-size: 0.85rem; opacity: 0.6; margin: 4px 0 0; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: rgba(255,255,255,0.1); }
.modal-body { padding: 24px; }
.hint { font-size: 0.85rem; opacity: 0.6; margin: 0 0 16px; line-height: 1.7; }
.perms-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.perm-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.2s ease; }
.perm-item:hover { border-color: rgba(197,160,89,0.3); }
.perm-item.checked { background: rgba(197,160,89,0.12); border-color: rgba(197,160,89,0.4); color: #facc6b; }
.perm-item input { accent-color: #c5a059; width: 16px; height: 16px; cursor: pointer; }
.perm-item span { font-size: 0.9rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06); }
.cancel-btn { padding: 10px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: #fff; cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.cancel-btn:hover { background: rgba(255,255,255,0.06); }
.save-btn { padding: 10px 24px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.save-btn:hover:not(:disabled) { transform: translateY(-2px); }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }

@media (max-width: 600px) {
  .perms-grid { grid-template-columns: 1fr; }
  .user-card { flex-wrap: wrap; }
}
</style>
