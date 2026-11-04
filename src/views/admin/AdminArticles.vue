<template>
  <div class="articles-admin">
    <!-- هدر و آمار -->
    <div class="page-head">
      <div>
        <h1>مدیریت مقالات <span class="badge-new">جدید</span></h1>
        <p>سیستم رسانه‌ای جدید — اسلاگ مستقل هر زبان، نسخه‌ها، محصولات مرتبط</p>
      </div>
      <div class="head-actions">
        <button class="btn ghost" @click="$router.push('/admin/blogs')">← ماژول قدیمی</button>
        <button class="btn primary" @click="$router.push('/admin/articles/new')">+ مقاله جدید</button>
      </div>
    </div>

    <!-- کارت‌های آمار -->
    <div class="stats-row">
      <div class="stat-card"><span class="stat-num">{{ stats.published }}</span><span class="stat-label">منتشرشده</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.drafts }}</span><span class="stat-label">پیش‌نویس</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.review }}</span><span class="stat-label">در انتظار بازبینی</span></div>
      <div class="stat-card"><span class="stat-num">{{ stats.scheduled }}</span><span class="stat-label">زمان‌بندی‌شده</span></div>
      <div class="stat-card"><span class="stat-num">{{ fmtNum(stats.totalViews) }}</span><span class="stat-label">مجموع بازدید</span></div>
    </div>

    <!-- فیلترها -->
    <div class="filter-row">
      <div class="search">
        <input v-model.trim="search" type="text" placeholder="جستجوی عنوان…" @keyup.enter="applyFilter" />
      </div>
      <div class="tabs">
        <button v-for="st in statusTabs" :key="st.value" class="tab" :class="{ active: status === st.value }" @click="setStatus(st.value)">{{ st.label }}</button>
      </div>
    </div>

    <!-- عملیات گروهی -->
    <div v-if="selected.length" class="bulk-bar">
      <span>{{ selected.length }} مورد انتخاب شد</span>
      <button class="btn small" @click="bulk('publish')">انتشار</button>
      <button class="btn small" @click="bulk('review')">ارسال به بازبینی</button>
      <button class="btn small" @click="bulk('draft')">پیش‌نویس</button>
      <button class="btn small" @click="bulk('archive')">آرشیو</button>
      <button class="btn small danger" @click="bulk('delete')">حذف</button>
    </div>

    <!-- جدول -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
            <th>عنوان</th>
            <th>وضعیت</th>
            <th>اسلاگ fa / en</th>
            <th>بازدید</th>
            <th>به‌روزرسانی</th>
            <th style="width:130px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" style="text-align:center;padding:40px">در حال بارگذاری…</td>
          </tr>
          <tr v-else-if="!articles.length">
            <td colspan="7" style="text-align:center;padding:40px;opacity:.6">
              مقاله‌ای نیست. <router-link to="/admin/articles/new" style="color:#facc6b">اولین مقاله را بنویسید ←</router-link>
            </td>
          </tr>
          <tr v-for="a in articles" :key="a._id">
            <td><input type="checkbox" :value="a._id" v-model="selected" /></td>
            <td>
              <div class="title-cell">
                <span class="t">{{ a.title?.fa || a.title?.en }}</span>
                <span class="sub">{{ a.title?.en || '—' }}</span>
              </div>
            </td>
            <td><span class="status" :class="a.status">{{ statusLabel(a.status) }}</span></td>
            <td class="slug-cell">
              <code dir="ltr">{{ a.slug?.fa }}</code>
              <code dir="ltr" class="sub">{{ a.slug?.en }}</code>
            </td>
            <td>{{ fmtNum(a.viewsCount) }}</td>
            <td>{{ fmtDate(a.updatedAt) }}</td>
            <td class="row-actions">
              <button title="مشاهده" @click="view(a)">👁</button>
              <button title="ویرایش" @click="$router.push(`/admin/articles/${a._id}/edit`)">✏️</button>
              <button title="حذف" class="danger" @click="remove(a)">🗑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- صفحه‌بندی -->
    <div v-if="meta.pages > 1" class="pagination">
      <button class="btn small" :disabled="meta.page <= 1" @click="goPage(meta.page - 1)">‹ قبلی</button>
      <span>صفحه {{ meta.page }} از {{ meta.pages }}</span>
      <button class="btn small" :disabled="meta.page >= meta.pages" @click="goPage(meta.page + 1)">بعدی ›</button>
    </div>
  </div>
</template>

<script setup>
/**
 * AdminArticles — لیست مدیریت مقالات ماژول جدید
 * جایگزین AdminBlogs پس از سوییچ نهایی.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { adminGetArticles, adminBulkArticles, adminDeleteArticle, adminArticleStats } from '../../services/articleApi'

const articles = ref([])
const loading = ref(true)
const selected = ref([])
const search = ref('')
const status = ref('')
const stats = reactive({ published: 0, drafts: 0, review: 0, scheduled: 0, totalViews: 0 })
const meta = reactive({ page: 1, limit: 50, total: 0, pages: 1 })

const statusTabs = [
  { value: '', label: 'همه' },
  { value: 'published', label: 'منتشرشده' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'review', label: 'بازبینی' },
  { value: 'scheduled', label: 'زمان‌بندی' },
  { value: 'archived', label: 'آرشیو' }
]

const statusLabel = (s) => ({ draft: 'پیش‌نویس', review: 'بازبینی', scheduled: 'زمان‌بندی', published: 'منتشرشده', archived: 'آرشیو' }[s] || s)
const fmtNum = (n) => { const x = Number(n) || 0; return x >= 1000 ? (x / 1000).toFixed(1) + 'k' : String(x) }
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('fa-IR') } catch { return '' } }

const allSelected = computed(() => articles.value.length > 0 && selected.value.length === articles.value.length)

const load = async () => {
  loading.value = true
  try {
    const params = { page: meta.page, limit: meta.limit }
    if (status.value) params.status = status.value
    if (search.value) params.search = search.value
    const res = await adminGetArticles(params)
    if (res.success) {
      articles.value = res.data
      Object.assign(meta, res.meta)
    }
  } finally { loading.value = false }
}

const loadStats = async () => {
  try {
    const res = await adminArticleStats()
    if (res.success) Object.assign(stats, res.data)
  } catch { /* بی‌خطر */ }
}

const setStatus = (v) => { status.value = v; meta.page = 1; load() }
const applyFilter = () => { meta.page = 1; load() }
const goPage = (p) => { meta.page = p; load() }
const toggleAll = () => {
  selected.value = allSelected.value ? [] : articles.value.map(a => a._id)
}

const bulk = async (action) => {
  if (action === 'delete' && !confirm(`حذف ${selected.value.length} مقاله؟ این عمل بازگشت‌پذیر نیست.`)) return
  const res = await adminBulkArticles(action, selected.value)
  if (res.success) {
    selected.value = []
    load(); loadStats()
  }
}

const remove = async (a) => {
  if (!confirm(`حذف «${a.title?.fa}»؟`)) return
  const res = await adminDeleteArticle(a._id)
  if (res.success) { load(); loadStats() }
}

const view = (a) => {
  window.open(`/fa/news/${a.slug?.fa || a.slug?.en}`, '_blank')
}

onMounted(() => { load(); loadStats() })
</script>

<style scoped>
.articles-admin { padding: 24px; max-width: 1200px; margin: 0 auto; color: #fff; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.page-head h1 { margin: 0 0 6px; font-size: 1.5rem; }
.page-head p { margin: 0; opacity: .6; font-size: .85rem; }
.badge-new { background: rgba(43,191,158,.15); color: #2bbf9e; font-size: .65rem; padding: 3px 10px; border-radius: 999px; vertical-align: middle; }
.head-actions { display: flex; gap: 10px; }

.btn { padding: 9px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #fff; font: inherit; font-size: .85rem; cursor: pointer; transition: all .2s; }
.btn:hover { border-color: rgba(197,160,89,.5); }
.btn.primary { background: linear-gradient(135deg, #c5a059, #8f7032); border: none; color: #000; font-weight: 700; }
.btn.small { padding: 6px 14px; font-size: .78rem; }
.btn.danger { border-color: rgba(239,68,68,.4); color: #f87171; }
.btn:disabled { opacity: .4; cursor: not-allowed; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 22px; }
.stat-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.stat-num { font-size: 1.5rem; font-weight: 800; color: #facc6b; }
.stat-label { font-size: .78rem; opacity: .6; }

.filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.search input { padding: 10px 16px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); color: #fff; font: inherit; min-width: 240px; outline: none; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab { padding: 7px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.1); background: transparent; color: rgba(255,255,255,.7); font: inherit; font-size: .8rem; cursor: pointer; }
.tab.active { background: rgba(197,160,89,.18); border-color: #c5a059; color: #facc6b; }

.bulk-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; margin-bottom: 14px; border-radius: 12px; background: rgba(197,160,89,.08); border: 1px solid rgba(197,160,89,.3); font-size: .85rem; }

.table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); }
table { width: 100%; border-collapse: collapse; font-size: .85rem; min-width: 760px; }
th { text-align: start; padding: 12px 14px; background: rgba(255,255,255,.04); font-size: .75rem; opacity: .7; }
td { padding: 12px 14px; border-top: 1px solid rgba(255,255,255,.06); vertical-align: middle; }
.title-cell .t { display: block; font-weight: 600; line-height: 1.5; }
.title-cell .sub, .slug-cell .sub { display: block; font-size: .75rem; opacity: .5; }
.slug-cell code { font-size: .72rem; color: #60a5fa; background: rgba(96,165,250,.08); padding: 2px 8px; border-radius: 6px; }
.status { padding: 4px 12px; border-radius: 999px; font-size: .72rem; }
.status.published { background: rgba(34,197,94,.12); color: #4ade80; }
.status.draft { background: rgba(255,255,255,.08); color: rgba(255,255,255,.6); }
.status.review { background: rgba(96,165,250,.12); color: #60a5fa; }
.status.scheduled { background: rgba(197,160,89,.15); color: #facc6b; }
.status.archived { background: rgba(239,68,68,.1); color: #f87171; }
.row-actions { white-space: nowrap; }
.row-actions button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px; opacity: .7; }
.row-actions button:hover { opacity: 1; }
.row-actions .danger:hover { color: #f87171; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 18px; font-size: .85rem; }
</style>
