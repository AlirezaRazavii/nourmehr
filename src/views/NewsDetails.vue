<template>
  <section class="blog-detail-page">
    <div class="container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ $t('loading') }}</span>
      </div>

      <template v-else-if="blog">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          {{ $t('news_back') }}
        </button>

        <nav class="breadcrumb" aria-label="breadcrumb">
          <router-link :to="{ name: 'Home', params: { lang: locale } }">{{ $t('nav_home') }}</router-link>
          <span class="sep">›</span>
          <router-link :to="{ name: 'News', params: { lang: locale } }">{{ $t('news_title') }}</router-link>
          <span class="sep">›</span>
          <span class="current">{{ blog.title }}</span>
        </nav>

        <article class="blog-content">
          <header class="blog-header">
            <div class="blog-meta">
              <span class="news-type">{{ getTypeLabel(blog.type) }}</span>
              <span v-if="blog.category" class="cat-badge">{{ getLocalizedText(blog.category.name) }}</span>
            </div>
            <h1>{{ blog.title }}</h1>
            <div class="blog-stats">
              <span v-if="blog.authorName" class="stat-item">✍️ {{ blog.authorName }}</span>
              <time class="stat-item" :datetime="blog.publishedAt || blog.createdAt">{{ formatDate(blog.publishedAt || blog.createdAt) }}</time>
              <span v-if="blog.readingTime" class="stat-item">⏱ {{ blog.readingTime }} {{ $t('news_min_read') }}</span>
              <span class="stat-item">👁 {{ formatCount(blog.viewsCount) }}</span>
            </div>
          </header>

          <div class="blog-image" v-if="blog.image">
            <img :src="getImageUrl(blog.image)" :alt="blog.imageAlt || blog.title" />
          </div>

          <p v-if="blog.excerpt" class="blog-excerpt">{{ blog.excerpt }}</p>

          <div class="blog-text" v-html="safeContent"></div>

          <div v-if="blog.tags?.length" class="tags-row">
            <button v-for="tag in blog.tags" :key="tag.slug" class="tag-chip" @click="goToTag(tag.slug)"># {{ tag.name }}</button>
          </div>

          <div class="share-row">
            <span class="share-label">{{ $t('news_share') }}:</span>
            <a class="share-btn tg" :href="shareLinks.telegram" target="_blank" rel="noopener noreferrer" :title="$t('news_share_telegram')" aria-label="Telegram">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <a class="share-btn wa" :href="shareLinks.whatsapp" target="_blank" rel="noopener noreferrer" :title="$t('news_share_whatsapp')" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            </a>
            <a class="share-btn tw" :href="shareLinks.twitter" target="_blank" rel="noopener noreferrer" :title="$t('news_share_x')" aria-label="X">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z"/></svg>
            </a>
            <button class="share-btn copy" @click="copyLink" :title="$t('news_share_copy')">{{ copied ? '✓' : '🔗' }}</button>
          </div>
        </article>

        <!-- مقاله قبلی / بعدی -->
        <div v-if="adjacent.prev || adjacent.next" class="adjacent-nav">
          <router-link v-if="adjacent.prev" class="adjacent-card glass" :to="{ name: 'NewsDetails', params: { lang: locale, slug: adjacent.prev.slug } }">
            <span class="adjacent-label">‹ {{ $t('news_prev') }}</span>
            <strong>{{ adjacent.prev.title }}</strong>
          </router-link>
          <div v-else class="adjacent-spacer"></div>
          <router-link v-if="adjacent.next" class="adjacent-card glass next" :to="{ name: 'NewsDetails', params: { lang: locale, slug: adjacent.next.slug } }">
            <span class="adjacent-label">{{ $t('news_next') }} ›</span>
            <strong>{{ adjacent.next.title }}</strong>
          </router-link>
        </div>

        <!-- مقالات مرتبط -->
        <div v-if="related.length" class="related-section">
          <h2>{{ $t('news_related') }}</h2>
          <div class="related-grid">
            <article v-for="rel in related" :key="rel._id" class="related-card glass" @click="goToBlog(rel.slug)">
              <div class="related-img" v-if="rel.image">
                <img :src="getImageUrl(rel.image)" :alt="rel.imageAlt || rel.title" loading="lazy" />
              </div>
              <div class="related-body">
                <h3>{{ rel.title }}</h3>
                <time>{{ formatDate(rel.publishedAt || rel.createdAt) }}</time>
              </div>
            </article>
          </div>
        </div>

        <!-- نظرات -->
        <div class="comments-section" id="comments">
          <h2>{{ $t('news_comments') }} <span class="comments-count">({{ comments.length }})</span></h2>

          <div v-if="!isAuthenticated" class="login-hint glass">
            <p>{{ $t('news_comment_login_required') }}</p>
            <router-link class="login-link" :to="{ name: 'Login', params: { lang: locale }, query: { redirect: route.fullPath } }">{{ $t('login') }} →</router-link>
          </div>

          <form v-else class="comment-form glass" @submit.prevent="submitComment">
            <label>{{ $t('news_comment_placeholder') }}</label>
            <textarea v-model.trim="commentText" rows="4" maxlength="2000" :placeholder="$t('news_comment_input')" required></textarea>
            <div class="comment-form-footer">
              <span class="comment-user">{{ user?.name || user?.email }}</span>
              <button type="submit" class="submit-comment" :disabled="submitting || commentText.length < 3">
                {{ submitting ? $t('loading') : $t('news_comment_submit') }}
              </button>
            </div>
          </form>

          <div v-if="justSubmitted" class="comment-pending glass">✓ {{ $t('news_comment_pending') }}</div>

          <div v-if="comments.length" class="comments-list">
            <div v-for="c in comments" :key="c._id" class="comment glass">
              <div class="comment-head">
                <strong>{{ c.name }}</strong>
                <time>{{ formatDate(c.createdAt) }}</time>
              </div>
              <p>{{ c.comment }}</p>
            </div>
          </div>
          <div v-else class="no-comments">{{ $t('news_no_comments') }}</div>
        </div>
      </template>

      <div v-else class="empty-state">
        <p>{{ loadFailed ? $t('news_error') : $t('news_not_found') }}</p>
        <button class="back-btn retry" @click="goBack">{{ $t('news_back') }}</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import DOMPurify from 'dompurify'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useHead } from '@unhead/vue'
import {
  getBlogBySlug,
  getRelatedBlogs,
  getAdjacentBlogs,
  getBlogComments,
  createBlogComment
} from '../services/blogApi'
import { getImageUrl } from '../utils/imageUrl'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  }
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy')
    node.removeAttribute('srcset')
  }
})

const { t, te, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const blog = ref(null)
const related = ref([])
const adjacent = reactive({ prev: null, next: null })
const comments = ref([])
const loading = ref(true)
const loadFailed = ref(false)

const commentText = ref('')
const submitting = ref(false)
const justSubmitted = ref(false)
const copied = ref(false)

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin

// همان الگوی router.js برای تشخیص احراز هویت
const user = ref(null)
const isAuthenticated = computed(() => {
  try {
    return !!localStorage.getItem('auth_token') && !!user.value
  } catch { return false }
})

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || value.en || ''
  return ''
}

const safeContent = computed(() => {
  const raw = blog.value?.content || ''
  if (!raw) return ''
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p','br','hr','strong','b','em','i','u','s','mark','small',
      'h2','h3','h4','h5','h6',
      'ul','ol','li','blockquote','pre','code',
      'a','img','figure','figcaption',
      'table','thead','tbody','tr','th','td',
      'span','div'
    ],
    ALLOWED_ATTR: ['href','src','alt','title','class','dir','width','height','loading'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i
  })
})

const pageUrl = computed(() => `${SITE_URL}${route.fullPath}`)
const shareLinks = computed(() => {
  const u = encodeURIComponent(pageUrl.value)
  const title = encodeURIComponent(blog.value?.title || '')
  return {
    telegram: `https://t.me/share/url?url=${u}&text=${title}`,
    whatsapp: `https://wa.me/?text=${title}%20${u}`,
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${title}`
  }
})

const seoTitle = computed(() => {
  if (!blog.value) return t('news_title')
  const s = blog.value.seo || {}
  return (locale.value === 'fa' ? (s.title?.fa || s.title?.en) : (s.title?.en || s.title?.fa)) || blog.value.title
})
const seoDescription = computed(() => {
  if (!blog.value) return t('news_subtitle')
  const s = blog.value.seo || {}
  const d = (locale.value === 'fa' ? (s.description?.fa || s.description?.en) : (s.description?.en || s.description?.fa))
    || blog.value.excerpt
    || String(blog.value.content || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 160)
  return d.slice(0, 300)
})

// متاهای سئو + JSON-LD Article
useHead({
  title: () => `${seoTitle.value} | نورمهر`,
  meta: [
    { name: 'description', content: seoDescription },
    { name: 'robots', content: () => blog.value?.seo?.noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:image', content: () => {
      const img = blog.value?.seo?.ogImage || blog.value?.image
      return img ? getImageUrl(img) : ''
    } },
    { property: 'og:url', content: pageUrl },
    { property: 'article:published_time', content: () => blog.value?.publishedAt || blog.value?.createdAt || '' }
  ],
  link: [
    { rel: 'canonical', href: () => blog.value?.seo?.canonicalUrl || pageUrl.value }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => {
        if (!blog.value) return ''
        const b = blog.value
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: String(seoTitle.value).slice(0, 110),
          description: seoDescription.value,
          image: (b.seo?.ogImage || b.image) ? [getImageUrl(b.seo?.ogImage || b.image)] : undefined,
          datePublished: b.publishedAt || b.createdAt,
          dateModified: b.updatedAt || b.publishedAt || b.createdAt,
          inLanguage: locale.value,
          author: { '@type': 'Person', name: b.authorName || 'نورمهر' },
          publisher: { '@type': 'Organization', name: 'نورمهر' },
          mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl.value }
        })
      }
    }
  ]
})

const getTypeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  if (te(key)) return t(key)
  return te('news_type_general') ? t('news_type_general') : ''
}

const formatDate = (d) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}

const formatCount = (n) => {
  const num = Number(n) || 0
  return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num)
}

const loadUser = () => {
  try { user.value = JSON.parse(localStorage.getItem('auth_user') || 'null') } catch { user.value = null }
}

const loadBlog = async () => {
  loading.value = true
  loadFailed.value = false
  justSubmitted.value = false
  try {
    const res = await getBlogBySlug(route.params.slug)
    if (res.success) {
      blog.value = res.data
      window.scrollTo({ top: 0 })
      loadUser()
      loadComments()
      loadRelated()
      loadAdjacent()
    } else {
      loadFailed.value = true
    }
  } catch (e) {
    console.error('Error fetching blog:', e)
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

const loadRelated = async () => {
  try {
    const res = await getRelatedBlogs(route.params.slug)
    if (res.success) related.value = res.data
  } catch (e) { console.error('Error fetching related blogs:', e) }
}

const loadAdjacent = async () => {
  try {
    const res = await getAdjacentBlogs(route.params.slug)
    if (res.success) {
      adjacent.prev = res.data.prev
      adjacent.next = res.data.next
    }
  } catch (e) { console.error('Error fetching adjacent blogs:', e) }
}

const loadComments = async () => {
  try {
    const res = await getBlogComments(route.params.slug)
    if (res.success) comments.value = res.data
  } catch (e) { console.error('Error fetching comments:', e) }
}

const submitComment = async () => {
  if (commentText.value.length < 3) return
  submitting.value = true
  try {
    const res = await createBlogComment(route.params.slug, commentText.value)
    if (res.success) {
      commentText.value = ''
      justSubmitted.value = true
    } else {
      alert(res.message || t('news_comment_error'))
    }
  } catch (e) {
    alert(e.response?.data?.message || t('news_comment_error'))
  } finally {
    submitting.value = false
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
  } catch {
    document.execCommand('copy')
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const goBack = () => router.push({ name: 'News', params: { lang: locale.value } })
const goToBlog = (slug) => router.push({ name: 'NewsDetails', params: { lang: locale.value, slug } })
const goToTag = (slug) => router.push({ name: 'News', params: { lang: locale.value }, query: { tag: slug } })

onMounted(loadBlog)
watch(() => route.params.slug, loadBlog)
</script>

<style scoped>
.blog-detail-page { min-height: 100vh; padding: 120px 40px 80px; background: #050814; color: #fff; }
.container { max-width: 800px; margin: 0 auto; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(197, 160, 89, 0.2); border-top-color: #c5a059; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.back-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.2); background: rgba(15,23,42,0.8); color: #fff; cursor: pointer; margin-bottom: 24px; transition: all 0.2s; font-family: inherit; }
.back-btn:hover { background: rgba(255,255,255,0.1); }

.breadcrumb { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.85rem; opacity: 0.7; margin-bottom: 24px; }
.breadcrumb a { color: #facc6b; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .sep { opacity: 0.5; }
.breadcrumb .current { opacity: 0.9; }

.blog-header { margin-bottom: 28px; }
.blog-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.news-type { padding: 4px 12px; border-radius: 999px; background: rgba(197, 160, 89, 0.15); color: #facc6b; font-size: 0.8rem; }
.cat-badge { padding: 4px 12px; border-radius: 999px; background: rgba(59,130,246,0.15); color: #60a5fa; font-size: 0.8rem; }

h1 { font-size: 2.3rem; margin: 0 0 16px; line-height: 1.35; }
.blog-stats { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; font-size: 0.85rem; opacity: 0.65; }

.blog-image { width: 100%; max-height: 440px; border-radius: 20px; overflow: hidden; margin-bottom: 28px; }
.blog-image img { width: 100%; height: 100%; object-fit: cover; }

.blog-excerpt { font-size: 1.1rem; line-height: 1.9; padding: 18px 22px; border-inline-start: 3px solid #c5a059; background: rgba(197,160,89,0.06); border-radius: 12px; opacity: 0.9; }

.blog-text { font-size: 1.05rem; line-height: 2; opacity: 0.92; }
.blog-text :deep(p) { margin-bottom: 1.4em; }
.blog-text :deep(h2) { font-size: 1.5rem; margin: 1.5em 0 0.8em; color: #facc6b; }
.blog-text :deep(h3) { font-size: 1.25rem; margin: 1.3em 0 0.6em; }
.blog-text :deep(img) { max-width: 100%; border-radius: 12px; }
.blog-text :deep(blockquote) { border-inline-start: 3px solid #c5a059; padding: 12px 20px; margin: 1.4em 0; background: rgba(197,160,89,0.06); border-radius: 10px; }
.blog-text :deep(a) { color: #60a5fa; }
.blog-text :deep(table) { width: 100%; border-collapse: collapse; margin: 1.4em 0; }
.blog-text :deep(th), .blog-text :deep(td) { border: 1px solid rgba(255,255,255,0.12); padding: 10px 14px; text-align: start; }
.blog-text :deep(pre) { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; overflow-x: auto; direction: ltr; }

.tags-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 32px 0 8px; }
.tag-chip { padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.7); font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.tag-chip:hover { border-color: #c5a059; color: #facc6b; }

.share-row { display: flex; align-items: center; gap: 10px; margin: 24px 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); }
.share-label { font-size: 0.88rem; opacity: 0.65; margin-inline-end: 4px; }
.share-btn { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(255,255,255,0.12); color: #fff; text-decoration: none; cursor: pointer; background: transparent; transition: all 0.2s; }
.share-btn svg { display: block; }
.share-btn:hover { transform: translateY(-2px); }
.share-btn.tg:hover { background: #229ed9; border-color: #229ed9; }
.share-btn.wa:hover { background: #25d366; border-color: #25d366; }
.share-btn.tw:hover { background: #000; border-color: #fff; }
.share-btn.copy:hover { background: #c5a059; border-color: #c5a059; color: #000; }
.share-btn.copy.ok { background: #22c55e; border-color: #22c55e; color: #fff; }

.adjacent-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 36px 0; }
.adjacent-card { padding: 18px 22px; border-radius: 16px; text-decoration: none; color: #fff; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s; }
.adjacent-card:hover { border-color: rgba(197,160,89,0.4); }
.adjacent-card.next { text-align: end; }
.adjacent-label { font-size: 0.78rem; color: #facc6b; }
.adjacent-card strong { font-size: 0.95rem; line-height: 1.5; }
.adjacent-spacer { }

.related-section { margin-top: 48px; }
.related-section h2, .comments-section h2 { font-size: 1.4rem; margin: 0 0 20px; }
.related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.related-card { border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.25s; }
.related-card:hover { transform: translateY(-4px); border-color: rgba(197,160,89,0.4); }
.related-img { height: 120px; overflow: hidden; }
.related-img img { width: 100%; height: 100%; object-fit: cover; }
.related-body { padding: 14px 16px; }
.related-body h3 { font-size: 0.95rem; margin: 0 0 8px; line-height: 1.5; }
.related-body time { font-size: 0.75rem; opacity: 0.5; }

.comments-section { margin-top: 48px; }
.comments-count { opacity: 0.5; font-size: 1rem; }
.login-hint { padding: 20px 24px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.login-link { color: #facc6b; text-decoration: none; font-weight: 600; }
.comment-form { padding: 20px 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 12px; }
.comment-form label { font-size: 0.88rem; opacity: 0.75; }
.comment-form textarea { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; color: #fff; font-family: inherit; font-size: 0.95rem; resize: vertical; outline: none; }
.comment-form textarea:focus { border-color: rgba(197,160,89,0.5); }
.comment-form-footer { display: flex; justify-content: space-between; align-items: center; }
.comment-user { font-size: 0.85rem; opacity: 0.6; }
.submit-comment { padding: 10px 26px; border-radius: 10px; border: none; background: linear-gradient(135deg, #c5a059, #8f7032); color: #000; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.submit-comment:disabled { opacity: 0.5; cursor: not-allowed; }
.comment-pending { margin-top: 12px; padding: 14px 20px; border-radius: 12px; border: 1px solid rgba(34,197,94,0.3); background: rgba(34,197,94,0.08); color: #4ade80; font-size: 0.9rem; }

.comments-list { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
.comment { padding: 16px 20px; border-radius: 14px; }
.comment-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.comment-head time { font-size: 0.78rem; opacity: 0.5; }
.comment p { margin: 0; font-size: 0.95rem; line-height: 1.8; opacity: 0.85; }
.no-comments { text-align: center; padding: 32px; opacity: 0.5; font-size: 0.9rem; }

.empty-state { text-align: center; padding: 80px; }
.empty-state .back-btn { margin-top: 16px; margin-bottom: 0; }

@media (max-width: 768px) {
  .blog-detail-page { padding: 100px 20px 60px; }
  h1 { font-size: 1.7rem; }
  .blog-image { max-height: 250px; }
  .adjacent-nav { grid-template-columns: 1fr; }
}
</style>
