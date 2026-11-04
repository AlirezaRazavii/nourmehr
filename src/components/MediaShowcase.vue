<script setup>
/**
 * MediaShowcase — بخش «رسانه نورمهر» در صفحه اصلی (جایگزین Announcements قدیمی)
 *
 * دیزاین «مجله لوکس»: ۱ کارت سینمایی بزرگ (مقاله منتخب شما = تیک «نمایش در صفحه اصلی»)
 * + ۳ کارت کناری جمع‌وجور + نوار CTA طلایی «ورود به رسانه» که کاربر را به هاب می‌برد.
 *
 * - داده از /api/articles/home (سیستم جدید Article — نه Blog قدیمی)
 * - اگر مقاله‌ای منتشر نشده باشد کل سکشن رندر نمی‌شود (صفحه اصلی تمیز می‌ماند)
 * - خودکفا: پالت خودش را دارد و مستقل از media.css است (صفحه اصلی همیشه تاریک است)
 * - RTL/LTR با logical properties
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getHomeArticles } from '../services/articleApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, te, locale } = useI18n()
const router = useRouter()

const articles = ref([])
const loading = ref(true)
const revealed = ref(false)
const sectionEl = ref(null)
let observer = null

/* اولین مقاله = هیرو (API بر اساس featured مرتب کرده) */
const hero = computed(() => articles.value[0] || null)
const sideArticles = computed(() => articles.value.slice(1, 4))

/* ------------------------------ کمکی‌ها ------------------------------ */
const loc = (v) => (!v ? '' : typeof v === 'string' ? v : (v[locale.value] || v.fa || v.en || ''))
const typeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  return te(key) ? t(key) : ''
}
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}

/* srcset از variants پایپ‌لاین sharp */
const heroSrc = (a) => {
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 1200)?.url || vs[vs.length - 1].url) : getImageUrl(a.image)
}
const heroSrcset = (a) => (a.imageVariants || []).map(v => `${getImageUrl(v.url)} ${v.w}w`).join(', ')
const thumbSrc = (a) => {
  const vs = a.imageVariants || []
  return vs.length ? getImageUrl(vs.find(v => v.w === 480)?.url || vs[0].url) : getImageUrl(a.image)
}

const open = (a) => {
  if (a?.slug) router.push({ name: 'ArticleView', params: { lang: locale.value, slug: a.slug } })
}
const enterMedia = () => router.push({ name: 'NewsCenter', params: { lang: locale.value } })

onMounted(async () => {
  try {
    const res = await getHomeArticles()
    if (res?.success && Array.isArray(res.data)) articles.value = res.data
  } catch (e) {
    console.error('Error fetching home articles:', e)
  } finally {
    loading.value = false
  }

  if (typeof IntersectionObserver === 'undefined') {
    revealed.value = true
    return
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        revealed.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.08 }
  )
  if (sectionEl.value) observer.observe(sectionEl.value)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section v-if="loading || hero" ref="sectionEl" class="ms" :class="{ revealed }">

    <div class="ms-glow ms-glow-1" aria-hidden="true"></div>
    <div class="ms-glow ms-glow-2" aria-hidden="true"></div>

    <div class="ms-inner">
      <!-- سربرگ سکشن -->
      <div class="ms-head">
        <div class="ms-head-text">
          <p class="ms-eyebrow">{{ $t('media_eyebrow') }}</p>
          <h2 class="ms-heading">
            <span class="ms-word" style="--d:0">{{ $t('media_heading_1') }}</span>
            <span class="ms-word gold" style="--d:1">{{ $t('media_heading_2') }}</span>
          </h2>
        </div>
        <button class="ms-viewall" type="button" @click="enterMedia">
          <span>{{ $t('media_view_all') }}</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- اسکلتون -->
      <div v-if="loading" class="ms-skeleton" role="status" aria-busy="true">
        <div class="ms-skel ms-skel-hero"></div>
        <div class="ms-skel ms-skel-side"></div>
      </div>

      <template v-else>
        <!-- گرید مجله‌ای: هیرو + کارت‌های کناری -->
        <div class="ms-grid">
          <article
            class="ms-hero"
            :style="{ '--d': 0 }"
            tabindex="0"
            role="link"
            :aria-label="loc(hero.title)"
            @click="open(hero)"
            @keydown.enter.prevent="open(hero)"
          >
            <img
              v-if="hero.image"
              class="ms-hero-img"
              :src="heroSrc(hero)"
              :srcset="heroSrcset(hero)"
              sizes="(max-width:768px) 92vw, (max-width:1100px) 62vw, 760px"
              :alt="loc(hero.imageAlt) || loc(hero.title)"
              fetchpriority="high"
            />
            <div v-else class="ms-hero-img ms-hero-nopimg" aria-hidden="true"></div>

            <div class="ms-hero-overlay">
              <div class="ms-badges">
                <span class="ms-badge" :class="hero.type">{{ typeLabel(hero.type) }}</span>
                <span v-if="hero.category" class="ms-badge cat">{{ hero.category.name }}</span>
              </div>
              <h3 class="ms-hero-title">{{ loc(hero.title) }}</h3>
              <p v-if="loc(hero.excerpt)" class="ms-hero-excerpt">{{ loc(hero.excerpt) }}</p>
              <div class="ms-hero-meta">
                <time :datetime="hero.publishedAt || hero.createdAt">{{ fmtDate(hero.publishedAt || hero.createdAt) }}</time>
                <span v-if="hero.readingTime" class="sep" aria-hidden="true">·</span>
                <span v-if="hero.readingTime">{{ hero.readingTime }} {{ $t('news_min_read') }}</span>
                <span class="ms-hero-cta">
                  {{ $t('news_read_more') }}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                    stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </article>

          <!-- کارت‌های کناری -->
          <div class="ms-side">
            <article
              v-for="(a, i) in sideArticles"
              :key="a._id"
              class="ms-card"
              :style="{ '--d': i + 1 }"
              tabindex="0"
              role="link"
              :aria-label="loc(a.title)"
              @click="open(a)"
              @keydown.enter.prevent="open(a)"
            >
              <div class="ms-card-img">
                <img v-if="a.image" :src="thumbSrc(a)" :alt="loc(a.imageAlt) || loc(a.title)" loading="lazy" />
              </div>
              <div class="ms-card-body">
                <span class="ms-badge sm" :class="a.type">{{ typeLabel(a.type) }}</span>
                <h4 class="ms-card-title">{{ loc(a.title) }}</h4>
                <div class="ms-card-foot">
                  <time :datetime="a.publishedAt || a.createdAt">{{ fmtDate(a.publishedAt || a.createdAt) }}</time>
                  <span class="ms-card-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- نوار CTA طلایی: ورود به رسانه -->
        <button class="ms-cta" type="button" :style="{ '--d': 4 }" @click="enterMedia">
          <span class="ms-cta-text">
            <b>{{ $t('media_enter_cta') }}</b>
            <i>{{ $t('media_enter_sub') }}</i>
          </span>
          <span class="ms-cta-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.ms {
  --ms-gold: #c5a059;
  --ms-gold-light: #f0cc7a;
  --ms-gold-dim: rgba(197, 160, 89, 0.14);
  --ms-line: rgba(255, 255, 255, 0.09);
  --ms-line-gold: rgba(197, 160, 89, 0.3);
  --ms-text: #eceef2;
  --ms-muted: rgba(236, 238, 242, 0.55);
  --ms-surface: rgba(255, 255, 255, 0.03);
  --ms-blue: #7cb2f8;
  --ms-teal: #52d4b6;

  position: relative;
  max-width: 1240px;
  margin: 0 auto;
  padding: 84px 24px 96px;
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
  color: var(--ms-text);
  overflow: hidden;
  box-sizing: border-box;
}

/* هاله‌های نرم پس‌زمینه */
.ms-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 2s ease;
  z-index: 0;
}
.ms.revealed .ms-glow { opacity: 1; }
.ms-glow-1 {
  width: 420px; height: 420px;
  top: -120px; inset-inline-start: -140px;
  background: radial-gradient(circle, rgba(197, 160, 89, 0.07) 0%, transparent 70%);
}
.ms-glow-2 {
  width: 360px; height: 360px;
  bottom: -100px; inset-inline-end: -120px;
  background: radial-gradient(circle, rgba(197, 160, 89, 0.05) 0%, transparent 70%);
}

.ms-inner { position: relative; z-index: 1; }

/* ------------------------------- سربرگ ------------------------------- */
.ms-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 34px;
}
.ms-eyebrow {
  margin: 0 0 10px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--ms-gold);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s;
}
.ms.revealed .ms-eyebrow { opacity: 1; transform: none; }

.ms-heading {
  margin: 0;
  font-size: clamp(1.7rem, 3.6vw, 2.6rem);
  font-weight: 800;
  line-height: 1.25;
}
.ms-word {
  display: inline-block;
  margin-inline-end: 0.35em;
  opacity: 0;
  transform: translateY(40%);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(0.25s + var(--d) * 0.1s);
}
.ms.revealed .ms-word { opacity: 1; transform: none; }
.ms-word.gold {
  background: linear-gradient(100deg, var(--ms-gold), var(--ms-gold-light));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--ms-gold);
}

.ms-viewall {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  border: 1px solid var(--ms-line-gold);
  background: transparent;
  color: var(--ms-text);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.3s, border-color 0.3s, color 0.3s, transform 0.3s;
}
.ms-viewall svg { transition: transform 0.3s; }
.ms-viewall:hover {
  background: var(--ms-gold);
  border-color: var(--ms-gold);
  color: #0a0d14;
  transform: translateY(-2px);
}
html[dir='rtl'] .ms-viewall svg { transform: rotate(180deg); }
html[dir='rtl'] .ms-viewall:hover svg { transform: rotate(180deg) translateX(3px); }

/* ------------------------------- اسکلتون ------------------------------- */
.ms-skeleton {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
}
.ms-skel {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: ms-shimmer 1.5s infinite;
  border-radius: 20px;
  border: 1px solid var(--ms-line);
}
.ms-skel-hero { min-height: 420px; }
.ms-skel-side { min-height: 420px; }
@keyframes ms-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ---------------------- گرید مجله‌ای: هیرو + کناری ---------------------- */
.ms-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
}

/* انیمیشن ورود پله‌ای کارت‌ها */
.ms-grid > *,
.ms-cta {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(0.35s + var(--d, 0) * 0.09s);
}
.ms.revealed .ms-grid > *,
.ms.revealed .ms-cta { opacity: 1; transform: none; }

/* ------------------------------ هیروی سینمایی ------------------------------ */
.ms-hero {
  position: relative;
  min-height: 430px;
  border-radius: 22px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--ms-line);
  outline-offset: 3px;
  display: flex;
  align-items: flex-end;
  transition: border-color 0.35s, box-shadow 0.35s, transform 0.35s;
}
.ms-hero:hover {
  border-color: var(--ms-line-gold);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  transform: translateY(-4px);
}
.ms-hero:focus-visible { outline: 2px solid var(--ms-gold); }
.ms-hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.ms-hero:hover .ms-hero-img { transform: scale(1.05); }
.ms-hero-nopimg { background: linear-gradient(135deg, #171b26, #0d1017); }

.ms-hero-overlay {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 30px 32px 28px;
  background: linear-gradient(to top, rgba(6, 8, 13, 0.94) 0%, rgba(6, 8, 13, 0.66) 46%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ms-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.ms-hero-title {
  margin: 0;
  font-size: clamp(1.3rem, 2.6vw, 1.9rem);
  font-weight: 800;
  line-height: 1.45;
  color: #fff;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.45);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ms-hero-excerpt {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.85;
  color: rgba(236, 238, 242, 0.78);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ms-hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.8rem;
  color: rgba(236, 238, 242, 0.6);
}
.ms-hero-meta .sep { opacity: 0.5; }
.ms-hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-inline-start: auto;
  color: var(--ms-gold-light);
  font-weight: 600;
  font-size: 0.84rem;
  transition: gap 0.25s;
}
.ms-hero:hover .ms-hero-cta { gap: 11px; }
html[dir='rtl'] .ms-hero-cta svg,
html[dir='rtl'] .ms-card-arrow svg { transform: rotate(180deg); }

/* ------------------------------ کارت‌های کناری ------------------------------ */
.ms-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ms-card {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 14px;
  align-items: center;
  flex: 1;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--ms-line);
  background: var(--ms-surface);
  cursor: pointer;
  outline-offset: 3px;
  transition: border-color 0.3s, background-color 0.3s, transform 0.3s;
}
.ms-card:hover {
  border-color: var(--ms-line-gold);
  background: rgba(197, 160, 89, 0.05);
  transform: translateY(-3px);
}
.ms-card:focus-visible { outline: 2px solid var(--ms-gold); }
.ms-card-img {
  width: 108px;
  height: 92px;
  border-radius: 11px;
  overflow: hidden;
  background: #12151d;
}
.ms-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.ms-card:hover .ms-card-img img { transform: scale(1.07); }
.ms-card-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.ms-card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.25s;
}
.ms-card:hover .ms-card-title { color: #fff; }
.ms-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--ms-muted);
}
.ms-card-arrow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--ms-line);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ms-muted);
  flex-shrink: 0;
  transition: border-color 0.3s, color 0.3s, background-color 0.3s;
}
.ms-card:hover .ms-card-arrow {
  border-color: var(--ms-gold);
  color: #0a0d14;
  background: var(--ms-gold);
}

/* ------------------------------ بج نوع مطلب ------------------------------ */
.ms-badge {
  display: inline-block;
  width: fit-content;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--ms-gold-dim);
  color: var(--ms-gold-light);
  border: 1px solid rgba(197, 160, 89, 0.25);
}
.ms-badge.sm { padding: 3px 10px; font-size: 0.66rem; }
.ms-badge.news { background: rgba(96, 165, 250, 0.14); color: var(--ms-blue); border-color: rgba(96, 165, 250, 0.3); }
.ms-badge.event { background: rgba(43, 191, 158, 0.13); color: var(--ms-teal); border-color: rgba(43, 191, 158, 0.3); }
.ms-badge.cat { background: rgba(255, 255, 255, 0.07); color: rgba(236, 238, 242, 0.85); border-color: var(--ms-line); }

/* ------------------------------ نوار CTA طلایی ------------------------------ */
.ms-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  margin-top: 20px;
  padding: 26px 32px;
  border-radius: 20px;
  border: 1px solid var(--ms-line-gold);
  background:
    linear-gradient(120deg, rgba(197, 160, 89, 0.16) 0%, rgba(197, 160, 89, 0.05) 45%, transparent 100%),
    var(--ms-surface);
  cursor: pointer;
  font-family: inherit;
  text-align: start;
  transition: border-color 0.35s, background-color 0.35s, transform 0.35s, box-shadow 0.35s;
}
.ms-cta:hover {
  border-color: var(--ms-gold);
  background:
    linear-gradient(120deg, rgba(197, 160, 89, 0.26) 0%, rgba(197, 160, 89, 0.09) 45%, transparent 100%),
    var(--ms-surface);
  transform: translateY(-3px);
  box-shadow: 0 18px 46px rgba(197, 160, 89, 0.14);
}
.ms-cta-text { display: flex; flex-direction: column; gap: 6px; }
.ms-cta-text b {
  font-size: clamp(1.05rem, 2vw, 1.3rem);
  font-weight: 800;
  color: #fff;
}
.ms-cta-text i {
  font-style: normal;
  font-size: 0.85rem;
  color: var(--ms-muted);
}
.ms-cta-arrow {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--ms-gold), var(--ms-gold-light));
  color: #0a0d14;
  flex-shrink: 0;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.ms-cta:hover .ms-cta-arrow { transform: translateX(6px) scale(1.06); }
html[dir='rtl'] .ms-cta-arrow { transform: rotate(180deg); }
html[dir='rtl'] .ms-cta:hover .ms-cta-arrow { transform: rotate(180deg) translateX(6px) scale(1.06); }

/* ------------------------------- واکنش‌گرا ------------------------------- */
@media (max-width: 1024px) {
  .ms-grid { grid-template-columns: 1fr; }
  .ms-hero { min-height: 360px; }
  .ms-skeleton { grid-template-columns: 1fr; }
  .ms-skel-side { display: none; }
}
@media (max-width: 768px) {
  .ms { padding: 56px 16px 64px; }
  .ms-head { margin-bottom: 24px; }
  .ms-viewall { padding: 8px 16px; }
  .ms-hero { min-height: 300px; }
  .ms-hero-overlay { padding: 22px 20px 20px; }
  .ms-hero-cta { margin-inline-start: 0; }
  .ms-cta { padding: 20px 22px; }
  .ms-cta-arrow { width: 46px; height: 46px; }
}
@media (max-width: 480px) {
  .ms-card { grid-template-columns: 84px 1fr; padding: 10px; }
  .ms-card-img { width: 84px; height: 78px; }
  .ms-heading { font-size: 1.5rem; }
}

@media (prefers-reduced-motion: reduce) {
  .ms-glow, .ms-eyebrow, .ms-word, .ms-grid > *, .ms-cta, .ms-hero, .ms-hero-img, .ms-card, .ms-cta-arrow {
    transition: none !important;
    animation: none !important;
  }
  .ms.revealed .ms-eyebrow,
  .ms.revealed .ms-word,
  .ms.revealed .ms-grid > *,
  .ms.revealed .ms-cta { opacity: 1; transform: none; }
  .ms-skel { animation: ms-shimmer 1.5s infinite !important; }
}
</style>