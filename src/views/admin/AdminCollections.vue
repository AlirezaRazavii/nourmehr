<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../../services/adminApi'
import { getImageUrl } from '../../utils/imageUrl'

const loading = ref(true)
const collections = ref([])
const allProducts = ref([])
const showModal = ref(false)
const showProductsModal = ref(false)
const editingCollection = ref(null)
const managingCollection = ref(null)
const deletingId = ref(null)
const searchQuery = ref('')
const productSearch = ref('')
const selectedProductIds = ref([])
const savingProducts = ref(false)

const form = ref({
  name: { fa: '', en: '' }, slug: '', 
  title: { fa: '', en: '' }, 
  subtitle: { fa: '', en: '' }, 
  icon: '',
  description: { fa: '', en: '' }, 
  bgColor: '#c5a059', status: 'active', showOnHome: true, sortOrder: 0,
})

const statusColors = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', text: 'فعال' },
  inactive: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'غیرفعال' },
}

const blankForm = () => ({
  name: { fa: '', en: '' }, slug: '', 
  title: { fa: '', en: '' }, 
  subtitle: { fa: '', en: '' }, 
  icon: '',
  description: { fa: '', en: '' }, 
  bgColor: '#c5a059', status: 'active', showOnHome: true, sortOrder: 0,
})

const fetchCollections = async () => {
  loading.value = true
  const res = await adminApi.getCollections()
  if (res.success) collections.value = res.data
  loading.value = false
}

const fetchProducts = async () => {
  const res = await adminApi.getProducts({ limit: 1000 })
  if (res.success) allProducts.value = res.data
}

onMounted(() => {
  fetchCollections()
  fetchProducts()
})

const filteredCollections = computed(() => {
  if (!searchQuery.value) return collections.value
  const q = searchQuery.value.toLowerCase()
  return collections.value.filter(c => 
    (c.name?.fa || '').toLowerCase().includes(q) || 
    (c.name?.en || '').toLowerCase().includes(q) || 
    (c.description?.fa || '').toLowerCase().includes(q)
  )
})

const filteredProductList = computed(() => {
  if (!productSearch.value) return allProducts.value
  const q = productSearch.value.toLowerCase()
  return allProducts.value.filter(p => 
    (p.name?.fa || '').toLowerCase().includes(q) || 
    (p.name?.en || '').toLowerCase().includes(q)
  )
})

const openCreate = () => {
  editingCollection.value = null
  form.value = blankForm()
  showModal.value = true
}

const openEdit = (col) => {
  editingCollection.value = col
  form.value = {
    name: { fa: col.name?.fa || '', en: col.name?.en || '' }, 
    slug: col.slug || '', 
    title: { fa: col.title?.fa || '', en: col.title?.en || '' },
    subtitle: { fa: col.subtitle?.fa || '', en: col.subtitle?.en || '' }, 
    icon: col.icon || '', 
    description: { fa: col.description?.fa || '', en: col.description?.en || '' },
    bgColor: col.bgColor || '#c5a059', status: col.status || 'active',
    showOnHome: col.showOnHome ?? true, sortOrder: col.sortOrder ?? 0,
  }
  showModal.value = true
}

const saveCollection = async () => {
  try {
    if (!form.value.name.fa) {
      return alert('نام فارسی کالکشن الزامی است');
    }
    const id = editingCollection.value?._id
    const payload = { ...form.value, sortOrder: Number(form.value.sortOrder) || 0 }
    if (editingCollection.value) {
      const res = await adminApi.updateCollection(id, payload)
      if (!res.success) throw new Error(res.message || 'خطا در ویرایش')
    } else {
      const res = await adminApi.createCollection(payload)
      if (!res.success) throw new Error(res.message || 'خطا در ایجاد')
    }
    showModal.value = false
    await fetchCollections()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'عملیات ناموفق بود'))
  }
}

const confirmDelete = (id) => { deletingId.value = id }

const deleteCollection = async (id) => {
  try {
    const res = await adminApi.deleteCollection(id)
    if (!res.success) throw new Error(res.message || 'خطا در حذف')
    collections.value = collections.value.filter(c => c._id !== id)
    deletingId.value = null
  } catch (err) {
    alert('خطا در حذف: ' + (err.response?.data?.message || err.message))
    deletingId.value = null
  }
}

// ───────── مدیریت محصولات کالکشن ─────────
const openProductsManager = (col) => {
  managingCollection.value = col
  productSearch.value = ''
  // محصولاتی که از قبل این کالکشن را دارند، تیک‌خورده باشند
  selectedProductIds.value = allProducts.value
    .filter(p => Array.isArray(p.collections) && p.collections.some(c => (c?._id || c) === col._id))
    .map(p => p._id)
  showProductsModal.value = true
}

const toggleProduct = (id) => {
  const idx = selectedProductIds.value.indexOf(id)
  if (idx === -1) selectedProductIds.value.push(id)
  else selectedProductIds.value.splice(idx, 1)
}

const isSelected = (id) => selectedProductIds.value.includes(id)

const saveProducts = async () => {
  savingProducts.value = true
  try {
    const res = await adminApi.setCollectionProducts(managingCollection.value._id, selectedProductIds.value)
    if (!res.success) throw new Error(res.message || 'خطا در ذخیره')
    showProductsModal.value = false
    await fetchCollections()
    await fetchProducts()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message))
  } finally {
    savingProducts.value = false
  }
}

const generateSlug = () => {
  form.value.slug = (form.value.name.fa || '')
    .trim()
    .replace(/[^\u0600-\u06FF\sa-zA-Z0-9]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'collection-' + Date.now()
}
</script>

<template>
  <div class="admin-collections">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت کالکشن‌ها</h1>
        <p class="page-subtitle">ایجاد مجموعه‌های ویژه و انتخاب محصولات آن‌ها (دوزبانه)</p>
      </div>
      <button class="create-btn" @click="openCreate">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        کالکشن جدید
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="جستجوی کالکشن..." />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="collections-grid">
      <div v-for="col in filteredCollections" :key="col._id" class="collection-card">
        <div class="collection-header">
          <div class="collection-icon" :style="{ background: col.bgColor + '33', borderColor: col.bgColor + '55' }">{{ col.icon }}</div>
          <div class="collection-title-group">
            <h3 class="collection-name">{{ col.title?.fa || col.name?.fa }}</h3>
            <span class="collection-en-name" v-if="col.name?.en">{{ col.name.en }}</span>
            <span class="collection-slug">{{ col.slug }}</span>
          </div>
          <span class="status-badge" :style="{ background: statusColors[col.status]?.bg, color: statusColors[col.status]?.color }">
            {{ statusColors[col.status]?.text }}
          </span>
        </div>

        <p class="collection-desc">{{ col.description?.fa || col.subtitle?.fa || '—' }}</p>

        <div class="collection-meta">
          <div class="meta-chip">
            <span>{{ col.productCount ?? 0 }} محصول</span>
          </div>
          <div class="meta-chip" :class="{ on: col.showOnHome }">
            <span>{{ col.showOnHome ? 'در صفحه اصلی' : 'مخفی' }}</span>
          </div>
        </div>

        <div class="collection-actions">
          <button class="action-btn products" @click="openProductsManager(col)">محصولات</button>
          <button class="action-btn edit" @click="openEdit(col)">ویرایش</button>
          <button class="action-btn delete" @click="confirmDelete(col._id)">حذف</button>
        </div>
      </div>

      <div v-if="filteredCollections.length === 0" class="empty-state">
        <span class="empty-icon">✦</span>
        <span>کالکشنی یافت نشد</span>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editingCollection ? 'ویرایش کالکشن' : 'کالکشن جدید' }}</h2>
            <button class="modal-close" @click="showModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              
              <div class="form-group full">
                <label class="form-label">نام کالکشن <span style="color:#ef4444">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.name.fa" type="text" class="form-input" placeholder="نام فارسی" @input="generateSlug" />
                  <input v-model="form.name.en" type="text" class="form-input" placeholder="English Name" dir="ltr" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">آدرس URL (slug)</label>
                <input v-model="form.slug" type="text" class="form-input" placeholder="amazing-offers" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label">آیکون</label>
                <input v-model="form.icon" type="text" class="form-input" placeholder="✦" maxlength="4" />
              </div>

              <div class="form-group full">
                <label class="form-label">عنوان نمایشی</label>
                <div class="lang-inputs">
                  <input v-model="form.title.fa" type="text" class="form-input" placeholder="عنوان فارسی" />
                  <input v-model="form.title.en" type="text" class="form-input" placeholder="English Title" dir="ltr" />
                </div>
              </div>

              <div class="form-group full">
                <label class="form-label">زیرعنوان</label>
                <div class="lang-inputs">
                  <input v-model="form.subtitle.fa" type="text" class="form-input" placeholder="زیرعنوان فارسی" />
                  <input v-model="form.subtitle.en" type="text" class="form-input" placeholder="English Subtitle" dir="ltr" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">رنگ بلوک</label>
                <input v-model="form.bgColor" type="color" class="form-color" />
              </div>
              <div class="form-group">
                <label class="form-label">ترتیب نمایش</label>
                <input v-model="form.sortOrder" type="number" class="form-input" placeholder="0" />
              </div>
              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                </select>
              </div>
              <div class="form-group full checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.showOnHome" type="checkbox" />
                  <span>نمایش در صفحه اصلی</span>
                </label>
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
              <button class="submit-btn" @click="saveCollection">ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Products Manager Modal -->
    <Transition name="modal">
      <div v-if="showProductsModal" class="modal-overlay" @click.self="showProductsModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>محصولات «{{ managingCollection?.title?.fa || managingCollection?.name?.fa }}»</h2>
            <button class="modal-close" @click="showProductsModal = false">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="search-box" style="margin-bottom:4px">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input v-model="productSearch" type="text" placeholder="جستجوی محصول..." />
            </div>
            <p class="selected-count">{{ selectedProductIds.length }} محصول انتخاب شده</p>

            <div class="product-pick-list">
              <label
                v-for="p in filteredProductList"
                :key="p._id"
                class="pick-item"
                :class="{ picked: isSelected(p._id) }"
              >
                <input type="checkbox" :checked="isSelected(p._id)" @change="toggleProduct(p._id)" />
                <div class="pick-img">
                  <img v-if="p.mainImage" :src="getImageUrl(p.mainImage)" :alt="p.name?.fa" />
                  <div v-else class="pick-placeholder">◆</div>
                </div>
                <div class="pick-info">
                  <span class="pick-name">{{ p.name?.fa }}</span>
                  <span class="pick-cat">{{ p.category?.name?.fa || p.category?.name || '' }}</span>
                </div>
              </label>
              <div v-if="filteredProductList.length === 0" class="empty-state" style="grid-column:1/-1">
                <span>محصولی یافت نشد</span>
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" @click="showProductsModal = false">انصراف</button>
              <button class="submit-btn" :disabled="savingProducts" @click="saveProducts">
                {{ savingProducts ? 'در حال ذخیره...' : 'ذخیره محصولات' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirm -->
    <Transition name="modal">
      <div v-if="deletingId !== null" class="modal-overlay small" @click.self="deletingId = null">
        <div class="modal-content small">
          <div class="modal-header"><h2>حذف کالکشن</h2></div>
          <div class="modal-body">
            <p class="confirm-text">آیا از حذف این کالکشن اطمینان دارید؟ محصولات حذف نمی‌شوند، فقط از این کالکشن خارج می‌شوند.</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="deletingId = null">انصراف</button>
              <button class="delete-btn" @click="deleteCollection(deletingId)">حذف</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-collections { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }

.create-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: all 0.3s ease; font-family: inherit;
}
.create-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }

.filters-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.search-box {
  flex: 1; min-width: 250px; display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); color: #fff;
}
.search-box svg { opacity: 0.4; flex-shrink: 0; }
.search-box input { flex: 1; background: none; border: none; color: #fff; font-size: 0.9rem; outline: none; font-family: inherit; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.collections-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.collection-card {
  padding: 24px; border-radius: 20px; background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column;
  gap: 16px; transition: all 0.3s ease;
}
.collection-card:hover { border-color: rgba(197,160,89,0.3); transform: translateY(-2px); }

.collection-header { display: flex; align-items: flex-start; gap: 14px; }
.collection-icon {
  width: 50px; height: 50px; border-radius: 14px; border: 1px solid;
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;
}
.collection-title-group { flex: 1; min-width: 0; }
.collection-name { font-size: 1.05rem; font-weight: 600; margin: 0 0 2px; }
.collection-en-name { font-size: 0.8rem; color: rgba(255,255,255,0.4); display: block; margin-bottom: 4px; }
.collection-slug { font-size: 0.8rem; opacity: 0.4; font-family: ui-monospace, monospace; }

.status-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 500; flex-shrink: 0; }

.collection-desc { font-size: 0.9rem; opacity: 0.7; line-height: 1.6; margin: 0; }
.collection-meta { display: flex; gap: 12px; flex-wrap: wrap; }
.meta-chip { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; opacity: 0.6; padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); }
.meta-chip.on { color: #22c55e; opacity: 1; background: rgba(34,197,94,0.1); }

.collection-actions { display: flex; gap: 8px; margin-top: 4px; }
.action-btn { flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px; border-radius: 10px; border: none; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
.action-btn.products { background: rgba(56,189,248,0.15); color: #38bdf8; }
.action-btn.products:hover { background: rgba(56,189,248,0.25); }
.action-btn.edit { background: rgba(197,160,89,0.15); color: #facc6b; }
.action-btn.edit:hover { background: rgba(197,160,89,0.25); }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover { background: rgba(239,68,68,0.25); }

.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); grid-column: 1 / -1; }
.empty-icon { font-size: 2.5rem; display: block; margin-bottom: 8px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 640px; max-height: 85vh; overflow-y: auto; border-radius: 20px; background: rgba(5,8,20,0.98); border: 1px solid rgba(255,255,255,0.08); padding: 0; }
.modal-content.small { max-width: 420px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: rgba(8, 10, 18, 0.95); backdrop-filter: blur(10px); z-index: 10; }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.modal-close:hover { background: rgba(255,255,255,0.1); }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.confirm-text { font-size: 0.95rem; opacity: 0.8; line-height: 1.7; margin: 0; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 0.85rem; opacity: 0.7; }
.form-input { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.2s ease; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: rgba(197,160,89,0.5); }
.form-input::placeholder { color: rgba(255,255,255,0.3); }
.form-color { height: 42px; padding: 4px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; }
.form-select { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem; font-family: inherit; outline: none; cursor: pointer; }
.form-select option { background: #0a0d14; color: #fff; }
.form-textarea { resize: vertical; min-height: 80px; margin-bottom: 8px; }

.lang-inputs { display: flex; gap: 10px; }

.checkbox-group { flex-direction: row; align-items: center; }
.checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9rem; }
.checkbox-label input { width: 18px; height: 18px; cursor: pointer; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; background: linear-gradient(to top, rgba(8, 10, 18, 1), transparent); padding-top: 10px; }
.cancel-btn { padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.7); font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
.cancel-btn:hover { background: rgba(255,255,255,0.06); }
.submit-btn { padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.delete-btn { padding: 10px 24px; border-radius: 10px; border: none; background: #ef4444; color: #fff; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
.delete-btn:hover { background: #dc2626; }

/* product picker */
.selected-count { font-size: 0.85rem; color: #facc6b; margin: 0; }
.product-pick-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 360px; overflow-y: auto; padding: 4px; }
.pick-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: all 0.2s ease; }
.pick-item:hover { border-color: rgba(197,160,89,0.3); }
.pick-item.picked { background: rgba(197,160,89,0.1); border-color: rgba(197,160,89,0.4); }
.pick-item input { width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; }
.pick-img { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pick-img img { width: 100%; height: 100%; object-fit: cover; }
.pick-placeholder { color: rgba(197,160,89,0.4); }
.pick-info { display: flex; flex-direction: column; min-width: 0; }
.pick-name { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pick-cat { font-size: 0.72rem; opacity: 0.5; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }

@media (max-width: 768px) {
  .collections-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; }
  .form-grid { grid-template-columns: 1fr; }
  .product-pick-list { grid-template-columns: 1fr; }
  .lang-inputs { flex-direction: column; }
}
</style>