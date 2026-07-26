<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../../services/adminApi'
import { getImageUrl } from '../../utils/imageUrl'

const route = useRoute()
const router = useRouter()

/* ------------------------------- ثابت‌ها ------------------------------- */
const PAGE_SIZE = 24
const MAX_IMAGE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const STATUS_META = {
  active:       { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', text: 'فعال' },
  out_of_stock: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', text: 'اتمام موجودی' },
  inactive:     { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'غیرفعال' },
  unknown:      { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'نامشخص' }
}
const statusOf = (p) => STATUS_META[p?.status] || STATUS_META.unknown

/* ------------------------------- Toast ------------------------------- */
const toasts = ref([])
let toastId = 0
const notify = (message, type = 'info', ttl = 4000) => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, ttl)
}

/* ------------------------------- State ------------------------------- */
const loading = ref(true)
const saving = ref(false)
const uploadingMain = ref(false)
const uploadingGallery = ref(false)

const products = ref([])
const categories = ref([])
const pagination = ref({ page: 1, pages: 1, total: 0 })

const searchQuery = ref('')
const statusFilter = ref('all')
const categoryFilter = ref('all')

const showModal = ref(false)
const editingProduct = ref(null)
const formErrors = ref({})

const fileInput = ref(null)
const galleryInput = ref(null)

/* تصاویری که در این جلسه آپلود شده‌اند و هنوز ذخیره نشده‌اند */
const sessionUploads = ref(new Set())
/* تصاویر اصلی محصول هنگام باز شدن مودال (برای تشخیص فایل ذخیره‌شده از موقت) */
const originalImages = ref(new Set())

/* --------------------------------- Form --------------------------------- */
const blankForm = () => ({
  name: { fa: '', en: '' }, category: '', price: '', stock: '',
  shortDesc: { fa: '', en: '' }, description: { fa: '', en: '' },
  image: '', gallery: [], status: 'active',
  weight: '', dimensions: '',
  material: { fa: '', en: '' }, craftsman: { fa: '', en: '' }, warranty: { fa: '', en: '' },
  sku: '', featuresText: { fa: '', en: '' }, sizes: [], colors: [], relatedProducts: []
})
const form = ref(blankForm())

/* ------------------------------ Data fetch ------------------------------ */
const buildParams = () => {
  const params = { page: pagination.value.page, limit: PAGE_SIZE }
  if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
  if (statusFilter.value !== 'all') params.status = statusFilter.value
  if (categoryFilter.value !== 'all') params.category = categoryFilter.value
  return params
}

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await adminApi.getProducts(buildParams())
    if (res?.success) {
      products.value = Array.isArray(res.data) ? res.data : []
      pagination.value = {
        page: res.page || 1,
        pages: res.pages || 1,
        total: res.total ?? products.value.length
      }
    } else {
      throw new Error(res?.message || 'دریافت محصولات ناموفق بود')
    }
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'خطا در دریافت محصولات', 'error')
    products.value = []
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await adminApi.getCategories()
    if (res?.success) categories.value = res.data || []
  } catch {
    notify('خطا در دریافت دسته‌بندی‌ها', 'error')
  }
}

/* لیست سبک برای انتخابگر «محصولات مرتبط» (مستقل از صفحه‌بندی جدول) */
const lookupProducts = ref([])
const lookupLoaded = ref(false)
const fetchLookup = async () => {
  if (lookupLoaded.value) return
  try {
    const res = await adminApi.getProducts({ limit: 200, page: 1 })
    if (res?.success) { lookupProducts.value = res.data || []; lookupLoaded.value = true }
  } catch { /* اختیاری است */ }
}

/* ------------------------- فیلترها با debounce ------------------------- */
let searchTimer = null
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { pagination.value.page = 1; fetchProducts() }, 400)
})
watch([statusFilter, categoryFilter], () => { pagination.value.page = 1; fetchProducts() })

const syncStatusFromRoute = () => {
  const s = route.query.status
  statusFilter.value = s && STATUS_META[s] ? s : 'all'
}
watch(() => route.query.status, syncStatusFromRoute)

const goToPage = (p) => {
  if (p < 1 || p > pagination.value.pages || p === pagination.value.page) return
  pagination.value.page = p
  fetchProducts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* --------------------------- Related products --------------------------- */
const relatedProductSearch = ref('')

const availableRelatedProducts = computed(() => {
  const currentId = editingProduct.value?._id || editingProduct.value?.id
  const q = relatedProductSearch.value.trim().toLowerCase()
  return lookupProducts.value.filter(p => {
    const pid = p._id || p.id
    if (currentId && pid === currentId) return false
    if (form.value.relatedProducts.includes(pid)) return false
    if (!q) return true
    return (p.name?.fa || '').toLowerCase().includes(q) || (p.name?.en || '').toLowerCase().includes(q)
  }).slice(0, 20)
})

const selectedRelatedProducts = computed(() =>
  form.value.relatedProducts
    .map(id => lookupProducts.value.find(p => (p._id || p.id) === id))
    .filter(Boolean)
)

const addRelatedProduct = (product) => {
  const pid = product._id || product.id
  if (pid && !form.value.relatedProducts.includes(pid)) form.value.relatedProducts.push(pid)
  relatedProductSearch.value = ''
}
const removeRelatedProduct = (pid) => {
  form.value.relatedProducts = form.value.relatedProducts.filter(id => id !== pid)
}

/* ---------------------------- Sizes & Colors ---------------------------- */
const addColor = () => form.value.colors.push({ name: { fa: '', en: '' }, value: '#c5a059' })
const removeColor = (i) => form.value.colors.splice(i, 1)
const addSize = () => form.value.sizes.push({ name: { fa: '', en: '' }, price: '', discountPercent: '' })
const removeSize = (i) => form.value.sizes.splice(i, 1)

/* ------------------------------- Modal I/O ------------------------------- */
const lockScroll = (lock) => { document.body.style.overflow = lock ? 'hidden' : '' }

const openCreate = () => {
  editingProduct.value = null
  form.value = blankForm()
  formErrors.value = {}
  sessionUploads.value = new Set()
  originalImages.value = new Set()
  relatedProductSearch.value = ''
  showModal.value = true
  lockScroll(true)
  fetchLookup()
}

const openEdit = (product) => {
  editingProduct.value = product
  const gallery = Array.isArray(product.images) ? [...product.images] : []

  form.value = {
    name: { fa: product.name?.fa || '', en: product.name?.en || '' },
    category: product.category?._id || (typeof product.category === 'string' ? product.category : ''),
    price: product.price ?? '',
    stock: product.stock ?? '',
    shortDesc: { fa: product.shortDesc?.fa || '', en: product.shortDesc?.en || '' },
    description: { fa: product.description?.fa || '', en: product.description?.en || '' },
    image: product.mainImage || '',
    gallery,
    status: product.status || 'active',
    weight: product.weight || '',
    dimensions: product.dimensions || '',
    material: { fa: product.material?.fa || '', en: product.material?.en || '' },
    craftsman: { fa: product.craftsman?.fa || '', en: product.craftsman?.en || '' },
    warranty: { fa: product.warranty?.fa || '', en: product.warranty?.en || '' },
    sku: product.sku || '',
    featuresText: {
      fa: Array.isArray(product.features) ? product.features.map(f => f?.fa || '').join('\n') : '',
      en: Array.isArray(product.features) ? product.features.map(f => f?.en || '').join('\n') : ''
    },
    sizes: Array.isArray(product.sizes)
      ? product.sizes.map(s => ({
          name: { fa: s.name?.fa || '', en: s.name?.en || '' },
          price: s.price ?? '', discountPercent: s.discountPercent ?? ''
        }))
      : [],
    colors: Array.isArray(product.colors)
      ? product.colors.map(c => ({ name: { fa: c.name?.fa || '', en: c.name?.en || '' }, value: c.value || '#c5a059' }))
      : [],
    relatedProducts: Array.isArray(product.relatedProducts)
      ? product.relatedProducts.map(rp => (typeof rp === 'object' ? (rp._id || rp.id) : rp)).filter(Boolean)
      : []
  }

  // تصاویری که واقعاً در دیتابیس ذخیره شده‌اند
  originalImages.value = new Set([product.mainImage, ...gallery].filter(Boolean))
  sessionUploads.value = new Set()
  formErrors.value = {}
  relatedProductSearch.value = ''
  showModal.value = true
  lockScroll(true)
  fetchLookup()
}

/** بستن مودال: فایل‌های آپلودشده‌ی ذخیره‌نشده را پاک می‌کنیم تا فایل یتیم نماند */
const closeModal = async ({ discardUploads = true } = {}) => {
  showModal.value = false
  lockScroll(false)

  if (discardUploads && sessionUploads.value.size) {
    const orphans = [...sessionUploads.value]
    sessionUploads.value = new Set()
    await Promise.allSettled(orphans.map(p => adminApi.deleteProductImage(p)))
  }
  editingProduct.value = null
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

const uploadOne = async (file) => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await adminApi.uploadProductImage(formData)
  const filePath = res?.filePath || res?.url
  if (!res?.success || !filePath) throw new Error(res?.message || 'آپلود ناموفق بود')
  sessionUploads.value.add(filePath)
  return filePath
}

const uploadMain = async (file) => {
  if (!validateFile(file)) return
  uploadingMain.value = true
  try {
    const previous = form.value.image
    form.value.image = await uploadOne(file)
    // اگر تصویر قبلی هم موقت بود، همان لحظه پاکش کن
    if (previous && sessionUploads.value.has(previous)) {
      sessionUploads.value.delete(previous)
      adminApi.deleteProductImage(previous).catch(() => {})
    }
  } catch (err) {
    notify(err.message || 'خطا در آپلود تصویر', 'error')
  } finally {
    uploadingMain.value = false
  }
}

const uploadGallery = async (files) => {
  const valid = [...files].filter(validateFile)
  if (!valid.length) return
  uploadingGallery.value = true
  try {
    const results = await Promise.allSettled(valid.map(uploadOne)) // موازی، نه سریال
    results.forEach(r => {
      if (r.status === 'fulfilled') form.value.gallery.push(r.value)
      else notify(r.reason?.message || 'یکی از تصاویر آپلود نشد', 'error')
    })
  } finally {
    uploadingGallery.value = false
  }
}

const triggerFileInput = () => fileInput.value?.click()
const triggerGalleryInput = () => galleryInput.value?.click()

const handleMainSelect = async (e) => {
  const file = e.target.files?.[0]
  if (file) await uploadMain(file)
  e.target.value = ''
}
const handleGallerySelect = async (e) => {
  if (e.target.files?.length) await uploadGallery(e.target.files)
  e.target.value = ''
}

const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }
const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over') }
const handleDrop = async (e, type = 'main') => {
  e.preventDefault()
  e.currentTarget.classList.remove('drag-over')
  const files = e.dataTransfer?.files
  if (!files?.length) return
  if (type === 'main') await uploadMain(files[0])
  else await uploadGallery(files)
}

/**
 * حذف تصویر:
 *  - اگر فایل موقتِ همین جلسه است → فوراً از سرور حذف شود
 *  - اگر تصویر ذخیره‌شده‌ی محصول است → فقط از فرم حذف شود، بک‌اند بعد از ذخیره پاکش می‌کند
 */
const dropImage = (path) => {
  if (!path) return
  if (sessionUploads.value.has(path)) {
    sessionUploads.value.delete(path)
    adminApi.deleteProductImage(path).catch(() => {})
  }
}
const removeMainImage = () => { const p = form.value.image; form.value.image = ''; dropImage(p) }
const removeGalleryImage = (index) => {
  const [p] = form.value.gallery.splice(index, 1)
  dropImage(p)
}

/* -------------------------------- Validate -------------------------------- */
const validateForm = () => {
  const errors = {}
  if (!form.value.name.fa.trim()) errors.name = 'نام فارسی محصول الزامی است'
  if (!form.value.category) errors.category = 'انتخاب دسته‌بندی الزامی است'
  const price = Number(form.value.price)
  if (form.value.price === '' || Number.isNaN(price) || price < 0) errors.price = 'قیمت باید عددی و بزرگ‌تر یا مساوی صفر باشد'
  const stock = Number(form.value.stock)
  if (form.value.stock !== '' && (Number.isNaN(stock) || stock < 0)) errors.stock = 'موجودی نمی‌تواند منفی باشد'

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

/* --------------------------------- Save --------------------------------- */
const buildPayload = () => {
  const { featuresText, ...rest } = form.value
  const faFeatures = (featuresText.fa || '').split('\n').map(s => s.trim()).filter(Boolean)
  const enFeatures = (featuresText.en || '').split('\n').map(s => s.trim()).filter(Boolean)

  return {
    ...rest,
    price: Number(form.value.price) || 0,
    stock: Number(form.value.stock) || 0,
    features: faFeatures.map((fa, i) => ({ fa, en: enFeatures[i] || '' })),
    sizes: (form.value.sizes || [])
      .filter(s => s?.name?.fa?.trim())
      .map(s => ({
        name: { fa: s.name.fa.trim(), en: String(s.name.en || '').trim() },
        price: Number(s.price) || 0,
        discountPercent: Math.min(Math.max(Number(s.discountPercent) || 0, 0), 100)
      })),
    colors: (form.value.colors || [])
      .filter(c => c?.name?.fa?.trim())
      .map(c => ({ name: { fa: c.name.fa.trim(), en: String(c.name.en || '').trim() }, value: c.value })),
    relatedProducts: form.value.relatedProducts || []
  }
}

const saveProduct = async () => {
  if (saving.value) return
  if (!validateForm()) {
    notify('لطفاً خطاهای فرم را برطرف کنید', 'error')
    await nextTick()
    document.querySelector('.form-input.has-error, .form-select.has-error')?.focus()
    return
  }

  saving.value = true
  try {
    const payload = buildPayload()
    const id = editingProduct.value?._id || editingProduct.value?.id
    const res = id ? await adminApi.updateProduct(id, payload) : await adminApi.createProduct(payload)
    if (!res?.success) throw new Error(res?.message || 'عملیات ناموفق بود')

    sessionUploads.value = new Set() // ذخیره شد، دیگر یتیم نیست
    notify(id ? 'محصول با موفقیت ویرایش شد' : 'محصول با موفقیت ایجاد شد', 'success')
    await closeModal({ discardUploads: false })
    await fetchProducts()
    lookupLoaded.value = false
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'ذخیره‌سازی ناموفق بود', 'error')
  } finally {
    saving.value = false
  }
}

/* -------------------------------- Delete -------------------------------- */
const deletingId = ref(null)
const removeProduct = async (product) => {
  const id = product._id || product.id
  if (!confirm(`آیا از حذف «${product.name?.fa || 'این محصول'}» اطمینان دارید؟ این عملیات بازگشت‌پذیر نیست.`)) return

  deletingId.value = id
  try {
    const res = await adminApi.deleteProduct(id)
    if (!res?.success) throw new Error(res?.message || 'حذف ناموفق بود')
    notify('محصول حذف شد', 'success')

    // اگر آخرین آیتم صفحه بود، یک صفحه به عقب برگرد
    if (products.value.length === 1 && pagination.value.page > 1) pagination.value.page--
    await fetchProducts()
    lookupLoaded.value = false
  } catch (err) {
    notify(err.response?.data?.message || err.message || 'خطا در حذف محصول', 'error')
  } finally {
    deletingId.value = null
  }
}

/* ------------------------------- Lifecycle ------------------------------- */
const onKeydown = (e) => { if (e.key === 'Escape' && showModal.value) closeModal() }

const fmt = (n) => (Number(n) || 0).toLocaleString('fa-IR')

onMounted(() => {
  syncStatusFromRoute()
  fetchProducts()
  fetchCategories()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(searchTimer)
  lockScroll(false)
})
</script>

<template>
  <div class="admin-products">
    <!-- Toasts -->
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
      </TransitionGroup>
    </div>

    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت محصولات</h1>
        <p class="page-subtitle">
          {{ pagination.total ? `${fmt(pagination.total)} محصول ثبت شده` : 'ایجاد، ویرایش و مدیریت محصولات (دوزبانه)' }}
        </p>
      </div>
      <button class="create-btn" @click="openCreate">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        محصول جدید
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="جستجوی محصول..." />
      </div>
      <select v-model="categoryFilter" class="filter-select">
        <option value="all">همه دسته‌بندی‌ها</option>
        <option v-for="cat in categories" :key="cat._id" :value="cat._id">{{ cat.name?.fa || cat.name }}</option>
      </select>
      <select v-model="statusFilter" class="filter-select">
        <option value="all">همه وضعیت‌ها</option>
        <option value="active">فعال</option>
        <option value="out_of_stock">اتمام موجودی</option>
        <option value="inactive">غیرفعال</option>
      </select>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <template v-else>
      <div class="products-grid">
        <div v-for="product in products" :key="product._id || product.id" class="product-card glass">
          <div class="product-img">
            <img v-if="product.mainImage" :src="getImageUrl(product.mainImage)" :alt="product.name?.fa" class="product-real-img" loading="lazy" />
            <div v-else class="img-placeholder">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <span class="status-badge" :style="{ background: statusOf(product).bg, color: statusOf(product).color }">
              {{ statusOf(product).text }}
            </span>
          </div>

          <div class="product-info">
            <h3 class="product-name">{{ product.name?.fa }}</h3>
            <span v-if="product.name?.en" class="product-en-name">{{ product.name.en }}</span>
            <span class="product-category">{{ product.category?.name?.fa || 'بدون دسته‌بندی' }}</span>

            <div class="product-meta">
              <div class="meta-item">
                <span class="meta-label">قیمت:</span>
                <span class="meta-value price">{{ fmt(product.price) }} تومان</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">موجودی:</span>
                <span class="meta-value" :class="{ low: (product.stock ?? 0) < 5 }">{{ fmt(product.stock ?? 0) }} عدد</span>
              </div>
            </div>

            <p class="product-desc">{{ product.shortDesc?.fa || product.description?.fa }}</p>
          </div>

          <div class="product-actions">
            <button class="action-btn edit" @click="openEdit(product)">ویرایش</button>
            <button class="action-btn delete" :disabled="deletingId === (product._id || product.id)" @click="removeProduct(product)">
              {{ deletingId === (product._id || product.id) ? 'در حال حذف...' : 'حذف' }}
            </button>
          </div>
        </div>

        <div v-if="products.length === 0" class="empty-state">
          <span class="empty-icon">📦</span>
          <span>محصولی یافت نشد</span>
        </div>
      </div>

      <div v-if="pagination.pages > 1" class="pagination">
        <button class="page-btn" :disabled="pagination.page === 1" @click="goToPage(pagination.page - 1)">قبلی</button>
        <span class="page-info">صفحه {{ fmt(pagination.page) }} از {{ fmt(pagination.pages) }}</span>
        <button class="page-btn" :disabled="pagination.page === pagination.pages" @click="goToPage(pagination.page + 1)">بعدی</button>
      </div>
    </template>

    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal()">
        <div class="modal-content glass" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2>{{ editingProduct ? 'ویرایش محصول' : 'محصول جدید' }}</h2>
            <button class="modal-close" type="button" aria-label="بستن" @click="closeModal()">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">نام محصول <span class="req">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.name.fa" type="text" class="form-input" :class="{ 'has-error': formErrors.name }" placeholder="نام فارسی" />
                  <input v-model="form.name.en" type="text" class="form-input" placeholder="English Name" dir="ltr" />
                </div>
                <span v-if="formErrors.name" class="error-text">{{ formErrors.name }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">دسته‌بندی <span class="req">*</span></label>
                <select v-model="form.category" class="form-select" :class="{ 'has-error': formErrors.category }">
                  <option value="" disabled>— انتخاب کنید —</option>
                  <option v-for="cat in categories" :key="cat._id" :value="cat._id">{{ cat.name?.fa || cat.name }}</option>
                </select>
                <span v-if="formErrors.category" class="error-text">{{ formErrors.category }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">قیمت (تومان) <span class="req">*</span></label>
                <input v-model="form.price" type="number" min="0" class="form-input" :class="{ 'has-error': formErrors.price }" placeholder="۰" />
                <span v-if="formErrors.price" class="error-text">{{ formErrors.price }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">موجودی</label>
                <input v-model="form.stock" type="number" min="0" class="form-input" :class="{ 'has-error': formErrors.stock }" placeholder="۰" />
                <span v-if="formErrors.stock" class="error-text">{{ formErrors.stock }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                  <option value="out_of_stock">اتمام موجودی</option>
                </select>
              </div>

              <!-- تصویر اصلی -->
              <div class="form-group full">
                <label class="form-label">تصویر اصلی</label>
                <div class="upload-area"
                     @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop($event, 'main')"
                     @click="!form.image && !uploadingMain && triggerFileInput()">
                  <input ref="fileInput" type="file" accept="image/*" hidden @change="handleMainSelect" />
                  <span v-if="uploadingMain">در حال آپلود...</span>
                  <span v-else-if="!form.image">Drag & drop یا کلیک برای انتخاب تصویر (حداکثر {{ MAX_IMAGE_MB }} مگابایت)</span>
                  <div v-else class="single-image-wrap">
                    <img :src="getImageUrl(form.image)" alt="Preview" class="preview-img" />
                    <button type="button" class="img-remove-btn" title="حذف تصویر" @click.stop="removeMainImage">✕</button>
                  </div>
                </div>
              </div>

              <!-- گالری -->
              <div class="form-group full">
                <label class="form-label">گالری تصاویر</label>
                <div class="upload-area"
                     @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop($event, 'gallery')"
                     @click="!uploadingGallery && triggerGalleryInput()">
                  <input ref="galleryInput" type="file" accept="image/*" multiple hidden @change="handleGallerySelect" />
                  <div v-if="form.gallery.length" class="gallery-preview">
                    <div v-for="(img, idx) in form.gallery" :key="img + idx" class="gallery-item">
                      <img :src="getImageUrl(img)" alt="" />
                      <button type="button" class="img-remove-btn" title="حذف تصویر" @click.stop="removeGalleryImage(idx)">✕</button>
                    </div>
                  </div>
                  <span v-if="uploadingGallery" class="upload-hint">در حال آپلود...</span>
                  <span v-else-if="!form.gallery.length">Drag & drop یا کلیک برای انتخاب تصاویر</span>
                  <span v-else class="upload-hint">برای افزودن تصویر بیشتر کلیک کنید</span>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">توضیح کوتاه</label>
                <div class="lang-inputs">
                  <input v-model="form.shortDesc.fa" type="text" class="form-input" placeholder="توضیح کوتاه فارسی" maxlength="200" />
                  <input v-model="form.shortDesc.en" type="text" class="form-input" placeholder="Short English description" dir="ltr" maxlength="200" />
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">توضیحات کامل</label>
                <div class="lang-inputs column">
                  <textarea v-model="form.description.fa" class="form-input form-textarea" rows="3" placeholder="توضیحات کامل فارسی..."></textarea>
                  <textarea v-model="form.description.en" class="form-input form-textarea" rows="3" placeholder="Full English description..." dir="ltr"></textarea>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">کد محصول (SKU)</label>
                <input v-model="form.sku" type="text" class="form-input" placeholder="مثلاً NM-DIA-001" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label">وزن</label>
                <input v-model="form.weight" type="text" class="form-input" placeholder="مثلاً ۱.۸ کیلوگرم" />
              </div>
              <div class="form-group">
                <label class="form-label">ابعاد</label>
                <input v-model="form.dimensions" type="text" class="form-input" placeholder="مثلاً ۲۵ × ۱۵ سانتی‌متر" />
              </div>

              <div class="form-group full">
                <label class="form-label">جنس</label>
                <div class="lang-inputs">
                  <input v-model="form.material.fa" type="text" class="form-input" placeholder="جنس به فارسی" />
                  <input v-model="form.material.en" type="text" class="form-input" placeholder="Material in English" dir="ltr" />
                </div>
              </div>
              <div class="form-group full">
                <label class="form-label">سازنده</label>
                <div class="lang-inputs">
                  <input v-model="form.craftsman.fa" type="text" class="form-input" placeholder="نام استادکار" />
                  <input v-model="form.craftsman.en" type="text" class="form-input" placeholder="Craftsman Name" dir="ltr" />
                </div>
              </div>
              <div class="form-group full">
                <label class="form-label">ضمانت</label>
                <div class="lang-inputs">
                  <input v-model="form.warranty.fa" type="text" class="form-input" placeholder="ضمانت به فارسی" />
                  <input v-model="form.warranty.en" type="text" class="form-input" placeholder="Warranty in English" dir="ltr" />
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">ویژگی‌ها (هر خط یک ویژگی)</label>
                <div class="lang-inputs column">
                  <textarea v-model="form.featuresText.fa" class="form-input form-textarea" rows="3" placeholder="ویژگی‌ها به فارسی..."></textarea>
                  <textarea v-model="form.featuresText.en" class="form-input form-textarea" rows="3" placeholder="Features in English..." dir="ltr"></textarea>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">سایزها و قیمت هر سایز</label>
                <div class="sizes-container">
                  <div v-for="(s, i) in form.sizes" :key="'size-' + i" class="dynamic-row">
                    <div class="lang-inputs flex-1">
                      <input v-model="s.name.fa" type="text" class="form-input" placeholder="نام سایز (فارسی)" />
                      <input v-model="s.name.en" type="text" class="form-input" placeholder="Size Name (EN)" dir="ltr" />
                    </div>
                    <input v-model="s.price" type="number" min="0" class="form-input w-120" placeholder="قیمت این سایز" />
                    <input v-model="s.discountPercent" type="number" min="0" max="100" class="form-input w-100" placeholder="٪ تخفیف" />
                    <button type="button" class="remove-btn" @click="removeSize(i)">حذف</button>
                  </div>
                  <button type="button" class="add-btn" @click="addSize">+ افزودن سایز</button>
                  <span class="hint-text">اگر قیمت یک سایز ۰ باشد، قیمت پایه محصول برای آن سایز استفاده می‌شود.</span>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">رنگ‌ها</label>
                <div class="colors-container">
                  <div v-for="(c, i) in form.colors" :key="'color-' + i" class="dynamic-row">
                    <div class="lang-inputs flex-1">
                      <input v-model="c.name.fa" type="text" class="form-input" placeholder="نام رنگ (فارسی)" />
                      <input v-model="c.name.en" type="text" class="form-input" placeholder="Color Name (EN)" dir="ltr" />
                    </div>
                    <input v-model="c.value" type="color" class="color-picker" />
                    <button type="button" class="remove-btn" @click="removeColor(i)">حذف</button>
                  </div>
                  <button type="button" class="add-btn" @click="addColor">+ افزودن رنگ</button>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">محصولات مرتبط</label>
                <div class="related-products-container">
                  <div v-if="selectedRelatedProducts.length" class="selected-tags">
                    <span v-for="rp in selectedRelatedProducts" :key="rp._id || rp.id" class="related-tag">
                      <img v-if="rp.mainImage" :src="getImageUrl(rp.mainImage)" class="tag-img" alt="" />
                      <span class="tag-name">{{ rp.name?.fa }}</span>
                      <button type="button" class="tag-remove" @click="removeRelatedProduct(rp._id || rp.id)">✕</button>
                    </span>
                  </div>
                  <div v-else class="no-related-hint">
                    محصول مرتبطی انتخاب نشده — محصولات هم‌دسته‌بندی به‌صورت خودکار نمایش داده می‌شوند
                  </div>

                  <div class="related-search-box">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input v-model="relatedProductSearch" type="text" class="form-input" placeholder="جستجو برای افزودن محصول مرتبط..." />
                  </div>

                  <div v-if="relatedProductSearch" class="related-dropdown">
                    <div v-if="availableRelatedProducts.length === 0" class="related-empty">محصولی یافت نشد</div>
                    <div v-for="p in availableRelatedProducts" :key="p._id || p.id" class="related-option" @click="addRelatedProduct(p)">
                      <img v-if="p.mainImage" :src="getImageUrl(p.mainImage)" class="option-img" alt="" />
                      <div v-else class="option-img-placeholder">📦</div>
                      <div class="option-info">
                        <span class="option-name">{{ p.name?.fa }}</span>
                        <span class="option-price">{{ fmt(p.price) }} تومان</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" type="button" :disabled="saving" @click="closeModal()">انصراف</button>
              <button class="submit-btn" type="button" :disabled="saving || uploadingMain || uploadingGallery" @click="saveProduct">
                {{ saving ? 'در حال ذخیره...' : 'ذخیره' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-products { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }
.create-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease; font-family: inherit; }
.create-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }

.filters-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 250px; display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #fff; }
.search-box svg { opacity: 0.4; flex-shrink: 0; }
.search-box input { flex: 1; background: none; border: none; color: #fff; font-size: 0.9rem; outline: none; font-family: inherit; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }
.filter-select { padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; outline: none; cursor: pointer; font-family: inherit; }
.filter-select option { background: #0a0d14; color: #fff; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.product-card { padding: 0; border-radius: 20px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: border-color 0.25s ease, transform 0.25s ease; overflow: hidden; }
.product-card:hover { border-color: rgba(197,160,89,0.3); transform: translateY(-2px); }
.product-img { height: 180px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; }
.img-placeholder { opacity: 0.3; }
.product-real-img { width: 100%; height: 100%; object-fit: contain; padding: 16px; box-sizing: border-box; }
.status-badge { position: absolute; top: 12px; right: 12px; display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
.product-info { padding: 20px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.product-name { font-size: 1rem; font-weight: 600; margin: 0; }
.product-en-name { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.product-category { font-size: 0.85rem; opacity: 0.5; }
.product-meta { display: flex; gap: 16px; margin-top: 8px; }
.meta-item { display: flex; gap: 4px; font-size: 0.85rem; }
.meta-label { opacity: 0.5; }
.meta-value { font-weight: 500; }
.meta-value.price { color: #facc6b; }
.meta-value.low { color: #ef4444; }
.product-desc { font-size: 0.85rem; opacity: 0.6; line-height: 1.6; margin: 8px 0 0; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.04); }
.action-btn { flex: 1; padding: 8px; border-radius: 8px; border: none; font-size: 0.85rem; cursor: pointer; transition: background 0.2s ease; font-family: inherit; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.edit { background: rgba(197,160,89,0.15); color: #facc6b; }
.action-btn.edit:hover { background: rgba(197,160,89,0.25); }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover:not(:disabled) { background: rgba(239,68,68,0.25); }
.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); grid-column: 1 / -1; }
.empty-icon { font-size: 2.5rem; display: block; margin-bottom: 8px; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0 24px; }
.page-btn { padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #fff; cursor: pointer; font-family: inherit; font-size: 0.85rem; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-info { font-size: 0.85rem; opacity: 0.6; }

.toast-stack { position: fixed; top: 20px; left: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 3000; }
.toast { padding: 12px 18px; border-radius: 12px; font-size: 0.86rem; color: #fff; backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); max-width: 340px; }
.toast.success { background: rgba(34,197,94,0.9); }
.toast.error { background: rgba(239,68,68,0.92); }
.toast.info { background: rgba(60,70,90,0.95); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-20px); }
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 650px; max-height: 85vh; overflow-y: auto; border-radius: 20px; padding: 0; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: rgba(8,10,18,0.95); backdrop-filter: blur(10px); z-index: 10; }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease; }
.modal-close:hover { background: rgba(255,255,255,0.1); }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 0.85rem; opacity: 0.7; }
.req { color: #ef4444; }
.form-input { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.2s ease; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: rgba(197,160,89,0.5); }
.form-input::placeholder { color: rgba(255,255,255,0.3); }
.form-input.has-error, .form-select.has-error { border-color: #ef4444; }
.error-text { font-size: 0.78rem; color: #ef4444; }
.form-select { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; cursor: pointer; }
.form-select option { background: #0a0d14; color: #fff; }
.form-textarea { resize: vertical; min-height: 80px; }
.lang-inputs { display: flex; gap: 10px; }
.lang-inputs.column { flex-direction: column; }
.flex-1 { flex: 1; }
.w-120 { width: 120px; }
.w-100 { width: 100px; }
.dynamic-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.remove-btn { padding: 8px 12px; border-radius: 8px; border: none; background: rgba(239,68,68,0.15); color: #ef4444; cursor: pointer; font-family: inherit; white-space: nowrap; height: 40px; }
.add-btn { align-self: flex-start; padding: 8px 16px; border-radius: 8px; border: 1px dashed rgba(197,160,89,0.5); background: transparent; color: #facc6b; cursor: pointer; font-family: inherit; }
.color-picker { width: 46px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; cursor: pointer; padding: 2px; }
.hint-text { font-size: 0.78rem; opacity: 0.5; margin-top: 4px; display: block; }
.sizes-container, .colors-container { display: flex; flex-direction: column; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; position: sticky; bottom: 0; background: linear-gradient(to top, rgba(8,10,18,1), transparent); padding-top: 10px; }
.cancel-btn { padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.7); font-size: 0.9rem; cursor: pointer; transition: background 0.2s ease; font-family: inherit; }
.cancel-btn:hover { background: rgba(255,255,255,0.06); }
.submit-btn { padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease; font-family: inherit; }
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }
.submit-btn:disabled, .cancel-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.upload-area { border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: border-color 0.2s ease, background 0.2s ease; background: rgba(255,255,255,0.02); }
.upload-area.drag-over { border-color: rgba(197,160,89,0.6); background: rgba(197,160,89,0.1); }
.upload-area .preview-img { max-width: 100%; max-height: 120px; object-fit: contain; border-radius: 8px; }
.upload-hint { display: block; margin-top: 10px; font-size: 0.78rem; opacity: 0.5; }
.single-image-wrap { position: relative; display: inline-block; }
.gallery-preview { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.gallery-item { position: relative; display: inline-block; }
.gallery-item img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
.img-remove-btn { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: #ef4444; color: #fff; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4); transition: transform 0.2s ease, background 0.2s ease; z-index: 5; }
.img-remove-btn:hover { background: #dc2626; transform: scale(1.15); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.related-products-container { display: flex; flex-direction: column; gap: 10px; }
.selected-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.related-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; background: rgba(197,160,89,0.15); border: 1px solid rgba(197,160,89,0.3); color: #facc6b; font-size: 0.82rem; }
.tag-img { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(197,160,89,0.4); }
.tag-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-remove { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 0.7rem; padding: 0 2px; line-height: 1; transition: color 0.2s; }
.tag-remove:hover { color: #ef4444; }
.no-related-hint { padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); text-align: center; color: rgba(255,255,255,0.4); font-size: 0.82rem; }
.related-search-box { display: flex; align-items: center; gap: 8px; position: relative; }
.related-search-box svg { position: absolute; right: 12px; opacity: 0.4; pointer-events: none; }
.related-search-box .form-input { padding-right: 36px; }
.related-dropdown { max-height: 200px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(8,10,18,0.95); }
.related-dropdown::-webkit-scrollbar { width: 4px; }
.related-dropdown::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.3); border-radius: 4px; }
.related-empty { padding: 16px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.85rem; }
.related-option { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid rgba(255,255,255,0.04); }
.related-option:last-child { border-bottom: none; }
.related-option:hover { background: rgba(197,160,89,0.1); }
.option-img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
.option-img-placeholder { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); font-size: 1rem; flex-shrink: 0; }
.option-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.option-name { font-size: 0.88rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.option-price { font-size: 0.78rem; color: rgba(197,160,89,0.8); }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .lang-inputs { flex-direction: column; }
  .dynamic-row { flex-wrap: wrap; }
  .w-120, .w-100 { width: 100%; }
}
</style>
