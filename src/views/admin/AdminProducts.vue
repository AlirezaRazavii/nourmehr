<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { adminApi } from '../../services/adminApi'
import { getImageUrl } from '../../utils/imageUrl'

const route = useRoute()

const loading = ref(true)
const products = ref([])
const showModal = ref(false)
const editingProduct = ref(null)
const searchQuery = ref('')
const statusFilter = ref('all')
const uploading = ref(false)

const fileInput = ref(null)
const galleryInput = ref(null)

const form = ref({
  name: { fa: '', en: '' }, category: '', price: '', stock: '',
  shortDesc: { fa: '', en: '' }, description: { fa: '', en: '' },
  image: '', gallery: [], status: 'active',
  weight: '', dimensions: '',
  material: { fa: '', en: '' }, craftsman: { fa: '', en: '' }, warranty: { fa: '', en: '' },
  sku: '', featuresText: { fa: '', en: '' }, sizes: [], colors: [], relatedProducts: [],
})

const blankForm = () => ({
  name: { fa: '', en: '' }, category: '', price: '', stock: '',
  shortDesc: { fa: '', en: '' }, description: { fa: '', en: '' },
  image: '', gallery: [], status: 'active',
  weight: '', dimensions: '',
  material: { fa: '', en: '' }, craftsman: { fa: '', en: '' }, warranty: { fa: '', en: '' },
  sku: '', featuresText: { fa: '', en: '' }, sizes: [], colors: [], relatedProducts: [],
})

const relatedProductSearch = ref('')

const availableRelatedProducts = computed(() => {
  const currentId = editingProduct.value?._id || editingProduct.value?.id
  return products.value
    .filter(p => {
      const pid = p._id || p.id
      if (currentId && pid === currentId) return false
      if (form.value.relatedProducts.includes(pid)) return false
      if (!relatedProductSearch.value) return true
      const q = relatedProductSearch.value.toLowerCase()
      return (p.name?.fa || '').includes(q) || (p.name?.en || '').toLowerCase().includes(q)
    })
    .slice(0, 20)
})

const selectedRelatedProducts = computed(() =>
  products.value.filter(p => form.value.relatedProducts.includes(p._id || p.id))
)

const addRelatedProduct = (product) => {
  const pid = product._id || product.id
  if (!form.value.relatedProducts.includes(pid)) form.value.relatedProducts.push(pid)
  relatedProductSearch.value = ''
}
const removeRelatedProduct = (pid) => {
  form.value.relatedProducts = form.value.relatedProducts.filter(id => id !== pid)
}

const addColor = () => { form.value.colors.push({ name: { fa: '', en: '' }, value: '#c5a059' }) }
const removeColor = (i) => { form.value.colors.splice(i, 1) }
const addSize = () => { form.value.sizes.push({ name: { fa: '', en: '' }, price: '', discountPercent: '' }) }
const removeSize = (i) => { form.value.sizes.splice(i, 1) }

const categories = ref([])
const fetchCategories = async () => {
  const res = await adminApi.getCategories()
  if (res.success) categories.value = res.data
}

const syncStatusFromRoute = () => { statusFilter.value = route.query.status || 'all' }
watch(() => route.query.status, syncStatusFromRoute)

onMounted(() => {
  syncStatusFromRoute()
  fetchProducts()
  fetchCategories()
})

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'فعال' },
  out_of_stock: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', text: 'اتمام موجودی' },
  inactive: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'غیرفعال' },
}

const fetchProducts = async () => {
  loading.value = true
  const res = await adminApi.getProducts()
  if (res.success) products.value = res.data
  loading.value = false
}

const filteredProducts = computed(() =>
  products.value.filter(p => {
    const nameFa = p.name?.fa || ''
    const nameEn = p.name?.en || ''
    const matchSearch = !searchQuery.value || nameFa.includes(searchQuery.value) || nameEn.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'out_of_stock'
        ? ((p.stock ?? 0) <= 0 || p.status === 'out_of_stock')
        : p.status === statusFilter.value)
    return matchSearch && matchStatus
  })
)

const openCreate = () => {
  editingProduct.value = null
  form.value = blankForm()
  showModal.value = true
}

const openEdit = (product) => {
  editingProduct.value = product
  form.value = {
    name: { fa: product.name?.fa || '', en: product.name?.en || '' },
    category: product.category?._id || (typeof product.category === 'string' ? product.category : ''),
    price: product.price ?? '',
    stock: product.stock ?? '',
    shortDesc: { fa: product.shortDesc?.fa || '', en: product.shortDesc?.en || '' },
    description: { fa: product.description?.fa || '', en: product.description?.en || '' },
    image: product.mainImage || '',
    gallery: Array.isArray(product.images) ? [...product.images] : [],
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
    sizes: Array.isArray(product.sizes) ? product.sizes.map(s => ({ name: { fa: s.name?.fa || '', en: s.name?.en || '' }, price: s.price ?? '', discountPercent: s.discountPercent ?? '' })) : [],
    colors: Array.isArray(product.colors) ? product.colors.map(c => ({ name: { fa: c.name?.fa || '', en: c.name?.en || '' }, value: c.value || '#c5a059' })) : [],
    relatedProducts: Array.isArray(product.relatedProducts)
      ? product.relatedProducts.map(rp => typeof rp === 'object' ? (rp._id || rp.id) : rp)
      : [],
  }
  relatedProductSearch.value = ''
  showModal.value = true
}

const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.target.classList.add('drag-over') }
const handleDragLeave = (e) => { e.target.classList.remove('drag-over') }

const handleImageDrop = async (e, type = 'main') => {
  e.preventDefault(); e.stopPropagation(); e.target.classList.remove('drag-over')
  const files = e.dataTransfer.files
  if (files.length > 0) {
    if (type === 'main') await uploadImage(files[0], 'main')
    else for (const file of files) await uploadImage(file, 'gallery')
  }
}

const triggerFileInput = () => fileInput.value.click()
const triggerGalleryInput = () => galleryInput.value.click()

const handleFileSelect = async (e, type = 'main') => {
  const file = e.target.files[0]
  if (file) await uploadImage(file, type)
  e.target.value = ''
}

const handleMultipleSelect = async (e) => {
  const files = e.target.files
  for (const file of files) await uploadImage(file, 'gallery')
  e.target.value = ''
}

const uploadImage = async (file, type) => {
  if (!file.type.startsWith('image/')) { alert('فقط فایل‌های تصویری مجاز هستند'); return }
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    const res = await adminApi.uploadProductImage(formData)
    if (res.success && res.filePath) {
      if (type === 'main') form.value.image = res.filePath
      else form.value.gallery.push(res.filePath)
    } else throw new Error(res.message || 'آپلود ناموفق')
  } catch (err) {
    alert('خطا در آپلود تصویر: ' + (err.message || 'خطای ناشناخته'))
  } finally {
    uploading.value = false
  }
}

// حذف تصویر اصلی
const removeMainImage = async () => {
  if (!form.value.image) return
  const pathToDelete = form.value.image
  form.value.image = ''
  try {
    await adminApi.deleteProductImage(pathToDelete)
  } catch (err) {
    console.error('خطا در حذف فایل تصویر اصلی:', err)
  }
}

// حذف یک عکس از گالری
const removeGalleryImage = async (index) => {
  const pathToDelete = form.value.gallery[index]
  form.value.gallery.splice(index, 1)
  try {
    await adminApi.deleteProductImage(pathToDelete)
  } catch (err) {
    console.error('خطا در حذف فایل گالری:', err)
  }
}

const saveProduct = async () => {
  try {
    const id = editingProduct.value?._id || editingProduct.value?.id
    const { featuresText, ...rest } = form.value

    const faFeatures = (featuresText.fa || '').split('\n').map(s => s.trim()).filter(Boolean)
    const enFeatures = (featuresText.en || '').split('\n').map(s => s.trim()).filter(Boolean)
    const features = faFeatures.map((fa, i) => ({ fa, en: enFeatures[i] || '' }))

    const payload = {
      ...rest,
      price: Number(form.value.price) || 0,
      stock: Number(form.value.stock) || 0,
      features,
      sizes: (form.value.sizes || []).filter(s => s && s.name?.fa).map(s => ({ name: { fa: String(s.name.fa).trim(), en: String(s.name.en || '').trim() }, price: Number(s.price) || 0, discountPercent: Number(s.discountPercent) || 0 })),
      colors: (form.value.colors || []).filter(c => c && c.name?.fa).map(c => ({ name: { fa: String(c.name.fa).trim(), en: String(c.name.en || '').trim() }, value: c.value })),
      relatedProducts: form.value.relatedProducts || [],
    }

    if (editingProduct.value) {
      const res = await adminApi.updateProduct(id, payload)
      if (!res.success) throw new Error(res.message || 'خطا در ویرایش')
    } else {
      const res = await adminApi.createProduct(payload)
      if (!res.success) throw new Error(res.message || 'خطا در ایجاد')
    }
    showModal.value = false
    await fetchProducts()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}

const deleteProduct = async (id) => {
  if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return
  try {
    const res = await adminApi.deleteProduct(id)
    if (!res.success) throw new Error(res.message || 'خطا در حذف')
    products.value = products.value.filter(p => (p._id || p.id) !== id)
  } catch (err) {
    alert('خطا در حذف: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}
</script>

<template>
  <div class="admin-products">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت محصولات</h1>
        <p class="page-subtitle">ایجاد، ویرایش و مدیریت محصولات (دوزبانه)</p>
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

    <div v-else class="products-grid">
      <div v-for="product in filteredProducts" :key="product._id" class="product-card glass">
        <div class="product-img">
          <img v-if="product.mainImage" :src="getImageUrl(product.mainImage)" :alt="product.name?.fa" class="product-real-img" />
          <div v-else class="img-placeholder">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <span class="status-badge" :style="{ background: statusColors[product.status]?.bg, color: statusColors[product.status]?.color }">
            {{ statusColors[product.status]?.text }}
          </span>
        </div>

        <div class="product-info">
          <h3 class="product-name">{{ product.name?.fa }}</h3>
          <span class="product-en-name" v-if="product.name?.en">{{ product.name.en }}</span>
          <span class="product-category">{{ product.category?.name?.fa || product.category?.name }}</span>

          <div class="product-meta">
            <div class="meta-item">
              <span class="meta-label">قیمت:</span>
              <span class="meta-value price">{{ (product.price || 0).toLocaleString('fa-IR') }} تومان</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">موجودی:</span>
              <span class="meta-value" :class="{ low: product.stock < 5 }">{{ product.stock }} عدد</span>
            </div>
          </div>

          <p class="product-desc">{{ product.description?.fa }}</p>
        </div>

        <div class="product-actions">
          <button class="action-btn edit" @click="openEdit(product)">ویرایش</button>
          <button class="action-btn delete" @click="deleteProduct(product._id || product.id)">حذف</button>
        </div>
      </div>

      <div v-if="filteredProducts.length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <span>محصولی یافت نشد</span>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>{{ editingProduct ? 'ویرایش محصول' : 'محصول جدید' }}</h2>
            <button class="modal-close" @click="showModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-grid">

              <div class="form-group full">
                <label class="form-label">نام محصول <span style="color:#ef4444">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.name.fa" type="text" class="form-input" placeholder="نام فارسی" />
                  <input v-model="form.name.en" type="text" class="form-input" placeholder="English Name" dir="ltr" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">دسته‌بندی</label>
                <select v-model="form.category" class="form-select">
                  <option v-for="cat in categories" :key="cat._id" :value="cat._id">{{ cat.name?.fa || cat.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">قیمت (تومان)</label>
                <input v-model="form.price" type="number" class="form-input" placeholder="۰" />
              </div>
              <div class="form-group">
                <label class="form-label">موجودی</label>
                <input v-model="form.stock" type="number" class="form-input" placeholder="۰" />
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
                <div class="upload-area" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop="handleImageDrop" @click="!form.image && triggerFileInput()">
                  <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="e => handleFileSelect(e, 'main')" />
                  <span v-if="!form.image && !uploading">Drag & drop یا کلیک برای انتخاب تصویر</span>
                  <span v-else-if="uploading">در حال آپلود...</span>
                  <div v-else class="single-image-wrap">
                    <img :src="getImageUrl(form.image)" alt="Preview" class="preview-img" />
                    <button type="button" class="img-remove-btn" @click.stop="removeMainImage" title="حذف تصویر">✕</button>
                  </div>
                </div>
              </div>

              <!-- گالری -->
              <div class="form-group full">
                <label class="form-label">گالری تصاویر (فایل‌های متعدد)</label>
                <div class="upload-area" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop="e => handleImageDrop(e, 'gallery')" @click="triggerGalleryInput">
                  <input type="file" ref="galleryInput" accept="image/*" multiple style="display:none" @change="e => handleMultipleSelect(e)" />
                  <span v-if="!form.gallery.length && !uploading">Drag & drop یا کلیک برای انتخاب تصاویر</span>
                  <span v-else-if="uploading">در حال آپلود...</span>
                  <div v-else class="gallery-preview">
                    <div v-for="(img, idx) in form.gallery" :key="idx" class="gallery-item">
                      <img :src="getImageUrl(img)" />
                      <button type="button" class="img-remove-btn" @click.stop="removeGalleryImage(idx)" title="حذف تصویر">✕</button>
                    </div>
                  </div>
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
                <div class="lang-inputs" style="flex-direction: column;">
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
                <div class="lang-inputs" style="flex-direction: column;">
                  <textarea v-model="form.featuresText.fa" class="form-input form-textarea" rows="3" placeholder="ویژگی‌ها به فارسی..."></textarea>
                  <textarea v-model="form.featuresText.en" class="form-input form-textarea" rows="3" placeholder="Features in English..." dir="ltr"></textarea>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">سایزها و قیمت هر سایز</label>
                <div class="sizes-container">
                  <div v-for="(s, i) in form.sizes" :key="i" class="dynamic-row">
                    <div class="lang-inputs" style="flex: 1;">
                      <input v-model="s.name.fa" type="text" class="form-input" placeholder="نام سایز (فارسی)" />
                      <input v-model="s.name.en" type="text" class="form-input" placeholder="Size Name (EN)" dir="ltr" />
                    </div>
                    <input v-model="s.price" type="number" class="form-input" placeholder="قیمت این سایز" style="width: 120px;" />
                    <input v-model="s.discountPercent" type="number" min="0" max="100" class="form-input" placeholder="٪ تخفیف" style="width: 100px;" />
                    <button type="button" @click="removeSize(i)" class="remove-btn">حذف</button>
                  </div>
                  <button type="button" @click="addSize" class="add-btn">+ افزودن سایز</button>
                  <span class="hint-text">اگر قیمت یک سایز ۰ باشد، قیمت پایه محصول برای آن سایز استفاده می‌شود.</span>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">رنگ‌ها</label>
                <div class="colors-container">
                  <div v-for="(c, i) in form.colors" :key="i" class="dynamic-row">
                    <div class="lang-inputs" style="flex: 1;">
                      <input v-model="c.name.fa" type="text" class="form-input" placeholder="نام رنگ (فارسی)" />
                      <input v-model="c.name.en" type="text" class="form-input" placeholder="Color Name (EN)" dir="ltr" />
                    </div>
                    <input v-model="c.value" type="color" class="color-picker" />
                    <button type="button" @click="removeColor(i)" class="remove-btn">حذف</button>
                  </div>
                  <button type="button" @click="addColor" class="add-btn">+ افزودن رنگ</button>
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">محصولات مرتبط</label>
                <div class="related-products-container">
                  <div v-if="selectedRelatedProducts.length" class="selected-tags">
                    <span v-for="rp in selectedRelatedProducts" :key="rp._id || rp.id" class="related-tag">
                      <img v-if="rp.mainImage" :src="getImageUrl(rp.mainImage)" class="tag-img" />
                      <span class="tag-name">{{ rp.name?.fa }}</span>
                      <button type="button" @click="removeRelatedProduct(rp._id || rp.id)" class="tag-remove">✕</button>
                    </span>
                  </div>
                  <div v-else class="no-related-hint">
                    <span>محصول مرتبطی انتخاب نشده — محصولات هم‌دسته‌بندی به صورت خودکار نمایش داده می‌شوند</span>
                  </div>

                  <div class="related-search-box">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input v-model="relatedProductSearch" type="text" placeholder="جستجو برای افزودن محصول مرتبط..." class="form-input" />
                  </div>

                  <div v-if="relatedProductSearch" class="related-dropdown">
                    <div v-if="availableRelatedProducts.length === 0" class="related-empty">محصولی یافت نشد</div>
                    <div v-for="p in availableRelatedProducts" :key="p._id || p.id" class="related-option" @click="addRelatedProduct(p)">
                      <img v-if="p.mainImage" :src="getImageUrl(p.mainImage)" class="option-img" />
                      <div v-else class="option-img-placeholder">📦</div>
                      <div class="option-info">
                        <span class="option-name">{{ p.name?.fa }}</span>
                        <span class="option-price">{{ p.price?.toLocaleString('fa-IR') }} تومان</span>
                      </div>
                    </div>
                  </div>

                  <span class="hint-text">اگر محصول مرتبطی انتخاب نکنید، محصولات هم‌دسته‌بندی به صورت خودکار در صفحه جزئیات نمایش داده می‌شوند.</span>
                </div>
              </div>

            </div>

            <div class="modal-actions">
              <button class="cancel-btn" @click="showModal = false">انصراف</button>
              <button class="submit-btn" @click="saveProduct">ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-products { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }
.create-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
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
.product-card { padding: 0; border-radius: 20px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; transition: all 0.3s ease; overflow: hidden; }
.product-card:hover { border-color: rgba(197,160,89,0.3); transform: translateY(-2px); }
.product-img { height: 180px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; }
.img-placeholder { opacity: 0.3; }
.product-real-img { width: 100%; height: 100%; object-fit: contain; padding: 16px; }
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
.product-desc { font-size: 0.85rem; opacity: 0.6; line-height: 1.6; margin: 8px 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.04); }
.action-btn { flex: 1; padding: 8px; border-radius: 8px; border: none; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
.action-btn.edit { background: rgba(197,160,89,0.15); color: #facc6b; }
.action-btn.edit:hover { background: rgba(197,160,89,0.25); }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover { background: rgba(239,68,68,0.25); }
.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); grid-column: 1 / -1; }
.empty-icon { font-size: 2.5rem; display: block; margin-bottom: 8px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 650px; max-height: 85vh; overflow-y: auto; border-radius: 20px; padding: 0; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: rgba(8, 10, 18, 0.95); backdrop-filter: blur(10px); z-index: 10; }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.modal-close:hover { background: rgba(255,255,255,0.1); }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 0.85rem; opacity: 0.7; }
.form-input { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.2s ease; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: rgba(197,160,89,0.5); }
.form-input::placeholder { color: rgba(255,255,255,0.3); }
.form-select { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; cursor: pointer; }
.form-select option { background: #0a0d14; color: #fff; }
.form-textarea { resize: vertical; min-height: 80px; margin-bottom: 8px; }
.lang-inputs { display: flex; gap: 10px; }
.dynamic-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.remove-btn { padding: 8px 12px; border-radius: 8px; border: none; background: rgba(239,68,68,0.15); color: #ef4444; cursor: pointer; font-family: inherit; white-space: nowrap; height: 40px; }
.add-btn { align-self: flex-start; padding: 8px 16px; border-radius: 8px; border: 1px dashed rgba(197,160,89,0.5); background: transparent; color: #facc6b; cursor: pointer; font-family: inherit; }
.color-picker { width: 46px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; cursor: pointer; padding: 2px; }
.hint-text { font-size: 0.78rem; opacity: 0.5; margin-top: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; position: sticky; bottom: 0; background: linear-gradient(to top, rgba(8, 10, 18, 1), transparent); padding-top: 10px; }
.cancel-btn { padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.7); font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
.cancel-btn:hover { background: rgba(255,255,255,0.06); }
.submit-btn { padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }
.upload-area { border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(255,255,255,0.02); }
.upload-area.drag-over { border-color: rgba(197,160,89,0.6); background: rgba(197,160,89,0.1); }
.upload-area .preview-img { max-width: 100%; max-height: 120px; object-fit: contain; border-radius: 8px; }
.single-image-wrap { position: relative; display: inline-block; }
.gallery-preview { display: flex; gap: 8px; flex-wrap: wrap; }
.gallery-item { position: relative; display: inline-block; }
.gallery-item img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
.img-remove-btn { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; border: none; background: #ef4444; color: #fff; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4); transition: transform 0.2s ease, background 0.2s ease; z-index: 5; }
.img-remove-btn:hover { background: #dc2626; transform: scale(1.15); }
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
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
</style>
