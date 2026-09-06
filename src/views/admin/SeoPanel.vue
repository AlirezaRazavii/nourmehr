<script setup>
/**
 * پنل سئو — قابل استفاده در فرم محصول (و بعداً مقاله/کالکشن)
 * v-model:seo آبجکت کامل سئو (fa/en/sitemap) — باید قبل از استفاده deep-clone شود
 */
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  defaultTitle: { type: String, default: '' },
  defaultDescription: { type: String, default: '' },
  defaultImage: { type: String, default: '' },
  images: { type: Array, default: () => [] },   // برای انتخاب ogImage از گالری
    slug: { type: String, default: '' },
  siteUrl: { type: String, default: 'https://nourmehr.ir' }
})
const emit = defineEmits(['update:modelValue'])

const activeTab = ref('fa')

const emitUp = (lang) => {
  emit('update:modelValue', { ...props.modelValue, [lang]: { ...props.modelValue[lang] } })
}

const onSitemapChange = (key, value) => {
  const sm = { ...props.modelValue.sitemap, [key]: key === 'priority' ? Number(value) : value }
  emit('update:modelValue', { ...props.modelValue, sitemap: sm })
}

/* ---------- ابزارهای تحلیل ---------- */
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const truncate = (s, n) => { const t = String(s || '').trim(); return t.length <= n ? t : t.slice(0, n - 1) + '…' }

const titleOf = (lang) => (props.modelValue?.[lang]?.title || '').trim()
const descOf = (lang) => (props.modelValue?.[lang]?.description || '').trim()
const kwOf = (lang) => (props.modelValue?.[lang]?.focusKeyword || '').trim()
const slugOf = (lang) => props.slug || ''

const effTitle = computed(() => {
  const t = titleOf(activeTab.value)
  return t || truncate(props.defaultTitle, 75)
})
const effDesc = computed(() => {
  const d = descOf(activeTab.value)
  return d || truncate(stripHtml(props.defaultDescription), 170)
})
const effImage = computed(() => {
  const o = props.modelValue?.[activeTab.value]?.ogImage || ''
  return o || props.defaultImage
})

const ogTitleOf = (lang) => (props.modelValue?.[lang]?.ogTitle || titleOf(lang) || '').trim()
const ogDescOf = (lang) => (props.modelValue?.[lang]?.ogDescription || descOf(lang) || '').trim()

/* ---------- تحلیل سئو (امتیاز) ---------- */
const analyze = (lang) => {
  const checks = []
  const kw = kwOf(lang)
  const title = effTitle.value
  const desc = effDesc.value
  const slug = props.slug || ''

  if (kw) {
    checks.push({
      ok: title.toLowerCase().includes(kw.toLowerCase()),
      label: `کلمه کلیدی «${kw}» در عنوان`,
      tip: 'کلمه کلیدی را در ابتدای عنوان بیاورید'
    })
    checks.push({
      ok: desc.toLowerCase().includes(kw.toLowerCase()),
      label: `کلمه کلیدی «${kw}» در توضیحات`,
      tip: 'حداقل یک بار طبیعی استفاده شود'
    })
    checks.push({
      ok: slug.toLowerCase().includes(kw.toLowerCase()),
      label: `کلمه کلیدی در آدرس (slug)`,
      tip: 'اگر slug فارسی است معادل انگلیسی کلمه را قرار دهید'
    })
  }

  const tLen = title.length
  checks.push({
    ok: tLen >= 30 && tLen <= 60,
    label: `طول عنوان (${tLen} حرف)`,
    tip: 'بهینه: ۳۰ تا ۶۰ حرف'
  })
  const dLen = desc.length
  checks.push({
    ok: dLen >= 70 && dLen <= 160,
    label: `طول توضیحات (${dLen} حرف)`,
    tip: 'بهینه: ۷۰ تا ۱۶۰ حرف'
  })

  const checksObj = {
    fa: [
      { label: 'عنوان متا', ok: !!titleOf('fa') || !!props.defaultTitle }
    ],
    en: [
      { label: 'عنوان متا', ok: !!titleOf('en') }
    ]
  }
  checks.push(checksObj[lang][0])

  return checks
}

const checks = computed(() => analyze(activeTab.value))
const passedCount = computed(() => checks.value.filter(c => c.ok).length)
const score = computed(() => {
  if (!checks.value.length) return 0
  return Math.round((passedCount.value / checks.value.length) * 100)
})
const scoreClass = computed(() => score.value >= 80 ? 'good' : score.value >= 50 ? 'ok' : 'bad')
const scoreText = computed(() => score.value >= 80 ? 'خوب' : score.value >= 50 ? 'متوسط' : 'ضعیف')

/* ---------- انتخاب تصویر OG ---------- */
const showOgPicker = ref(false)
const pickOg = (img) => {
  const lang = activeTab.value
  props.modelValue[lang].ogImage = img
  showOgPicker.value = false
  emitUp(lang)
}

/* ---------- alt تصاویر ---------- */
const pickAltLang = (v) => {
  if (!v || typeof v !== 'object') return ''
  return v.fa || v.en || ''
}
</script>

<template>
  <div class="seo-panel">
    <!-- امتیاز + پیش‌نمایش SERP -->
    <div class="seo-head">
      <div class="seo-score" :class="scoreClass">
        <span class="score-num">{{ score }}</span>
        <span class="score-label">{{ scoreText }}</span>
      </div>
      <div class="serp-preview">
        <span class="serp-url">{{ siteUrl }}/fa/product/{{ slugOf() }}</span>
        <span class="serp-title">{{ effTitle }}</span>
        <span class="serp-desc">{{ effDesc }}</span>
      </div>
    </div>

    <!-- تب زبان -->
    <div class="lang-tabs">
      <button type="button" :class="{ active: activeTab === 'fa' }" @click="activeTab = 'fa'">فارسی</button>
      <button type="button" :class="{ active: activeTab === 'en' }" @click="activeTab = 'en'">English</button>
    </div>

    <!-- فیلدها -->
    <div class="seo-fields">
      <div class="field">
        <label>عنوان متا (Title) <span class="count" :class="{ warn: modelValue[activeTab].title?.length > 60 }">{{ (modelValue[activeTab].title || '').length }}/60</span></label>
        <input
          :value="modelValue[activeTab].title"
          @input="modelValue[activeTab].title = $event.target.value; emitUp(activeTab)"
          type="text"
          maxlength="75"
          placeholder="خالی = نام محصول"
        />
        <span class="hint">در نتایج گوگل و تب مرورگر نمایش داده می‌شود. بهینه: ۳۰-۶۰ حرف</span>
      </div>

      <div class="field">
        <label>توضیحات متا (Description) <span class="count" :class="{ warn: (modelValue[activeTab].description || '').length > 160 }">{{ (modelValue[activeTab].description || '').length }}/160</span></label>
        <textarea
          :value="modelValue[activeTab].description"
          @input="modelValue[activeTab].description = $event.target.value; emitUp(activeTab)"
          rows="3"
          maxlength="175"
          placeholder="خالی = توضیح کوتاه محصول"
        ></textarea>
        <span class="hint">متن زیر عنوان در نتایج جستجو. بهینه: ۷۰-۱۶۰ حرف</span>
      </div>

      <div class="field">
        <label>کلمه کلیدی کانونی</label>
        <input
          :value="modelValue[activeTab].focusKeyword"
          @input="modelValue[activeTab].focusKeyword = $event.target.value; emitUp(activeTab)"
          type="text"
          maxlength="100"
          placeholder="مثلاً: تابلو فیروزه‌کوبی"
        />
        <span class="hint">برای تحلیل امتیاز استفاده می‌شود؛ در صفحه نمایش داده نمی‌شود</span>
      </div>

      <div class="field">
        <label>آدرس کانونیکال (اختیاری)</label>
        <input
          :value="modelValue[activeTab].canonicalUrl"
          @input="modelValue[activeTab].canonicalUrl = $event.target.value; emitUp(activeTab)"
          type="text"
          dir="ltr"
          placeholder="خالی = آدرس خودکار محصول"
        />
        <span class="hint">فقط اگر این صفحه جایگزین صفحه‌ی دیگری است پر کنید</span>
      </div>

      <div class="field">
        <label>تصویر اشتراک‌گذاری (og:image)</label>
        <div class="og-row">
          <input
            :value="modelValue[activeTab].ogImage"
            @input="modelValue[activeTab].ogImage = $event.target.value; emitUp(activeTab)"
            type="text"
            dir="ltr"
            placeholder="خالی = تصویر اصلی محصول"
          />
          <button type="button" class="pick-btn" @click="showOgPicker = !showOgPicker">انتخاب از گالری</button>
        </div>
        <div v-if="showOgPicker" class="og-picker">
          <div v-for="img in images" :key="img" class="og-option" @click="pickOg(img)">
            <img :src="img" alt="" />
          </div>
          <span v-if="!images.length" class="hint">اول تصاویر محصول را آپلود کنید</span>
        </div>
      </div>

      <div class="field">
        <label>عنوان و توضیح شبکه‌های اجتماعی (اختیاری)</label>
        <div class="og-extra">
          <input
            :value="modelValue[activeTab].ogTitle"
            @input="modelValue[activeTab].ogTitle = $event.target.value; emitUp(activeTab)"
            type="text"
            maxlength="95"
            placeholder="عنوان سفارشی برای تلگرام/واتساپ — خالی = عنوان متا"
          />
          <input
            :value="modelValue[activeTab].ogDescription"
            @input="modelValue[activeTab].ogDescription = $event.target.value; emitUp(activeTab)"
            type="text"
            maxlength="200"
            placeholder="توضیح سفارشی برای تلگرام/واتساپ — خالی = توضیحات متا"
          />
        </div>
      </div>

      <div class="field checkbox-field">
        <label class="check-label">
          <input
            type="checkbox"
            :checked="modelValue[activeTab].noIndex"
            @change="modelValue[activeTab].noIndex = $event.target.checked; emitUp(activeTab)"
          />
          <span>این زبان از گوگل حذف شود (noindex)</span>
        </label>
        <span class="hint">اگر محتوای این زبان کامل نیست، فعالش بگذارید</span>
      </div>
    </div>

    <!-- sitemap -->
    <div class="sitemap-row">
      <label class="check-label">
        <input type="checkbox" :checked="modelValue.sitemap.include" @change="onSitemapChange('include', $event.target.checked)" />
        <span>در نقشه سایت باشد</span>
      </label>
      <div class="sitemap-field">
        <label>اولویت</label>
        <select :value="modelValue.sitemap.priority" @change="onSitemapChange('priority', $event.target.value)">
          <option v-for="p in [0, 0.3, 0.5, 0.6, 0.8, 0.9, 1]" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="sitemap-field">
        <label>تناوب به‌روزرسانی</label>
        <select :value="modelValue.sitemap.changefreq" @change="onSitemapChange('changefreq', $event.target.value)">
          <option v-for="f in ['always', 'hourly', 'dail' + 'y', 'weekly', 'monthly', 'yearly', 'never']" :key="f" :value="f">{{ f }}</option>
        </select>
      </div>
    </div>

    <!-- چک‌لیست -->
    <div class="seo-checklist">
      <div v-for="(c, i) in checks" :key="i" class="check-item" :class="{ ok: c.ok, bad: !c.ok }">
        <span class="check-icon">{{ c.ok ? '✓' : '✗' }}</span>
        <span class="check-label">{{ c.label }}</span>
        <span v-if="!c.ok && c.tip" class="check-tip">{{ c.tip }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seo-panel { display: flex; flex-direction: column; gap: 16px; }
.seo-head { display: flex; gap: 16px; align-items: stretch; }
.seo-score { flex-shrink: 0; width: 92px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 14px; border: 1px solid; gap: 2px; }
.seo-score.good { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.08); color: #22c55e; }
.seo-score.ok { border-color: rgba(234,179,8,0.4); background: rgba(234,179,8,0.08); color: #eab308; }
.seo-score.bad { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #ef4444; }
.score-num { font-size: 1.6rem; font-weight: 700; }
.score-label { font-size: 0.75rem; opacity: 0.8; }
.serp-preview { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 12px; background: #fff; color: #1a0d05; direction: rtl; min-width: 0; }
.serp-url { font-size: 0.78rem; color: #0b57d0; word-break: break-all; direction: ltr; text-align: right; }
.serp-title { font-size: 1rem; font-weight: 500; color: #1a0d05; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.serp-desc { font-size: 0.8rem; color: #4d5156; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lang-tabs { display: flex; gap: 8px; }
.lang-tabs button { padding: 7px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6); cursor: pointer; font-family: inherit; font-size: 0.85rem; transition: all 0.2s; }
.lang-tabs button.active { background: rgba(197,160,89,0.15); border-color: rgba(197,160,89,0.4); color: #facc6b; }
.seo-fields { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 0.82rem; color: rgba(255,255,255,0.75); display: flex; justify-content: space-between; align-items: center; }
.count { font-size: 0.72rem; opacity: 0.55; font-family: monospace; }
.count.warn { color: #ef4444; opacity: 1; }
.field input, .field textarea { padding: 9px 13px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.88rem; font-family: inherit; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
.field input:focus, .field textarea:focus { border-color: rgba(197,160,89,0.5); }
.field textarea { resize: vertical; min-height: 70px; }
.hint { font-size: 0.72rem; opacity: 0.45; }
.og-row { display: flex; gap: 8px; }
.og-row input { flex: 1; }
.pick-btn { padding: 0 14px; border-radius: 10px; border: 1px solid rgba(197,160,89,0.35); background: rgba(197,160,89,0.1); color: #facc6b; cursor: pointer; font-size: 0.8rem; font-family: inherit; white-space: nowrap; }
.og-picker { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(255,255,255,0.02); }
.og-option { width: 64px; height: 64px; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s; }
.og-option:hover { border-color: #c5a059; }
.og-option img { width: 100%; height: 100%; object-fit: cover; }
.og-extra { display: flex; flex-direction: column; gap: 8px; }
.checkbox-field .check-label, .sitemap-row .check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: rgba(255,255,255,0.8); }
.checkbox-field input, .sitemap-row input[type=checkbox] { accent-color: #c5a059; width: 16px; height: 16px; }
.sitemap-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.02); }
.sitemap-field { display: flex; align-items: center; gap: 6px; }
.sitemap-field label { font-size: 0.78rem; opacity: 0.6; }
.sitemap-field select { padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.82rem; outline: none; cursor: pointer; }
.sitemap-field select option { background: #0a0d14; }
.seo-checklist { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; background: rgba(255,255,255,0.015); }
.check-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: rgba(255,255,255,0.55); }
.check-item.ok { color: rgba(34,197,94,0.9); }
.check-item.bad { color: rgba(239,68,68,0.9); }
.check-icon { width: 18px; text-align: center; font-weight: 700; }
.check-tip { margin-right: auto; font-size: 0.72rem; opacity: 0.5; }
</style>