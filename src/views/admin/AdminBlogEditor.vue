<template>
  <div class="blog-editor" v-if="loaded">
    <div class="editor-header">
      <div class="header-right">
        <button class="back-btn" @click="goBack">← {{ $t('admin_back') }}</button>
        <h1>{{ isEdit ? $t('admin_edit_post') : $t('admin_new_post') }}</h1>
      </div>
      <div class="header-actions">
        <span v-if="form.viewsCount > 0" class="views-chip">👁 {{ form.viewsCount }}</span>
        <button class="save-btn" :disabled="saving" @click="save(false)">
          {{ saving ? $t('loading') : (isEdit ? $t('admin_save') : $t('admin_publish_now')) }}
        </button>
      </div>
    </div>

    <div class="editor-grid">
      <!-- ستون اصلی -->
      <div class="editor-main">
        <!-- تب زبان -->
        <div class="lang-tabs">
          <button class="lang-tab" :class="{ active: activeLang === 'fa' }" @click="activeLang = 'fa'">فارسی</button>
          <button class="lang-tab" :class="{ active: activeLang === 'en' }" @click="activeLang = 'en'">English</button>
        </div>

        <div class="panel glass">
          <div class="form-group">
            <label class="form-label">{{ activeLang === 'fa' ? 'عنوان مقاله *' : 'Title * (English)' }}</label>
            <input v-if="activeLang === 'fa'" v-model="form.title.fa" type="text" class="form-input" dir="rtl" placeholder="عنوان فارسی" />
            <input v-else v-model="form.title.en" type="text" class="form-input" dir="ltr" placeholder="English Title" />
          </div>

          <div class="form-group">
            <label class="form-label">{{ activeLang === 'fa' ? 'خلاصه مقاله' : 'Excerpt' }}</label>
            <textarea v-if="activeLang === 'fa'" v-model="form.excerpt.fa" rows="2" class="form-input" dir="rtl" placeholder="خلاصه‌ای کوتاه برای کارت مقاله و توضیحات متا"></textarea>
            <textarea v-else v-model="form.excerpt.en" rows="2" class="form-input" dir="ltr" placeholder="Short English excerpt"></textarea>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="form-label">{{ activeLang === 'fa' ? 'محتوای کامل' : 'Content' }}</label>
              <span class="word-count">{{ wordCount }} {{ activeLang === 'fa' ? 'کلمه' : 'words' }}</span>
            </div>
            <div class="toolbar" v-if="activeEditor">
              <button type="button" v-for="btn in toolbarButtons" :key="btn.label" class="tool-btn" :class="{ active: btn.isActive?.() }" @click="btn.action()" :title="btn.title">{{ btn.label }}</button>
              <span class="tool-sep"></span>
              <button type="button" class="tool-btn" @click="setLink" title="لینک">🔗</button>
              <button type="button" class="tool-btn" @click="activeEditor.chain().focus().unsetLink().run()" title="حذف لینک">⛓️‍💥</button>
              <button type="button" class="tool-btn" @click="triggerImageUpload" title="تصویر">🖼</button>
              <input type="file" ref="imgInput" accept="image/*" style="display:none" @change="uploadEditorImage" />
            </div>
            <EditorContent v-if="activeEditor" :editor="activeEditor" class="tiptap-wrap" :dir="activeLang === 'fa' ? 'rtl' : 'ltr'" />
          </div>
        </div>

        <!-- پنل سئو -->
        <div class="panel glass">
          <h2 class="panel-title">🔎 سئو</h2>

          <!-- پیش‌نمایش گوگل -->
          <div class="google-preview">
            <div class="gp-url">{{ googlePreview.url }}</div>
            <div class="gp-title">{{ googlePreview.title }}</div>
            <div class="gp-desc">{{ googlePreview.description }}</div>
          </div>

          <div class="seo-fields">
            <div class="form-group">
              <label class="form-label">عنوان متا (SEO Title)</label>
              <div class="counter-wrap">
                <input :value="activeLang === 'fa' ? form.seo.title.fa : form.seo.title.en" @input="setSeo('title', $event.target.value)" type="text" class="form-input" :dir="activeLang === 'fa' ? 'rtl' : 'ltr'" :placeholder="activeLang === 'fa' ? 'خالی = عنوان مقاله' : 'Empty = post title'" />
                <span class="char-counter" :class="{ warn: seoTitleLen > 60 }">{{ seoTitleLen }}/60</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">توضیحات متا (Meta Description)</label>
              <div class="counter-wrap">
                <textarea :value="activeLang === 'fa' ? form.seo.description.fa : form.seo.description.en" @input="setSeo('description', $event.target.value)" rows="2" class="form-input" :dir="activeLang === 'fa' ? 'rtl' : 'ltr'" :placeholder="activeLang === 'fa' ? 'خالی = خلاصه مقاله' : 'Empty = excerpt'"></textarea>
                <span class="char-counter" :class="{ warn: seoDescLen > 160 }">{{ seoDescLen }}/160</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">کلمات کلیدی (با , جدا کنید)</label>
              <input :value="activeLang === 'fa' ? form.seo.keywords.fa : form.seo.keywords.en" @input="setSeo('keywords', $event.target.value)" type="text" class="form-input" :dir="activeLang === 'fa' ? 'rtl' : 'ltr'" placeholder="کلمه کلیدی ۱, کلمه کلیدی ۲" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">کلمه کلیدی کانونی</label>
                <input v-model="form.seo.focusKeyword" type="text" class="form-input" :placeholder="activeLang === 'fa' ? 'کلمه اصلی هدف این مقاله' : 'Focus keyword'" />
              </div>
              <div class="form-group">
                <label class="form-label">Canonical URL (اختیاری)</label>
                <input v-model="form.seo.canonicalUrl" type="text" class="form-input" dir="ltr" placeholder="https://nourmehr.ir/..." />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">تصویر OG (اشتراک‌گذاری)</label>
                <div class="og-row">
                  <img v-if="form.seo.ogImage" :src="getImageUrl(form.seo.ogImage)" class="og-preview" alt="OG" />
                  <button type="button" class="upload-btn" @click="triggerOgUpload">{{ form.seo.ogImage ? 'تغییر' : 'آپلود' }}</button>
                  <button v-if="form.seo.ogImage" type="button" class="upload-btn remove" @click="form.seo.ogImage = ''">حذف</button>
                  <input type="file" ref="ogInput" accept="image/*" style="display:none" @change="uploadOgImage" />
                </div>
                <p v-if="!form.seo.ogImage && form.image" class="hint">خالی = از تصویر شاخص استفاده می‌شود</p>
              </div>
              <div class="form-group">
                <label class="form-label noindex-toggle">
                  <input type="checkbox" v-model="form.seo.noIndex" />
                  خروج از ایندکس گوگل (noindex)
                </label>
                <p class="hint">با فعال‌کردن این گزینه موتورهای جستجو این مقاله را ایندکس نمی‌کنند.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ستون تنظیمات انتشار -->
      <aside class="editor-aside">
        <div class="panel glass">
          <h2 class="panel-title">📤 انتشار</h2>
          <div class="form-group">
            <label class="form-label">وضعیت</label>
            <select v-model="form.status" class="form-select">
              <option value="draft">پیش‌نویس</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
              <option value="published">منتشرشده</option>
              <option value="archived">آرشیو</option>
            </select>
          </div>
          <div v-if="form.status === 'scheduled'" class="form-group">
            <label class="form-label">تاریخ و ساعت انتشار</label>
            <input v-model="publishAtLocal" type="datetime-local" class="form-input" />
          </div>
          <div v-if="form.publishedAt && form.status === 'published'" class="published-info">
            منتشرشده: {{ formatDate(form.publishedAt) }}
          </div>
          <label class="check-row">
            <input type="checkbox" v-model="form.featured" />
            ⭐ مقاله ویژه (نمایش در صفحه اصلی)
          </label>
        </div>

        <div class="panel glass">
          <h2 class="panel-title">🗂 دسته‌بندی و تگ</h2>
          <div class="form-group">
            <label class="form-label">دسته‌بندی</label>
            <select v-model="form.category" class="form-select">
              <option :value="null">بدون دسته‌بندی</option>
              <option v-for="cat in categories" :key="cat._id" :value="cat._id">{{ cat.name?.fa }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">نوع</label>
            <select v-model="form.type" class="form-select">
              <option value="news">خبر</option>
              <option value="event">رویداد</option>
              <option value="article">مقاله</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">تگ‌ها (Enter برای افزودن)</label>
            <div class="tags-editor">
              <span v-for="(tag, i) in form.tags" :key="i" class="tag-pill">
                {{ tag.fa || tag.en }}
                <button type="button" @click="form.tags.splice(i, 1)">✕</button>
              </span>
              <input v-model="tagInput" type="text" class="form-input tag-input" dir="rtl" :placeholder="form.tags.length ? '' : 'مثلاً: فیروزه‌کوبی'" @keydown.enter.prevent="addTag" />
            </div>
          </div>
        </div>

        <div class="panel glass">
          <h2 class="panel-title">🖼 تصویر شاخص</h2>
          <div class="upload-area" @click="$refs.imageInput.click()">
            <input type="file" ref="imageInput" accept="image/*" style="display:none" @change="uploadFeaturedImage" />
            <span v-if="!form.image && !uploadingImage">کلیک برای انتخاب تصویر</span>
            <span v-else-if="uploadingImage">در حال آپلود...</span>
            <img v-else :src="getImageUrl(form.image)" alt="تصویر شاخص" class="preview-img" />
          </div>
          <div class="form-group" v-if="form.image" style="margin-top: 12px;">
            <label class="form-label">متن جایگزین تصویر (Alt)</label>
            <input v-if="activeLang === 'fa'" v-model="form.imageAlt.fa" type="text" class="form-input" dir="rtl" placeholder="توضیح تصویر برای سئو" />
            <input v-else v-model="form.imageAlt.en" type="text" class="form-input" dir="ltr" placeholder="Image alt text" />
          </div>
        </div>

        <div class="panel glass">
          <h2 class="panel-title">🔗 آدرس (Slug)</h2>
          <div class="slug-row">
            <input v-model="form.slug" type="text" class="form-input" dir="ltr" placeholder="auto" />
            <button type="button" class="upload-btn" @click="autoSlug" title="ساخت خودکار">⟳</button>
          </div>
          <p class="hint">{{ slugPreview }}</p>
          <div v-if="isEdit" class="form-group" style="margin-top: 10px;">
            <label class="form-label">نویسنده</label>
            <input v-model="form.authorName" type="text" class="form-input" dir="rtl" />
          </div>
        </div>
      </aside>
    </div>
  </div>
  <div v-else class="loading-state">
    <div class="spinner"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import api from '../../services/api'
import {
  adminGetBlog, adminCreateBlog, adminUpdateBlog, adminGetCategories
} from '../../services/blogApi'
import { getImageUrl } from '../../utils/imageUrl'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const loaded = ref(false)
const saving = ref(false)
const activeLang = ref('fa')
const categories = ref([])
const uploadingImage = ref(false)
const tagInput = ref('')

const blankForm = () => ({
  _id: null,
  title: { fa: '', en: '' },
  slug: '',
  excerpt: { fa: '', en: '' },
  content: { fa: '', en: '' },
  image: '',
  imageAlt: { fa: '', en: '' },
  type: 'news',
  category: null,
  tags: [],
  status: 'draft',
  publishedAt: null,
  featured: false,
  viewsCount: 0,
  authorName: '',
  seo: {
    title: { fa: '', en: '' },
    description: { fa: '', en: '' },
    keywords: { fa: '', en: '' },
    canonicalUrl: '',
    ogImage: '',
    noIndex: false,
    focusKeyword: ''
  }
})

const form = reactive(blankForm())
const publishAtLocal = ref('')

/* ------------------------------ ویرایشگرها ------------------------------ */
const faEditor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({ link: { openOnClick: false } }),
    ImageExtension,
    Placeholder.configure({ placeholder: 'محتوای کامل فارسی...' })
  ],
  editorProps: { attributes: { class: 'tiptap-content', dir: 'rtl' } },
  onUpdate: ({ editor }) => { form.content.fa = editor.getHTML() }
})

const enEditor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({ link: { openOnClick: false } }),
    ImageExtension,
    Placeholder.configure({ placeholder: 'Full English content...' })
  ],
  editorProps: { attributes: { class: 'tiptap-content', dir: 'ltr' } },
  onUpdate: ({ editor }) => { form.content.en = editor.getHTML() }
})

const activeEditor = computed(() => (activeLang.value === 'fa' ? faEditor.value : enEditor.value))

const wordCount = computed(() => {
  const html = activeLang.value === 'fa' ? form.content.fa : form.content.en
  const text = String(html || '').replace(/<[^>]*>/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
})

const toolbarButtons = computed(() => {
  const ed = activeEditor.value
  if (!ed) return []
  return [
    { label: 'B', title: 'بولد', action: () => ed.chain().focus().toggleBold().run(), isActive: () => ed.isActive('bold') },
    { label: 'I', title: 'ایتالیک', action: () => ed.chain().focus().toggleItalic().run(), isActive: () => ed.isActive('italic') },
    { label: 'S', title: 'خط‌خورده', action: () => ed.chain().focus().toggleStrike().run(), isActive: () => ed.isActive('strike') },
    { label: 'H2', title: 'عنوان ۲', action: () => ed.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => ed.isActive('heading', { level: 2 }) },
    { label: 'H3', title: 'عنوان ۳', action: () => ed.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => ed.isActive('heading', { level: 3 }) },
    { label: '•', title: 'لیست نقطه‌ای', action: () => ed.chain().focus().toggleBulletList().run(), isActive: () => ed.isActive('bulletList') },
    { label: '۱.', title: 'لیست شماره‌دار', action: () => ed.chain().focus().toggleOrderedList().run(), isActive: () => ed.isActive('orderedList') },
    { label: '❝', title: 'نقل‌قول', action: () => ed.chain().focus().toggleBlockquote().run(), isActive: () => ed.isActive('blockquote') },
    { label: '―', title: 'خط جداکننده', action: () => ed.chain().focus().setHorizontalRule().run() }
  ]
})

const setLink = () => {
  const ed = activeEditor.value
  if (!ed) return
  const url = window.prompt('آدرس لینک:', ed.getAttributes('link').href || 'https://')
  if (url === null) return
  if (url === '') return ed.chain().focus().unsetLink().run()
  ed.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
}

const imgInput = ref(null)
const triggerImageUpload = () => imgInput.value?.click()

const uploadEditorImage = async (e) => {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await api.post('/admin/blogs/upload-image', fd)
    if (res.data?.success && res.data.filePath) {
      activeEditor.value?.chain().focus().setImage({ src: res.data.filePath, alt: file.name }).run()
    }
  } catch (err) {
    alert('خطا در آپلود تصویر: ' + (err.response?.data?.message || err.message))
  }
}

/* -------------------------------- سئو -------------------------------- */
const setSeo = (field, value) => {
  form.seo[field][activeLang.value] = value
}

const seoTitleLen = computed(() => (activeLang.value === 'fa' ? form.seo.title.fa : form.seo.title.en).length)
const seoDescLen = computed(() => (activeLang.value === 'fa' ? form.seo.description.fa : form.seo.description.en).length)

const googlePreview = computed(() => {
  const lang = activeLang.value
  const title = (lang === 'fa' ? form.seo.title.fa : form.seo.title.en) || (lang === 'fa' ? form.title.fa : form.title.en) || 'عنوان مقاله'
  const desc = (lang === 'fa' ? form.seo.description.fa : form.seo.description.en)
    || (lang === 'fa' ? form.excerpt.fa : form.excerpt.en)
    || 'توضیحات متا در این قسمت نمایش داده می‌شود...'
  const slug = form.slug || (lang === 'fa' ? form.title.fa : form.title.en).replace(/\s+/g, '-') || 'post'
  return {
    url: `nourmehr.ir/${lang}/news/› ${String(slug).toLowerCase().slice(0, 60)}`,
    title: `${title} | نورمهر`,
    description: desc.length > 160 ? desc.slice(0, 157) + '…' : desc
  }
})

const ogInput = ref(null)
const triggerOgUpload = () => ogInput.value?.click()
const uploadOgImage = async (e) => {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  uploadingImage.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await api.post('/admin/blogs/upload-image', fd)
    if (res.data?.success && res.data.filePath) form.seo.ogImage = res.data.filePath
  } catch (err) {
    alert('خطا در آپلود: ' + (err.response?.data?.message || err.message))
  } finally {
    uploadingImage.value = false
  }
}

/* ------------------------------ تصویر شاخص ------------------------------ */
const uploadFeaturedImage = async (e) => {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  uploadingImage.value = true
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await api.post('/admin/blogs/upload-image', fd)
    if (res.data?.success && res.data.filePath) {
      form.image = res.data.filePath
    } else {
      throw new Error('آپلود ناموفق بود')
    }
  } catch (err) {
    alert('خطا در آپلود تصویر: ' + (err.response?.data?.message || err.message))
  } finally {
    uploadingImage.value = false
  }
}

/* -------------------------------- تگ‌ها -------------------------------- */
const addTag = () => {
  const name = tagInput.value.trim()
  if (!name) return
  if (!form.tags.some(t => (t.fa || t.en) === name)) {
    form.tags.push({ fa: name, en: '' })
  }
  tagInput.value = ''
}

/* ------------------------------ slug و ذخیره ------------------------------ */
const autoSlug = () => {
  const base = activeLang.value === 'fa' ? form.title.fa : form.title.en
  form.slug = `${String(base).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u0600-\u06FF-]/g, '')}`.replace(/-+/g, '-')
}

const slugPreview = computed(() => `nourmehr.ir/${activeLang.value}/news/${(form.slug || '...').toLowerCase()}`)

const formatDate = (d) => {
  try { return new Date(d).toLocaleDateString('fa-IR') } catch { return '' }
}

const goBack = () => router.push('/admin/blogs')

const save = async (silent = false) => {
  if (!form.title.fa) {
    return alert('عنوان فارسی الزامی است')
  }
  saving.value = true
  try {
    const payload = { ...form }
    payload.publishedAt = publishAtLocal.value ? new Date(publishAtLocal.value).toISOString() : form.publishedAt
    if (!payload.slug) autoSlug()

    if (isEdit.value) {
      const res = await adminUpdateBlog(form._id, payload)
      if (!res?.success) throw new Error(res?.message || 'خطا در ویرایش')
    } else {
      const res = await adminCreateBlog(payload)
      if (!res?.success) throw new Error(res?.message || 'خطا در ایجاد مقاله')
      form._id = res.data._id
      router.replace(`/admin/blogs/${res.data._id}/edit`)
    }
    if (!silent) alert('ذخیره شد ✓')
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}

const load = async () => {
  try {
    const catRes = await adminGetCategories()
    if (catRes?.success) categories.value = catRes.data

    if (isEdit.value) {
      const res = await adminGetBlog(route.params.id)
      if (!res?.success) throw new Error('مقاله یافت نشد')
      const b = res.data
      Object.assign(form, {
        ...blankForm(),
        ...b,
        title: { fa: b.title?.fa || '', en: b.title?.en || '' },
        excerpt: { fa: b.excerpt?.fa || '', en: b.excerpt?.en || '' },
        content: { fa: b.content?.fa || '', en: b.content?.en || '' },
        imageAlt: { fa: b.imageAlt?.fa || '', en: b.imageAlt?.en || '' },
        category: b.category?._id || b.category || null,
        tags: (b.tags || []).map(t => ({ slug: t.slug, fa: t.fa, en: t.en })),
        seo: {
          ...blankForm().seo,
          ...(b.seo || {}),
          title: { fa: b.seo?.title?.fa || '', en: b.seo?.title?.en || '' },
          description: { fa: b.seo?.description?.fa || '', en: b.seo?.description?.en || '' },
          keywords: { fa: b.seo?.keywords?.fa || '', en: b.seo?.keywords?.en || '' }
        }
      })
      if (form.status === 'scheduled' && form.publishedAt) {
        publishAtLocal.value = new Date(form.publishedAt).toISOString().slice(0, 16)
      }
      faEditor.value?.commands.setContent(form.content.fa || '')
      enEditor.value?.commands.setContent(form.content.en || '')
    }
  } catch (err) {
    alert(err.message)
    goBack()
  } finally {
    loaded.value = true
  }
}

// هشدار خروج با تغییرات ذخیره‌نشده
const beforeUnload = (e) => {
  if (wordCount.value > 0 || form.title.fa) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => {
  load()
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

watch(faEditor, (ed) => { if (ed && form.content.fa) ed.commands.setContent(form.content.fa) })
watch(enEditor, (ed) => { if (ed && form.content.en) ed.commands.setContent(form.content.en) })
</script>

<style scoped>
.blog-editor { max-width: 1280px; margin: 0 auto; }
.editor-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.header-right { display: flex; align-items: center; gap: 16px; }
.header-right h1 { font-size: 1.3rem; margin: 0; }
.back-btn { padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; font-family: inherit; }
.back-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
.header-actions { display: flex; align-items: center; gap: 12px; }
.views-chip { font-size: 0.85rem; opacity: 0.7; }
.save-btn { padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; font-family: inherit; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.editor-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
.editor-main, .editor-aside { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.lang-tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 4px; width: fit-content; }
.lang-tab { padding: 8px 22px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.lang-tab.active { background: rgba(197,160,89,0.2); color: #facc6b; font-weight: 600; }

.panel { border-radius: 18px; padding: 22px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.07); }
.panel-title { font-size: 1rem; margin: 0 0 16px; }

.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.form-label { font-size: 0.85rem; opacity: 0.7; }
.label-row { display: flex; justify-content: space-between; align-items: center; }
.form-input, .form-select, .form-textarea {
  padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem;
  font-family: inherit; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box;
}
.form-input:focus, .form-select:focus { border-color: rgba(197,160,89,0.5); }
.form-select option { background: #0a0d14; color: #fff; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* TipTap */
.toolbar { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-bottom: none; border-radius: 10px 10px 0 0; }
.tool-btn { min-width: 32px; height: 32px; padding: 0 8px; border-radius: 7px; border: none; background: transparent; color: rgba(255,255,255,0.75); cursor: pointer; font-size: 0.85rem; font-weight: 700; font-family: inherit; }
.tool-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
.tool-btn.active { background: rgba(197,160,89,0.25); color: #facc6b; }
.tool-sep { width: 1px; background: rgba(255,255,255,0.1); margin: 4px 4px; }
.tiptap-wrap { border: 1px solid rgba(255,255,255,0.08); border-radius: 0 0 10px 10px; background: rgba(255,255,255,0.02); }
.tiptap-wrap :deep(.tiptap-content) { min-height: 320px; padding: 16px 18px; outline: none; font-size: 0.98rem; line-height: 2; }
.tiptap-wrap :deep(.tiptap-content p.is-editor-empty:first-child)::before { content: attr(data-placeholder); opacity: 0.35; float: left; height: 0; pointer-events: none; }
.tiptap-wrap :deep(.tiptap-content img) { max-width: 100%; border-radius: 10px; }
.tiptap-wrap :deep(.tiptap-content h2) { font-size: 1.4rem; }
.tiptap-wrap :deep(.tiptap-content h3) { font-size: 1.15rem; }
.tiptap-wrap :deep(.tiptap-content blockquote) { border-inline-start: 3px solid #c5a059; padding-inline-start: 14px; opacity: 0.85; }
.tiptap-wrap :deep(.tiptap-content a) { color: #60a5fa; }
.word-count { font-size: 0.78rem; opacity: 0.5; }

/* سئو */
.google-preview { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px; background: #fff; color: #1a0dab; direction: ltr; text-align: left; }
.gp-url { font-size: 0.78rem; color: #202124; opacity: 0.8; margin-bottom: 2px; }
.gp-title { font-size: 1.05rem; margin-bottom: 4px; }
.gp-desc { font-size: 0.85rem; color: #4d5156; }
.counter-wrap { position: relative; }
.char-counter { position: absolute; top: -20px; inset-inline-end: 0; font-size: 0.72rem; opacity: 0.6; }
.char-counter.warn { color: #ef4444; opacity: 1; }
.hint { font-size: 0.75rem; opacity: 0.45; margin: 6px 0 0; }
.noindex-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.noindex-toggle input { width: 16px; height: 16px; accent-color: #c5a059; }
.og-row { display: flex; align-items: center; gap: 10px; }
.og-preview { width: 80px; height: 48px; object-fit: cover; border-radius: 8px; }
.upload-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(197,160,89,0.4); background: transparent; color: #facc6b; cursor: pointer; font-family: inherit; font-size: 0.82rem; }
.upload-btn.remove { border-color: rgba(239,68,68,0.4); color: #ef4444; }

/* انتشار */
.check-row { display: flex; align-items: center; gap: 10px; font-size: 0.88rem; cursor: pointer; margin-top: 6px; }
.check-row input { accent-color: #c5a059; width: 16px; height: 16px; }
.published-info { font-size: 0.8rem; opacity: 0.6; margin-top: 4px; }

/* تگ‌ها */
.tags-editor { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: rgba(255,255,255,0.04); }
.tag-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(197,160,89,0.18); color: #facc6b; font-size: 0.8rem; }
.tag-pill button { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.7; }
.tag-pill button:hover { opacity: 1; }
.tag-input { flex: 1; min-width: 120px; border: none !important; background: transparent !important; padding: 4px !important; }

/* تصویر */
.upload-area { border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
.upload-area:hover { border-color: rgba(197,160,89,0.6); }
.preview-img { max-width: 100%; max-height: 160px; object-fit: contain; border-radius: 8px; }

.slug-row { display: flex; gap: 8px; }

.loading-state { display: flex; justify-content: center; padding: 80px; }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .editor-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
