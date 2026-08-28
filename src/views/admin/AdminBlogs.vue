<template>
  <div class="admin-blogs">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت اخبار و مقالات</h1>
        <p class="page-subtitle">ایجاد، ویرایش، زمان‌بندی و سئوی مقالات</p>
      </div>
      <div class="header-actions">
        <button class="secondary-btn" @click="showCategoriesModal = true">دسته‌بندی‌ها</button>
        <button class="create-btn" @click="goNew">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          مقاله جدید
        </button>
      </div>
    </div>

    <!-- آمار -->
    <div class="stats-row" v-if="stats">
      <div class="stat-card glass"><span class="stat-num">{{ stats.published }}</span><span class="stat-label">منتشرشده</span></div>
      <div class="stat-card glass"><span class="stat-num">{{ stats.drafts }}</span><span class="stat-label">پیش‌نویس</span></div>
      <div class="stat-card glass"><span class="stat-num">{{ stats.scheduled }}</span><span class="stat-label">زمان‌بندی‌شده</span></div>
      <div class="stat-card glass"><span class="stat-num" :class="{ alert: stats.pendingComments > 0 }">{{ stats.pendingComments }}</span><span class="stat-label">نظر در انتظار</span></div>
      <div class="stat-card glass"><span class="stat-num">{{ formatCount(stats.totalViews) }}</span><span class="stat-label">کل بازدید</span></div>
    </div>

    <!-- تب‌ها -->
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">مقالات</button>
      <button class="tab" :class="{ active: tab === 'comments' }" @click="tab = 'comments'">
        نظرات <span v-if="stats?.pendingComments" class="tab-badge">{{ stats.pendingComments }}</span>
      </button>
    </div>

    <!-- ============================ تب مقالات ============================ -->
    <template v-if="tab === 'posts'">
      <div class="toolbar-row">
        <div class="search-box">
          <input v-model.trim="search" type="text" placeholder="جستجوی عنوان..." @input="debouncedFetch" />
        </div>
        <select v-model="statusFilter" class="filter-select" @change="fetchBlogs">
          <option value="">همه وضعیت‌ها</option>
          <option value="published">منتشرشده</option>
          <option value="draft">پیش‌نویس</option>
          <option value="scheduled">زمان‌بندی‌شده</option>
          <option value="archived">آرشیو</option>
        </select>
        <div v-if="selectedIds.length" class="bulk-row">
          <span class="bulk-label">{{ selectedIds.length }} انتخاب‌شده:</span>
          <button class="bulk-btn publish" @click="bulk('publish')">انتشار</button>
          <button class="bulk-btn" @click="bulk('unpublish')">پیش‌نویس</button>
          <button class="bulk-btn" @click="bulk('feature')">ویژه</button>
          <button class="bulk-btn danger" @click="bulk('delete')">حذف</button>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>در حال بارگذاری...</span>
      </div>

      <div v-else class="blogs-list">
        <table class="blogs-table glass">
          <thead>
            <tr>
              <th><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
              <th>تصویر</th>
              <th>عنوان</th>
              <th>دسته</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
              <th>بازدید</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="blog in blogs" :key="blog._id" :class="{ scheduled: blog.status === 'scheduled' }">
              <td><input type="checkbox" :value="blog._id" v-model="selectedIds" /></td>
              <td>
                <img v-if="blog.image" :src="getImageUrl(blog.image)" :alt="blog.title?.fa" class="blog-thumb" />
                <div v-else class="blog-thumb-placeholder">📰</div>
              </td>
              <td>
                <strong>{{ blog.title?.fa }}</strong>
                <span v-if="blog.title?.en" class="en-title">{{ blog.title.en }}</span>
                <div class="post-flags">
                  <span v-if="blog.featured" class="flag">⭐ ویژه</span>
                  <span v-if="blog.seo?.noIndex" class="flag warn">noindex</span>
                </div>
              </td>
              <td>{{ blog.category?.name?.fa || '—' }}</td>
              <td><span class="status-badge" :class="blog.status">{{ statusLabel(blog.status) }}</span></td>
              <td class="date-cell">{{ formatDate(blog.publishedAt || blog.createdAt) }}</td>
              <td>{{ formatCount(blog.viewsCount) }}</td>
              <td>
                <div class="actions">
                  <button class="action-btn edit" @click="goEdit(blog._id)">ویرایش</button>
                  <a v-if="blog.status === 'published'" class="action-btn view" :href="`/fa/news/${blog.slug}`" target="_blank">مشاهده</a>
                  <button class="action-btn delete" @click="deleteBlog(blog._id)">حذف</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="blogs.length === 0" class="empty-state">هنوز مقاله‌ای ایجاد نشده است.</div>

        <nav v-if="meta.pages > 1" class="pagination">
          <button class="page-btn" :disabled="meta.page <= 1" @click="goPage(meta.page - 1)">‹</button>
          <span class="page-info">صفحه {{ meta.page }} از {{ meta.pages }}</span>
          <button class="page-btn" :disabled="meta.page >= meta.pages" @click="goPage(meta.page + 1)">›</button>
        </nav>
      </div>
    </template>

    <!-- ============================ تب نظرات ============================ -->
    <template v-else>
      <div class="toolbar-row">
        <select v-model="commentFilter" class="filter-select" @change="fetchComments">
          <option value="pending">در انتظار تایید</option>
          <option value="approved">تاییدشده</option>
          <option value="all">همه</option>
        </select>
      </div>

      <div v-if="commentsLoading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="comments-list">
        <div v-for="c in comments" :key="c._id" class="comment-row glass">
          <div class="comment-main">
            <div class="comment-head">
              <strong>{{ c.name }}</strong>
              <span class="comment-blog">روی «{{ c.blog?.title?.fa || '—' }}»</span>
              <time>{{ formatDate(c.createdAt) }}</time>
            </div>
            <p>{{ c.comment }}</p>
          </div>
          <div class="comment-actions">
            <button v-if="!c.isApproved" class="action-btn edit" @click="approve(c._id)">تایید</button>
            <button v-else class="action-btn" @click="unapprove(c._id)">لغو تایید</button>
            <button class="action-btn delete" @click="removeComment(c._id)">حذف</button>
          </div>
        </div>
        <div v-if="comments.length === 0" class="empty-state">نظری در این وضعیت وجود ندارد.</div>
      </div>
    </template>

    <!-- ========================= مودال دسته‌بندی‌ها ========================= -->
    <Transition name="modal">
      <div v-if="showCategoriesModal" class="modal-overlay" @click.self="showCategoriesModal = false">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>مدیریت دسته‌بندی‌ها</h2>
            <button class="modal-close" @click="showCategoriesModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="cat-form">
              <input v-model="catForm.fa" type="text" class="form-input" dir="rtl" placeholder="نام فارسی" />
              <input v-model="catForm.en" type="text" class="form-input" dir="ltr" placeholder="English name" />
              <button class="create-btn" @click="saveCategory">{{ catEditingId ? 'ذخیره' : 'افزودن' }}</button>
              <button v-if="catEditingId" class="cancel-btn" @click="resetCatForm">انصراف</button>
            </div>
            <div class="cats-list">
              <div v-for="cat in categories" :key="cat._id" class="cat-row">
                <div>
                  <strong>{{ cat.name?.fa }}</strong>
                  <span v-if="cat.name?.en" class="en-title">{{ cat.name.en }}</span>
                  <span class="cat-slug">/{{ cat.slug }}</span>
                </div>
                <div class="actions">
                  <button class="action-btn edit" @click="startEditCat(cat)">ویرایش</button>
                  <button class="action-btn delete" @click="deleteCat(cat._id)">حذف</button>
                </div>
              </div>
              <div v-if="categories.length === 0" class="empty-state">دسته‌بندی‌ای وجود ندارد.</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  adminGetBlogs, adminDeleteBlog, adminBulkBlogs, adminBlogStats,
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminGetComments, adminApproveComment, adminUnapproveComment, adminDeleteComment
} from '../../services/blogApi'
import { getImageUrl } from '../../utils/imageUrl'

const router = useRouter()

const tab = ref('posts')
const blogs = ref([])
const loading = ref(true)
const commentsLoading = ref(false)
const stats = ref(null)
const search = ref('')
const statusFilter = ref('')
const selectedIds = ref([])
const meta = reactive({ page: 1, limit: 50, total: 0, pages: 1 })

const comments = ref([])
const commentFilter = ref('pending')

const categories = ref([])
const showCategoriesModal = ref(false)
const catEditingId = ref(null)
const catForm = reactive({ fa: '', en: '' })

const allSelected = computed(() => blogs.value.length > 0 && selectedIds.value.length === blogs.value.length)
const toggleAll = () => {
  selectedIds.value = allSelected.value ? [] : blogs.value.map(b => b._id)
}

const statusLabel = (s) => ({
  published: 'منتشرشده', draft: 'پیش‌نویس', scheduled: 'زمان‌بندی', archived: 'آرشیو'
}[s] || s)

const formatDate = (d) => {
  try { return new Date(d).toLocaleDateString('fa-IR') } catch { return '' }
}
const formatCount = (n) => {
  const num = Number(n) || 0
  return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num)
}

let searchTimer = null
const debouncedFetch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { meta.page = 1; fetchBlogs() }, 350)
}

const fetchBlogs = async () => {
  loading.value = true
  try {
    const params = { page: meta.page, limit: meta.limit }
    if (statusFilter.value) params.status = statusFilter.value
    if (search.value) params.search = search.value
    const res = await adminGetBlogs(params)
    if (res?.success) {
      blogs.value = res.data
      Object.assign(meta, res.meta || {})
    }
    selectedIds.value = []
  } catch (err) {
    console.error('Error fetching blogs:', err)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await adminBlogStats()
    if (res?.success) stats.value = res.data
  } catch (e) { console.error(e) }
}

const fetchComments = async () => {
  commentsLoading.value = true
  try {
    const res = await adminGetComments({ status: commentFilter.value, limit: 100 })
    if (res?.success) comments.value = res.data
  } catch (e) { console.error(e) } finally {
    commentsLoading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await adminGetCategories()
    if (res?.success) categories.value = res.data
  } catch (e) { console.error(e) }
}

const goPage = (p) => { meta.page = p; fetchBlogs() }
const goNew = () => router.push('/admin/blogs/new')
const goEdit = (id) => router.push(`/admin/blogs/${id}/edit`)

const deleteBlog = async (id) => {
  if (!confirm('آیا از حذف این مقاله اطمینان دارید؟')) return
  try {
    const res = await adminDeleteBlog(id)
    if (!res?.success) throw new Error(res?.message || 'خطا در حذف')
    await fetchBlogs()
    await fetchStats()
  } catch (err) {
    alert(err.message)
  }
}

const bulk = async (action) => {
  const label = { publish: 'انتشار', unpublish: 'پیش‌نویس', feature: 'ویژه', delete: 'حذف' }[action]
  if (!confirm(`${label} ${selectedIds.value.length} مقاله انتخاب‌شده؟`)) return
  try {
    const res = await adminBulkBlogs(action, selectedIds.value)
    if (!res?.success) throw new Error(res?.message || 'خطا')
    await Promise.all([fetchBlogs(), fetchStats()])
  } catch (err) {
    alert(err.message)
  }
}

const approve = async (id) => {
  try { await adminApproveComment(id); await Promise.all([fetchComments(), fetchStats()]) } catch (e) { alert(e.message) }
}
const unapprove = async (id) => {
  try { await adminUnapproveComment(id); await Promise.all([fetchComments(), fetchStats()]) } catch (e) { alert(e.message) }
}
const removeComment = async (id) => {
  if (!confirm('حذف این نظر؟')) return
  try { await adminDeleteComment(id); await Promise.all([fetchComments(), fetchStats()]) } catch (e) { alert(e.message) }
}

/* ---------------------------- دسته‌بندی‌ها ---------------------------- */
const saveCategory = async () => {
  if (!catForm.fa) return alert('نام فارسی الزامی است')
  try {
    const payload = { name: { fa: catForm.fa, en: catForm.en } }
    if (catEditingId.value) {
      await adminUpdateCategory(catEditingId.value, payload)
    } else {
      await adminCreateCategory(payload)
    }
    resetCatForm()
    await fetchCategories()
  } catch (err) {
    alert(err.response?.data?.message || err.message)
  }
}
const startEditCat = (cat) => {
  catEditingId.value = cat._id
  catForm.fa = cat.name?.fa || ''
  catForm.en = cat.name?.en || ''
}
const resetCatForm = () => {
  catEditingId.value = null
  catForm.fa = ''
  catForm.en = ''
}
const deleteCat = async (id) => {
  if (!confirm('حذف این دسته‌بندی؟ مقالات آن به «بدون دسته» منتقل می‌شوند.')) return
  try {
    await adminDeleteCategory(id)
    await fetchCategories()
  } catch (err) {
    alert(err.response?.data?.message || err.message)
  }
}

watch(tab, (t) => {
  if (t === 'comments') fetchComments()
})
watch(showCategoriesModal, (open) => {
  if (open) fetchCategories()
})

onMounted(() => {
  fetchBlogs()
  fetchStats()
})
</script>

<style scoped>
.admin-blogs { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }
.header-actions { display: flex; gap: 10px; }

.create-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-family: inherit;
}
.secondary-btn { padding: 10px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.8); cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.secondary-btn:hover { border-color: rgba(197,160,89,0.5); }

/* آمار */
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.stat-card { border-radius: 16px; padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); }
.stat-num { font-size: 1.5rem; font-weight: 800; color: #facc6b; }
.stat-num.alert { color: #ef4444; }
.stat-label { font-size: 0.8rem; opacity: 0.55; }

/* تب‌ها */
.tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 4px; width: fit-content; }
.tab { padding: 9px 24px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; font-family: inherit; font-size: 0.9rem; }
.tab.active { background: rgba(197,160,89,0.2); color: #facc6b; font-weight: 600; }
.tab-badge { display: inline-block; min-width: 20px; padding: 1px 6px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 0.72rem; margin-inline-start: 6px; }

/* تولبار */
.toolbar-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-box input { padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-family: inherit; outline: none; width: 240px; }
.filter-select { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-family: inherit; outline: none; }
.filter-select option { background: #0a0d14; }
.bulk-row { display: flex; align-items: center; gap: 8px; margin-inline-start: auto; }
.bulk-label { font-size: 0.82rem; opacity: 0.6; }
.bulk-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(197,160,89,0.4); background: transparent; color: #facc6b; cursor: pointer; font-family: inherit; font-size: 0.82rem; }
.bulk-btn.danger { border-color: rgba(239,68,68,0.4); color: #ef4444; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.blogs-table { width: 100%; border-collapse: collapse; border-radius: 20px; overflow: hidden; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); }
.blogs-table th, .blogs-table td { padding: 14px 18px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04); }
.blogs-table th { font-size: 0.85rem; color: rgba(255,255,255,0.6); font-weight: 600; }
.blogs-table tr:last-child td { border-bottom: none; }
.blogs-table input[type="checkbox"] { accent-color: #c5a059; width: 16px; height: 16px; cursor: pointer; }
tr.scheduled td { background: rgba(245,158,11,0.04); }

.blog-thumb { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; }
.blog-thumb-placeholder { width: 50px; height: 50px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.en-title { display: block; font-size: 0.8rem; color: rgba(255,255,255,0.4); }
.post-flags { display: flex; gap: 6px; margin-top: 4px; }
.flag { font-size: 0.7rem; color: #facc6b; }
.flag.warn { color: #ef4444; }

.status-badge { padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; white-space: nowrap; }
.status-badge.published { background: rgba(34,197,94,0.15); color: #4ade80; }
.status-badge.draft { background: rgba(156,163,175,0.15); color: #9ca3af; }
.status-badge.scheduled { background: rgba(245,158,11,0.15); color: #fbbf24; }
.status-badge.archived { background: rgba(127,29,29,0.25); color: #f87171; }

.date-cell { white-space: nowrap; font-size: 0.82rem; }

.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.action-btn { padding: 6px 12px; border-radius: 8px; border: none; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; font-family: inherit; text-decoration: none; }
.action-btn.edit { background: rgba(197,160,89,0.15); color: #facc6b; }
.action-btn.edit:hover { background: rgba(197,160,89,0.25); }
.action-btn.view { background: rgba(59,130,246,0.15); color: #60a5fa; }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover { background: rgba(239,68,68,0.25); }

.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); }

.pagination { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 20px 0; }
.page-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: #fff; cursor: pointer; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 0.85rem; opacity: 0.6; }

/* نظرات */
.comments-list { display: flex; flex-direction: column; gap: 12px; }
.comment-row { border-radius: 16px; padding: 18px 22px; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.comment-main { flex: 1; min-width: 0; }
.comment-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.comment-blog { font-size: 0.8rem; color: #facc6b; opacity: 0.8; }
.comment-head time { font-size: 0.78rem; opacity: 0.45; }
.comment-main p { margin: 0; font-size: 0.92rem; line-height: 1.8; opacity: 0.85; }
.comment-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* مودال دسته‌بندی */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 560px; max-height: 80vh; overflow-y: auto; border-radius: 20px; background: rgba(8,10,18,0.95); border: 1px solid rgba(255,255,255,0.08); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.modal-header h2 { font-size: 1.1rem; margin: 0; }
.modal-close { width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; }
.modal-body { padding: 22px; }
.cat-form { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
.cat-form .form-input { flex: 1; min-width: 140px; }
.cancel-btn { padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; font-family: inherit; }
.cats-list { display: flex; flex-direction: column; gap: 8px; }
.cat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.cat-slug { font-size: 0.75rem; opacity: 0.4; margin-inline-start: 8px; direction: ltr; display: inline-block; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }

@media (max-width: 768px) {
  .blogs-table { font-size: 0.8rem; }
  .blogs-table th, .blogs-table td { padding: 10px 8px; }
  .comment-row { flex-direction: column; align-items: stretch; }
}
</style>
