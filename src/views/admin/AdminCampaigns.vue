<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { adminApi } from '../../services/adminApi'
import { getImageUrl } from '../../utils/imageUrl'

/* ───────── لیست کمپین‌ها ───────── */
const loading = ref(true)
const campaigns = ref([])
const searchQuery = ref('')
const deletingId = ref(null)
const now = ref(Date.now())
let tick = null

const statusMeta = {
  draft:     { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', text: 'پیش‌نویس' },
  scheduled: { bg: 'rgba(56,189,248,0.15)',  color: '#38bdf8', text: 'زمان‌بندی‌شده' },
  active:    { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', text: 'فعال' },
  expired:   { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', text: 'منقضی' },
  archived:  { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', text: 'بایگانی' },
}

const fa = (n) => Number(n || 0).toLocaleString('fa-IR')

const fetchCampaigns = async () => {
  loading.value = true
  try {
    const res = await adminApi.getCampaigns()
    if (res.success) campaigns.value = res.data || []
  } catch (err) {
    alert('خطا در دریافت کمپین‌ها: ' + (err.response?.data?.message || err.message))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCampaigns()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => { if (tick) clearInterval(tick) })

const filteredCampaigns = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return campaigns.value
  return campaigns.value.filter(c =>
    (c.name?.fa || '').toLowerCase().includes(q) ||
    (c.name?.en || '').toLowerCase().includes(q) ||
    (c.slug || '').toLowerCase().includes(q)
  )
})

const fmtDateTime = (v) => {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return '—' }
}

// شمارندهٔ زنده — همان چیزی که بعداً روی هوم نمایش داده می‌شود
const remainingText = (c) => {
  const target = c.endsAt ? new Date(c.endsAt).getTime()
    : c.startsAt ? new Date(c.startsAt).getTime() : null
  if (!target) return ''
  let diff = target - now.value
  const starts = c.startsAt && new Date(c.startsAt).getTime() > now.value
  if (diff <= 0) return starts ? '' : 'پایان یافته'
  const d = Math.floor(diff / 86400000); diff -= d * 86400000
  const h = Math.floor(diff / 3600000);  diff -= h * 3600000
  const m = Math.floor(diff / 60000);    diff -= m * 60000
  const s = Math.floor(diff / 1000)
  const body = `${fa(d)} روز ${fa(h)}:${fa(m).padStart(2, '۰')}:${fa(s).padStart(2, '۰')}`
  return starts ? `شروع تا ${body}` : body
}

/* ───────── فرم ساخت/ویرایش ───────── */
const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)

const blankForm = () => ({
  name: { fa: '', en: '' },
  slug: '',
  description: { fa: '', en: '' },
  startsAt: '',
  endsAt: '',
  status: 'draft',
  expiryAction: 'archive',
  priority: 0,
  showCountdown: true,
  countdownLabel: { fa: '', en: '' },
  themeColor: '#c5a059',
  targets: [],
})
const form = ref(blankForm())

// گزینه‌های سایز هر محصول (از API جزئیات، چون لیست ادمین sizes ندارد)
const sizeOptions = ref({})
const sizeLoading = ref({})

const toLocalInput = (v) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)

const sizeName = (s) => (typeof s?.name === 'string' ? s.name : (s?.name?.fa || s?.name?.en || ''))

const loadSizes = async (productId) => {
  if (!productId || sizeOptions.value[productId] || sizeLoading.value[productId]) return
  sizeLoading.value = { ...sizeLoading.value, [productId]: true }
  try {
    const res = await adminApi.getProductById(productId)
    const sizes = (res?.data?.sizes || []).map(sizeName).filter(Boolean)
    sizeOptions.value = { ...sizeOptions.value, [productId]: sizes }
  } catch (e) {
    sizeOptions.value = { ...sizeOptions.value, [productId]: [] }
  } finally {
    sizeLoading.value = { ...sizeLoading.value, [productId]: false }
  }
}

const openCreate = () => {
  editing.value = null
  form.value = blankForm()
  showModal.value = true
}

const openEdit = (c) => {
  editing.value = c
  form.value = {
    name: { fa: c.name?.fa || '', en: c.name?.en || '' },
    slug: c.slug || '',
    description: { fa: c.description?.fa || '', en: c.description?.en || '' },
    startsAt: toLocalInput(c.startsAt),
    endsAt: toLocalInput(c.endsAt),
    status: ['expired'].includes(c.status) ? 'active' : (c.status || 'draft'),
    expiryAction: c.expiryAction || 'archive',
    priority: c.priority ?? 0,
    showCountdown: c.showCountdown !== false,
    countdownLabel: { fa: c.countdownLabel?.fa || '', en: c.countdownLabel?.en || '' },
    themeColor: c.themeColor || '#c5a059',
    targets: (c.targets || []).map(t => ({
      product: String(t.product?._id || t.product || ''),
      productName: t.product?.name?.fa || '',
      sizes: [...(t.sizes || [])],
      percent: t.percent ?? 10,
    })),
  }
  showModal.value = true
  form.value.targets.forEach(t => loadSizes(t.product))
}

const generateSlug = () => {
  if (editing.value) return
  form.value.slug = (form.value.name.fa || '')
    .trim()
    .replace(/[^\u0600-\u06FF\sa-zA-Z0-9]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const toggleTargetSize = (target, name) => {
  const i = target.sizes.indexOf(name)
  if (i === -1) target.sizes.push(name)
  else target.sizes.splice(i, 1)
}
const removeTarget = (i) => form.value.targets.splice(i, 1)

const saveCampaign = async () => {
  if (!form.value.name.fa.trim()) return alert('نام فارسی کمپین الزامی است')
  if (!form.value.targets.length) return alert('حداقل یک محصول باید به کمپین اضافه شود')
  const bad = form.value.targets.find(t => !(Number(t.percent) >= 1 && Number(t.percent) <= 99))
  if (bad) return alert('درصد تخفیف هر محصول باید بین ۱ تا ۹۹ باشد')
  const s = fromLocalInput(form.value.startsAt)
  const e = fromLocalInput(form.value.endsAt)
  if (s && e && new Date(e) <= new Date(s)) return alert('زمان پایان باید بعد از زمان شروع باشد')

  const payload = {
    name: { fa: form.value.name.fa.trim(), en: form.value.name.en.trim() },
    slug: form.value.slug.trim(),
    description: form.value.description,
    startsAt: s,
    endsAt: e,
    status: form.value.status,
    expiryAction: form.value.expiryAction,
    priority: Number(form.value.priority) || 0,
    showCountdown: !!form.value.showCountdown,
    countdownLabel: form.value.countdownLabel,
    themeColor: form.value.themeColor,
    targets: form.value.targets.map(t => ({
      product: t.product,
      sizes: t.sizes,
      percent: Math.round(Number(t.percent)),
    })),
  }

  saving.value = true
  try {
    const res = editing.value
      ? await adminApi.updateCampaign(editing.value._id, payload)
      : await adminApi.createCampaign(payload)
    if (!res.success) throw new Error(res.message || 'خطا در ذخیره')
    showModal.value = false
    await fetchCampaigns()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}

const deleteCampaign = async (id) => {
  try {
    const res = await adminApi.deleteCampaign(id)
    if (!res.success) throw new Error(res.message || 'خطا در حذف')
    campaigns.value = campaigns.value.filter(c => c._id !== id)
    deletingId.value = null
  } catch (err) {
    alert('خطا در حذف: ' + (err.response?.data?.message || err.message))
    deletingId.value = null
  }
}

/* ───────── انتخابگر محصول (جستجو + صفحه‌بندی سروری) ───────── */
const showPicker = ref(false)
const pickerSearch = ref('')
const pickerProducts = ref([])
const pickerPage = ref(1)
const pickerPages = ref(1)
const pickerLoading = ref(false)
let pickerTimer = null
let pickerSeq = 0

const fetchPickerProducts = async (page = 1) => {
  const seq = ++pickerSeq
  pickerLoading.value = true
  try {
    const params = { limit: 30, page }
    if (pickerSearch.value.trim()) params.search = pickerSearch.value.trim()
    const res = await adminApi.getProducts(params)
    if (seq !== pickerSeq) return
    if (res.success) {
      pickerProducts.value = res.data || []
      pickerPage.value = res.page || 1
      pickerPages.value = res.pages || 1
    }
  } catch (err) {
    if (seq === pickerSeq) alert('خطا در دریافت محصولات: ' + (err.response?.data?.message || err.message))
  } finally {
    if (seq === pickerSeq) pickerLoading.value = false
  }
}

watch(pickerSearch, () => {
  if (!showPicker.value) return
  clearTimeout(pickerTimer)
  pickerTimer = setTimeout(() => fetchPickerProducts(1), 400)
})

const openPicker = () => {
  pickerSearch.value = ''
  showPicker.value = true
  fetchPickerProducts(1)
}

const alreadyAdded = (id) => form.value.targets.some(t => t.product === id)

const pickProduct = (p) => {
  if (alreadyAdded(p._id)) return
  form.value.targets.push({
    product: p._id,
    productName: p.name?.fa || '',
    sizes: [],
    percent: 30,
  })
  loadSizes(p._id)
}
</script>

<template>
  <div class="admin-campaigns">
    <div class="page-header">
      <div>
        <h1 class="page-title">کمپین‌های تخفیف زمان‌دار</h1>
        <p class="page-subtitle">بلک فرایدی، نوروز و… — تخفیف روی محصول یا سایزهای مشخص، با شروع و پایان خودکار</p>
      </div>
      <button class="create-btn" @click="openCreate">+ کمپین جدید</button>
    </div>

    <div class="search-box">
      <input v-model="searchQuery" type="text" placeholder="جستجوی کمپین..." />
    </div>

    <div v-if="loading" class="loading-state">در حال بارگذاری...</div>

    <div v-else class="campaigns-grid">
      <div v-for="c in filteredCampaigns" :key="c._id" class="campaign-card">
        <div class="card-head">
          <div class="head-text">
            <h3 class="c-name">{{ c.name?.fa }}</h3>
            <span class="c-slug">{{ c.slug }}</span>
          </div>
          <span class="status-badge"
                :style="{ background: statusMeta[c.effectiveStatus || c.status]?.bg, color: statusMeta[c.effectiveStatus || c.status]?.color }">
            {{ statusMeta[c.effectiveStatus || c.status]?.text || c.status }}
          </span>
        </div>

        <div class="c-dates">
          <span>شروع: {{ fmtDateTime(c.startsAt) }}</span>
          <span>پایان: {{ fmtDateTime(c.endsAt) }}</span>
        </div>

        <div v-if="remainingText(c)" class="c-countdown">{{ remainingText(c) }}</div>

        <div class="c-meta">
          <span class="chip">{{ fa(c.targetCount ?? (c.targets || []).length) }} محصول</span>
          <span class="chip">اولویت {{ fa(c.priority) }}</span>
          <span class="chip" :class="{ on: c.showCountdown }">{{ c.showCountdown ? 'تایمر روشن' : 'تایمر خاموش' }}</span>
        </div>

        <div class="c-actions">
          <button class="action-btn edit" @click="openEdit(c)">ویرایش</button>
          <button class="action-btn delete" @click="deletingId = c._id">حذف</button>
        </div>
      </div>

      <div v-if="filteredCampaigns.length === 0" class="empty-state">کمپینی یافت نشد</div>
    </div>

    <!-- فرم ساخت/ویرایش -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editing ? 'ویرایش کمپین' : 'کمپین جدید' }}</h2>
            <button class="modal-close" @click="showModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">نام کمپین <span class="req">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.name.fa" type="text" class="form-input" placeholder="مثلاً بلک فرایدی" @input="generateSlug" />
                  <input v-model="form.name.en" type="text" class="form-input" placeholder="Black Friday" dir="ltr" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">آدرس (slug)</label>
                <input v-model="form.slug" type="text" class="form-input" placeholder="black-friday" dir="ltr" />
              </div>
              <div class="form-group">
                <label class="form-label">اولویت (بزرگ‌تر برنده است)</label>
                <input v-model="form.priority" type="number" class="form-input" placeholder="0" />
              </div>

              <div class="form-group">
                <label class="form-label">شروع (خالی = از همین حالا)</label>
                <input v-model="form.startsAt" type="datetime-local" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">پایان (خالی = بی‌پایان)</label>
                <input v-model="form.endsAt" type="datetime-local" class="form-input" />
              </div>

              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="draft">پیش‌نویس (اعمال نمی‌شود)</option>
                  <option value="scheduled">زمان‌بندی‌شده</option>
                  <option value="active">فعال</option>
                  <option v-if="editing" value="archived">بایگانی</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">بعد از پایان</label>
                <select v-model="form.expiryAction" class="form-select">
                  <option value="archive">بایگانی شود (قابل تمدید)</option>
                  <option value="hide">کاملاً مخفی شود</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">رنگ تم</label>
                <input v-model="form.themeColor" type="color" class="form-color" />
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.showCountdown" type="checkbox" />
                  <span>نمایش تایمر شمارش معکوس</span>
                </label>
              </div>

              <div class="form-group full">
                <label class="form-label">متن تایمر</label>
                <div class="lang-inputs">
                  <input v-model="form.countdownLabel.fa" type="text" class="form-input" placeholder="تا پایان بلک فرایدی" />
                  <input v-model="form.countdownLabel.en" type="text" class="form-input" placeholder="Black Friday ends in" dir="ltr" />
                </div>
              </div>
            </div>

            <!-- اهداف تخفیف -->
            <div class="targets-block">
              <div class="targets-head">
                <h3>محصولات و درصد تخفیف</h3>
                <button type="button" class="add-btn" @click="openPicker">+ افزودن محصول</button>
              </div>
              <p class="hint">اگر هیچ سایزی انتخاب نشود، تخفیف روی همهٔ سایزهای آن محصول اعمال می‌شود.</p>

              <div v-if="form.targets.length === 0" class="empty-targets">هنوز محصولی اضافه نشده است</div>

              <div v-for="(t, i) in form.targets" :key="t.product" class="target-row">
                <div class="target-top">
                  <span class="target-name">{{ t.productName || t.product }}</span>
                  <input v-model="t.percent" type="number" min="1" max="99" class="form-input percent-input" />
                  <span class="percent-sign">٪</span>
                  <button type="button" class="remove-btn" @click="removeTarget(i)">حذف</button>
                </div>
                <div class="target-sizes">
                  <span v-if="sizeLoading[t.product]" class="hint">در حال خواندن سایزها...</span>
                  <template v-else-if="(sizeOptions[t.product] || []).length">
                    <button v-for="s in sizeOptions[t.product]" :key="s" type="button"
                            class="size-chip" :class="{ on: t.sizes.includes(s) }"
                            @click="toggleTargetSize(t, s)">{{ s }}</button>
                    <span class="hint">{{ t.sizes.length ? `${fa(t.sizes.length)} سایز انتخاب شده` : 'همهٔ سایزها' }}</span>
                  </template>
                  <span v-else class="hint">این محصول سایز ندارد — تخفیف روی کل محصول اعمال می‌شود</span>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" @click="showModal = false">انصراف</button>
              <button class="submit-btn" :disabled="saving" @click="saveCampaign">
                {{ saving ? 'در حال ذخیره...' : 'ذخیره کمپین' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- انتخابگر محصول -->
    <Transition name="modal">
      <div v-if="showPicker" class="modal-overlay" @click.self="showPicker = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>انتخاب محصول</h2>
            <button class="modal-close" @click="showPicker = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="search-box">
              <input v-model="pickerSearch" type="text" placeholder="جستجوی محصول..." />
            </div>
            <div v-if="pickerLoading" class="loading-state">در حال بارگذاری...</div>
            <div class="product-pick-list">
              <button v-for="p in pickerProducts" :key="p._id" type="button"
                      class="pick-item" :class="{ picked: alreadyAdded(p._id) }"
                      :disabled="alreadyAdded(p._id)" @click="pickProduct(p)">
                <div class="pick-img">
                  <img v-if="p.mainImage" :src="getImageUrl(p.mainImage)" :alt="p.name?.fa" />
                  <span v-else>◆</span>
                </div>
                <div class="pick-info">
                  <span class="pick-name">{{ p.name?.fa }}</span>
                  <span class="pick-cat">{{ p.category?.name?.fa || '' }}</span>
                </div>
                <span v-if="alreadyAdded(p._id)" class="added-mark">✓</span>
              </button>
              <div v-if="!pickerLoading && pickerProducts.length === 0" class="empty-state">محصولی یافت نشد</div>
            </div>
            <div v-if="pickerPages > 1" class="picker-pagination">
              <button type="button" class="page-btn" :disabled="pickerPage <= 1 || pickerLoading" @click="fetchPickerProducts(pickerPage - 1)">قبلی</button>
              <span class="page-info">صفحه {{ fa(pickerPage) }} از {{ fa(pickerPages) }}</span>
              <button type="button" class="page-btn" :disabled="pickerPage >= pickerPages || pickerLoading" @click="fetchPickerProducts(pickerPage + 1)">بعدی</button>
            </div>
            <div class="modal-actions">
              <button class="submit-btn" @click="showPicker = false">تمام</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- تایید حذف -->
    <Transition name="modal">
      <div v-if="deletingId" class="modal-overlay small" @click.self="deletingId = null">
        <div class="modal-content small">
          <div class="modal-header"><h2>حذف کمپین</h2></div>
          <div class="modal-body">
            <p class="confirm-text">با حذف کمپین، تخفیف آن فوراً از قیمت‌ها برداشته می‌شود. قیمت و تخفیف اصلی محصولات دست‌نخورده می‌ماند.</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="deletingId = null">انصراف</button>
              <button class="delete-btn" @click="deleteCampaign(deletingId)">حذف</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-campaigns { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: .88rem; opacity: .5; margin: 4px 0 0; }
.create-btn, .submit-btn { padding: 10px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg,#c5a059,#8f7032); color: #000; font-weight: 600; cursor: pointer; font-family: inherit; }
.submit-btn:disabled { opacity: .6; cursor: not-allowed; }
.search-box { display: flex; padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); }
.search-box input { flex: 1; background: none; border: none; color: #fff; outline: none; font-family: inherit; font-size: .9rem; }
.loading-state, .empty-state { padding: 40px; text-align: center; color: rgba(255,255,255,.45); grid-column: 1/-1; }
.campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(330px,1fr)); gap: 18px; }
.campaign-card { padding: 22px; border-radius: 18px; background: rgba(5,8,20,.9); border: 1px solid rgba(255,255,255,.06); display: flex; flex-direction: column; gap: 14px; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.c-name { font-size: 1.05rem; margin: 0 0 3px; }
.c-slug { font-size: .78rem; opacity: .4; font-family: ui-monospace, monospace; }
.status-badge { padding: 4px 10px; border-radius: 999px; font-size: .75rem; white-space: nowrap; }
.c-dates { display: flex; flex-direction: column; gap: 4px; font-size: .82rem; opacity: .65; }
.c-countdown { font-size: .9rem; color: #facc6b; font-weight: 600; }
.c-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { font-size: .78rem; padding: 5px 10px; border-radius: 8px; background: rgba(255,255,255,.04); opacity: .7; }
.chip.on { color: #22c55e; background: rgba(34,197,94,.1); opacity: 1; }
.c-actions { display: flex; gap: 8px; }
.action-btn { flex: 1; padding: 9px; border-radius: 10px; border: none; font-size: .85rem; cursor: pointer; font-family: inherit; }
.action-btn.edit { background: rgba(197,160,89,.15); color: #facc6b; }
.action-btn.delete { background: rgba(239,68,68,.15); color: #ef4444; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 760px; max-height: 88vh; overflow-y: auto; border-radius: 20px; background: rgba(5,8,20,.98); border: 1px solid rgba(255,255,255,.08); }
.modal-content.small { max-width: 440px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,.06); position: sticky; top: 0; background: rgba(8,10,18,.97); z-index: 5; }
.modal-header h2 { font-size: 1.15rem; margin: 0; }
.modal-close { width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; }
.modal-body { padding: 22px; display: flex; flex-direction: column; gap: 20px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1/-1; }
.form-label { font-size: .84rem; opacity: .7; }
.req { color: #ef4444; }
.form-input, .form-select { padding: 10px 13px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #fff; font-family: inherit; font-size: .9rem; outline: none; width: 100%; box-sizing: border-box; }
.form-select option { background: #0a0d14; }
.form-color { height: 42px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); cursor: pointer; }
.lang-inputs { display: flex; gap: 10px; }
.checkbox-group { justify-content: flex-end; }
.checkbox-label { display: flex; align-items: center; gap: 9px; font-size: .88rem; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; }
.targets-block { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,.06); padding-top: 16px; }
.targets-head { display: flex; justify-content: space-between; align-items: center; }
.targets-head h3 { font-size: .98rem; margin: 0; }
.add-btn { padding: 8px 14px; border-radius: 9px; border: 1px solid rgba(197,160,89,.4); background: rgba(197,160,89,.1); color: #facc6b; cursor: pointer; font-family: inherit; font-size: .84rem; }
.hint { font-size: .76rem; opacity: .5; margin: 0; }
.empty-targets { padding: 22px; text-align: center; color: rgba(255,255,255,.35); border: 1px dashed rgba(255,255,255,.1); border-radius: 12px; font-size: .85rem; }
.target-row { padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); display: flex; flex-direction: column; gap: 9px; }
.target-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.target-name { flex: 1; min-width: 130px; font-size: .88rem; }
.percent-input { width: 78px; text-align: center; }
.percent-sign { font-size: .85rem; opacity: .6; }
.remove-btn { padding: 6px 12px; border-radius: 8px; border: none; background: rgba(239,68,68,.15); color: #ef4444; cursor: pointer; font-family: inherit; font-size: .78rem; }
.target-sizes { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
.size-chip { padding: 5px 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03); color: rgba(255,255,255,.7); font-size: .75rem; cursor: pointer; font-family: inherit; }
.size-chip.on { border-color: #c5a059; background: rgba(197,160,89,.15); color: #facc6b; }
.product-pick-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 340px; overflow-y: auto; }
.pick-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); cursor: pointer; text-align: start; font-family: inherit; color: #fff; }
.pick-item.picked { opacity: .5; cursor: default; border-color: rgba(34,197,94,.4); }
.pick-img { width: 42px; height: 42px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,.03); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pick-img img { width: 100%; height: 100%; object-fit: cover; }
.pick-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.pick-name { font-size: .84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pick-cat { font-size: .72rem; opacity: .5; }
.added-mark { color: #22c55e; }
.picker-pagination { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.page-btn { padding: 8px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #fff; cursor: pointer; font-family: inherit; font-size: .84rem; }
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-info { font-size: .8rem; opacity: .6; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
.cancel-btn { padding: 10px 22px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: transparent; color: rgba(255,255,255,.7); cursor: pointer; font-family: inherit; }
.delete-btn { padding: 10px 22px; border-radius: 10px; border: none; background: #ef4444; color: #fff; font-weight: 600; cursor: pointer; font-family: inherit; }
.confirm-text { font-size: .92rem; opacity: .8; line-height: 1.8; margin: 0; }
.modal-enter-active, .modal-leave-active { transition: all .25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.96); }
@media (max-width: 768px) {
  .campaigns-grid, .form-grid, .product-pick-list { grid-template-columns: 1fr; }
  .lang-inputs { flex-direction: column; }
}
</style>