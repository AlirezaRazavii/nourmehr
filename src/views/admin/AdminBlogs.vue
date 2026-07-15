<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import { getImageUrl } from '../../utils/imageUrl'

const blogs = ref([])
const loading = ref(true)
const showModal = ref(false)
const editingBlog = ref(null)
const uploading = ref(false)

const blankForm = () => ({
  _id: null,
  title: { fa: '', en: '' },
  slug: '',
  excerpt: { fa: '', en: '' },
  content: { fa: '', en: '' },
  image: '',
  type: 'news',
  status: 'active'
})

const form = ref(blankForm())

const fetchBlogs = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/blogs')
    if (res.data?.success) blogs.value = res.data.data
  } catch (err) {
    console.error('Error fetching blogs:', err)
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingBlog.value = null
  form.value = blankForm()
  showModal.value = true
}

const openEdit = (blog) => {
  editingBlog.value = blog
  form.value = { ...blankForm(), ...blog }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleUploadImage = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('image', file)
    // استفاده از مسیر آپلود عمومی (اگر دارید) یا مسیر آپلود محصولات
    const res = await api.post('/images/upload', formData) 
    if (res.data?.success && res.data.filePath) {
      form.value.image = res.data.filePath
    } else {
      throw new Error('آپلود ناموفق بود')
    }
  } catch (err) {
    alert('خطا در آپلود تصویر: ' + (err.response?.data?.message || err.message))
  } finally {
    uploading.value = false
  }
}

const saveBlog = async () => {
  try {
    if (!form.value.title.fa) {
      return alert('عنوان فارسی الزامی است')
    }
    
    const payload = { ...form.value }
    if (!payload.slug) {
      payload.slug = `${payload.title.fa.replace(/\s+/g, '-').replace(/[^\u0600-\u06FFa-z0-9-]/g, '')}-${Date.now()}`
    }

    if (editingBlog.value) {
      const res = await api.put(`/admin/blogs/${editingBlog.value._id}`, payload)
      if (!res.data?.success) throw new Error(res.data?.message || 'خطا در ویرایش')
    } else {
      const res = await api.post('/admin/blogs', payload)
      if (!res.data?.success) throw new Error(res.data?.message || 'خطا در ایجاد مقاله')
    }
    
    showModal.value = false
    await fetchBlogs()
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message))
  }
}

const deleteBlog = async (id) => {
  if (!confirm('آیا از حذف این مقاله اطمینان دارید؟')) return
  try {
    const res = await api.delete(`/admin/blogs/${id}`)
    if (!res.data?.success) throw new Error('خطا در حذف')
    blogs.value = blogs.value.filter(b => b._id !== id)
  } catch (err) {
    alert('خطا در حذف: ' + (err.response?.data?.message || err.message))
  }
}

onMounted(fetchBlogs)
</script>

<template>
  <div class="admin-blogs">
    <div class="page-header">
      <div>
        <h1 class="page-title">مدیریت اخبار و مقالات</h1>
        <p class="page-subtitle">ایجاد، ویرایش و حذف مقالات و اطلاعیه‌ها</p>
      </div>
      <button class="create-btn" @click="openCreate">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        مقاله جدید
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="blogs-list">
      <table class="blogs-table glass">
        <thead>
          <tr>
            <th>تصویر</th>
            <th>عنوان</th>
            <th>نوع</th>
            <th>وضعیت</th>
            <th>تاریخ</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="blog in blogs" :key="blog._id">
            <td>
              <img v-if="blog.image" :src="getImageUrl(blog.image)" :alt="blog.title?.fa" class="blog-thumb" />
              <div v-else class="blog-thumb-placeholder">📰</div>
            </td>
            <td>
              <strong>{{ blog.title?.fa }}</strong>
              <span v-if="blog.title?.en" class="en-title">{{ blog.title.en }}</span>
            </td>
            <td>
              <span class="type-badge" :class="blog.type">{{ blog.type }}</span>
            </td>
            <td>
              <span class="status-badge" :class="blog.status">
                {{ blog.status === 'active' ? 'فعال' : 'غیرفعال' }}
              </span>
            </td>
            <td>{{ new Date(blog.createdAt).toLocaleDateString('fa-IR') }}</td>
            <td>
              <div class="actions">
                <button class="action-btn edit" @click="openEdit(blog)">ویرایش</button>
                <button class="action-btn delete" @click="deleteBlog(blog._id)">حذف</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="blogs.length === 0" class="empty-state">
        <span>هنوز مقاله‌ای ایجاد نشده است.</span>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2>{{ editingBlog ? 'ویرایش مقاله' : 'مقاله جدید' }}</h2>
            <button class="modal-close" @click="closeModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <!-- عنوان -->
              <div class="form-group full">
                <label class="form-label">عنوان مقاله <span style="color:#ef4444">*</span></label>
                <div class="lang-inputs">
                  <input v-model="form.title.fa" type="text" class="form-input" placeholder="عنوان فارسی" />
                  <input v-model="form.title.en" type="text" class="form-input" placeholder="English Title" dir="ltr" />
                </div>
              </div>

              <!-- Slug -->
              <div class="form-group">
                <label class="form-label">آدرس URL (slug)</label>
                <input v-model="form.slug" type="text" class="form-input" placeholder="اختیاری - خودکار ساخته می‌شود" dir="ltr" />
              </div>

              <!-- نوع و وضعیت -->
              <div class="form-group">
                <label class="form-label">نوع مقاله</label>
                <select v-model="form.type" class="form-select">
                  <option value="news">خبر</option>
                  <option value="event">رویداد</option>
                  <option value="article">مقاله</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">وضعیت</label>
                <select v-model="form.status" class="form-select">
                  <option value="active">فعال (منتشر شود)</option>
                  <option value="inactive">غیرفعال (پیش‌نویس)</option>
                </select>
              </div>

              <!-- تصویر شاخص -->
              <div class="form-group full">
                <label class="form-label">تصویر شاخص</label>
                <div class="upload-area" @click="$refs.fileInput.click()">
                  <input type="file" ref="fileInput" accept="image/*" style="display:none" @change="handleUploadImage" />
                  <span v-if="!form.image && !uploading">کلیک برای انتخاب تصویر</span>
                  <span v-else-if="uploading">در حال آپلود...</span>
                  <img v-else :src="getImageUrl(form.image)" alt="Preview" class="preview-img" />
                </div>
              </div>

              <!-- خلاصه -->
              <div class="form-group full">
                <label class="form-label">خلاصه مقاله</label>
                <div class="lang-inputs">
                  <input v-model="form.excerpt.fa" type="text" class="form-input" placeholder="خلاصه فارسی" />
                  <input v-model="form.excerpt.en" type="text" class="form-input" placeholder="Short English excerpt" dir="ltr" />
                </div>
              </div>

              <!-- محتوا -->
              <div class="form-group full">
                <label class="form-label">محتوای کامل</label>
                <div class="lang-inputs" style="flex-direction: column;">
                  <textarea v-model="form.content.fa" class="form-input form-textarea" rows="6" placeholder="محتوای کامل فارسی..."></textarea>
                  <textarea v-model="form.content.en" class="form-input form-textarea" rows="6" placeholder="Full English content..." dir="ltr"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" @click="closeModal">انصراف</button>
              <button class="submit-btn" @click="saveBlog">ذخیره</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-blogs { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; opacity: 0.5; margin: 4px 0 0; }

.create-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 20px;
  border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;
}
.create-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: rgba(255,255,255,0.5); }
.spinner { width: 36px; height: 36px; border: 3px solid rgba(197,160,89,0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.blogs-table { width: 100%; border-collapse: collapse; border-radius: 20px; overflow: hidden; background: rgba(5,8,20,0.9); border: 1px solid rgba(255,255,255,0.06); }
.blogs-table th, .blogs-table td { padding: 16px 20px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.04); }
.blogs-table th { font-size: 0.85rem; color: rgba(255,255,255,0.6); font-weight: 600; }
.blogs-table tr:last-child td { border-bottom: none; }

.blog-thumb { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; }
.blog-thumb-placeholder { width: 50px; height: 50px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.en-title { display: block; font-size: 0.8rem; color: rgba(255,255,255,0.4); }

.type-badge { padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; text-transform: capitalize; }
.type-badge.news { background: rgba(59,130,246,0.15); color: #60a5fa; }
.type-badge.event { background: rgba(245,158,11,0.15); color: #fbbf24; }
.type-badge.article { background: rgba(16,185,129,0.15); color: #34d399; }

.status-badge { padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; }
.status-badge.active { background: rgba(34,197,94,0.15); color: #4ade80; }
.status-badge.inactive { background: rgba(156,163,175,0.15); color: #9ca3af; }

.actions { display: flex; gap: 8px; }
.action-btn { padding: 6px 12px; border-radius: 8px; border: none; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
.action-btn.edit { background: rgba(197,160,89,0.15); color: #facc6b; }
.action-btn.edit:hover { background: rgba(197,160,89,0.25); }
.action-btn.delete { background: rgba(239,68,68,0.15); color: #ef4444; }
.action-btn.delete:hover { background: rgba(239,68,68,0.25); }

.empty-state { text-align: center; padding: 60px; color: rgba(255,255,255,0.4); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
.modal-content { width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto; border-radius: 20px; padding: 0; background: rgba(8, 10, 18, 0.95); border: 1px solid rgba(255,255,255,0.08); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; background: rgba(8, 10, 18, 0.98); backdrop-filter: blur(10px); z-index: 10; }
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-close { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; color: #fff; cursor: pointer; transition: all 0.2s; }
.modal-close:hover { background: rgba(255,255,255,0.1); }
.modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 0.85rem; opacity: 0.7; }
.form-input, .form-select {
  padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 0.9rem;
  font-family: inherit; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box;
}
.form-input:focus, .form-select:focus { border-color: rgba(197,160,89,0.5); }
.form-select option { background: #0a0d14; color: #fff; }
.form-textarea { resize: vertical; min-height: 120px; margin-bottom: 8px; }

.lang-inputs { display: flex; gap: 10px; }

.upload-area { border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
.upload-area:hover { border-color: rgba(197,160,89,0.6); }
.preview-img { max-width: 100%; max-height: 150px; object-fit: contain; border-radius: 8px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; background: linear-gradient(to top, rgba(8,10,18,1), transparent); padding-top: 10px; }
.cancel-btn { padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.7); font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
.cancel-btn:hover { background: rgba(255,255,255,0.06); }
.submit-btn { padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(197,160,89,0.5); }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .lang-inputs { flex-direction: column; }
  .blogs-table { font-size: 0.8rem; }
  .blogs-table th, .blogs-table td { padding: 10px; }
}
</style>