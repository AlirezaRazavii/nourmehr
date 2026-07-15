<template>
  <section class="blog-detail-page">
    <div class="container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ $t('loading') }}</span>
      </div>

      <div v-else-if="blog" class="blog-content">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          {{ $t('news_back') }}
        </button>

        <h1>{{ blog.title }}</h1>
        <div class="blog-meta">
          <span class="news-type">{{ $t('news_type_' + blog.type) }}</span>
          <span class="blog-date">{{ formatDate(blog.createdAt) }}</span>
        </div>

        <div class="blog-image" v-if="blog.image">
          <img :src="getImageUrl(blog.image)" :alt="blog.title" />
        </div>

        <div class="blog-text" v-html="blog.content"></div>
      </div>

      <div v-else class="empty-state">
        <p>{{ $t('news_not_found') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getBlogBySlug } from '../services/blogApi'
import { getImageUrl } from '../utils/imageUrl'

const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const blog = ref(null)
const loading = ref(true)

const formatDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}

const goBack = () => router.push({ name: 'News', params: { lang: locale.value } })

const loadBlog = async () => {
  loading.value = true
  try {
    const res = await getBlogBySlug(route.params.slug)
    if (res.success) blog.value = res.data
  } catch (e) {
    console.error('Error fetching blog:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadBlog)
watch(() => route.params.slug, loadBlog)
</script>

<style scoped>
.blog-detail-page { min-height: 100vh; padding: 120px 40px 80px; background: #050814; color: #fff; }
.container { max-width: 800px; margin: 0 auto; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.back-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); background: rgba(15,23,42,0.8); color: #fff; cursor: pointer; margin-bottom: 30px; transition: all 0.2s; }
.back-btn:hover { background: rgba(255,255,255,0.1); }

h1 { font-size: 2.5rem; margin: 0 0 16px; line-height: 1.3; }
.blog-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 30px; }
.news-type { padding: 4px 12px; border-radius: 999px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-size: 0.8rem; }
.blog-date { font-size: 0.9rem; opacity: 0.6; }

.blog-image { width: 100%; height: 400px; border-radius: 20px; overflow: hidden; margin-bottom: 40px; }
.blog-image img { width: 100%; height: 100%; object-fit: cover; }

.blog-text { font-size: 1.05rem; line-height: 2; opacity: 0.9; }
.blog-text :deep(p) { margin-bottom: 1.5em; }
.blog-text :deep(h2) { font-size: 1.5rem; margin: 1.5em 0 0.8em; color: #facc6b; }

.empty-state { text-align: center; padding: 80px; }

@media (max-width: 768px) {
  .blog-detail-page { padding: 100px 20px 60px; }
  h1 { font-size: 1.8rem; }
  .blog-image { height: 250px; }
}
</style>