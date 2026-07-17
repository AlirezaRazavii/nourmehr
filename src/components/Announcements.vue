<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getHomeBlogs } from '../services/blogApi'

const { t, te, locale } = useI18n()
const router = useRouter()

const announcements = ref([])
const loading = ref(true)

// اگر عنوان/متن در دیتابیس به‌صورت آبجکت چندزبانه ذخیره شده باشد، زبان فعلی را برمی‌گرداند
const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || value.en || ''
  return ''
}

const formatDate = (d) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString(locale.value === 'fa' ? 'fa-IR' : 'en-US')
  } catch {
    return ''
  }
}

// کلید ترجمه‌ی نوع را امن می‌کند: اگر کلید وجود نداشت به «general» برمی‌گردد
const getTypeLabel = (type) => {
  const key = 'news_type_' + (type || 'general')
  if (te(key)) return t(key)
  return te('news_type_general') ? t('news_type_general') : ''
}

const goToBlog = (slug) => {
  if (slug) router.push({ name: 'NewsDetails', params: { lang: locale.value, slug } })
}

const revealed = ref(false)
const expandedId = ref(null)
const sectionEl = ref(null)
let observer = null

const toggle = (id) => {
  expandedId.value = expandedId.value === id ? null : id
}

onMounted(async () => {
  try {
    const res = await getHomeBlogs()
    if (res?.success && Array.isArray(res.data)) {
      announcements.value = res.data
    }
  } catch (e) {
    console.error('Error fetching home blogs:', e)
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
    { threshold: 0.1 }
  )
  if (sectionEl.value) observer.observe(sectionEl.value)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section ref="sectionEl" class="ann" :class="{ revealed }">

    <div class="orb orb-1" aria-hidden="true"></div>
    <div class="orb orb-2" aria-hidden="true"></div>

    <div class="rule rule-top" aria-hidden="true"><span></span></div>

    <p class="eyebrow">{{ $t('news_eyebrow') }}</p>

    <h2 class="heading">
      <span class="h-word" style="--d:0">{{ $t('news_heading_1') }}</span>
      <span class="h-word accent" style="--d:1">{{ $t('news_heading_2') }}</span>
    </h2>

    <div v-if="loading" class="state-box" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ $t('loading') }}</span>
    </div>

    <div v-else-if="announcements.length === 0" class="state-box">
      <p>{{ $t('news_empty') }}</p>
    </div>

    <ol v-else class="list">
      <li
        v-for="(item, i) in announcements"
        :key="item._id"
        class="row"
        :class="{ open: expandedId === item._id }"
        :style="{ '--d': i }"
        @click="toggle(item._id)"
        role="button"
        :aria-expanded="expandedId === item._id"
        tabindex="0"
        @keydown.enter.prevent="toggle(item._id)"
        @keydown.space.prevent="toggle(item._id)"
      >
        <div class="row-head">

          <div class="row-left">
            <span class="num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="vr" aria-hidden="true"></span>

            <div class="row-body">
              <div class="row-meta">
                <span class="type">
                  {{ getTypeLabel(item.type) }}
                </span>
                <time class="date date-sm" :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
              </div>
              <h3 class="row-title">{{ getLocalizedText(item.title) }}</h3>
            </div>
          </div>

          <div class="row-right">
            <time class="date date-lg" :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
            <span class="arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </div>
        </div>

        <div class="body" :inert="expandedId !== item._id ? true : null">
          <p class="excerpt">{{ getLocalizedText(item.excerpt) }}</p>
          <button
            class="read-more"
            type="button"
            @click.stop="goToBlog(item.slug)"
          >
            {{ $t('news_read_more') }}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </li>
    </ol>

    <div class="rule rule-bot" aria-hidden="true"><span></span></div>
  </section>
</template>

<style scoped>

.ann {
  --gold:        #c5a059;
  --gold-light:  #f0cc7a;
  --gold-dim:    rgba(197, 160, 89, 0.12);
  --border:      rgba(255, 255, 255, 0.10);
  --border-gold: rgba(197, 160, 89, 0.22);
  --text:        #e4e4e7;
  --muted:       rgba(228, 228, 231, 0.42);
  --bg-row:      rgba(255, 255, 255, 0.025);
  --bg-row-open: rgba(197, 160, 89, 0.04);
  --radius-row:  14px;

  position: relative;
  max-width: 960px;
  margin: 0 auto;
  padding: 88px 32px 96px;
  color: var(--text);
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
  overflow: hidden;
  box-sizing: border-box;
}


.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1.8s ease;
  z-index: 0;
  will-change: opacity;
}
.revealed .orb { opacity: 1; }
.orb-1 {
  width: 320px; height: 320px;
  top: -80px; left: -100px;
  background: radial-gradient(circle, rgba(197,160,89,.06) 0%, transparent 70%);
}
.orb-2 {
  width: 280px; height: 280px;
  bottom: -60px; right: -80px;
  background: radial-gradient(circle, rgba(197,160,89,.05) 0%, transparent 70%);
}


.rule {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}
.rule span {
  display: block;
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  transition: width 1.1s cubic-bezier(.16,1,.3,1);
}
.revealed .rule span { width: 100%; }
.rule-top { margin-bottom: 44px; }
.rule-bot { margin-top: 16px; }


.eyebrow {
  text-align: center;
  font-size: 0.66rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0 0 12px;
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity .6s ease .2s, transform .6s ease .2s;
}
.revealed .eyebrow { opacity: 1; transform: translateY(0); }

.heading {
  text-align: center;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 48px;
  position: relative;
  z-index: 1;
}
.h-word {
  display: block;
  opacity: 0;
  transform: translateY(40%);
  transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1);
  transition-delay: calc(.3s + var(--d) * .1s);
}
.revealed .h-word { opacity: 1; transform: translateY(0); }
.h-word.accent {
  background: linear-gradient(100deg, var(--gold), var(--gold-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: var(--gold); /* fallback اگر background-clip پشتیبانی نشود */
}


.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 0;
  color: var(--muted);
  font-size: 0.9rem;
  position: relative;
  z-index: 1;
}
.spinner {
  width: 32px; height: 32px;
  border: 2.5px solid rgba(197,160,89,.18);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }


.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}


.row {
  border-radius: var(--radius-row);
  border: 1px solid var(--border);
  background: var(--bg-row);
  padding: 0 20px;
  cursor: pointer;
  user-select: none;
  outline-offset: 3px;

  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity  .6s cubic-bezier(.16,1,.3,1),
    transform .6s cubic-bezier(.16,1,.3,1),
    background-color .3s ease,
    border-color .3s ease;
  transition-delay: calc(.4s + var(--d) * .1s);
}
.revealed .row { opacity: 1; transform: translateY(0); }
.row:hover  { background: rgba(255,255,255,.04); border-color: var(--border-gold); }
.row.open   { background: var(--bg-row-open);     border-color: var(--border-gold); }
.row:focus-visible { outline: 2px solid var(--gold); }


.row-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 0;
  min-width: 0;
}

/* LEFT section: num + divider + [type + title] */
.row-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.num {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  min-width: 28px;
  text-align: center;
  flex-shrink: 0;
  transition: color .25s;
}
.row:hover .num, .row.open .num { color: var(--gold); }

.vr {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  flex-shrink: 0;
  transition: background .25s;
}
.row:hover .vr, .row.open .vr { background: rgba(197,160,89,.5); }

.row-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.type {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  background: var(--gold-dim);
  color: var(--gold-light);
  border: 1px solid rgba(197,160,89,.18);
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color .25s, border-color .25s;
}
.row:hover .type { background: rgba(197,160,89,.18); border-color: rgba(197,160,89,.35); }

.row-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color .25s;
}
.row:hover .row-title { color: #fff; }


.row-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.date {
  font-size: 0.76rem;
  color: var(--muted);
  white-space: nowrap;
}


.date-lg { display: block; }

.date-sm { display: none; }

.arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  flex-shrink: 0;
  transition: transform .35s ease, background-color .35s ease, border-color .35s ease, color .35s ease;
}
.row:hover .arrow { border-color: rgba(197,160,89,.35); color: var(--gold); }
.row.open .arrow  { transform: rotate(180deg); background: var(--gold); border-color: var(--gold); color: #000; }


.body {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height .4s ease, opacity .3s ease, padding .4s ease;
  padding-bottom: 0;
  border-top: 0px solid transparent;
}
.row.open .body {
  max-height: 400px;
  opacity: 1;
  padding-bottom: 20px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.excerpt {
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.8;
  margin: 0 0 16px;
}

.read-more {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.025);
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color .3s ease, border-color .3s ease, color .3s ease;
}
.read-more:hover {
  border-color: var(--gold);
  background: var(--gold);
  color: #000;
}
.read-more svg { transition: transform .25s ease; }
.read-more:hover svg { transform: translateX(3px); }
/* آیکون فلش در حالت فارسی (RTL) باید برعکس شود */
:global([dir="rtl"]) .read-more svg { transform: scaleX(-1); }
:global([dir="rtl"]) .read-more:hover svg { transform: scaleX(-1) translateX(3px); }


@media (max-width: 768px) {
  .ann {
    padding: 56px 18px 64px;
  }
  .heading { margin-bottom: 36px; }

  .num, .vr { display: none; }

  .date-lg { display: none; }
  .date-sm { display: block; margin-inline-start: auto; }

  .row { padding: 0 16px; }
  .row-head { padding: 18px 0; gap: 12px; }

  .row-title {
    white-space: normal;
    text-overflow: unset;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.95rem;
  }

  .row.open .body { padding-top: 14px; }
}


@media (max-width: 480px) {
  .ann {
    padding: 40px 12px 48px;
  }
  .heading { font-size: 1.5rem; margin-bottom: 28px; }
  .eyebrow { font-size: 0.6rem; letter-spacing: 0.22em; }

  .row { padding: 0 14px; border-radius: 12px; }
  .row-head { padding: 16px 0; gap: 10px; }

  .row-title { font-size: 0.9rem; -webkit-line-clamp: 3; line-clamp: 3; }

  .arrow { width: 28px; height: 28px; }
  .arrow svg { width: 14px; height: 14px; }

  .excerpt { font-size: 0.84rem; }

  .read-more {
    width: 100%;
    justify-content: center;
    padding: 11px 16px;
  }
}

@media (hover: none) {
  .row:hover { background: var(--bg-row); border-color: var(--border); }
  .row:hover .num,
  .row:hover .type,
  .row:hover .vr,
  .row:hover .arrow,
  .row:hover .row-title { color: inherit; }
}


@media (prefers-reduced-motion: reduce) {
  .h-word, .eyebrow, .row, .rule span, .orb, .arrow, .body {
    transition: none !important;
    animation: none !important;
  }
  .revealed .h-word,
  .revealed .eyebrow,
  .revealed .row   { opacity: 1; transform: none; }
  .revealed .rule span { width: 100%; }
  .spinner { animation: spin 0.9s linear infinite !important; }
}
</style>
