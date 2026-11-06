<template>
  <div class="art-editor" v-if="loaded">
    <!-- هدر -->
    <div class="editor-header">
      <div class="header-right">
        <button class="btn ghost" @click="$router.push('/admin/articles')">← بازگشت</button>
        <h1>{{ isEdit ? 'ویرایش مقاله' : 'مقاله جدید' }}</h1>
        <span v-if="lastSavedAt" class="save-state">{{ autosaving ? 'در حال ذخیره…' : 'ذخیره‌شده ' + lastSavedAt }}</span>
      </div>
      <div class="header-actions">
        <button class="btn ghost" @click="showBotPreview = true">👁 چشم گوگل‌بات</button>
        <button class="btn primary" :disabled="saving" @click="save(false)">
          {{ saving ? 'در حال ذخیره…' : (form.status === 'published' ? 'ذخیره' : 'انتشار') }}
        </button>
      </div>
    </div>

    <div class="editor-grid">
      <!-- ================= ستون اصلی ================= -->
      <div class="editor-main">
        <!-- تب زبان با نقطه تکمیل -->
        <div class="lang-tabs">
          <button class="lang-tab" :class="{ active: activeLang === 'fa' }" @click="activeLang = 'fa'">
            فارسی <i class="dot" :class="completion.fa"></i>
          </button>
          <button class="lang-tab" :class="{ active: activeLang === 'en' }" @click="activeLang = 'en'">
            English <i class="dot" :class="completion.en"></i>
          </button>
        </div>

        <div class="panel">
          <!-- عنوان -->
          <div class="form-group">
            <label>عنوان {{ activeLang === 'fa' ? 'فارسی *' : 'انگلیسی' }}</label>
            <input v-model="form.title[activeLang]" type="text" dir="auto" :placeholder="activeLang === 'fa' ? 'عنوان مقاله' : 'English title'" />
          </div>

          <!-- اسلاگ مستقل هر زبان -->
          <div class="form-row">
            <div class="form-group">
              <label>اسلاگ {{ activeLang === 'fa' ? 'فارسی' : 'انگلیسی' }} (آدرس URL)</label>
              <input v-model="form.slug[activeLang]" type="text" dir="ltr" :placeholder="activeLang === 'fa' ? 'مثلاً: قالی-اصفهان' : 'e.g.: isfahan-carpet'" />
            </div>
            <div class="form-group">
              <label>پیش‌نمایش آدرس</label>
              <div class="url-preview" dir="ltr">nourmehr.ir/{{ activeLang }}/news/{{ form.slug[activeLang] || '…' }}</div>
            </div>
          </div>

          <!-- خلاصه -->
          <div class="form-group">
            <label>خلاصه (برای کارت و متا)</label>
            <textarea v-model="form.excerpt[activeLang]" rows="2" dir="auto"></textarea>
          </div>

          <!-- ادیتور تیپ‌تپ -->
          <div class="form-group">
            <div class="label-row">
              <label>محتوای کامل</label>
              <span class="word-count">{{ wordCount }} کلمه</span>
            </div>
            <div class="toolbar" v-if="editor">
              <button type="button" class="tool" :class="{ active: editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()" title="درشت">B</button>
              <button type="button" class="tool" :class="{ active: editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()" title="مورب">I</button>
              <button type="button" class="tool" :class="{ active: editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" title="تیتر ۲ (در فهرست مطالب)">H2</button>
              <button type="button" class="tool" :class="{ active: editor.isActive('heading', { level: 3 }) }" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" title="تیتر ۳">H3</button>
              <button type="button" class="tool" :class="{ active: editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()" title="لیست نقطه‌ای">•—</button>
              <button type="button" class="tool" :class="{ active: editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()" title="نقل‌قول">❝</button>
              <span class="tool-sep"></span>
              <button type="button" class="tool" @click="openLinkPicker" title="لینک داخلی (محصول/مقاله)">🔗+</button>
              <button type="button" class="tool" @click="triggerImageUpload" title="تصویر (WebP خودکار)">🖼</button>
              <input ref="imgInput" type="file" accept="image/*" style="display:none" @change="uploadImage" />
            </div>
            <EditorContent v-if="editor" :editor="editor" class="tiptap-wrap" :dir="activeLang === 'fa' ? 'rtl' : 'ltr'" />
          </div>
        </div>

        <!-- پنل سئو -->
        <div class="panel">
          <h2 class="panel-title">🔎 سئو — {{ activeLang === 'fa' ? 'فارسی' : 'English' }}</h2>
          <div class="google-preview">
            <div class="gp-url" dir="ltr">nourmehr.ir › {{ activeLang }} › news › {{ form.slug[activeLang] || '…' }}</div>
            <div class="gp-title">{{ seoTitlePreview }}</div>
            <div class="gp-desc">{{ seoDescPreview }}</div>
          </div>
          <div class="form-group">
            <label>عنوان متا <span class="counter" :class="{ warn: form.seo[activeLang].title.length > 60 }">{{ form.seo[activeLang].title.length }}/60</span></label>
            <input v-model="form.seo[activeLang].title" type="text" dir="auto" placeholder="خالی = عنوان مقاله" />
          </div>
          <div class="form-group">
            <label>توضیحات متا <span class="counter" :class="{ warn: form.seo[activeLang].description.length > 160 }">{{ form.seo[activeLang].description.length }}/160</span></label>
            <textarea v-model="form.seo[activeLang].description" rows="2" dir="auto" placeholder="خالی = خلاصه مقاله"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>کلمه کلیدی کانونی</label>
              <input v-model="form.seo[activeLang].focusKeyword" type="text" dir="auto" />
            </div>
            <div class="form-group">
              <label>Canonical (اختیاری)</label>
              <input v-model="form.seo[activeLang].canonicalUrl" type="text" dir="ltr" placeholder="https://nourmehr.ir/..." />
            </div>
          </div>
          <label class="check-row">
            <input type="checkbox" v-model="form.seo[activeLang].noIndex" />
            این نسخه زبان از ایندکس خارج شود (noindex)
          </label>
        </div>

        <!-- FAQ -->
        <div class="panel">
          <div class="label-row">
            <h2 class="panel-title">❓ پرسش‌های متداول (FAQ)</h2>
            <button class="btn small" type="button" @click="addFaq">+ افزودن</button>
          </div>
          <p class="hint">سوالات پربازتاب کاربران را بنویسید — JSON-LD نوع FAQPage ساخته می‌شود و شانس ریچ‌ریزالت را بالا می‌برد.</p>
          <div v-for="(f, i) in form.faq" :key="i" class="faq-item">
            <div class="faq-head">
              <span>سوال {{ i + 1 }}</span>
              <button type="button" class="btn small danger" @click="form.faq.splice(i, 1)">حذف</button>
            </div>
            <div class="form-group"><label>سوال (فارسی)</label><input v-model="f.question.fa" type="text" dir="rtl" /></div>
            <div class="form-group"><label>پاسخ (فارسی)</label><textarea v-model="f.answer.fa" rows="2" dir="rtl"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>Question (EN)</label><input v-model="f.question.en" type="text" dir="ltr" /></div>
              <div class="form-group"><label>Answer (EN)</label><textarea v-model="f.answer.en" rows="2" dir="ltr"></textarea></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= ستون کناری ================= -->
      <aside class="editor-aside">
        <!-- انتشار -->
        <div class="panel">
          <h2 class="panel-title">📌 انتشار</h2>
          <div class="form-group">
            <label>وضعیت</label>
            <select v-model="form.status">
              <option value="draft">پیش‌نویس</option>
              <option value="review">در انتظار بازبینی</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
              <option value="published">منتشرشده</option>
              <option value="archived">آرشیو</option>
            </select>
          </div>
          <div v-if="form.status === 'scheduled' || form.status === 'published'" class="form-group">
            <label>تاریخ انتشار</label>
            <input v-model="publishAtInput" type="datetime-local" />
            <!-- پیش‌نمایش شمسی بدون هیچ کتابخانه‌ای -->
            <p v-if="jalaliPreview" class="jalali">🗓 {{ jalaliPreview }}</p>
          </div>
          <label class="check-row"><input type="checkbox" v-model="form.featured" /> نمایش در صفحه اصلی + هیروی رسانه (پست ویژه)</label>
        </div>

        <!-- دسته و نوع -->
        <div class="panel">
          <h2 class="panel-title">🗂 دسته‌بندی</h2>
          <div class="form-group">
            <label>نوع محتوا</label>
            <select v-model="form.type">
              <option value="news">خبر</option>
              <option value="event">رویداد</option>
              <option value="article">مقاله</option>
            </select>
          </div>
          <div class="form-group">
            <label>دسته</label>
            <select v-model="form.category">
              <option :value="null">— بدون دسته —</option>
              <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name?.fa || c.slug }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>تگ‌ها (با کاما جدا کنید)</label>
            <input v-model="tagsInput" type="text" dir="auto" placeholder="قالی, میناکاری, اصفهان" @blur="parseTags" />
          </div>
        </div>

        <!-- تصویر شاخص -->
        <div class="panel">
          <h2 class="panel-title">🖼 تصویر شاخص</h2>
          <img v-if="form.image" :src="getImageUrl(form.image)" class="cover-preview" alt="cover" />
          <button class="btn small" type="button" @click="triggerCoverUpload">{{ form.image ? 'تغییر تصویر' : 'آپلود تصویر' }}</button>
          <button v-if="form.image" class="btn small danger" type="button" @click="form.image = ''; form.imageVariants = []">حذف</button>
          <input ref="coverInput" type="file" accept="image/*" style="display:none" @change="uploadCover" />
          <div class="form-group" style="margin-top:10px">
            <label>متن جایگزین (alt)</label>
            <input v-model="form.imageAlt[activeLang]" type="text" dir="auto" />
          </div>
          <p v-if="form.imageVariants?.length" class="hint">✓ {{ form.imageVariants.length }} عرض WebP تولید شد (srcset)</p>
        </div>

        <!-- محصولات مرتبط -->
        <div class="panel">
          <div class="label-row">
            <h2 class="panel-title">🛍 محصولات مرتبط</h2>
          </div>
          <p class="hint">لینک داخلی مقاله ↔ محصول (موتور لینک‌سازی داخلی سئو)</p>
          <div class="form-group" style="position:relative">
            <input v-model="productSearch" type="text" placeholder="جستجوی محصول…" @input="searchProducts" />
            <div v-if="productResults.length" class="search-dropdown">
              <button v-for="p in productResults" :key="p._id" type="button" @click="addProduct(p)">
                {{ p.title }} <small v-if="p.slug" dir="ltr">{{ p.slug }}</small>
              </button>
            </div>
          </div>
          <div v-for="(rp, i) in form.relatedProducts" :key="rp.product" class="related-item">
            <span>{{ rp.title }}</span>
            <button type="button" class="btn small danger" @click="form.relatedProducts.splice(i, 1)">✕</button>
          </div>
        </div>

                <!-- مقالات مرتبط (انتخاب دستی) -->
        <div class="panel">
          <div class="label-row">
            <h2 class="panel-title">🔗 مقالات مرتبط</h2>
          </div>
          <p class="hint">فقط مقالاتی که اینجا انتخاب می‌کنی نمایش داده می‌شوند؛ اگر خالی بماند هیچ مقاله‌ای نشان داده نمی‌شود. (حداکثر ۶)</p>
          <div class="form-group" style="position:relative">
            <input v-model="relatedSearch" type="text" placeholder="جستجوی مقاله…" @input="searchRelated" />
            <div v-if="relatedResults.length" class="search-dropdown">
              <button v-for="a in relatedResults" :key="a.id" type="button" @click="addRelated(a)">
                {{ a.title }} <small v-if="a.slug" dir="ltr">{{ a.slug }}</small>
              </button>
            </div>
          </div>
          <div v-for="(r, i) in form.relatedArticles" :key="r._id" class="related-item">
            <span>{{ r.title }}</span>
            <button type="button" class="btn small danger" @click="form.relatedArticles.splice(i, 1)">✕</button>
          </div>
        </div>

        <!-- تاریخچه نسخه‌ها -->
        <div v-if="isEdit && form.revisions?.length" class="panel">
          <h2 class="panel-title">🕘 تاریخچه نسخه‌ها</h2>
          <div class="revisions-list">
            <div v-for="(rev, i) in [...form.revisions].reverse().slice(0, 8)" :key="i" class="rev-item">
              <div class="rev-info">
                <b>{{ rev.savedBy || '—' }}</b>
                <span>{{ fmtRevDate(rev.savedAt) }}</span>
                <small v-if="rev.note">{{ rev.note }}</small>
              </div>
              <button class="btn small" type="button" @click="restoreRev(form.revisions.length - 1 - i)">بازگردانی</button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- مودال پیش‌نمایش گوگل‌بات -->
    <div v-if="showBotPreview" class="modal-backdrop" @click.self="showBotPreview = false">
      <div class="modal">
        <div class="modal-head">
          <b>👁 پیش‌نمایش چشم گوگل‌بات {{ activeLang === 'fa' ? '(فارسی)' : '(English)' }}</b>
          <button class="btn small" @click="showBotPreview = false">بستن ✕</button>
        </div>
        <p class="hint">این دقیقاً همان HTML است که ربات گوگل می‌بیند — تضمین هم‌ارزی با همین تست روزانه چک می‌شود.</p>
        <div v-if="botHtml" class="bot-frame"><iframe :srcdoc="botHtml" title="bot preview"></iframe></div>
        <div v-else class="bot-loading">در حال ساخت پیش‌نمایش… (اول یک بار ذخیره کنید)</div>
      </div>
    </div>

    <!-- مودال انتخاب لینک داخلی -->
    <div v-if="showLinkPicker" class="modal-backdrop" @click.self="showLinkPicker = false">
      <div class="modal">
        <div class="modal-head">
          <b>🔗 درج لینک داخلی</b>
          <button class="btn small" @click="showLinkPicker = false">بستن ✕</button>
        </div>
        <div class="form-group">
          <input v-model="linkQuery" type="text" placeholder="جستجوی محصول یا مقاله…" @input="searchLinks" />
        </div>
        <div class="link-results">
          <button v-for="item in linkResults" :key="item.type + item.id" type="button" class="link-item" @click="insertLink(item)">
            <span class="type-chip" :class="item.type">{{ item.type === 'product' ? 'محصول' : 'مقاله' }}</span>
            {{ item.title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AdminArticleEditor — ادیتور مقالات سیستم رسانه‌ای جدید
 *
 * ارتقاءها نسبت به AdminBlogEditor:
 *  ۱) اسلاگ مستقل fa/en با پیش‌نمایش زنده URL و ۳۰۱ خودکار هنگام تغییر
 *  ۲) ذخیره خودکار ۲ ثانیه‌ای (autosave بدون ثبت نسخه) + ذخیره دستی (ثبت نسخه)
 *  ۳) تاریخچه نسخه‌ها + بازگردانی
 *  ۴) FAQ دوزبانه (JSON-LD FAQPage)
 *  ۵) محصولات مرتبط (لینک‌سازی داخلی)
 *  ۶) آپلود تصویر با پایپ‌لاین sharp (WebP چندعرضی)
 *  ۷) دکمه «چشم گوگل‌بات» — همان HTML ربات در iframe
 *  ۸) انتخاب‌گر لینک داخلی در نوار ابزار
 *  ۹) پیش‌نمایش شمسی تاریخ انتشار (Intl — بدون کتابخانه)
 */
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  adminGetArticle, adminCreateArticle, adminUpdateArticle,
  adminUploadArticleImage, adminLinkSearch, adminRestoreRevision, adminBotPreview,
  adminGetCategories
} from '../../services/articleApi'
import { getImageUrl } from '../../utils/imageUrl'

const route = useRoute()
const isEdit = Boolean(route.params.id)

const loaded = ref(false)
const saving = ref(false)
const autosaving = ref(false)
const lastSavedAt = ref('')
const showBotPreview = ref(false)
const showLinkPicker = ref(false)
const botHtml = ref('')

const activeLang = ref('fa')
const categories = ref([])
const tagsInput = ref('')
const productSearch = ref('')
const productResults = ref([])
const relatedSearch = ref('')
const relatedResults = ref([])
const linkQuery = ref('')
const linkResults = ref([])
const publishAtInput = ref('')

const form = reactive({
  title: { fa: '', en: '' },
  slug: { fa: '', en: '' },
  excerpt: { fa: '', en: '' },
  image: '',
  imageVariants: [],
  imageAlt: { fa: '', en: '' },
  type: 'news',
  category: null,
  tags: [],
  status: 'draft',
  publishedAt: null,
  featured: false,
  faq: [],
  relatedProducts: [], // [{ product, title, note }]
  relatedArticles: [], // [{ _id, title }]
  revisions: [],
  seo: {
    fa: { title: '', description: '', focusKeyword: '', canonicalUrl: '', noIndex: false },
    en: { title: '', description: '', focusKeyword: '', canonicalUrl: '', noIndex: false }
  }
})

/* ------------------------------ نقطه تکمیل زبان ------------------------------ */
const completion = computed(() => {
  const grade = (lang) => {
    const t = form.title[lang], c = contentHtml[lang]
    if (t && c && form.excerpt[lang] && form.slug[lang]) return 'full'
    if (t && c) return 'partial'
    return 'empty'
  }
  return { fa: grade('fa'), en: grade('en') }
})

/* -------------------------------- ادیتورها -------------------------------- */
// ادیتور تیپ‌تپ — فقط یک نمونه؛ با تغییر تب زبان محتوایش عوض می‌شود
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    ImageExtension,
    Placeholder.configure({ placeholder: 'نوشتن را شروع کنید…' })
  ],
  editorProps: { attributes: { class: 'tiptap-content' } },
  onUpdate: () => { touchAutosave() }
})

// HTML فعلی هر زبان — ادیتور تک‌نمونه‌ای بین زبان‌ها سوییچ می‌شود
const contentStore = reactive({ fa: { tiptap: null, html: '' }, en: { tiptap: null, html: '' } })
const contentHtml = contentStore

const switchLangContent = (lang) => {
  if (!editor.value) return
  // ذخیره زبان فعلی
  contentStore[lang === 'fa' ? 'en' : 'fa'] = {
    tiptap: editor.value.getJSON(),
    html: editor.value.getHTML()
  }
  // بارگذاری زبان جدید
  editor.value.commands.setContent(contentStore[lang]?.tiptap || contentStore[lang]?.html || '', false)
}
watch(activeLang, switchLangContent)

const wordCount = computed(() => {
  const text = editor.value?.getText() || ''
  return text.trim() ? text.trim().split(/\s+/).length : 0
})

/* ------------------------------ اسلاگ خودکار ------------------------------ */
const slugify = (s) => String(s || '').toLowerCase().trim()
  .replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')

// اگر اسلاگ هنوز «خودکار» است (دست‌کاری نشده)، با تغییر عنوان به‌روز می‌شود
watch(() => form.title.fa, (v, old) => {
  if (form.slug.fa === slugify(old)) form.slug.fa = slugify(v)
})
watch(() => form.title.en, (v, old) => {
  if (form.slug.en === slugify(old)) form.slug.en = slugify(v || form.title.fa)
})

/* ------------------------------ پیش‌نمایش‌ها ------------------------------ */
const seoTitlePreview = computed(() =>
  (form.seo[activeLang.value].title || form.title[activeLang.value] || 'عنوان مقاله').slice(0, 62) + ' | نورمهر'
)
const seoDescPreview = computed(() =>
  (form.seo[activeLang.value].description || form.excerpt[activeLang.value] || 'توضیحات متا…').slice(0, 165)
)

const jalaliPreview = computed(() => {
  if (!publishAtInput.value) return ''
  try {
    // تاریخ شمسی بدون کتابخانه — Intl خودش تقویم فارسی را دارد
    return new Date(publishAtInput.value).toLocaleString('fa-IR', { dateStyle: 'full', timeStyle: 'short' })
  } catch { return '' }
})

watch(publishAtInput, (v) => {
  if (v) form.publishedAt = new Date(v).toISOString()
})

/* ------------------------------ ذخیره خودکار ------------------------------ */
let autosaveTimer = null
let suspendWatch = false // هنگام اعمال پاسخ سرور، واچ را موقتاً خاموش می‌کنیم (جلوگیری از لوپ autosave)
const dirty = ref(false)

const touchAutosave = () => {
  if (suspendWatch) return
  dirty.value = true
  if (!isEdit) return // مقاله جدید: هنوز id نداریم
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => doSave(true), 2000)
}

const collectPayload = (autosave) => {
  // محتوای زبان فعال را هم از ادیتور بردار
  if (editor.value) {
    contentStore[activeLang.value] = { tiptap: editor.value.getJSON(), html: editor.value.getHTML() }
  }
  return {
    title: { ...form.title },
    slug: { ...form.slug },
    excerpt: { ...form.excerpt },
    content: JSON.parse(JSON.stringify(contentStore)),
    image: form.image,
    imageVariants: form.imageVariants,
    imageAlt: { ...form.imageAlt },
    type: form.type,
    category: form.category || null,
    tags: form.tags,
    status: form.status,
    publishedAt: form.publishedAt,
    featured: form.featured,
    faq: form.faq,
    relatedProducts: form.relatedProducts.map(rp => ({ product: rp.product, note: { fa: '', en: '' } })),
    relatedArticles: form.relatedArticles.map(r => r._id),
    seo: form.seo,
    autosave
  }
}

const doSave = async (autosave) => {
  if (autosave) autosaving.value = true; else saving.value = true
  try {
    const res = isEdit
      ? await adminUpdateArticle(route.params.id, collectPayload(autosave))
      : await adminCreateArticle(collectPayload(false))
    if (res.success) {
      lastSavedAt.value = new Date().toLocaleTimeString('fa-IR')
      suspendWatch = true
      if (!isEdit) {
        // مقاله تازه ساخته شد → به حالت ویرایش برو (تا autosave و نسخه‌ها کار کند)
        window.location.href = `/admin/articles/${res.data._id}/edit`
        return
      }
      if (!autosave) {
        form.revisions = res.data.revisions || form.revisions
        dirty.value = false
      }
      await nextTick()
      suspendWatch = false
    }
  } finally {
    autosaving.value = false
    saving.value = false
  }
}

const save = async (autosave) => doSave(autosave)

onBeforeUnmount(() => {
  clearTimeout(autosaveTimer)
  // ذخیره آخرین تغییرات معلق هنگام خروج
  if (isEdit && dirty.value) doSave(true).catch(() => {})
})

/* ------------------------------ آپلود تصاویر ------------------------------ */
const imgInput = ref(null)
const coverInput = ref(null)
const triggerImageUpload = () => imgInput.value?.click()
const triggerCoverUpload = () => coverInput.value?.click()

const uploadImage = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const alt = prompt('متن جایگزین (alt) تصویر چیست؟\nبرای سئو حیاتی است:') || ''
  const res = await adminUploadArticleImage(file, alt)
  if (res.success) {
    editor.value?.chain().focus().setImage({ src: res.url, alt }).run()
  }
  e.target.value = ''
}

const uploadCover = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const alt = form.imageAlt.fa || form.title.fa
  const res = await adminUploadArticleImage(file, alt)
  if (res.success) {
    form.image = res.url
    form.imageVariants = res.variants || []
  }
  e.target.value = ''
}

/* ------------------------------ لینک داخلی ------------------------------ */
let linkTimer = null
const openLinkPicker = () => { showLinkPicker.value = true; linkQuery.value = '' }
const searchLinks = () => {
  clearTimeout(linkTimer)
  linkTimer = setTimeout(async () => {
    if (linkQuery.value.trim().length < 2) { linkResults.value = []; return }
    const res = await adminLinkSearch(linkQuery.value.trim())
    if (res.success) linkResults.value = res.data
  }, 300)
}
const insertLink = (item) => {
  const lang = activeLang.value
  const url = item.type === 'product'
    ? `/${lang}/product/${encodeURIComponent(item.slug)}`
    : `/${lang}/news/${encodeURIComponent(item.slug)}`
  editor.value?.chain().focus().setLink({ href: url }).run()
  showLinkPicker.value = false
}

/* ------------------------------ محصولات مرتبط ------------------------------ */
let productTimer = null
const searchProducts = () => {
  clearTimeout(productTimer)
  productTimer = setTimeout(async () => {
    if (productSearch.value.trim().length < 2) { productResults.value = []; return }
    const res = await adminLinkSearch(productSearch.value.trim())
    if (res.success) productResults.value = res.data.filter(x => x.type === 'product')
  }, 300)
}
const addProduct = (p) => {
  if (form.relatedProducts.some(rp => rp.product === p._id)) return
  form.relatedProducts.push({ product: p._id, title: p.title })
  productSearch.value = ''
  productResults.value = []
}

/* ------------------------------ مقالات مرتبط (دستی) ------------------------------ */
let relatedTimer = null
const searchRelated = () => {
  clearTimeout(relatedTimer)
  relatedTimer = setTimeout(async () => {
    if (relatedSearch.value.trim().length < 2) { relatedResults.value = []; return }
    const res = await adminLinkSearch(relatedSearch.value.trim())
    if (res.success) relatedResults.value = res.data.filter(x => x.type === 'article')
  }, 300)
}
const addRelated = (a) => {
  // توجه: linkSearch فیلد را id برمی‌گرداند نه _id (علت باگ محصولات مرتبط)
  if (form.relatedArticles.some(r => r._id === a.id)) return
  form.relatedArticles.push({ _id: a.id, title: a.title })
  relatedSearch.value = ''
  relatedResults.value = []
}

/* ------------------------------ FAQ / تگ‌ها ------------------------------ */
const addFaq = () => {
  form.faq.push({ question: { fa: '', en: '' }, answer: { fa: '', en: '' } })
}
const parseTags = () => {
  form.tags = tagsInput.value.split(/[,،]/).map(s => s.trim()).filter(Boolean)
    .map(name => ({ slug: slugify(name), fa: name, en: '' }))
}

/* ------------------------------ نسخه‌ها ------------------------------ */
const fmtRevDate = (d) => { try { return new Date(d).toLocaleString('fa-IR') } catch { return '' } }
const restoreRev = async (index) => {
  if (!confirm('بازگردانی به این نسخه؟ وضعیت فعلی هم به‌عنوان یک نسخه ذخیره می‌شود.')) return
  const res = await adminRestoreRevision(route.params.id, index)
  if (res.success) window.location.reload()
}

/* ------------------------------ گوگل‌بات ------------------------------ */
watch(showBotPreview, async (v) => {
  if (!v || !isEdit) return
  botHtml.value = ''
  const res = await adminBotPreview(route.params.id, activeLang.value)
  if (res.success) botHtml.value = res.html
})

/* ------------------------------ بارگذاری اولیه ------------------------------ */
onMounted(async () => {
  if (isEdit) {
    const res = await adminGetArticle(route.params.id)
    if (res.success) {
      const a = res.data
      Object.assign(form, {
        title: a.title || { fa: '', en: '' },
        slug: a.slug || { fa: '', en: '' },
        excerpt: a.excerpt || { fa: '', en: '' },
        image: a.image || '',
        imageVariants: a.imageVariants || [],
        imageAlt: a.imageAlt || { fa: '', en: '' },
        type: a.type || 'news',
        category: a.category?._id || null,
        tags: a.tags || [],
        status: a.status || 'draft',
        publishedAt: a.publishedAt,
        featured: Boolean(a.featured),
        faq: a.faq || [],
        revisions: a.revisions || [],
        relatedProducts: (a.relatedProducts || []).map(rp => ({
          product: rp.product?._id || rp.product,
          title: rp.product?.name?.fa || rp.product?.name?.en || 'محصول'
        })),
        relatedArticles: (a.relatedArticles || []).map(ra => ({
          _id: ra._id,
          title: (ra.title?.fa || ra.title?.en || 'مقاله') + (ra.status !== 'published' ? ' (پیش‌نویس)' : '')
        }))
      })
      if (a.seo) {
        for (const lang of ['fa', 'en']) {
          form.seo[lang] = { ...form.seo[lang], ...(a.seo[lang] || {}) }
        }
      }
      contentStore.fa = a.content?.fa || { tiptap: null, html: '' }
      contentStore.en = a.content?.en || { tiptap: null, html: '' }
      editor.value?.commands.setContent(contentStore.fa.tiptap || contentStore.fa.html || '', false)
      if (a.publishedAt) {
        const d = new Date(a.publishedAt)
        publishAtInput.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      }
      tagsInput.value = (a.tags || []).map(t => t.fa || t.en || t.slug).join('، ')
    }
  }
  try {
    const res = await adminGetCategories()
    if (res.success) categories.value = res.data
  } catch { /* بی‌خطر */ }
  await nextTick()
  loaded.value = true
  suspendWatch = false
})

// تغییر هر فیلد فرم → autosave (در حین اعمال پاسخ سرور معلق است)
watch(form, () => { if (loaded.value) touchAutosave() }, { deep: true })
</script>

<style scoped>
.art-editor { padding: 20px; max-width: 1400px; margin: 0 auto; color: #fff; }
.editor-header { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; }
.header-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.header-right h1 { margin: 0; font-size: 1.3rem; }
.save-state { font-size: .75rem; color: #2bbf9e; background: rgba(43,191,158,.1); padding: 4px 12px; border-radius: 999px; }
.header-actions { display: flex; gap: 10px; }

.editor-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
@media (max-width: 1100px) { .editor-grid { grid-template-columns: 1fr; } }

.panel { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 20px; margin-bottom: 18px; }
.panel-title { margin: 0 0 14px; font-size: 1rem; }
.label-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }

.btn { padding: 9px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #fff; font: inherit; font-size: .84rem; cursor: pointer; transition: all .2s; }
.btn:hover { border-color: rgba(197,160,89,.5); }
.btn.primary { background: linear-gradient(135deg, #c5a059, #8f7032); border: none; color: #000; font-weight: 700; }
.btn.small { padding: 5px 12px; font-size: .75rem; }
.btn.danger { border-color: rgba(239,68,68,.4); color: #f87171; }

.lang-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.lang-tab { padding: 9px 22px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: transparent; color: rgba(255,255,255,.75); font: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.lang-tab.active { background: rgba(197,160,89,.18); border-color: #c5a059; color: #facc6b; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.full { background: #22c55e; }
.dot.partial { background: #eab308; }
.dot.empty { background: rgba(255,255,255,.2); }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: .8rem; opacity: .7; margin-bottom: 6px; }
.form-group input, .form-group textarea, .form-group select {
  width: 100%; padding: 10px 14px; border-radius: 10px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
  color: #fff; font: inherit; font-size: .9rem; outline: none;
}
.form-group input:focus, .form-group textarea:focus { border-color: rgba(197,160,89,.5); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
.counter { float: left; font-size: .7rem; opacity: .6; }
.counter.warn { color: #f87171; opacity: 1; }
.check-row { display: flex; align-items: center; gap: 8px; font-size: .84rem; cursor: pointer; margin: 8px 0; }
.hint { font-size: .74rem; opacity: .55; line-height: 1.8; margin: 6px 0; }
.word-count { font-size: .72rem; opacity: .5; }
.url-preview { padding: 10px 14px; border-radius: 10px; background: rgba(96,165,250,.06); border: 1px dashed rgba(96,165,250,.3); color: #60a5fa; font-size: .78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jalali { font-size: .8rem; color: #facc6b; margin: 8px 0 0; }

.toolbar { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px; border: 1px solid rgba(255,255,255,.1); border-radius: 10px 10px 0 0; background: rgba(255,255,255,.03); }
.tool { min-width: 34px; padding: 6px 10px; border: none; border-radius: 8px; background: transparent; color: #fff; font: inherit; font-size: .82rem; cursor: pointer; }
.tool:hover { background: rgba(255,255,255,.08); }
.tool.active { background: rgba(197,160,89,.2); color: #facc6b; }
.tool-sep { width: 1px; background: rgba(255,255,255,.12); margin: 2px 4px; }

.tiptap-wrap { border: 1px solid rgba(255,255,255,.08); border-top: none; border-radius: 0 0 10px 10px; background: rgba(255,255,255,.02); }
.tiptap-wrap :deep(.tiptap-content) { min-height: 340px; padding: 16px 18px; outline: none; font-size: .95rem; line-height: 2; }
.tiptap-wrap :deep(.tiptap-content p.is-editor-empty:first-child)::before { content: attr(data-placeholder); opacity: .35; height: 0; pointer-events: none; }
.tiptap-wrap :deep(.tiptap-content img) { max-width: 100%; border-radius: 10px; }
.tiptap-wrap :deep(.tiptap-content h2) { font-size: 1.35rem; margin: 1em 0 .5em; }
.tiptap-wrap :deep(.tiptap-content h3) { font-size: 1.1rem; margin: .9em 0 .4em; }
.tiptap-wrap :deep(.tiptap-content blockquote) { border-inline-start: 3px solid #c5a059; padding-inline-start: 14px; opacity: .85; }

.google-preview { background: #fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; color: #1a0dab; }
.gp-url { font-size: .72rem; color: #0f9d58; direction: ltr; text-align: left; }
.gp-title { font-size: 1rem; margin: 4px 0; color: #1a0dab; }
.gp-desc { font-size: .78rem; color: #4d5156; line-height: 1.6; }

.faq-item { border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
.faq-head { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; opacity: .7; margin-bottom: 10px; }

.cover-preview { width: 100%; border-radius: 10px; margin-bottom: 10px; }
.search-dropdown { position: absolute; inset-inline: 0; top: 100%; z-index: 20; background: #0c1128; border: 1px solid rgba(255,255,255,.14); border-radius: 10px; overflow: hidden; }
.search-dropdown button { display: flex; justify-content: space-between; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #fff; font: inherit; font-size: .82rem; cursor: pointer; text-align: start; }
.search-dropdown button:hover { background: rgba(197,160,89,.12); }
.related-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; font-size: .8rem; margin-bottom: 6px; }

.revisions-list { max-height: 300px; overflow-y: auto; }
.rev-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid rgba(255,255,255,.06); }
.rev-info { display: flex; flex-direction: column; gap: 2px; font-size: .78rem; }
.rev-info span { opacity: .6; font-size: .72rem; }
.rev-info small { opacity: .45; }

.modal-backdrop { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #0a0f24; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 20px; width: min(880px, 94vw); max-height: 88vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.bot-frame iframe { width: 100%; height: 60vh; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: #fff; }
.bot-loading { text-align: center; padding: 60px; opacity: .6; }
.link-results { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.link-item { padding: 10px 14px; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: transparent; color: #fff; font: inherit; font-size: .84rem; cursor: pointer; text-align: start; }
.link-item:hover { border-color: rgba(197,160,89,.5); }
.type-chip { font-size: .68rem; padding: 2px 10px; border-radius: 999px; margin-inline-end: 8px; }
.type-chip.product { background: rgba(96,165,250,.15); color: #60a5fa; }
.type-chip.article { background: rgba(197,160,89,.15); color: #facc6b; }
</style>
