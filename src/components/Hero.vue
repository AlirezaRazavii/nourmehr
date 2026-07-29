<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPublicHero } from '../services/heroApi'

const { locale } = useI18n()

/* ───────── state ───────── */
const slides = ref([])
const settings = ref({
  isEnabled: true,
  autoplay: true,
  autoplayDelay: 6000,
  pauseOnHover: true,
  showCounter: true,
  heroHeight: '',
})
const index = ref(0)
const loading = ref(true)
const rootEl = ref(null)

const hoverPaused = ref(false)
const pageVisible = ref(true)
const inView = ref(true)

let timer = null
let observer = null

/* ───────── cache (کلید شامل زبان است) ───────── */
const TTL = 5 * 60 * 1000
const cacheKey = () => `hero_v3_${locale.value}`


const readCache = () => {
  try {
    const raw = sessionStorage.getItem(cacheKey())
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p?.t || Date.now() - p.t > TTL) return null
    return p.data
  } catch { return null }
}

const writeCache = (data) => {
  try { sessionStorage.setItem(cacheKey(), JSON.stringify({ t: Date.now(), data })) } catch {}
}

/* ───────── derived ───────── */
const active = computed(() => slides.value[index.value] || {})
const total = computed(() => slides.value.length)
const accent = computed(() => active.value.themeColor || '#c5a059')

const canAutoplay = computed(() =>
  settings.value.autoplay &&
  total.value > 1 &&
  inView.value &&
  pageVisible.value &&
  !hoverPaused.value
)

const delay = computed(() => {
  const d = Number(settings.value.autoplayDelay)
  return Number.isFinite(d) && d >= 2000 ? d : 6000
})

const isFa = (t = '') => /[\u0600-\u06FF]/.test(String(t))

const heroStyle = computed(() => ({
  '--accent': accent.value,
  ...(settings.value.heroHeight ? { minHeight: settings.value.heroHeight } : {}),
}))

const bgStyle = computed(() => {
  const b = Number(active.value.bgBrightness)
  return { filter: `brightness(${Number.isFinite(b) ? b : 0.38})` }
})

/* ───────── links ───────── */
const isExternal = (l) => /^(https?:)?\/\//i.test(String(l || ''))

const localePath = (link) => {
  if (!link) return `/${locale.value}/products`
  const clean = String(link).startsWith('/') ? link : `/${link}`
  if (/^\/(fa|en)(\/|$)/.test(clean)) return clean
  return `/${locale.value}${clean === '/' ? '' : clean}`
}

/* ───────── navigation ───────── */
const go = (i, restart = true) => {
  if (total.value < 2) return
  index.value = ((i % total.value) + total.value) % total.value
  preload(index.value + 1)
  if (restart) sync()
}
const next = () => go(index.value + 1)
const prev = () => go(index.value - 1)

const start = () => {
  stop()
  if (!canAutoplay.value) return
  timer = window.setInterval(() => go(index.value + 1, false), delay.value)
}
const stop = () => { if (timer) { clearInterval(timer); timer = null } }
const sync = () => (canAutoplay.value ? start() : stop())

/* ───────── preload ───────── */
const seen = new Set()
const preload = (i) => {
  if (total.value < 2) return
  const s = slides.value[((i % total.value) + total.value) % total.value]
  ;[s?.image, s?.bgImage].filter(Boolean).forEach((src) => {
    if (seen.has(src)) return
    seen.add(src)
    const img = new Image()
    img.decoding = 'async'
    img.src = src
  })
}

/* ───────── swipe ───────── */
let sx = 0, sy = 0, swiping = false
const onDown = (e) => { sx = e.clientX; sy = e.clientY; swiping = true }
const onUp = (e) => {
  if (!swiping) return
  swiping = false
  const dx = e.clientX - sx
  const dy = e.clientY - sy
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
  const rtl = document.documentElement.getAttribute('dir') === 'rtl'
  dx > 0 ? (rtl ? next() : prev()) : (rtl ? prev() : next())
}

/* ───────── data ───────── */
const version = ref(null)

const apply = (data) => {
  const list = Array.isArray(data?.slides) ? data.slides.filter(Boolean) : []
  if (data?.enabled === false || !list.length) {
    slides.value = []
    version.value = data?.version ?? null
    return false
  }
  settings.value = { ...settings.value, ...(data.settings || {}) }
  slides.value = list
  version.value = data.version ?? null
  if (index.value >= list.length) index.value = 0
  return true
}

const fetchFresh = async () => {
  const res = await getPublicHero()
  return res?.data ?? res
}

const load = async () => {
  const cached = readCache()

  // ۱) اگر کش داریم فوراً نمایش بده تا صفحه سریع بالا بیاید
  if (cached) {
    apply(cached)
    loading.value = false
    preload(1)
    sync()

    // ۲) در پس‌زمینه نسخهٔ تازه را بگیر؛ اگر version فرق داشت، آپدیت کن
    try {
      const fresh = await fetchFresh()
      const changed = (fresh?.version ?? null) !== (cached?.version ?? null)
      if (changed) {
        writeCache(fresh)
        stop()
        seen.clear()
        index.value = 0
        apply(fresh)
        preload(1)
        sync()
      }
    } catch { /* آفلاین بودن نباید هیرو را خراب کند */ }
    return
  }

  // ۳) بدون کش: مسیر عادی
  loading.value = true
  try {
    const data = await fetchFresh()
    writeCache(data)
    apply(data)
  } catch {
    slides.value = []
  } finally {
    loading.value = false
    preload(1)
    sync()
  }
}
/* ───────── lifecycle ───────── */
const onVisibility = () => { pageVisible.value = document.visibilityState === 'visible'; sync() }

const onKey = (e) => {
  if (!inView.value || total.value < 2) return
  if (e.key === 'ArrowRight') document.documentElement.getAttribute('dir') === 'rtl' ? prev() : next()
  if (e.key === 'ArrowLeft') document.documentElement.getAttribute('dir') === 'rtl' ? next() : prev()
}

onMounted(async () => {
  pageVisible.value = document.visibilityState === 'visible'
  document.addEventListener('visibilitychange', onVisibility, { passive: true })
  window.addEventListener('keydown', onKey)

  await load()

  if ('IntersectionObserver' in window && rootEl.value) {
    observer = new IntersectionObserver(([e]) => { inView.value = e.isIntersecting; sync() }, { threshold: 0.15 })
    observer.observe(rootEl.value)
  }
})

onUnmounted(() => {
  stop()
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('keydown', onKey)
})

// با تعویض زبان، هیرو دوباره و از کشِ همان زبان لود می‌شود
watch(locale, () => { stop(); seen.clear(); load() })
</script>

<template>
  <section
    v-if="!loading && settings.isEnabled && total"
    ref="rootEl"
    class="hero"
    :style="heroStyle"
    @mouseenter="settings.pauseOnHover && (hoverPaused = true, sync())"
    @mouseleave="settings.pauseOnHover && (hoverPaused = false, sync())"
    @pointerdown="onDown"
    @pointerup="onUp"
  >
    <!-- پس‌زمینه -->
    <div class="hero__bg">
      <Transition name="bg">
        <img
          v-if="active.bgImage"
          :key="`bg-${index}`"
          :src="active.bgImage"
          :style="bgStyle"
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
        />
      </Transition>
      <span class="hero__veil" aria-hidden="true"></span>
    </div>

    <div class="hero__inner">
      <!-- متن -->
      <div class="hero__text">
        <Transition name="rise" mode="out-in">
          <div :key="index" class="stack">
            <span v-if="active.title" class="eyebrow" :class="{ fa: isFa(active.title) }">
              <i class="dot"></i>{{ active.title }}
            </span>

            <h1 v-if="active.subtitle" class="title" :class="{ fa: isFa(active.subtitle) }">
              {{ active.subtitle }}
            </h1>

            <span class="rule" aria-hidden="true"></span>

            <p v-if="active.description" class="desc">{{ active.description }}</p>

            <a
              v-if="isExternal(active.buttonLink)"
              :href="active.buttonLink"
              target="_blank"
              rel="noopener"
              class="cta"
            >
              <span>{{ active.buttonText || $t('hero_explore_btn') }}</span>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <router-link v-else :to="localePath(active.buttonLink)" class="cta">
              <span>{{ active.buttonText || $t('hero_explore_btn') }}</span>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </router-link>
          </div>
        </Transition>
      </div>

      <!-- تصویر -->
      <div class="hero__media">
        <span class="glow" aria-hidden="true"></span>
        <Transition name="pop" mode="out-in">
          <img
            v-if="active.image"
            :key="`img-${index}`"
            class="shot"
            :src="active.image"
            :alt="active.subtitle || active.title || ''"
            :loading="index === 0 ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            decoding="async"
            draggable="false"
          />
        </Transition>
        <span class="shadow" aria-hidden="true"></span>
      </div>
    </div>

    <!-- کنترل‌ها -->
    <nav v-if="total > 1" class="hero__nav" aria-label="hero">
      <button class="arrow" :aria-label="$t('hero_prev_aria')" @click="prev">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>

      <div class="dots">
        <button
          v-for="(s, i) in slides"
          :key="s.id || i"
          class="dot-btn"
          :class="{ on: i === index }"
          :aria-label="`${$t('hero_goto_aria')} ${i + 1}`"
          :aria-current="i === index"
          @click="go(i)"
        >
          <span class="fill" :style="i === index && canAutoplay ? { animationDuration: delay + 'ms' } : null"></span>
        </button>
      </div>

      <button class="arrow" :aria-label="$t('hero_next_aria')" @click="next">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>

      <span v-if="settings.showCounter" class="counter">
        <b>{{ String(index + 1).padStart(2, '0') }}</b> / {{ String(total).padStart(2, '0') }}
      </span>
    </nav>
  </section>

  <!-- اسکلت بارگذاری: هم‌ارتفاع با هیرو تا CLS نداشته باشیم -->
  <section v-else-if="loading" class="hero hero--skeleton" aria-hidden="true">
    <span class="sk-ring"></span>
  </section>
</template>

<style scoped>
.hero,
.hero * { box-sizing: border-box; }

.hero {
   --nav-h: var(--nav-total, 112px);
  --accent: #c5a059;
  --ink: #f2f2f4;
  --muted: rgba(242, 242, 244, 0.58);

  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: calc(100svh - var(--nav-h));
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #050814;
  color: var(--ink);
  font-family: 'Vazirmatn', system-ui, sans-serif;
  user-select: none;
}

/* ── پس‌زمینه ── */
.hero__bg { position: absolute; inset: 0; z-index: 0; display: grid; }
.hero__bg img {
  grid-area: 1 / 1;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  transform: scale(1.03);
}
.hero__veil {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(5,8,20,.15), rgba(5,8,20,.78) 78%),
    linear-gradient(to bottom, rgba(5,8,20,.35), rgba(5,8,20,.06) 40%, rgba(5,8,20,.92));
}

/* ── چیدمان ── */
.hero__inner {
  position: relative; z-index: 2;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(90px, 11vh, 130px) clamp(20px, 5vw, 64px) clamp(96px, 12vh, 130px);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(24px, 5vw, 64px);
}

/* ── متن ── */
.hero__text { min-width: 0; }
.stack { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }

.eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: .74rem; font-weight: 600;
  letter-spacing: .26em; text-transform: uppercase;
  color: var(--accent);
}
.eyebrow.fa { letter-spacing: .08em; text-transform: none; font-size: .86rem; }
.dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex: 0 0 auto; }

.title {
  margin: 0;
  font-size: clamp(2.1rem, 5.4vw, 4rem);
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: -.015em;
  background: linear-gradient(105deg, #fff 25%, var(--accent) 78%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--accent);
}
.title.fa { font-weight: 800; line-height: 1.34; }

.rule {
  width: 56px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), transparent);
}

.desc {
  margin: 0;
  max-width: 46ch;
  font-size: clamp(.88rem, 1.1vw, .98rem);
  line-height: 2;
  color: var(--muted);
  white-space: pre-line;
}

.cta {
  margin-top: 8px;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 13px 26px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: .9rem; font-weight: 700;
  text-decoration: none;
  transition: background-color .35s ease, color .35s ease, gap .3s ease, box-shadow .35s ease;
}
.cta svg { transition: transform .3s ease; }
[dir="rtl"] .cta svg { transform: rotate(180deg); }

/* ── تصویر ── */
.hero__media {
  position: relative;
  display: grid;
  place-items: center;
  min-height: min(58vh, 520px);
}
.glow {
  position: absolute; inset: 12% 8%;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 26%, transparent), transparent 68%);
  filter: blur(48px);
  opacity: .7;
}
.shot {
  position: relative;
  grid-area: 1 / 1;
  max-width: min(100%, 500px);
  max-height: min(62vh, 560px);
  width: auto; height: auto;
  object-fit: contain;
  filter: drop-shadow(0 26px 46px rgba(0,0,0,.55));
}
.shadow {
  position: absolute; bottom: 6%; left: 50%;
  width: min(56%, 260px); height: 26px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(0,0,0,.5);
  filter: blur(18px);
}

/* ── کنترل‌ها ── */
.hero__nav {
  position: absolute; z-index: 3;
  bottom: clamp(20px, 4vh, 38px);
  inset-inline-start: 50%;
  transform: translateX(-50%);
  display: flex; align-items: center; gap: 14px;
}
[dir="rtl"] .hero__nav { transform: translateX(50%); }

.arrow {
  width: 38px; height: 38px;
  padding: 0 !important;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,.14) !important;
  background: rgba(255,255,255,.05) !important;
  color: rgba(255,255,255,.72) !important;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background-color .3s ease, color .3s ease, border-color .3s ease;
}
[dir="rtl"] .arrow svg { transform: rotate(180deg); }

.dots { display: flex; align-items: center; gap: 8px; }
.dot-btn {
  position: relative;
  width: 30px; height: 3px;
  padding: 0 !important;
  border: none !important;
  border-radius: 999px !important;
  background: rgba(255,255,255,.16) !important;
  cursor: pointer;
  overflow: hidden;
  transition: width .35s ease, background-color .3s ease;
}
.dot-btn.on { width: 54px; }
.fill {
  position: absolute; inset: 0;
  transform-origin: left center;
  transform: scaleX(0);
  background: var(--accent);
  border-radius: inherit;
}
[dir="rtl"] .fill { transform-origin: right center; }
.dot-btn.on .fill { animation: dotFill linear forwards; }
@keyframes dotFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.counter {
  font-family: ui-monospace, monospace;
  font-size: .78rem;
  color: rgba(255,255,255,.4);
  direction: ltr;
}
.counter b { color: var(--accent); font-weight: 700; }

/* ── ترنزیشن‌ها (فقط opacity/transform) ── */
.bg-enter-active { transition: opacity .9s ease; }
.bg-leave-active { transition: opacity .9s ease; position: absolute; inset: 0; }
.bg-enter-from, .bg-leave-to { opacity: 0; }

.rise-enter-active { transition: opacity .5s ease, transform .6s cubic-bezier(.16,1,.3,1); }
.rise-leave-active { transition: opacity .28s ease, transform .28s ease; }
.rise-enter-from { opacity: 0; transform: translateY(22px); }
.rise-leave-to   { opacity: 0; transform: translateY(-14px); }

.pop-enter-active { transition: opacity .55s ease, transform .7s cubic-bezier(.16,1,.3,1); }
.pop-leave-active { transition: opacity .3s ease, transform .3s ease; }
.pop-enter-from { opacity: 0; transform: translateY(18px) scale(.965); }
.pop-leave-to   { opacity: 0; transform: translateY(-10px) scale(.985); }

/* ── hover فقط روی دسکتاپ ── */
@media (hover: hover) and (pointer: fine) {
  .cta:hover { background: var(--accent); color: #08090d; gap: 15px; box-shadow: 0 12px 34px color-mix(in srgb, var(--accent) 32%, transparent); }
  .arrow:hover { background: var(--accent) !important; color: #08090d !important; border-color: var(--accent) !important; }
  .dot-btn:hover { background: rgba(255,255,255,.3) !important; }
}

/* ── ریسپانسیو ── */
@media (max-width: 900px) {
  .hero__inner {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 26px;
    padding-top: clamp(84px, 12vh, 110px);
    padding-bottom: 104px;
  }
  .hero__text { order: 2; }
  .hero__media { order: 1; min-height: 34vh; }
  .stack { align-items: center; }
  .desc { max-width: 40ch; }
  .shot { max-height: 38vh; max-width: 78%; }
  .glow { filter: blur(36px); opacity: .55; }
}

@media (max-width: 480px) {
  .title { font-size: 1.95rem; }
  .desc { font-size: .85rem; line-height: 1.9; }
  .cta { width: 100%; justify-content: center; }
  .hero__nav { gap: 10px; }
  .counter { display: none; }
  .arrow { width: 34px; height: 34px; }
}

/* ── اسکلت ── */
.hero--skeleton { display: flex; align-items: center; justify-content: center; }
.sk-ring {
  width: 42px; height: 42px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.12);
  border-top-color: #c5a059;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── کاهش حرکت ── */
@media (prefers-reduced-motion: reduce) {
  .bg-enter-active, .bg-leave-active,
  .rise-enter-active, .rise-leave-active,
  .pop-enter-active, .pop-leave-active,
  .cta, .arrow, .dot-btn { transition-duration: .01ms !important; }
  .rise-enter-from, .pop-enter-from { transform: none; }
  .dot-btn.on .fill { animation: none; transform: scaleX(1); }
  .sk-ring { animation: none; }
}
</style>
