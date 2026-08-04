<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi } from '../../services/adminApi'

const { locale } = useI18n()

const loading = ref(true)
const discounts = ref([])
const showModal = ref(false)
const editingDiscount = ref(null)

const form = ref({
  code: '', type: 'percent', value: '', minPurchase: '', maxDiscount: '',
  usageLimit: '', perUserLimit: '', firstPurchaseOnly: false,
  startDate: '', endDate: '', descriptionFa: '',
  descriptionEn: '', status: 'active', isPublic: false,
})

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'فعال' },
  inactive: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', text: 'غیرفعال' },
  expired: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'منقضی شده' },
}

// تابع کمکی: توضیحات را بر اساس زبان فعال برمی‌گرداند (هم آبجکت دوزبانه و هم رشته‌ی قدیمی)
const getLocalizedDesc = (desc) => {
  if (!desc) return ''
  if (typeof desc === 'string') return desc
  return desc[locale.value] || desc.fa || desc.en || ''
}

const fetchDiscounts = async () => {
  loading.value = true
  const res = await adminApi.getDiscounts()
  if (res.success) {
    discounts.value = (res.data || []).map(d => ({
      ...d,
      value: d.value ?? 0,
      minPurchase: d.minPurchase ?? 0,
      usageLimit: d.usageLimit ?? 1,
      usedCount: d.usedCount ?? 0,
    }))
  }
  loading.value = false
}

onMounted(fetchDiscounts)

const openCreate = () => {
  editingDiscount.value = null
  form.value = {
    code: '', type: 'percent', value: '', minPurchase: '', maxDiscount: '',
    usageLimit: '', perUserLimit: '', firstPurchaseOnly: false,
    startDate: '', endDate: '', descriptionFa: '',
    descriptionEn: '', status: 'active', isPublic: false,
  }
  showModal.value = true
}

const openEdit = (discount) => {
  editingDiscount.value = discount

  // مدیریت سازگاری: توضیحات قدیمی ممکن است رشته باشد
  let descFa = ''
  let descEn = ''
  if (discount.description) {
    if (typeof discount.description === 'string') {
      descFa = discount.description
    } else {
      descFa = discount.description.fa || ''
      descEn = discount.description.en || ''
    }
  }

  form.value = {
    code: discount.code || '',
    type: discount.type || 'percent',
    value: discount.value ?? '',
    minPurchase: discount.minPurchase ?? '',
    maxDiscount: discount.maxDiscount ?? '',
    usageLimit: discount.usageLimit ?? '',
    perUserLimit: discount.perUserLimit ?? '',
    firstPurchaseOnly: discount.firstPurchaseOnly || false,
    startDate: discount.startDate ? discount.startDate.substring(0, 10) : '',
    endDate: discount.endDate ? discount.endDate.substring(0, 10) : '',
    descriptionFa: descFa,
    descriptionEn: descEn,
    status: discount.status || 'active',
    isPublic: discount.isPublic ?? false,
  }
  showModal.value = true
}

const saveDiscount = async () => {
  try {
    const id = editingDiscount.value?._id || editingDiscount.value?.id

    // آبجکت data را صریح می‌سازیم تا فیلدهای اضافه (descriptionFa/En) به بک‌اند نروند
    const data = {
      code: form.value.code,
      type: form.value.type,
      value: form.value.value === '' ? 0 : Number(form.value.value),
      minPurchase: form.value.minPurchase === '' ? 0 : Number(form.value.minPurchase),
      maxDiscount: form.value.maxDiscount === '' ? null : Number(form.value.maxDiscount),
      usageLimit: form.value.usageLimit === '' ? 1 : Number(form.value.usageLimit),
      perUserLimit: form.value.perUserLimit === '' ? 1 : Number(form.value.perUserLimit),
      firstPurchaseOnly: !!form.value.firstPurchaseOnly,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      status: form.value.status,
      isPublic: !!form.value.isPublic,
      description: {
        fa: form.value.descriptionFa || '',
        en: form.value.descriptionEn || '',
      },
    }

    if (editingDiscount.value) {
      const res = await adminApi.updateDiscount(id, data)
      if (!res.success) throw new Error(res.message || 'خطا در ویرایش')
    } else {
      const res = await adminApi.createDiscount(data)
      if (!res.success) throw new Error(res.message || 'خطا در ایجاد')
    }
    showModal.value = false
    await fetchDiscounts()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}

const deleteDiscount = async (id) => {
  if (!confirm('آیا از حذف این کد تخفیف اطمینان دارید؟')) return
  try {
    const res = await adminApi.deleteDiscount(id)
    if (!res.success) throw new Error(res.message || 'خطا در حذف')
    discounts.value = discounts.value.filter(d => (d._id || d.id) !== id)
  } catch (err) {
    alert('خطا در حذف: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}
</script>

<template>
  <div class="admin-discounts">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت تخفیف‌ها</h1>
        <p class="page-subtitle">ایجاد و مدیریت کدهای تخفیف و کوپن</p>
      </div>
      <button class="create-btn" @click="openCreate">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        کد تخفیف جدید
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="discounts-grid">
      <div v-for="discount in discounts" :key="discount._id || discount.id" class="discount-card glass">
        <div class="discount-header">
          <div class="discount-code">{{ discount.code }}</div>
          <span class="status-badge" :style="{ background: statusColors[discount.status]?.bg, color: statusColors[discount.status]?.color }">
            {{ statusColors[discount.status]?.text }}
          </span>
        </div>

        <p class="discount-desc">{{ getLocalizedDesc(discount.description) }}</p>

        <div class="discount-details">
          <div class="detail-item">
            <span class="detail-label">نوع:</span>
            <span class="detail-value">{{ discount.type === 'percent' ? 'درصدی' : 'ثابت' }}</span>

          </div>
          <div class="detail-item">
            <span class="detail-label">مقدار:</span>
            <span class="detail-value highlight">
              {{ discount.type === 'percent' ? (discount.value ?? 0) + '٪' : (discount.value ?? 0).toLocaleString('fa-IR') + ' تومان' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">حداقل خرید:</span>
            <span class="detail-value">{{ (discount.minPurchase ?? 0).toLocaleString('fa-IR') }} تومان</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">بازه:</span>
            <span class="detail-value">{{ discount.startDate ? new Date(discount.startDate).toLocaleDateString('fa-IR') : '—' }} تا {{ discount.endDate ? new Date(discount.endDate).toLocaleDateString('fa-IR') : '—' }}</span>
          </div>
        </div>

        <div class="discount-usage">
          <div class="usage-bar">
            <div class="usage-fill" :style="{ width: ((discount.usedCount ?? 0) / (discount.usageLimit || 1) * 100) + '%' }"></div>
          </div>
          <span class="usage-text">{{ discount.usedCount ?? 0 }} / {{ discount.usageLimit ?? 0 }} استفاده شده</span>
        </div>

        <div class="discount-actions">
          <button class="action-btn edit" @click="openEdit(discount)">ویرایش</button>
          <button class="action-btn delete" @click="deleteDiscount(discount._id || discount.id)">حذف</button>
        </div>
      </div>

      <div v-if="discounts.length === 0" class="empty-state">
        <span class="empty-icon">🎫</span>
        <p>هنوز هیچ کد تخفیفی ثبت نشده است</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>{{ editingDiscount ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید' }}</h2>
            <button class="modal-close" @click="showModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">کد تخفیف</label>
                <input v-model="form.code" type="text" class="form-input" placeholder="مثال: NOURMEHR" />
              </div>
              <div class="form-group">
                <label class="form-label">نوع تخفیف</label>
                <select v-model="form.type" class="form-select">
                  <option value="percent">درصدی</option>
                  <option value="fixed">ثابت (تومان)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">مقدار تخفیف</label>
                <input v-model="form.value" type="number" class="form-input" placeholder="مقدار" />
              </div>
              <div class="form-group">
                <label class="form-label">حداقل خرید (تومان)</label>
                <input v-model="form.minPurchase" type="number" class="form-input" placeholder="۰" />
              </div>
              <div class="form-group">
                <label class="form-label">حداکثر تخفیف (تومان)</label>
                <input v-model="form.maxDiscount" type="number" class="form-input" placeholder="۰" />
              </div>
              <div class="form-group">
                <label class="form-label">تعداد استفاده مجاز</label>
                <input v-model="form.usageLimit" type="number" class="form-input" placeholder="۱۰۰" />
              </div>
              <div class="form-group">
                <label class="form-label">سقف استفاده هر کاربر</label>
                <input v-model="form.perUserLimit" type="number" class="form-input" placeholder="۱" />
              </div>
              <div class="form-group">
                <label class="form-label">فقط اولین خرید</label>
                <select v-model="form.firstPurchaseOnly" class="form-select">
                  <option :value="false">خیر</option>
                  <option :value="true">بله</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">تاریخ شروع</label>
                <input v-model="form.startDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">تاریخ پایان</label>
                <input v-model="form.endDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                  <option value="expired">منقضی شده</option>
                </select>
              </div>
            </div>

            <div class="form-group full">
              <label class="form-label">توضیحات (فارسی)</label>
              <textarea v-model="form.descriptionFa" class="form-input form-textarea" placeholder="توضیحات فارسی این کد تخفیف..." rows="3"></textarea>
            </div>

            <div class="form-group full">
              <label class="form-label">توضیحات (انگلیسی)</label>
              <textarea v-model="form.descriptionEn" class="form-input form-textarea" placeholder="English description..." rows="3" dir="ltr"></textarea>
            </div>

            <div class="form-group full">
              <label class="checkbox-row">
                <input type="checkbox" v-model="form.isPublic" />
                <span>نمایش این کد در صفحه‌ی عمومی تخفیف‌ها</span>
              </label>
              <span class="checkbox-hint">اگر فعال باشد، همه‌ی کاربران این کد را در صفحه‌ی تخفیف‌ها می‌بینند.</span>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" @click="showModal = false">انصراف</button>
              <button class="submit-btn" @click="saveDiscount">ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-discounts {
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

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(197,160,89,0.5);
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

.discounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.discount-card {
  padding: 24px;
  border-radius: 20px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;
}

.discount-card:hover {
  border-color: rgba(197,160,89,0.3);
  transform: translateY(-2px);
}

.discount-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.discount-code {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #facc6b;
  font-family: ui-monospace, monospace;
}

.status-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.discount-desc {
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.6;
  margin: 0;
}

.discount-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.detail-label {
  opacity: 0.5;
}

.detail-value {
  font-weight: 500;
}

.detail-value.highlight {
  color: #facc6b;
}

.discount-usage {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usage-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  background: linear-gradient(to right, #c5a059, #facc6b);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.usage-text {
  font-size: 0.8rem;
  opacity: 0.6;
}

.discount-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.action-btn.edit {
  background: rgba(197,160,89,0.15);
  color: #facc6b;
}

.action-btn.edit:hover {
  background: rgba(197,160,89,0.25);
}

.action-btn.delete {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

.action-btn.delete:hover {
  background: rgba(239,68,68,0.25);
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: rgba(255,255,255,0.4);
  grid-column: 1 / -1;
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 8px;
}

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
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.modal-header h2 {
  font-size: 1.2rem;
  margin: 0;
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
  gap: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.form-input {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: rgba(197,160,89,0.5);
}

.form-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.form-select {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}

.form-select option {
  background: #0a0d14;
  color: #fff;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.cancel-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.cancel-btn:hover {
  background: rgba(255,255,255,0.06);
}

.submit-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(197,160,89,0.5);
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

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9rem;
}
.checkbox-row input {
  width: 18px;
  height: 18px;
  accent-color: #c5a059;
  cursor: pointer;
}
.checkbox-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.78rem;
  opacity: 0.5;
}

</style>