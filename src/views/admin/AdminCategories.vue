<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const categories = ref([])
const showModal = ref(false)
const editingCategory = ref(null)
const deletingId = ref(null)
const searchQuery = ref('')

const form = ref({
  name: { fa: '', en: '' },
  slug: '',
  icon: '',
  description: { fa: '', en: '' },
  status: 'active',
  parents: [],
})

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'فعال' },
  inactive: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'غیرفعال' },
}

const fetchCategories = async () => {
  loading.value = true
  const res = await adminApi.getCategories()
  if (res.success) {
    categories.value = res.data
  }
  loading.value = false
}

onMounted(fetchCategories)

const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  const q = searchQuery.value.toLowerCase()
  return categories.value.filter(c =>
    (c.name?.fa || '').toLowerCase().includes(q) ||
    (c.name?.en || '').toLowerCase().includes(q) ||
    (c.description?.fa || '').toLowerCase().includes(q)
  )
})

const openCreate = () => {
  editingCategory.value = null
  form.value = { name: { fa: '', en: '' }, slug: '', icon: '', description: { fa: '', en: '' }, status: 'active', parents: [] }
  showModal.value = true
}

const openEdit = (cat) => {
  editingCategory.value = cat
  form.value = {
    name: { fa: cat.name?.fa || '', en: cat.name?.en || '' },
    slug: cat.slug || '',
    icon: cat.icon || '',
    description: { fa: cat.description?.fa || '', en: cat.description?.en || '' },
    status: cat.status || 'active',
    parents: cat.parents || [],
  }
  showModal.value = true
}

const saveCategory = async () => {
  try {
    if (!form.value.name.fa) {
      return alert('نام فارسی دسته‌بندی الزامی است');
    }
    const id = editingCategory.value?._id || editingCategory.value?.id
    if (editingCategory.value) {
      const res = await adminApi.updateCategory(id, form.value)
      if (!res.success) throw new Error(res.message || 'خطا در ویرایش')
    } else {
      const res = await adminApi.createCategory(form.value)
      if (!res.success) throw new Error(res.message || 'خطا در ایجاد')
    }
    showModal.value = false
    await fetchCategories()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}

const confirmDelete = (id) => {
  deletingId.value = id
}

const deleteCategory = async (id) => {
  try {
    const res = await adminApi.deleteCategory(id)
    if (!res.success) throw new Error(res.message || 'خطا در حذف')
    categories.value = categories.value.filter(c => (c._id || c.id) !== id)
    deletingId.value = null
  } catch (err) {
    alert('خطا در حذف: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
    deletingId.value = null
  }
}

const generateSlug = () => {
  // ساخت slug بر اساس نام فارسی
  form.value.slug = (form.value.name.fa || '')
    .trim()
    .replace(/[^\u0600-\u06FF\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category-' + Date.now()
}

</script>

<template>
  <div class="admin-categories">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت دسته‌بندی‌ها</h1>
        <p class="page-subtitle">ایجاد، ویرایش و مدیریت دسته‌بندی‌های محصولات (دوزبانه)</p>
      </div>
      <button class="create-btn" @click="openCreate">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        دسته‌بندی جدید
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="جستجوی دسته‌بندی..." />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="categories-grid">
      <div v-for="cat in filteredCategories" :key="cat._id" class="category-card glass">
        <div class="category-header">
          <div class="category-icon">{{ cat.icon }}</div>
          <div class="category-title-group">
            <h3 class="category-name">{{ cat.name?.fa }}</h3>
            <span class="category-en-name" v-if="cat.name?.en">{{ cat.name.en }}</span>
            <span class="category-slug">{{ cat.slug }}</span>
          </div>
          <span class="status-badge" :style="{ background: statusColors[cat.status]?.bg, color: statusColors[cat.status]?.color }">
            {{ statusColors[cat.status]?.text }}
          </span>
        </div>

        <p class="category-desc">{{ cat.description?.fa }}</p>

        <div class="category-meta">
          <div class="meta-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
            <span>{{ cat.productCount }} محصول</span>
          </div>
          <div class="meta-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{{ cat.createdAt ? new Date(cat.createdAt).toLocaleDateString('fa-IR') : '-' }}</span>
          </div>
          <div class="meta-chip" v-if="cat.parents && cat.parents.length > 0">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16m-8-8h16" stroke-linecap="round"/></svg>
            <span>زیردسته ({{ cat.parents.length }} والد)</span>
          </div>
          <div class="meta-chip" v-else>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            <span>دسته اصلی</span>
          </div>
        </div>

        <div class="category-actions">
          <button class="action-btn edit" @click="openEdit(cat)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            ویرایش
          </button>
          <button class="action-btn delete" @click="confirmDelete(cat._id)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
            حذف
          </button>
        </div>
      </div>

      <div v-if="filteredCategories.length === 0" class="empty-state">
        <span class="empty-icon">📁</span>
        <span>دسته‌بندی‌ای یافت نشد</span>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>{{ editingCategory ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید' }}</h2>
            <button class="modal-close" @click="showModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              
              <div class="form-group full">
                <label class="form-label">نام دسته‌بندی <span style="color:#ef4444">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.name.fa" type="text" class="form-input" placeholder="نام فارسی" @input="generateSlug" />
                  <input v-model="form.name.en" type="text" class="form-input" placeholder="English Name" dir="ltr" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">آدرس URL (slug)</label>
                <input v-model="form.slug" type="text" class="form-input" placeholder="diamond-cut" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                </select>
              </div>
              <div class="form-group full">
                <label class="form-label">آیکون (emoji یا unicode)</label>
                <input v-model="form.icon" type="text" class="form-input" placeholder="◆" maxlength="4" />
                <span class="input-hint">یک emoji یا نماد کوتاه</span>
              </div>
              <div class="form-group full">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label class="form-label">دسته‌بندی‌های والد (اختیاری)</label>
                  <button type="button" @click="form.parents = []" class="clear-selection-btn">تغییر به دسته اصلی (حذف همه)</button>
                </div>
                <div class="checkbox-grid">
                  <label 
                    v-for="c in categories.filter(x => x._id !== editingCategory?._id)" 
                    :key="c._id" 
                    class="checkbox-label"
                  >
                    <input type="checkbox" :value="c._id" v-model="form.parents" />
                    <span class="checkbox-text">{{ c.name?.fa }}</span>
                  </label>
                </div>
                <span class="input-hint">می‌توانید هر تعداد والد که می‌خواهید برای این دسته تیک بزنید. اگر هیچکدام تیک نخورد، دسته اصلی محسوب می‌شود.</span>
              </div>
              
              <div class="form-group full">
                <label class="form-label">توضیحات</label>
                <div class="lang-inputs" style="flex-direction: column;">
                  <textarea v-model="form.description.fa" class="form-input form-textarea" rows="3" placeholder="توضیحات فارسی..."></textarea>
                  <textarea v-model="form.description.en" class="form-input form-textarea" rows="3" placeholder="English Description..." dir="ltr"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" @click="showModal = false">انصراف</button>
              <button class="submit-btn" @click="saveCategory">ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirm Modal -->
    <Transition name="modal">
      <div v-if="deletingId !== null" class="modal-overlay small" @click.self="deletingId = null">
        <div class="modal-content glass small">
          <div class="modal-header">
            <h2>حذف دسته‌بندی</h2>
          </div>
          <div class="modal-body">
            <p class="confirm-text">آیا از حذف این دسته‌بندی اطمینان دارید؟ این عملیات قابل بازگشت نیست.</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="deletingId = null">انصراف</button>
              <button class="delete-btn" @click="deleteCategory(deletingId)">حذف</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-categories {
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

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.category-card {
  padding: 24px;
  border-radius: 20px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;
}

.category-card:hover {
  border-color: rgba(197,160,89,0.3);
  transform: translateY(-2px);
}

.category-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.category-icon {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(197,160,89,0.2), rgba(197,160,89,0.05));
  border: 1px solid rgba(197,160,89,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.category-title-group {
  flex: 1;
  min-width: 0;
}

.category-name {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 2px;
}

.category-en-name {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.4);
  display: block;
  margin-bottom: 4px;
}

.category-slug {
  font-size: 0.8rem;
  opacity: 0.4;
  font-family: ui-monospace, monospace;
}

.status-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.category-desc {
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.6;
  margin: 0;
}

.category-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  opacity: 0.6;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
}

.category-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
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

.modal-overlay.small {
  align-items: center;
}

.modal-content {
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 20px;
  padding: 0;
}

.modal-content.small {
  max-width: 420px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  background: rgba(8, 10, 18, 0.95);
  backdrop-filter: blur(10px);
  z-index: 10;
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

.confirm-text {
  font-size: 0.95rem;
  opacity: 0.8;
  line-height: 1.7;
  margin: 0;
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
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: rgba(197,160,89,0.5);
}

.form-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.input-hint {
  font-size: 0.75rem;
  opacity: 0.4;
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
  margin-bottom: 8px;
}

.lang-inputs {
  display: flex;
  gap: 10px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  position: sticky;
  bottom: 0;
  background: linear-gradient(to top, rgba(8, 10, 18, 1), transparent);
  padding-top: 10px;
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

.delete-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: #ef4444;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.delete-btn:hover {
  background: #dc2626;
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

@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
  .page-header {
    flex-direction: column;
    gap: 12px;
  }
}
.clear-selection-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.clear-selection-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 14px;
  max-height: 200px;
  overflow-y: auto;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  accent-color: #c5a059;
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin: 0;
}
.checkbox-text {
  font-size: 0.85rem;
  color: rgba(255,255,255,0.85);
  user-select: none;
}
</style>