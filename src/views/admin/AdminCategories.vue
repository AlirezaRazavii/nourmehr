<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { adminApi } from '../../services/adminApi'
import { getImageUrl } from '../../utils/imageUrl'

/* ------------------------------- ثابت‌ها ------------------------------- */
const MAX_IMAGE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'فعال' },
  inactive: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'غیرفعال' },
}

/* -------------------------------- Toast -------------------------------- */
const toasts = ref([])
let toastId = 0
const notify = (message, type = 'info', ttl = 4000) => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, ttl)
}

/* -------------------------------- State -------------------------------- */
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)

const categories = ref([])
const showModal = ref(false)
const editingCategory = ref(null)
const deletingId = ref(null)
const searchQuery = ref('')

const fileInput = ref(null)

/** تصاویری که در این جلسه آپلود شده‌اند و هنوز ذخیره نشده‌اند */
const sessionUploads = ref(new Set())

const blankForm = () => ({
  name: { fa: '', en: '' },
  slug: '',
  icon: '◆',
  image: '',
  description: { fa: '', en: '' },
  status: 'active',
  sortOrder: 0,
  parents: [],
})

const form = ref(blankForm())

/* ------------------------------ Data fetch ------------------------------ */
const fetchCategories = async () => {
  loading.value = true
  try {
    const res = await adminApi.getCategories()
    if (res?.success) {
      categories.value = Array.isArray(res.data) ? res.data : []
    } else {
      throw new Error(res?.message || 'دریافت دسته‌بندی‌ها ناموفق بود')
    }
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'خطا در دریافت دسته‌بندی‌ها', 'error')
    categories.value = []
  } finally {
    loading.value = false
  }
}

fetchCategories()

/* -------------------------------- Helpers -------------------------------- */
const catId = (c) => c?._id || c?.id || ''

const parentNamesOf = (cat) => {
  if (!cat?.parents?.length) return ''
  return cat.parents
    .map(pid => {
      const id = typeof pid === 'string' ? pid : catId(pid)
      const found = categories.value.find(c => catId(c) === id)
      return found ? (found.name?.fa || found.name || '') : ''
    })
    .filter(Boolean)
    .join(' / ')
}

const filteredCategories = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return categories.value
  return categories.value.filter(c =>
    (c.name?.fa || '').toLowerCase().includes(q) ||
    (c.name?.en || '').toLowerCase().includes(q) ||
    (c.slug || '').toLowerCase().includes(q) ||
    (c.description?.fa || '').toLowerCase().includes(q)
  )
})

const availableParents = computed(() => {
  const currentId = catId(editingCategory.value)
  return categories.value.filter(c => catId(c) !== currentId)
})

const generateSlug = () => {
  const base = (form.value.name.en || form.value.name.fa || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  form.value.slug = base || 'category-' + Date.now()
}

/* ------------------------------- Modal I/O ------------------------------- */
const lockScroll = (lock) => { document.body.style.overflow = lock ? 'hidden' : '' }

const openCreate = () => {
  editingCategory.value = null
  form.value = blankForm()
  sessionUploads.value = new Set()
  showModal.value = true
  lockScroll(true)
}

const openEdit = (cat) => {
  editingCategory.value = cat
  form.value = {
    name: { fa: cat.name?.fa || '', en: cat.name?.en || '' },
    slug: cat.slug || '',
    icon: cat.icon || '◆',
    image: cat.image || '',
    description: { fa: cat.description?.fa || '', en: cat.description?.en || '' },
    status: cat.status || 'active',
    sortOrder: cat.sortOrder ?? 0,
    parents: (cat.parents || []).map(p => (typeof p === 'string' ? p : catId(p))).filter(Boolean),
  }
  sessionUploads.value = new Set()
  showModal.value = true
  lockScroll(true)
}

/** بستن مودال: فایل‌های آپلودشدهٔ ذخیره‌نشده پاک می‌شوند تا یتیم نمانند */
const closeModal = async ({ discardUploads = true } = {}) => {
  showModal.value = false
  lockScroll(false)

  if (discardUploads && sessionUploads.value.size) {
    const orphans = [...sessionUploads.value]
    sessionUploads.value = new Set()
    await Promise.allSettled(orphans.map(p => adminApi.deleteCategoryImage(p)))
  }
  editingCategory.value = null
}

/* -------------------------------- Uploads -------------------------------- */
const validateFile = (file) => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    notify(`فرمت «${file.name}» پشتیبانی نمی‌شود. فقط JPG، PNG، WebP و AVIF مجاز است.`, 'error')
    return false
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    notify(`حجم «${file.name}» بیشتر از ${MAX_IMAGE_MB} مگابایت است.`, 'error')
    return false
  }
  return true
}

const uploadImage = async (file) => {
  if (!validateFile(file)) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await adminApi.uploadCategoryImage(fd)
    const filePath = res?.filePath || res?.url
    if (!res?.success || !filePath) throw new Error(res?.message || 'آپلود ناموفق بود')

    const previous = form.value.image
    form.value.image = filePath
    sessionUploads.value.add(filePath)

    // اگر تصویر قبلی هم موقت بود، همان لحظه پاکش کن
    if (previous && sessionUploads.value.has(previous)) {
      sessionUploads.value.delete(previous)
      adminApi.deleteCategoryImage(previous).catch(() => {})
    }
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'خطا در آپلود تصویر', 'error')
  } finally {
    uploading.value = false
  }
}

const triggerFileInput = () => fileInput.value?.click()

const handleFileSelect = async (e) => {
  const file = e.target.files?.[0]
  if (file) await uploadImage(file)
  e.target.value = ''
}

const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }
const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over') }
const handleDrop = async (e) => {
  e.preventDefault()
  e.currentTarget.classList.remove('drag-over')
  const file = e.dataTransfer?.files?.[0]
  if (file) await uploadImage(file)
}

/**
 * حذف تصویر:
 *  - فایل موقتِ همین جلسه → فوراً از سرور حذف شود
 *  - تصویر ذخیره‌شده → فقط از فرم حذف شود، بک‌اند بعد از ذخیره پاکش می‌کند
 */
const removeImage = () => {
  const p = form.value.image
  form.value.image = ''
  if (p && sessionUploads.value.has(p)) {
    sessionUploads.value.delete(p)
    adminApi.deleteCategoryImage(p).catch(() => {})
  }
}

/* --------------------------------- Save --------------------------------- */
const saveCategory = async () => {
  if (saving.value) return

  if (!form.value.name.fa.trim()) {
    notify('نام فارسی دسته‌بندی الزامی است', 'error')
    return
  }
  if (!form.value.slug.trim()) generateSlug()

  saving.value = true
  try {
    const payload = {
      name: { fa: form.value.name.fa.trim(), en: form.value.name.en.trim() },
      slug: form.value.slug.trim(),
      icon: form.value.icon || '◆',
      image: form.value.image || '',
      description: { fa: form.value.description.fa, en: form.value.description.en },
      status: form.value.status,
      sortOrder: Number(form.value.sortOrder) || 0,
      parents: form.value.parents,
    }

    const id = catId(editingCategory.value)
    const res = id
      ? await adminApi.updateCategory(id, payload)
      : await adminApi.createCategory(payload)

    if (!res?.success) throw new Error(res?.message || 'عملیات ناموفق بود')

    sessionUploads.value = new Set() // ذخیره شد، دیگر یتیم نیست
    notify(id ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی ایجاد شد', 'success')
    await closeModal({ discardUploads: false })
    await fetchCategories()
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'ذخیره‌سازی ناموفق بود', 'error')
  } finally {
    saving.value = false
  }
}

/* -------------------------------- Delete -------------------------------- */
const confirmDelete = (id) => { deletingId.value = id }

const deleteCategory = async (id) => {
  try {
    const res = await adminApi.deleteCategory(id)
    if (!res?.success) throw new Error(res?.message || 'حذف ناموفق بود')
    categories.value = categories.value.filter(c => catId(c) !== id)
    notify('دسته‌بندی حذف شد', 'success')
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'خطا در حذف دسته‌بندی', 'error')
  } finally {
    deletingId.value = null
  }
}

/* ------------------------------- Lifecycle ------------------------------- */
const onKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (deletingId.value !== null) { deletingId.value = null; return }
  if (showModal.value) closeModal()
}
window.addEventListener('keydown', onKeydown)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  lockScroll(false)
})

const fmt = (n) => (Number(n) || 0).toLocaleString('fa-IR')
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fa-IR') : '—')
</script>

<template>
  <div class="admin-categories">
    <!-- Toasts -->
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
      </TransitionGroup>
    </div>

    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت دسته‌بندی‌ها</h1>
        <p class="page-subtitle">
          {{ categories.length ? `${fmt(categories.length)} دسته‌بندی ثبت شده` : 'ایجاد، ویرایش و مدیریت دسته‌بندی‌های محصولات (دوزبانه)' }}
        </p>
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
      <div v-for="cat in filteredCategories" :key="catId(cat)" class="category-card glass">
        <!-- تصویر دسته‌بندی -->
        <div class="category-cover">
          <img v-if="cat.image" :src="getImageUrl(cat.image)" :alt="cat.name?.fa" loading="lazy" />
          <div v-else class="cover-placeholder">
            <span class="cover-icon">{{ cat.icon || '◆' }}</span>
            <span class="cover-hint">بدون تصویر</span>
          </div>
          <span
            class="status-badge floating"
            :style="{ background: statusColors[cat.status]?.bg, color: statusColors[cat.status]?.color }"
          >
            {{ statusColors[cat.status]?.text }}
          </span>
        </div>

        <div class="category-header">
          <div class="category-icon">{{ cat.icon || '◆' }}</div>
          <div class="category-title-group">
            <h3 class="category-name">{{ cat.name?.fa }}</h3>
            <span class="category-en-name" v-if="cat.name?.en">{{ cat.name.en }}</span>
            <span class="category-slug">{{ cat.slug }}</span>
          </div>
        </div>

        <p class="category-desc">{{ cat.description?.fa || '—' }}</p>

        <div class="category-meta">
          <div class="meta-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>
            <span>{{ fmt(cat.productCount || 0) }} محصول</span>
          </div>
          <div class="meta-chip">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{{ fmtDate(cat.createdAt) }}</span>
          </div>
          <div class="meta-chip" v-if="cat.parents && cat.parents.length">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16m-8-8h16" stroke-linecap="round"/></svg>
            <span>زیردستهٔ: {{ parentNamesOf(cat) }}</span>
          </div>
          <div class="meta-chip root" v-else>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            <span>دسته اصلی</span>
          </div>
        </div>

        <div class="category-actions">
          <button class="action-btn edit" @click="openEdit(cat)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            ویرایش
          </button>
          <button class="action-btn delete" @click="confirmDelete(catId(cat))">
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

    <!-- Create / Edit Modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal()">
        <div class="modal-content glass" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2>{{ editingCategory ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید' }}</h2>
            <button class="modal-close" type="button" aria-label="بستن" @click="closeModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid">

              <div class="form-group full">
                <label class="form-label">نام دسته‌بندی <span class="req">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.name.fa" type="text" class="form-input" placeholder="نام فارسی" />
                  <input v-model="form.name.en" type="text" class="form-input" placeholder="English Name" dir="ltr" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">آدرس URL (slug)</label>
                <div class="slug-row">
                  <input v-model="form.slug" type="text" class="form-input" placeholder="diamond-cut" dir="ltr" />
                  <button type="button" class="slug-btn" @click="generateSlug">ساخت خودکار</button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">آیکون (emoji یا نماد)</label>
                <input v-model="form.icon" type="text" class="form-input" placeholder="◆" maxlength="4" />
                <span class="input-hint">یک emoji یا نماد کوتاه</span>
              </div>

              <div class="form-group">
                <label class="form-label">ترتیب نمایش</label>
                <input v-model="form.sortOrder" type="number" class="form-input" placeholder="۰" />
                <span class="input-hint">عدد کوچک‌تر، بالاتر نمایش داده می‌شود</span>
              </div>

              <!-- تصویر دسته‌بندی -->
              <div class="form-group full">
                <label class="form-label">تصویر دسته‌بندی</label>
                <div
                  class="upload-area"
                  @dragover="handleDragOver"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop"
                  @click="!form.image && !uploading && triggerFileInput()"
                >
                  <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFileSelect" />
                  <span v-if="uploading">در حال آپلود...</span>
                  <span v-else-if="!form.image">
                    Drag &amp; drop یا کلیک برای انتخاب تصویر (حداکثر {{ MAX_IMAGE_MB }} مگابایت)
                  </span>
                  <div v-else class="single-image-wrap">
                    <img :src="getImageUrl(form.image)" alt="Preview" class="preview-img" />
                    <button type="button" class="img-remove-btn" title="حذف تصویر" @click.stop="removeImage">✕</button>
                  </div>
                </div>
                <span class="input-hint">این تصویر در مگامنوی نوبار کنار نام دسته‌بندی نمایش داده می‌شود.</span>
              </div>

              <!-- والدها -->
              <div class="form-group full">
                <div class="label-row">
                  <label class="form-label">دسته‌بندی‌های والد (اختیاری)</label>
                  <button type="button" class="clear-selection-btn" @click="form.parents = []">
                    تغییر به دسته اصلی (حذف همه)
                  </button>
                </div>
                <div class="checkbox-grid">
                  <label v-for="c in availableParents" :key="catId(c)" class="checkbox-label">
                    <input type="checkbox" :value="catId(c)" v-model="form.parents" />
                    <span class="checkbox-text">{{ c.name?.fa }}</span>
                  </label>
                  <span v-if="availableParents.length === 0" class="input-hint">دسته‌بندی دیگری برای انتخاب وجود ندارد</span>
                </div>
                <span class="input-hint">
                  اگر هیچ‌کدام تیک نخورد، این دسته یک «دسته اصلی» محسوب می‌شود.
                </span>
              </div>

              <div class="form-group full">
                <label class="form-label">توضیحات</label>
                <div class="lang-inputs column">
                  <textarea v-model="form.description.fa" class="form-input form-textarea" rows="3" placeholder="توضیحات فارسی..."></textarea>
                  <textarea v-model="form.description.en" class="form-input form-textarea" rows="3" placeholder="English Description..." dir="ltr"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" type="button" :disabled="saving" @click="closeModal()">انصراف</button>
              <button class="submit-btn" type="button" :disabled="saving || uploading" @click="saveCategory">
                {{ saving ? 'در حال ذخیره...' : 'ذخیره' }}
              </button>
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
            <p class="confirm-text">
              آیا از حذف این دسته‌بندی اطمینان دارید؟ این عملیات قابل بازگشت نیست و تصویر آن نیز حذف می‌شود.
            </p>
            <div class="modal-actions">
              <button class="cancel-btn" type="button" @click="deletingId = null">انصراف</button>
              <button class="delete-btn" type="button" @click="deleteCategory(deletingId)">حذف</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-categories { display: flex; flex-direction: column; gap: 20px; }
.admin-categories *, .admin-categories *::before, .admin-categories *::after { box-sizing: border-box; }

/* ------------------------------- Header ------------------------------- */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }

.create-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  border-radius: 10px; border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease; font-family: inherit;
}
.create-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }

/* ------------------------------- Filters ------------------------------ */
.filters-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.search-box {
  flex: 1; min-width: 250px; display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-radius: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #fff;
}
.search-box svg { opacity: 0.4; flex-shrink: 0; }
.search-box input { flex: 1; min-width: 0; background: none; border: none; color: #fff; font-size: 0.9rem; outline: none; font-family: inherit; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

/* ------------------------------- Loading ------------------------------ */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* -------------------------------- Grid -------------------------------- */
.categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

.category-card {
  padding: 0 0 20px; border-radius: 20px;
  background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-direction: column; gap: 14px;
  transition: border-color 0.25s ease, transform 0.25s ease;
  overflow: hidden;
}
.category-card:hover { border-color: rgba(197,160,89,0.3); transform: translateY(-2px); }

/* ------------------------------- Cover -------------------------------- */
.category-cover {
  position: relative; width: 100%; aspect-ratio: 16/9;
  background: radial-gradient(circle at 50% 40%, rgba(197,160,89,0.08), rgba(255,255,255,0.02));
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.category-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: 0.4; }
.cover-icon { font-size: 2rem; color: #c5a059; }
.cover-hint { font-size: 0.72rem; color: rgba(255,255,255,0.5); }

.status-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 500; flex-shrink: 0; }
.status-badge.floating { position: absolute; top: 12px; inset-inline-end: 12px; backdrop-filter: blur(6px); }

/* ------------------------------- Content ------------------------------ */
.category-header { display: flex; align-items: flex-start; gap: 14px; padding: 0 20px; }
.category-icon {
  width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(197,160,89,0.2), rgba(197,160,89,0.05));
  border: 1px solid rgba(197,160,89,0.2);
  display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
}
.category-title-group { flex: 1; min-width: 0; }
.category-name { font-size: 1.05rem; font-weight: 600; margin: 0 0 2px; word-break: break-word; }
.category-en-name { font-size: 0.8rem; color: rgba(255,255,255,0.4); display: block; margin-bottom: 4px; }
.category-slug { font-size: 0.78rem; opacity: 0.4; font-family: ui-monospace, monospace; word-break: break-all; }

.category-desc {
  font-size: 0.88rem; opacity: 0.68; line-height: 1.7; margin: 0; padding: 0 20px;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.category-meta { display: flex; gap: 10px; flex-wrap: wrap; padding: 0 20px; }
.meta-chip {
  display: flex; align-items: center; gap: 6px; font-size: 0.8rem; opacity: 0.62;
  padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.03);
  max-width: 100%; overflow: hidden;
}
.meta-chip span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta-chip svg { flex-shrink: 0; }
.meta-chip.root { color: #facc6b; opacity: 0.85; background: rgba(197,160,89,0.08); }

.category-actions { display: flex; gap: 8px; padding: 0 20px; margin-top: 2px; }
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: 10px; border: none;
  font-size: 0.85rem; cursor: pointer; transition: background 0.2s ease; font-family: inherit;
}
.action-btn.edit { background: rgba(197,160,89,0.15); color: #facc6b; }
.action-btn.edit:hover { background: rgba(197,160,89,0.25); }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover { background: rgba(239,68,68,0.25); }

.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); grid-column: 1 / -1; }
.empty-icon { font-size: 2.5rem; display: block; margin-bottom: 8px; }

/* -------------------------------- Toast ------------------------------- */
.toast-stack { position: fixed; top: 20px; left: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 3000; }
.toast { padding: 12px 18px; border-radius: 12px; font-size: 0.86rem; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.4); max-width: 340px; }
.toast.success { background: rgba(34,197,94,0.92); }
.toast.error { background: rgba(239,68,68,0.92); }
.toast.info { background: rgba(60,70,90,0.95); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-20px); }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }

/* -------------------------------- Modal ------------------------------- */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
}
.modal-content {
  width: 100%; max-width: 640px; max-height: 85vh; overflow-y: auto;
  border-radius: 20px; padding: 0; background: rgba(8,10,18,0.97);
  border: 1px solid rgba(255,255,255,0.08);
}
.modal-content.small { max-width: 420px; }

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; background: rgba(8,10,18,0.97); backdrop-filter: blur(10px); z-index: 10;
}
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-close {
  width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease;
}
.modal-close:hover { background: rgba(255,255,255,0.1); }

.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.confirm-text { font-size: 0.95rem; opacity: 0.8; line-height: 1.8; margin: 0; }

/* -------------------------------- Form -------------------------------- */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 0.85rem; opacity: 0.7; }
.req { color: #ef4444; }

.label-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }

.form-input {
  padding: 10px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #fff; font-size: 0.9rem; font-family: inherit; outline: none;
  transition: border-color 0.2s ease; width: 100%;
}
.form-input:focus { border-color: rgba(197,160,89,0.5); }
.form-input::placeholder { color: rgba(255,255,255,0.3); }

.form-select {
  padding: 10px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; cursor: pointer; width: 100%;
}
.form-select option { background: #0a0d14; color: #fff; }

.form-textarea { resize: vertical; min-height: 80px; }

.input-hint { font-size: 0.75rem; opacity: 0.45; line-height: 1.7; }

.lang-inputs { display: flex; gap: 10px; }
.lang-inputs.column { flex-direction: column; }

.slug-row { display: flex; gap: 8px; align-items: center; }
.slug-btn {
  flex-shrink: 0; padding: 10px 14px; border-radius: 10px;
  border: 1px dashed rgba(197,160,89,0.4); background: transparent;
  color: #facc6b; font-size: 0.78rem; font-family: inherit; cursor: pointer; white-space: nowrap;
  transition: background 0.2s ease;
}
.slug-btn:hover { background: rgba(197,160,89,0.1); }

/* ------------------------------- Upload ------------------------------- */
.upload-area {
  border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 20px;
  text-align: center; cursor: pointer; background: rgba(255,255,255,0.02);
  transition: border-color 0.2s ease, background 0.2s ease;
  font-size: 0.85rem; color: rgba(255,255,255,0.55);
}
.upload-area.drag-over { border-color: rgba(197,160,89,0.6); background: rgba(197,160,89,0.1); }
.single-image-wrap { position: relative; display: inline-block; }
.preview-img { max-width: 100%; max-height: 160px; object-fit: contain; border-radius: 10px; display: block; }
.img-remove-btn {
  position: absolute; top: -8px; inset-inline-end: -8px;
  width: 24px; height: 24px; border-radius: 50%; border: none;
  background: #ef4444; color: #fff; font-size: 0.75rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4); z-index: 5;
  transition: transform 0.2s ease, background 0.2s ease;
}
.img-remove-btn:hover { background: #dc2626; transform: scale(1.15); }

/* ------------------------------ Checkbox ------------------------------ */
.clear-selection-btn {
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444; border-radius: 6px; padding: 4px 8px; font-size: 0.75rem;
  cursor: pointer; transition: background 0.2s ease, color 0.2s ease; font-family: inherit;
}
.clear-selection-btn:hover { background: rgba(239,68,68,0.2); color: #f87171; }

.checkbox-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; padding: 14px; max-height: 200px; overflow-y: auto;
}
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0; }
.checkbox-label input[type="checkbox"] { accent-color: #c5a059; width: 16px; height: 16px; cursor: pointer; margin: 0; flex-shrink: 0; }
.checkbox-text { font-size: 0.85rem; color: rgba(255,255,255,0.85); user-select: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ------------------------------- Actions ------------------------------ */
.modal-actions {
  display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;
  position: sticky; bottom: 0;
  background: linear-gradient(to top, rgba(8,10,18,1), transparent);
  padding-top: 12px;
}
.cancel-btn {
  padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: transparent; color: rgba(255,255,255,0.7); font-size: 0.9rem;
  cursor: pointer; transition: background 0.2s ease; font-family: inherit;
}
.cancel-btn:hover { background: rgba(255,255,255,0.06); }
.cancel-btn:disabled, .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.submit-btn {
  padding: 10px 24px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032); color: #000;
  font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease; font-family: inherit;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }

.delete-btn {
  padding: 10px 24px; border-radius: 10px; border: none;
  background: #ef4444; color: #fff; font-size: 0.9rem; font-weight: 600;
  cursor: pointer; transition: background 0.25s ease; font-family: inherit;
}
.delete-btn:hover { background: #dc2626; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* ------------------------------ Responsive ---------------------------- */
@media (max-width: 768px) {
  .categories-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; }
  .create-btn { width: 100%; justify-content: center; }
  .form-grid { grid-template-columns: 1fr; }
  .lang-inputs { flex-direction: column; }
  .slug-row { flex-direction: column; align-items: stretch; }
  .slug-btn { width: 100%; }
  .toast-stack { left: 12px; right: 12px; }
  .toast { max-width: none; }
}

@media (prefers-reduced-motion: reduce) {
  .create-btn, .submit-btn, .category-card, .img-remove-btn { transition: none !important; }
  .create-btn:hover, .submit-btn:hover, .category-card:hover, .img-remove-btn:hover { transform: none; }
  .spinner { animation-duration: 1.5s; }
}
</style>
