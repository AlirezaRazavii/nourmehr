<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuth } from '../../stores/auth'
import { useOrders } from '../../stores/orders'
import { useAddresses } from '../../stores/addresses'

const { t, locale } = useI18n()
const authStore = useAuth()
const { user, userName } = storeToRefs(authStore)
const { updateProfile } = authStore

const ordersStore = useOrders()
const { orders } = storeToRefs(ordersStore)
const { fetchOrders } = ordersStore

const addressesStore = useAddresses()
const { addresses } = storeToRefs(addressesStore)
const { fetchAddresses } = addressesStore

const isEditing = ref(false)
const isLoading = ref(false)

const ordersCount = computed(() => (orders.value || []).length)
const addressesCount = computed(() => (addresses.value || []).length)

const formData = ref({
  name: ''
})

const startEdit = () => {
  formData.value = {
    name: user.value?.name || ''
  }
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  formData.value = { name: '' }
}

const handleUpdate = async () => {
  if (!formData.value.name || formData.value.name.trim().length < 3) {
    alert(t('user_profile_err_name'))
    return
  }

  isLoading.value = true

  const result = await updateProfile({ name: formData.value.name.trim() })

  if (!result.success) {
    alert(result.error || t('user_profile_err_update'))
    isLoading.value = false
    return
  }

  alert(t('user_profile_success'))
  isEditing.value = false
  isLoading.value = false
}

onMounted(async () => {
  try { await fetchOrders() } catch (e) { /* ignore */ }
  try { await fetchAddresses() } catch (e) { /* ignore */ }
})
</script>

<template>
  <div class="user-profile">
    <div v-if="!isEditing" class="profile-view">
      <div class="profile-header glass">
        <div class="avatar-large">
          <span>{{ userName?.charAt(0) || '?' }}</span>
        </div>
        <div class="profile-info">
          <h3>{{ userName }}</h3>
          <p class="profile-phone">{{ user?.phone }}</p>
          <span class="member-badge">
            {{ $t('user_profile_member_since') }} {{ user?.createdAt ? new Date(user.createdAt).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') : '-' }}
          </span>
        </div>
        <button class="edit-btn" @click="startEdit">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {{ $t('user_profile_edit_btn') }}
        </button>
      </div>

      <!-- آمار حساب -->
      <div class="profile-stats">
        <div class="stat-card glass">
          <span class="stat-icon">📦</span>
          <div class="stat-info">
            <span class="stat-value">{{ ordersCount }}</span>
            <span class="stat-label">{{ $t('user_stat_orders') }}</span>
          </div>
        </div>
        <div class="stat-card glass">
          <span class="stat-icon">📍</span>
          <div class="stat-info">
            <span class="stat-value">{{ addressesCount }}</span>
            <span class="stat-label">{{ $t('user_stat_addresses') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ویرایش پروفایل -->
    <div v-else class="profile-edit">
      <div class="edit-header">
        <h3>{{ $t('user_profile_edit_title') }}</h3>
        <button class="cancel-btn" @click="cancelEdit">{{ $t('user_profile_cancel') }}</button>
      </div>

      <form @submit.prevent="handleUpdate" class="edit-form glass">
        <h4>{{ $t('user_profile_personal_info') }}</h4>

        <div class="form-group">
          <label>{{ $t('user_profile_label_name') }} <span class="required">*</span></label>
          <input v-model="formData.name" type="text" :placeholder="$t('user_profile_placeholder_name')" required />
        </div>

        <div class="form-group">
          <label>{{ $t('user_profile_label_phone') }}</label>
          <input :value="user?.phone" type="tel" disabled readonly />
          <span class="field-hint">{{ $t('user_profile_phone_locked') }}</span>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn" @click="cancelEdit">{{ $t('user_profile_cancel') }}</button>
          <button type="submit" class="submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else>{{ $t('user_profile_save_changes') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* خنثی کردن سایه سنگین global glass برای جلوگیری از تداخل */
.glass {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
}
.glass:hover {
  transform: none !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
}

.user-profile { display: flex; flex-direction: column; gap: 32px; }

.profile-view {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.profile-header { display: flex; align-items: center; gap: 20px; padding: 24px; flex-wrap: wrap; }
.avatar-large { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #c5a059, #8f7032); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; color: #000; box-shadow: 0 4px 15px rgba(197, 160, 89, 0.4); flex-shrink: 0; }
.profile-info { flex: 1; min-width: 200px; }
.profile-info h3 { font-size: 1.3rem; margin: 0 0 6px; }
.profile-phone { margin: 2px 0; opacity: 0.8; font-size: 0.9rem; direction: ltr; text-align: start; }
.member-badge { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 999px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-size: 0.8rem; }

.edit-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; transition: all 0.3s ease; flex-shrink: 0; font-size: 0.85rem; }
.edit-btn:hover { filter: brightness(1.1); }

.profile-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.stat-card { display: flex; align-items: center; gap: 14px; padding: 20px; text-align: center; }
.stat-icon { font-size: 1.8rem; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #facc6b; }
.stat-label { font-size: 0.85rem; opacity: 0.8; }

.edit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
.edit-header h3 { margin: 0; font-size: 1.2rem; }

.edit-form { padding: 24px; }
.edit-form h4 { margin: 0 0 16px; color: #facc6b; font-size: 0.95rem; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 500; }
.required { color: #ef4444; }

.form-group input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(15, 23, 42, 0.8); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; transition: all 0.25s ease; box-sizing: border-box; }
.form-group input:focus { border-color: rgba(197, 160, 89, 0.6); }
.form-group input:disabled { opacity: 0.6; cursor: not-allowed; }
.field-hint { display: block; margin-top: 6px; font-size: 0.75rem; opacity: 0.6; }

.form-actions { display: flex; gap: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.cancel-btn { padding: 10px 20px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; color: #fff; cursor: pointer; transition: all 0.25s ease; }
.cancel-btn:hover { background: rgba(255, 255, 255, 0.1); }

.submit-btn { flex: 1; padding: 12px; border-radius: 8px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
.submit-btn:hover:not(:disabled) { filter: brightness(1.1); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.loading-spinner { width: 18px; height: 18px; border: 2px solid rgba(0, 0, 0, 0.2); border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ریسپانسیو */
@media (max-width: 768px) {
  .profile-header { flex-direction: column; text-align: center; padding: 20px; gap: 12px; }
  .profile-stats { grid-template-columns: 1fr; gap: 16px; }
  .form-actions { flex-direction: column; }
  .cancel-btn, .submit-btn { width: 100%; }
  .edit-form { padding: 16px; }
}
</style>
