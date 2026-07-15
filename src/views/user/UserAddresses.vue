<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAddresses } from '../../stores/addresses'

const { t } = useI18n()
const addressesStore = useAddresses()
const { addresses } = storeToRefs(addressesStore)
const { fetchAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } = addressesStore

const isEditing = ref(false)
const editingId = ref(null)
const showModal = ref(false)

const emptyForm = () => ({
  title: '', fullName: '', phone: '', province: '', city: '', address: '', postalCode: '', isDefault: false
})

const formData = ref(emptyForm())

// تبدیل ارقام فارسی/عربی به انگلیسی تا با regex بک‌اند سازگار باشد
const toEnglishDigits = (str = '') =>
  String(str)
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))

const openAddModal = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = emptyForm()
  showModal.value = true
}

const openEditModal = (address) => {
  isEditing.value = true
  editingId.value = address._id || address.id
  // فقط فیلدهای فرم کپی می‌شوند تا داده‌های اضافی مثل _id ارسال نشود
  formData.value = {
    title: address.title || '',
    fullName: address.fullName || '',
    phone: address.phone || '',
    province: address.province || '',
    city: address.city || '',
    address: address.address || '',
    postalCode: address.postalCode || '',
    isDefault: !!address.isDefault
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  formData.value = emptyForm()
}

const handleSubmit = async () => {
  // نرمال‌سازی ارقام موبایل و کد پستی
  const payload = {
    ...formData.value,
    phone: toEnglishDigits(formData.value.phone).trim(),
    postalCode: toEnglishDigits(formData.value.postalCode).trim(),
    title: formData.value.title.trim(),
    fullName: formData.value.fullName.trim(),
    province: formData.value.province.trim(),
    city: formData.value.city.trim(),
    address: formData.value.address.trim()
  }

  if (!payload.title || !payload.fullName || !payload.phone ||
      !payload.province || !payload.city || !payload.address || !payload.postalCode) {
    alert(t('user_addresses_err_required'))
    return
  }

  // اعتبارسنجی سمت کلاینت هماهنگ با بک‌اند
  if (!/^09\d{9}$/.test(payload.phone)) {
    alert(t('user_addresses_err_phone') || 'شماره موبایل نامعتبر است')
    return
  }
  if (!/^\d{10}$/.test(payload.postalCode)) {
    alert(t('user_addresses_err_postal') || 'کد پستی باید ۱۰ رقم باشد')
    return
  }
  if (payload.address.length < 10) {
    alert(t('user_addresses_err_address') || 'آدرس حداقل ۱۰ کاراکتر باشد')
    return
  }

  let result
  if (isEditing.value) {
    result = await updateAddress(editingId.value, payload)
  } else {
    result = await addAddress(payload)
  }

  if (result.success) {
    closeModal()
  } else {
    alert(result.error || t('user_addresses_err_save'))
  }
}

const handleDelete = async (id) => {
  if (!confirm(t('user_addresses_delete_confirm'))) return
  const result = await deleteAddress(id)
  if (!result.success) alert(result.error || t('user_addresses_delete_error'))
}

const handleSetDefault = async (id) => {
  const result = await setDefaultAddress(id)
  if (!result.success) alert(result.error || t('user_addresses_set_default_error'))
}

onMounted(() => {
  fetchAddresses()
})
</script>

<template>
  <div class="user-addresses">
    <div class="header">
      <h3>{{ $t('user_addresses_title') }}</h3>
      <button class="add-btn" @click="openAddModal">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        {{ $t('user_addresses_add_new') }}
      </button>
    </div>
    
    <div v-if="addresses.length === 0" class="empty-state">
      <span class="empty-icon">📍</span>
      <h4>{{ $t('user_addresses_empty') }}</h4>
      <button class="add-first-btn" @click="openAddModal">{{ $t('user_addresses_add_first') }}</button>
    </div>
    
    <div v-else class="addresses-grid">
      <article 
        v-for="address in addresses" 
        :key="address._id || address.id"
        class="address-card glass"
        :class="{ default: address.isDefault }"
      >
        <div class="card-header">
          <div class="address-title">{{ address.title }}</div>
          <span v-if="address.isDefault" class="default-badge">{{ $t('user_addresses_default') }}</span>
        </div>
        
        <div class="card-body">
          <p class="address-name"><strong>{{ address.fullName }}</strong></p>
          <p class="address-phone">📞 {{ address.phone }}</p>
          <p class="address-text">
            {{ address.province }}، {{ address.city }}<br>
            {{ address.address }}
          </p>
          <p class="address-postal">{{ $t('user_addresses_postal_code_label') }} {{ address.postalCode }}</p>
        </div>
        
        <div class="card-footer">
          <button v-if="!address.isDefault" class="set-default-btn" @click="handleSetDefault(address._id || address.id)">
            {{ $t('user_addresses_set_default') }}
          </button>
          <button class="edit-btn" @click="openEditModal(address)">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            {{ $t('user_addresses_edit') }}
          </button>
          <button class="delete-btn" @click="handleDelete(address._id || address.id)">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            {{ $t('user_addresses_delete') }}
          </button>
        </div>
      </article>
    </div>
    
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card glass">
          <div class="modal-header">
            <h3>{{ isEditing ? $t('user_addresses_modal_edit_title') : $t('user_addresses_modal_add_title') }}</h3>
            <button class="close-btn" @click="closeModal">✕</button>
          </div>
          
          <form @submit.prevent="handleSubmit" class="address-form">
            <div class="form-row">
              <div class="form-group">
                <label>{{ $t('user_addresses_label_title') }} <span class="required">*</span></label>
                <input v-model="formData.title" type="text" :placeholder="$t('user_addresses_placeholder_title')" required />
              </div>
              <div class="form-group">
                <label>{{ $t('user_addresses_label_full_name') }} <span class="required">*</span></label>
                <input v-model="formData.fullName" type="text" :placeholder="$t('user_addresses_placeholder_full_name')" required />
              </div>
            </div>
            
            <div class="form-group">
              <label>{{ $t('user_addresses_label_phone') }} <span class="required">*</span></label>
              <input v-model="formData.phone" type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" required />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>{{ $t('user_addresses_label_province') }} <span class="required">*</span></label>
                <input v-model="formData.province" type="text" :placeholder="$t('user_addresses_label_province')" required />
              </div>
              <div class="form-group">
                <label>{{ $t('user_addresses_label_city') }} <span class="required">*</span></label>
                <input v-model="formData.city" type="text" :placeholder="$t('user_addresses_label_city')" required />
              </div>
            </div>
            
            <div class="form-group">
              <label>{{ $t('user_addresses_label_address') }} <span class="required">*</span></label>
              <textarea v-model="formData.address" rows="3" :placeholder="$t('user_addresses_placeholder_address')" required></textarea>
            </div>
            
            <div class="form-group">
              <label>{{ $t('user_addresses_label_postal_code') }} <span class="required">*</span></label>
              <input v-model="formData.postalCode" type="text" placeholder="۱۲۳۴۵۶۷۸۹۰" required />
            </div>
            
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.isDefault" />
              <span>{{ $t('user_addresses_set_as_default') }}</span>
            </label>
            
            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="closeModal">{{ $t('user_addresses_cancel') }}</button>
              <button type="submit" class="submit-btn">
                {{ isEditing ? $t('user_addresses_save_changes') : $t('user_addresses_add_new') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-addresses { display: flex; flex-direction: column; gap: 24px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.header h3 { font-size: 1.4rem; margin: 0; }
.add-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
.add-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197, 160, 89, 0.4); }
.empty-state { text-align: center; padding: 60px; }
.empty-icon { font-size: 4rem; display: block; margin-bottom: 16px; }
.empty-state h4 { margin: 0 0 16px; }
.add-first-btn { padding: 12px 24px; border-radius: 999px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; }
.addresses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.address-card { padding: 24px; border-radius: 16px; background: rgba(5, 8, 20, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; }
.address-card.default { border-color: rgba(197, 160, 89, 0.5); background: linear-gradient(135deg, rgba(197, 160, 89, 0.1), rgba(5, 8, 20, 0.9)); }
.address-card:hover { transform: translateY(-4px); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.address-title { font-weight: 600; font-size: 1.05rem; }
.default-badge { padding: 4px 10px; border-radius: 999px; background: rgba(197, 160, 89, 0.2); color: #facc6b; font-size: 0.75rem; }
.card-body { margin-bottom: 20px; }
.card-body p { margin: 0 0 8px; font-size: 0.9rem; line-height: 1.7; }
.address-name { font-weight: 600; color: #facc6b; }
.address-phone { opacity: 0.8; }
.address-postal { opacity: 0.7; font-size: 0.85rem; }
.card-footer { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.set-default-btn, .edit-btn, .delete-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid; background: transparent; font-size: 0.85rem; cursor: pointer; transition: all 0.25s ease; }
.set-default-btn { border-color: rgba(197, 160, 89, 0.4); color: #facc6b; }
.set-default-btn:hover { background: rgba(197, 160, 89, 0.15); }
.edit-btn { border-color: rgba(255, 255, 255, 0.2); color: #fff; }
.edit-btn:hover { background: rgba(255, 255, 255, 0.1); }
.delete-btn { border-color: rgba(239, 68, 68, 0.4); color: #ef4444; }
.delete-btn:hover { background: rgba(239, 68, 68, 0.15); }

.modal-overlay { 
  position: fixed; 
  inset: 0; 
  background: rgba(0, 0, 0, 0.8); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 1000; 
  padding: 20px; 
  overflow-y: auto; 
}
.modal-card { 
  width: 100%; 
  max-width: 500px; 
  max-height: 90vh; 
  display: flex; 
  flex-direction: column; 
  padding: 0; 
  border-radius: 20px; 
  background: rgba(5, 8, 20, 0.98); 
  border: 1px solid rgba(255, 255, 255, 0.1); 
  overflow: hidden; 
  margin: auto; 
}
.modal-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 20px 24px; 
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0; 
}
.modal-header h3 { margin: 0; font-size: 1.2rem; }
.close-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; color: #fff; cursor: pointer; transition: all 0.25s ease; flex-shrink: 0; }
.close-btn:hover { background: rgba(255, 255, 255, 0.1); }
.address-form { 
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
  padding: 24px; 
  overflow-y: auto; 
  flex: 1; 
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.85rem; font-weight: 500; }
.required { color: #ef4444; }
.form-group input, .form-group textarea { padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(15, 23, 42, 0.8); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; transition: all 0.25s ease; width: 100%; box-sizing: border-box; }
.form-group input:focus, .form-group textarea:focus { border-color: rgba(197, 160, 89, 0.6); }
.form-group textarea { resize: vertical; min-height: 80px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; accent-color: #c5a059; }
.form-actions { 
  display: flex; 
  gap: 12px; 
  margin-top: 8px; 
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky; 
  bottom: -24px; 
  background: rgba(5, 8, 20, 0.98); 
  margin-bottom: -24px;
  z-index: 2;
}
.cancel-btn, .submit-btn { flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.25s ease; }
.cancel-btn { border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; color: #fff; }
.cancel-btn:hover { background: rgba(255, 255, 255, 0.1); }
.submit-btn { border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197, 160, 89, 0.4); }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-card, .modal-leave-to .modal-card { transform: scale(0.95); }

@media (max-width: 768px) {
  .header { flex-direction: column; gap: 16px; align-items: stretch; }
  .addresses-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .modal-card { max-height: 85vh; border-radius: 16px; }
  .modal-overlay { padding: 15px; }
}
</style>