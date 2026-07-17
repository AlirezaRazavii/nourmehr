<template>
  <section class="news-page">
    <div class="container">
      <div class="page-header">
        <h1>{{ $t('news_title') }}</h1>
        <p>{{ $t('news_subtitle') }}</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ $t('loading') }}</span>
      </div>

      <div v-else-if="blogs.length" class="news-grid">
        <article v-for="blog in blogs" :key="blog._id" class="news-card glass" @click="goToBlog(blog.slug)">
          <div class="news-img" v-if="blog.image">
            <img :src="getImageUrl(blog.image)" :alt="getLocalizedText(blog.title)" />
          </div>
          <div class="news-body">
            <span class="news-type">{{ getTypeLabel(blog.type) }}</span>
            <h3>{{ getLocalizedText(blog.title) }}</h3>
            <p>{{ getLocalizedText(blog.excerpt) }}</p>
            <div class="news-footer">
              <span class="news-date">{{ formatDate(blog.createdAt) }}</span>
              <span class="news-read-more">{{ $t('news_read_more') }} →</span>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📰</div>
        <p>{{ $t('news_empty') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getBlogs } from '../services/blogApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, te, locale } = useI18n()
const router = useRouter()
const blogs = ref([])
const loading = ref(true)

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || value.en || ''
  return ''
}

const getTypeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  if (te(key)) return t(key)
  return te('news_type_general') ? t('news_type_general') : ''
}

const formatDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}

const goToBlog = (slug) => {
  router.push({ name: 'NewsDetails', params: { lang: locale.value, slug } })
}

onMounted(async () => {
  try {
    const res = await getBlogs()
    if (res.success) blogs.value = res.data
  } catch (e) {
    console.error('Error fetching blogs:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.news-page { min-height: 100vh; padding: 120px 40px 80px; background: #050814; color: #fff; }
.container { max-width: 1200px; margin: 0 auto; }
.page-header { text-align: center; margin-bottom: 50px; }
.page-header h1 { font-size: 2.5rem; margin: 0 0 10px; background: linear-gradient(135deg, #fff, #c5a059); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.page-header p { opacity: 0.7; font-size: 1.1rem; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.news-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
.news-card { border-radius: 20px; overflow: hidden; background: rgba(5, 8, 20, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.3s ease; }
.news-card:hover { transform: translateY(-6px); border-color: rgba(197, 160, 89, 0.4); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.news-img { height: 200px; width: 100%; overflow: hidden; }
.news-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.news-card:hover .news-img img { transform: scale(1.05); }
.news-body { padding: 24px; }
.news-type { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-size: 0.75rem; margin-bottom: 12px; }
.news-body h3 { font-size: 1.2rem; margin: 0 0 10px; line-height: 1.4; }
.news-body p { font-size: 0.9rem; opacity: 0.7; line-height: 1.7; margin: 0 0 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.news-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
.news-date { font-size: 0.8rem; opacity: 0.5; }
.news-read-more { font-size: 0.85rem; color: #2bbf9e; font-weight: 600; }

.empty-state { text-align: center; padding: 80px; }
.empty-icon { font-size: 4rem; margin-bottom: 16px; }

@media (max-width: 768px) {
  .news-page { padding: 100px 20px 60px; }
  .news-grid { grid-template-columns: 1fr; }
}
</style>
