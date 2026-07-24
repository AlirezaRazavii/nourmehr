<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  getHeroAdmin, updateHeroSettings, addHeroSlide,
  updateHeroSlide, deleteHeroSlide, reorderHeroSlides, uploadHeroImage,
} from '../../services/heroApi'

const loading = ref(true)
const saving = ref(false)
const slides = ref([])
const settings = reactive({
  isEnabled: true, autoplay: true, autoplayDelay: 7000, pauseOnHover: false,
  showTimer: true, showCounter: true, showBgTypography: true,
  showCornerDeco: true, enableFloat: true, transitionType: 'slide', heroHeight: '100svh',
})

const editing = ref(null)
const showModal = ref(false)
const uploadingProduct = ref(false)
const uploadingBg = ref(false)
const toast = ref('')

const emptySlide = () => ({
  title: { fa: '', en: '' },
  subtitle: { fa: '', en: '' },
  description: { fa: '', en: '' },
  buttonText: { fa: '', en: '' },
  buttonLink: '/products',
  productImage: '', bgImage: '',
  themeColor: '#0db9e9', bgBrightness: 0.35, isActive: true,
})

const showToast = (msg) => { toast.value = msg; setTimeout(() => (toast.value = ''), 2500) }

const load = async () => {
  loading.value = true
  try {
    const res = await getHeroAdmin()
    const data = res.data ?? res
    slides.value = (data.slides || []).sort((a, b) => (a.order || 0) - (b.order || 0))
    Object.assign(settings, data.settings || {})
  } catch (e) {
    showToast('خطا در بارگذاری هیرو')
  } finally {
    loading.value = false
  }
}

const openNew = () => { editing.value = emptySlide(); showModal.value = true }
const openEdit = (slide) => { editing.value = JSON.parse(JSON.stringify(slide)); showModal.value = true }
const closeModal = () => { showModal.value = false; editing.value = null }

const onFile = async (e, field) => {
  const file = e.target.files?.[0]
  if (!file) return
  const flag = field === 'productImage' ? uploadingProduct : uploadingBg
  flag.value = true
  try {
    const res = await uploadHeroImage(file)
    const data = res.data ?? res
    editing.value[field] = data.url
    showToast('تصویر آپلود شد ✓')
  } catch (err) {
    showToast('خطا در آپلود تصویر')
  } finally {
    flag.value = false
    e.target.value = ''
  }
}

const saveSlide = async () => {
  saving.value = true
  try {
    if (editing.value._id) {
      await updateHeroSlide(editing.value._id, editing.value)
      showToast('اسلاید ویرایش شد ✓')
    } else {
      await addHeroSlide(editing.value)
      showToast('اسلاید افزوده شد ✓')
    }
    closeModal()
    await load()
  } catch (err) {
    showToast('خطا در ذخیره اسلاید')
  } finally {
    saving.value = false
  }
}

const removeSlide = async (slide) => {
  if (!confirm('آیا از حذف این اسلاید مطمئن هستید؟')) return
  try {
    await deleteHeroSlide(slide._id)
    showToast('اسلاید حذف شد ✓')
    await load()
  } catch (err) {
    showToast('خطا در حذف اسلاید')
  }
}

const toggleActive = async (slide) => {
  try {
    await updateHeroSlide(slide._id, { isActive: !slide.isActive })
    await load()
  } catch (err) { showToast('خطا') }
}

const move = async (index, dir) => {
  const newIndex = index + dir
  if (newIndex < 0 || newIndex >= slides.value.length) return
  const arr = [...slides.value]
  ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
  slides.value = arr
  try {
    await reorderHeroSlides(arr.map((s) => s._id))
    showToast('ترتیب به‌روزرسانی شد ✓')
  } catch (err) { showToast('خطا در مرتب‌سازی'); await load() }
}

const saveSettings = async () => {
  saving.value = true
  try {
    await updateHeroSettings({ ...settings })
    showToast('تنظیمات ذخیره شد ✓')
  } catch (err) {
    showToast('خطا در ذخیره تنظیمات')
  } finally {
    saving.value = false
  }
}

const imgSrc = (url) => url || ''

onMounted(load)
</script>

<template>
  <div class="admin-hero" dir="rtl">
    <div class="page-head">
      <div>
        <h1>مدیریت هیرو (اسلایدر اصلی)</h1>
        <p>افزودن، ویرایش، حذف و مرتب‌سازی اسلایدها و تنظیمات نمایش</p>
      </div>
      <button class="btn-primary" @click="openNew">+ اسلاید جدید</button>
    </div>

    <div v-if="loading" class="loading">در حال بارگذاری...</div>

    <template v-else>
      <section class="card">
        <h2>تنظیمات کلی</h2>
        <div class="settings-grid">
          <label class="switch-row"><input type="checkbox" v-model="settings.isEnabled" /> نمایش هیرو در سایت</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.autoplay" /> پخش خودکار</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.pauseOnHover" /> توقف با نگه‌داشتن ماوس</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.showTimer" /> نمایش تایمر</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.showCounter" /> نمایش شمارنده</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.showBgTypography" /> نمایش متن بزرگ پس‌زمینه</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.showCornerDeco" /> نمایش دکور گوشه‌ها</label>
          <label class="switch-row"><input type="checkbox" v-model="settings.enableFloat" /> انیمیشن شناور تصویر</label>

          <label class="field"><span>سرعت تعویض (میلی‌ثانیه)</span><input type="number" min="1000" step="500" v-model.number="settings.autoplayDelay" /></label>
          <label class="field">
            <span>نوع ترنزیشن</span>
            <select v-model="settings.transitionType">
              <option value="slide">اسلاید</option>
              <option value="fade">محو</option>
              <option value="zoom">زوم</option>
            </select>
          </label>
          <label class="field"><span>ارتفاع هیرو</span><input type="text" v-model="settings.heroHeight" placeholder="100svh" /></label>
        </div>
        <button class="btn-primary" :disabled="saving" @click="saveSettings">ذخیره تنظیمات</button>
      </section>

      <section class="card">
        <h2>اسلایدها ({{ slides.length }})</h2>
        <div v-if="!slides.length" class="empty">هنوز اسلایدی ندارید.</div>

        <div v-for="(slide, i) in slides" :key="slide._id" class="slide-row">
          <div class="thumb" :style="{ background: slide.themeColor }">
            <img v-if="slide.productImage" :src="imgSrc(slide.productImage)" alt="" />
          </div>
          <div class="slide-info">
            <strong>{{ slide.title?.fa || '(بدون عنوان)' }} — {{ slide.subtitle?.fa }}</strong>
            <span class="desc">{{ slide.description?.fa }}</span>
            <span class="badges">
              <em :style="{ background: slide.themeColor }" class="color-dot"></em>
              <span :class="['status', slide.isActive ? 'on' : 'off']">{{ slide.isActive ? 'فعال' : 'غیرفعال' }}</span>
            </span>
          </div>
          <div class="slide-actions">
            <button class="ico" @click="move(i, -1)" :disabled="i === 0" title="بالا">▲</button>
            <button class="ico" @click="move(i, 1)" :disabled="i === slides.length - 1" title="پایین">▼</button>
            <button class="ico" @click="toggleActive(slide)" title="فعال/غیرفعال">◑</button>
            <button class="ico edit" @click="openEdit(slide)">ویرایش</button>
            <button class="ico del" @click="removeSlide(slide)">حذف</button>
          </div>
        </div>
      </section>
    </template>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">
          <h3>{{ editing._id ? 'ویرایش اسلاید' : 'اسلاید جدید' }}</h3>
          <button class="close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="two-col">
            <label class="field"><span>عنوان (فارسی)</span><input v-model="editing.title.fa" /></label>
            <label class="field"><span>Title (English)</span><input v-model="editing.title.en" dir="ltr" /></label>
            <label class="field"><span>زیرعنوان (فارسی)</span><input v-model="editing.subtitle.fa" /></label>
            <label class="field"><span>Subtitle (English)</span><input v-model="editing.subtitle.en" dir="ltr" /></label>
          </div>

          <label class="field"><span>توضیحات (فارسی)</span><textarea rows="2" v-model="editing.description.fa"></textarea></label>
          <label class="field"><span>Description (English)</span><textarea rows="2" v-model="editing.description.en" dir="ltr"></textarea></label>

          <div class="two-col">
            <label class="field"><span>متن دکمه (فارسی)</span><input v-model="editing.buttonText.fa" /></label>
            <label class="field"><span>Button (English)</span><input v-model="editing.buttonText.en" dir="ltr" /></label>
          </div>

          <label class="field"><span>لینک دکمه</span><input v-model="editing.buttonLink" dir="ltr" placeholder="/products" /></label>

          <div class="two-col">
            <div class="upload-box">
              <span>تصویر اصلی (محصول)</span>
              <div class="preview" v-if="editing.productImage"><img :src="imgSrc(editing.productImage)" alt="" /></div>
              <input type="file" accept="image/*" @change="onFile($event, 'productImage')" />
              <small v-if="uploadingProduct">در حال آپلود...</small>
            </div>
            <div class="upload-box">
              <span>تصویر پس‌زمینه</span>
              <div class="preview bg" v-if="editing.bgImage"><img :src="imgSrc(editing.bgImage)" alt="" /></div>
              <input type="file" accept="image/*" @change="onFile($event, 'bgImage')" />
              <small v-if="uploadingBg">در حال آپلود...</small>
            </div>
          </div>

          <div class="two-col">
            <label class="field"><span>رنگ تم</span><input type="color" v-model="editing.themeColor" /></label>
            <label class="field"><span>روشنایی پس‌زمینه ({{ editing.bgBrightness }})</span><input type="range" min="0" max="1" step="0.05" v-model.number="editing.bgBrightness" /></label>
          </div>

          <label class="switch-row"><input type="checkbox" v-model="editing.isActive" /> اسلاید فعال باشد</label>
        </div>

        <div class="modal-foot">
          <button class="btn-ghost" @click="closeModal">انصراف</button>
          <button class="btn-primary" :disabled="saving" @click="saveSlide">{{ saving ? 'در حال ذخیره...' : 'ذخیره' }}</button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.admin-hero { padding: 24px; color: #e7e7ea; }
.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.page-head h1 { font-size: 1.4rem; margin: 0 0 4px; }
.page-head p { margin: 0; opacity: 0.6; font-size: 0.85rem; }
.loading, .empty { padding: 40px; text-align: center; opacity: 0.6; }
.card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
.card h2 { font-size: 1.05rem; margin: 0 0 16px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 16px; }
.switch-row { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; }
.field span { opacity: 0.75; }
.field input, .field select, .field textarea { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 9px 12px; color: #fff; font-size: 0.9rem; font-family: inherit; }
.field input[type="color"] { height: 42px; padding: 4px; cursor: pointer; }
.slide-row { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 10px; }
.thumb { width: 60px; height: 60px; border-radius: 10px; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.thumb img { width: 100%; height: 100%; object-fit: contain; }
.slide-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.slide-info .desc { font-size: 0.8rem; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badges { display: flex; align-items: center; gap: 8px; }
.color-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; }
.status { font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; }
.status.on { background: rgba(46,204,113,0.2); color: #2ecc71; }
.status.off { background: rgba(231,76,60,0.2); color: #e74c3c; }
.slide-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.ico { background: rgba(255,255,255,0.08); border: none; color: #fff; border-radius: 8px; padding: 7px 10px; cursor: pointer; font-size: 0.8rem; }
.ico:disabled { opacity: 0.3; cursor: not-allowed; }
.ico.edit { background: rgba(52,152,219,0.25); }
.ico.del { background: rgba(231,76,60,0.25); }
.btn-primary { background: #c5a059; color: #1a1a1a; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 10px; padding: 10px 20px; cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #141824; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; width: 100%; max-width: 640px; max-height: 90vh; display: flex; flex-direction: column; }
.modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.modal-head h3 { margin: 0; font-size: 1.1rem; }
.close { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; }
.modal-body { padding: 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid rgba(255,255,255,0.08); }
.upload-box { display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; }
.upload-box > span { opacity: 0.75; }
.preview { width: 100%; height: 120px; border-radius: 10px; overflow: hidden; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; }
.preview img { width: 100%; height: 100%; object-fit: contain; }
.preview.bg img { object-fit: cover; }
.upload-box small { color: #c5a059; }
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1a1a; border: 1px solid rgba(255,255,255,0.15); padding: 12px 22px; border-radius: 12px; z-index: 2000; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 640px) { .two-col { grid-template-columns: 1fr; } .slide-row { flex-direction: column; align-items: stretch; } }
</style>
