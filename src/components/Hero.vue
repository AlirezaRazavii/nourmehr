<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'

import { getPublicHero } from '../services/heroApi'

/* =====================================================
   تنظیمات پیش‌فرض
===================================================== */

const defaultSettings = {
  isEnabled: true,
  autoplay: true,
  autoplayDelay: 7000,
  pauseOnHover: false,
  showTimer: true,
  showCounter: true,
  showBgTypography: true,
  showCornerDeco: true,
  enableFloat: true,
  transitionType: 'slide',
  heroHeight: '100svh',
}

/* =====================================================
   کش سراسری هیرو
===================================================== */

const HERO_CACHE_KEY = 'hero_cache_v1'
const HERO_CACHE_TTL = 5 * 60 * 1000

let heroMemoryCache = null

const readHeroCache = () => {
  if (
    heroMemoryCache &&
    Date.now() - heroMemoryCache.t < HERO_CACHE_TTL
  ) {
    return heroMemoryCache.data
  }

  try {
    const raw = sessionStorage.getItem(HERO_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.t) return null
    if (Date.now() - parsed.t > HERO_CACHE_TTL) return null

    heroMemoryCache = parsed
    return parsed.data
  } catch (error) {
    return null
  }
}

const writeHeroCache = (data) => {
  const entry = { t: Date.now(), data }
  heroMemoryCache = entry

  try {
    sessionStorage.setItem(
      HERO_CACHE_KEY,
      JSON.stringify(entry)
    )
  } catch (error) {}
}

const runWhenIdle = (task, timeout = 2000) => {
  if (typeof window === 'undefined') return

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout })
  } else {
    window.setTimeout(task, 300)
  }
}

/* =====================================================
   State
===================================================== */

const heroRef = ref(null)

const currentSlide = ref(0)
const loading = ref(true)
const settings = ref({ ...defaultSettings })
const slides = ref([])

const isTransitioning = ref(false)
const renderVersion = ref(0)

const inView = ref(true)
const pageVisible = ref(true)
const hoverPaused = ref(false)

let slideInterval = null
let transitionUnlockTimer = null
let observer = null
let dataSignature = ''

const preloadedSources = new Set()

/* =====================================================
   وضعیت فعال بودن انیمیشن‌ها
===================================================== */

const isPaused = computed(() => {
  return !inView.value || !pageVisible.value
})

const canAutoplay = computed(() => {
  return (
    settings.value.autoplay &&
    slides.value.length > 1 &&
    inView.value &&
    pageVisible.value &&
    !hoverPaused.value
  )
})

/* =====================================================
   اسلاید فعال
===================================================== */

const active = computed(() => {
  return slides.value[currentSlide.value] || {}
})

const activeKey = computed(() => {
  const id =
    active.value.id ??
    active.value._id ??
    currentSlide.value

  return `${id}-${renderVersion.value}`
})

const themeColor = computed(() => {
  return active.value.themeColor || '#c8aa55'
})

/* =====================================================
   تشخیص زبان متن
===================================================== */

const isPersian = (text = '') => {
  return /[\u0600-\u06FF]/.test(String(text))
}

const titleIsPersian = computed(() => {
  return isPersian(active.value.title)
})

const subtitleIsPersian = computed(() => {
  return isPersian(active.value.subtitle)
})

const descriptionIsPersian = computed(() => {
  return isPersian(active.value.description)
})

const buttonIsPersian = computed(() => {
  return isPersian(active.value.buttonText)
})

const titleClasses = computed(() => ({
  'text-persian': titleIsPersian.value,
  'text-latin': !titleIsPersian.value,
}))

const subtitleClasses = computed(() => ({
  'text-persian': subtitleIsPersian.value,
  'text-latin': !subtitleIsPersian.value,
}))

/* =====================================================
   تصاویر
===================================================== */

const resolveImg = (url) => {
  return url || ''
}

const slideBackground = (slide) => {
  return (
    slide?.bgImage ||
    slide?.backgroundImage ||
    slide?.image ||
    ''
  )
}

const activeBackground = computed(() => {
  return resolveImg(slideBackground(active.value))
})

const activeProductImage = computed(() => {
  return resolveImg(active.value.image)
})

/* =====================================================
   استایل‌های پویا
===================================================== */

const heroStyle = computed(() => ({
  height:
    settings.value.heroHeight ||
    defaultSettings.heroHeight,

  '--theme-color': themeColor.value,
}))

const backgroundStyle = computed(() => {
  const brightness =
    Number(active.value.bgBrightness ?? 0.42)

  return {
    filter: `brightness(${brightness})`,
  }
})

/* =====================================================
   تایمر
===================================================== */

const autoplayDelay = computed(() => {
  const delay = Number(settings.value.autoplayDelay)

  if (!Number.isFinite(delay) || delay < 1500) {
    return 7000
  }

  return delay
})

const timerDuration = computed(() => {
  return `${autoplayDelay.value / 1000}s`
})

/* =====================================================
   استانداردسازی نوع ترنزیشن
===================================================== */

const normalizeTransitionValue = (transition) => {
  let value = transition

  if (value && typeof value === 'object') {
    value =
      value.value ??
      value.key ??
      value.name ??
      value.label ??
      ''
  }

  return String(value || 'slide')
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, '')
    .replace(/[_\-\s]+/g, '')
}

const normalizedTransitionType = computed(() => {
  const selected = normalizeTransitionValue(
    settings.value.transitionType
  )

  const transitionMap = {
    slide: 'slide',
    slider: 'slide',
    sliding: 'slide',
    اسلاید: 'slide',
    اسلایدی: 'slide',
    حرکت: 'slide',
    حرکتی: 'slide',

    fade: 'fade',
    fading: 'fade',
    faded: 'fade',
    محو: 'fade',
    محوشدن: 'fade',
    فید: 'fade',
    فیدشدن: 'fade',

    zoom: 'zoom',
    zooming: 'zoom',
    زوم: 'zoom',
    بزرگنمایی: 'zoom',
  }

  return transitionMap[selected] || 'slide'
})

/* =====================================================
   نام ترنزیشن بخش‌ها
===================================================== */

const backgroundTransitionName = computed(() => {
  return `background-${normalizedTransitionType.value}`
})

const titleTransitionName = computed(() => {
  return `title-${normalizedTransitionType.value}`
})

const subtitleTransitionName = computed(() => {
  return `subtitle-${normalizedTransitionType.value}`
})

const productTransitionName = computed(() => {
  return `product-${normalizedTransitionType.value}`
})

const descriptionTransitionName = computed(() => {
  return `description-${normalizedTransitionType.value}`
})

/* =====================================================
   مدت قفل ترنزیشن
===================================================== */

const transitionLockDuration = computed(() => {
  const durations = {
    slide: 1250,
    fade: 1150,
    zoom: 1300,
  }

  return (
    durations[normalizedTransitionType.value] ||
    1250
  )
})

/* =====================================================
   مدیریت پخش خودکار
===================================================== */

const stopAutoSlide = () => {
  if (slideInterval !== null) {
    window.clearInterval(slideInterval)
    slideInterval = null
  }
}

const startAutoSlide = () => {
  stopAutoSlide()

  if (!canAutoplay.value) return

  slideInterval = window.setInterval(() => {
    nextSlide(false)
  }, autoplayDelay.value)
}

const syncAutoplay = () => {
  if (canAutoplay.value) {
    startAutoSlide()
  } else {
    stopAutoSlide()
  }
}

/* =====================================================
   قفل و آزادسازی ترنزیشن
===================================================== */

const clearTransitionLock = () => {
  if (transitionUnlockTimer !== null) {
    window.clearTimeout(transitionUnlockTimer)
    transitionUnlockTimer = null
  }

  isTransitioning.value = false
}

const lockTransition = () => {
  clearTransitionLock()
  isTransitioning.value = true

  transitionUnlockTimer = window.setTimeout(() => {
    isTransitioning.value = false
    transitionUnlockTimer = null
  }, transitionLockDuration.value)
}

/* =====================================================
   Preload تدریجی تصاویر
===================================================== */

const preloadSource = (source) => {
  if (!source) return
  if (preloadedSources.has(source)) return

  preloadedSources.add(source)

  const image = new Image()
  image.decoding = 'async'
  image.fetchPriority = 'low'
  image.src = source
}

const preloadSlideAt = (index) => {
  const total = slides.value.length
  if (total === 0) return

  const normalized = ((index % total) + total) % total
  const slide = slides.value[normalized]
  if (!slide) return

  preloadSource(resolveImg(slide.image))
  preloadSource(resolveImg(slideBackground(slide)))
}

const preloadNeighbors = () => {
  if (slides.value.length <= 1) return

  runWhenIdle(() => {
    preloadSlideAt(currentSlide.value + 1)
  }, 3000)
}

const preloadRemaining = () => {
  if (slides.value.length <= 2) return

  runWhenIdle(() => {
    for (let i = 2; i < slides.value.length; i += 1) {
      preloadSlideAt(currentSlide.value + i)
    }
  }, 8000)
}

/* =====================================================
   تغییر اسلاید
===================================================== */

const changeSlide = (
  targetIndex,
  restartTimer = true
) => {
  if (
    slides.value.length <= 1 ||
    isTransitioning.value
  ) {
    return
  }

  const total = slides.value.length

  const normalizedIndex =
    ((targetIndex % total) + total) % total

  if (normalizedIndex === currentSlide.value) {
    return
  }

  stopAutoSlide()
  lockTransition()

  currentSlide.value = normalizedIndex
  renderVersion.value += 1

  preloadNeighbors()

  if (restartTimer) {
    syncAutoplay()
  } else if (canAutoplay.value) {
    startAutoSlide()
  }
}

const nextSlide = (restartTimer = true) => {
  changeSlide(
    currentSlide.value + 1,
    restartTimer
  )
}

const onShowcaseClick = () => {
  nextSlide(true)
}

/* =====================================================
   توقف پخش روی Hover
===================================================== */

const onMouseEnter = () => {
  if (settings.value.pauseOnHover) {
    hoverPaused.value = true
    stopAutoSlide()
  }
}

const onMouseLeave = () => {
  if (settings.value.pauseOnHover) {
    hoverPaused.value = false
    syncAutoplay()
  }
}

/* =====================================================
   مدیریت خطای تصویر
===================================================== */

const handleImageError = (event) => {
  const image = event?.target

  if (image) {
    image.style.visibility = 'hidden'
  }
}

/* =====================================================
   ناظر ورود به دید و وضعیت تب
===================================================== */

const destroyObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

const setupObserver = () => {
  if (typeof window === 'undefined') return
  if (!('IntersectionObserver' in window)) return
  if (!heroRef.value) return

  destroyObserver()

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return

      inView.value = entry.isIntersecting
      syncAutoplay()
    },
    { threshold: 0.01 }
  )

  observer.observe(heroRef.value)
}

const onVisibilityChange = () => {
  pageVisible.value =
    document.visibilityState === 'visible'

  syncAutoplay()
}

/* =====================================================
   اعمال داده‌ها
===================================================== */

const applyHeroData = (data) => {
  const receivedSlides = Array.isArray(data?.slides)
    ? data.slides.filter(Boolean)
    : []

  const hasSlides =
    data?.enabled !== false &&
    receivedSlides.length > 0

  if (!hasSlides) {
    slides.value = []
    currentSlide.value = 0
    return false
  }

  settings.value = {
    ...defaultSettings,
    ...(data?.settings || {}),
    isEnabled: data?.enabled !== false,
  }

  slides.value = receivedSlides
  currentSlide.value = 0
  renderVersion.value += 1

  return true
}

const signatureOf = (data) => {
  try {
    return JSON.stringify(data)
  } catch (error) {
    return ''
  }
}

/* =====================================================
   دریافت اطلاعات هیرو
===================================================== */

const fetchHero = async () => {
  const response = await getPublicHero()
  return response?.data ?? response
}

const revalidateHero = async () => {
  try {
    const data = await fetchHero()
    const signature = signatureOf(data)

    if (signature && signature === dataSignature) return

    dataSignature = signature
    writeHeroCache(data)

    const applied = applyHeroData(data)

    if (applied) {
      await nextTick()
      setupObserver()
      syncAutoplay()
      preloadNeighbors()
    }
  } catch (error) {}
}

const loadHero = async () => {
  stopAutoSlide()
  clearTransitionLock()

  const cached = readHeroCache()

  if (cached) {
    dataSignature = signatureOf(cached)
    applyHeroData(cached)
    loading.value = false

    await nextTick()
    setupObserver()
    syncAutoplay()
    preloadNeighbors()
    preloadRemaining()

    runWhenIdle(revalidateHero, 6000)
    return
  }

  loading.value = true

  try {
    const data = await fetchHero()

    dataSignature = signatureOf(data)
    writeHeroCache(data)
    applyHeroData(data)
  } catch (error) {
    slides.value = []
    currentSlide.value = 0
  } finally {
    loading.value = false

    await nextTick()
    setupObserver()
    syncAutoplay()
    preloadNeighbors()
    preloadRemaining()
  }
}

/* =====================================================
   Lifecycle
===================================================== */

onMounted(() => {
  pageVisible.value =
    document.visibilityState === 'visible'

  document.addEventListener(
    'visibilitychange',
    onVisibilityChange,
    { passive: true }
  )

  loadHero()
})

onUnmounted(() => {
  stopAutoSlide()
  clearTransitionLock()
  destroyObserver()

  document.removeEventListener(
    'visibilitychange',
    onVisibilityChange
  )
})
</script>

<template>
  <section
    v-if="
      !loading &&
      settings.isEnabled &&
      slides.length
    "
    ref="heroRef"
    class="hero"
    :class="[
      `hero--transition-${normalizedTransitionType}`,
      {
        'hero--transitioning': isTransitioning,
        'hero--paused': isPaused,
      },
    ]"
    :style="heroStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- پس‌زمینه -->
    <div class="background-stack">
      <Transition :name="backgroundTransitionName">
        <img
          v-if="activeBackground"
          :key="`${activeKey}-background`"
          class="hero__background"
          :src="activeBackground"
          :style="backgroundStyle"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchpriority="high"
          draggable="false"
          @error="handleImageError"
        />
      </Transition>
    </div>

    <!-- لایه‌های ثابت روی پس‌زمینه -->
    <div class="hero__overlay"></div>

    <div
      class="hero__texture"
      aria-hidden="true"
    ></div>

    <!-- محتوای اصلی -->
    <div
      class="showcase"
      role="button"
      tabindex="0"
      aria-label="نمایش اسلاید بعدی"
      @click="onShowcaseClick"
      @keydown.enter="onShowcaseClick"
      @keydown.space.prevent="onShowcaseClick"
    >
      <!-- تایپوگرافی -->
      <div
        v-if="settings.showBgTypography"
        class="typography"
        aria-hidden="true"
      >
        <div class="typography__content">
          <!-- لایه ثابت عنوان -->
          <div class="title-slot">
            <Transition :name="titleTransitionName">
              <h1
                :key="`${activeKey}-title`"
                class="hero-title"
                :class="titleClasses"
                :dir="
                  titleIsPersian ? 'rtl' : 'ltr'
                "
              >
                <span
                  class="
                    hero-title__text
                    preserve-spaces
                  "
                  v-text="active.title"
                ></span>
              </h1>
            </Transition>
          </div>

          <!-- لایه ثابت زیرعنوان -->
          <div class="subtitle-slot">
            <Transition
              :name="subtitleTransitionName"
            >
              <h2
                :key="`${activeKey}-subtitle`"
                class="hero-subtitle"
                :class="subtitleClasses"
                :dir="
                  subtitleIsPersian
                    ? 'rtl'
                    : 'ltr'
                "
              >
                <span
                  class="
                    hero-subtitle__text
                    preserve-spaces
                  "
                  v-text="active.subtitle"
                ></span>
              </h2>
            </Transition>
          </div>
        </div>
      </div>

      <!-- محصول -->
      <div class="product">
        <div
          class="product__stage"
          :class="{
            'product__stage--static':
              !settings.enableFloat,
          }"
        >
          <div class="product__layers">
            <Transition
              :name="productTransitionName"
            >
              <div
                :key="`${activeKey}-product`"
                class="product__layer"
              >
                <img
                  :key="`${activeKey}-image`"
                  :src="activeProductImage"
                  :alt="
                    active.title ||
                    'تصویر محصول'
                  "
                  class="product__image"
                  fetchpriority="high"
                  decoding="async"
                  draggable="false"
                  @error="handleImageError"
                />
              </div>
            </Transition>
          </div>

          <div
            class="product__shadow"
            aria-hidden="true"
          ></div>
        </div>
      </div>
    </div>

    <!-- پنل اطلاعات -->
    <aside
      class="info-panel"
      :dir="
        descriptionIsPersian
          ? 'rtl'
          : 'ltr'
      "
      @click.stop
    >
      <div class="info-panel__line-wrapper">
        <span
          class="info-panel__line"
          :style="{
            backgroundColor: themeColor,
          }"
        ></span>
      </div>

      <!-- لایه ثابت توضیحات -->
      <div class="description-slot">
        <Transition
          :name="descriptionTransitionName"
        >
          <p
            :key="`${activeKey}-description`"
            class="info-panel__description"
            v-text="active.description"
          ></p>
        </Transition>
      </div>

      <div class="info-panel__footer">
        <router-link
          :to="
            active.buttonLink || '/products'
          "
          class="info-panel__button"
          :dir="
            buttonIsPersian ? 'rtl' : 'ltr'
          "
          :style="{ color: themeColor }"
        >
          <span>
            {{
              active.buttonText ||
              $t('hero_explore_btn')
            }}
          </span>

          <svg
            class="info-panel__button-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M12 5l7 7-7 7"
            />
          </svg>
        </router-link>

        <div
          v-if="settings.showCounter"
          class="slide-counter"
        >
          <span
            class="slide-counter__current"
            :style="{ color: themeColor }"
          >
            {{
              String(currentSlide + 1).padStart(
                2,
                '0'
              )
            }}
          </span>

          <span class="slide-counter__separator">
            /
          </span>

          <span class="slide-counter__total">
            {{
              String(slides.length).padStart(
                2,
                '0'
              )
            }}
          </span>
        </div>
      </div>
    </aside>

    <!-- تایمر -->
    <div
      v-if="
        settings.showTimer &&
        settings.autoplay &&
        slides.length > 1
      "
      class="hero-timer"
      aria-hidden="true"
    >
      <svg
        :key="`${activeKey}-timer`"
        width="48"
        height="48"
        viewBox="0 0 50 50"
      >
        <circle
          cx="25"
          cy="25"
          r="22"
          class="hero-timer__background"
        />

        <circle
          cx="25"
          cy="25"
          r="22"
          class="hero-timer__progress"
          :style="{
            stroke: themeColor,
            animationDuration: timerDuration,
          }"
        />
      </svg>

      <span class="hero-timer__icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M7 13l5 5 5-5M7 6l5 5 5-5"
          />
        </svg>
      </span>
    </div>

    <!-- تزئین گوشه‌ها -->
    <template v-if="settings.showCornerDeco">
      <div
        class="corner corner--top"
        aria-hidden="true"
      ></div>

      <div
        class="corner corner--bottom"
        aria-hidden="true"
      ></div>
    </template>
  </section>

  <!-- حالت بارگذاری -->
  <section
    v-else-if="loading"
    class="hero-loading"
    aria-label="در حال بارگذاری"
  >
    <span class="hero-loading__spinner"></span>
  </section>
</template>

<style scoped>
/* =====================================================
   تنظیم عمومی
===================================================== */

.hero,
.hero *,
.hero *::before,
.hero *::after {
  box-sizing: border-box;
}

.hero {
  --hero-background-color: #050814;
  --theme-color: #c8aa55;

  position: relative;
  isolation: isolate;

  width: 100%;
  height: 100svh;
  min-height: 600px;

  overflow: hidden;

  color: #fff;
  background: var(--hero-background-color);

  perspective: 1400px;
  perspective-origin: center;
}

/* =====================================================
   پس‌زمینه
===================================================== */

.background-stack {
  position: absolute;
  inset: 0;
  z-index: 0;

  display: grid;
  overflow: hidden;
}

.hero__background {
  grid-area: 1 / 1;

  display: block;

  width: 104%;
  height: 104%;
  max-width: none;
  margin: -2%;

  object-fit: cover;
  object-position: center;

  user-select: none;
  pointer-events: none;

  transform:
    translate3d(0, 0, 0)
    scale(1.035);

  transform-origin: center;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.hero__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;

  pointer-events: none;

  background:
    radial-gradient(
      circle at center,
      rgba(5, 8, 20, 0.01) 0%,
      rgba(5, 8, 20, 0.18) 48%,
      rgba(5, 8, 20, 0.82) 100%
    ),
    linear-gradient(
      to bottom,
      rgba(5, 8, 20, 0.22) 0%,
      rgba(5, 8, 20, 0.03) 42%,
      rgba(5, 8, 20, 0.76) 100%
    );
}

.hero__texture {
  position: absolute;
  inset: 0;
  z-index: 2;

  pointer-events: none;
  opacity: 0.05;

  background-image: url(
    "data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.5'/%3E%3C/svg%3E"
  );
}

/* =====================================================
   صحنه اصلی
===================================================== */

.showcase {
  position: absolute;
  inset: 0;
  z-index: 3;

  overflow: hidden;
  cursor: pointer;
  outline: none;

  perspective: 1250px;
  perspective-origin: 50% 46%;
  transform-style: preserve-3d;
}

/* =====================================================
   تایپوگرافی
===================================================== */

.typography {
  position: absolute;
  top: 48%;
  left: 50%;
  z-index: 1;

  width: 100%;
  max-width: 100%;

  pointer-events: none;

  transform:
    translate3d(-50%, -50%, -90px);

  transform-style: preserve-3d;
}

.typography__content {
  width: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;

  text-align: center;
  transform-style: preserve-3d;
}

/*
  هر دو نسخه قدیم و جدید عنوان دقیقاً روی هم قرار
  می‌گیرند و باعث تغییر ارتفاع یا پرش نمی‌شوند.
*/
.title-slot,
.subtitle-slot {
  position: relative;

  width: 100%;

  display: grid;
  place-items: center;

  overflow: visible;
  isolation: isolate;
}

.title-slot > *,
.subtitle-slot > * {
  grid-area: 1 / 1;
}

.hero-title,
.hero-subtitle {
  position: relative;

  width: 100%;
  max-width: 100%;

  margin: 0;
  padding: 0;

  text-align: center;
  font-weight: 400;

  pointer-events: none;

  transform-origin: center;
  transform-style: preserve-3d;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.hero-title__text,
.hero-subtitle__text {
  display: inline-block;
  max-width: 100%;
}

.preserve-spaces {
  white-space: break-spaces;
  overflow-wrap: normal;
  word-break: normal;
  tab-size: 4;
}

/* =====================================================
   لایه‌بندی GPU فقط هنگام ترنزیشن
===================================================== */

.hero--transitioning .hero__background,
.hero--transitioning .hero-title,
.hero--transitioning .hero-subtitle,
.hero--transitioning .product__layer,
.hero--transitioning .info-panel__description {
  will-change:
    opacity,
    transform,
    filter;
}

/* =====================================================
   توقف کامل انیمیشن‌ها خارج از دید
===================================================== */

.hero--paused .product__stage,
.hero--paused .hero-timer__progress,
.hero--paused .hero-timer__icon {
  animation-play-state: paused;
}

/* =====================================================
   عنوان و زیرعنوان
===================================================== */

.hero-title {
  z-index: 1;

  font-size: clamp(5.5rem, 11.5vw, 12rem);
  line-height: 0.82;

  color: rgba(197, 160, 89, 0.43);

  text-shadow:
    0 0 30px rgba(0, 0, 0, 0.62);

  opacity: 0.9;
}

.hero-subtitle {
  z-index: 1;

  font-size: clamp(4rem, 7.5vw, 8rem);
  line-height: 1;

  color: var(--theme-color);

  text-shadow:
    0 4px 14px rgba(0, 0, 0, 0.9),
    0 16px 38px rgba(0, 0, 0, 0.55);
}

/* =====================================================
   متن لاتین
===================================================== */

.text-latin {
  direction: ltr;

  font-family:
    'Times New Roman',
    Georgia,
    serif;

  letter-spacing: 5px;
  text-transform: uppercase;
}

.hero-title.text-latin .hero-title__text {
  color: transparent;
  -webkit-text-fill-color: transparent;

  background-image: linear-gradient(
    to right,
    rgba(197, 160, 89, 0.56),
    rgba(92, 196, 218, 0.45)
  );

  background-clip: text;
  -webkit-background-clip: text;
}

.hero-subtitle.text-latin
  .hero-subtitle__text {
  color: transparent;
  -webkit-text-fill-color: transparent;

  background-image: linear-gradient(
    to right,
    var(--theme-color),
    #fff
  );

  background-clip: text;
  -webkit-background-clip: text;
}

/* =====================================================
   متن فارسی
===================================================== */

.text-persian {
  direction: rtl;
  unicode-bidi: plaintext;

  font-family:
    'DimaShekasteh',
    'IranNastaliq',
    'Noto Nastaliq Urdu',
    Tahoma,
    serif;

  letter-spacing: 0;
  word-spacing: 0;
}

.hero-title.text-persian {
  font-size: clamp(5rem, 10.5vw, 11rem);
  line-height: 1;

  color: rgba(255, 255, 255, 0.4);
}

.hero-subtitle.text-persian {
  margin-top: -0.58em;

  font-size: clamp(3.8rem, 7vw, 7.5rem);
  line-height: 1;

  color: var(--theme-color);
}

.hero-title.text-persian
  .hero-title__text {
  padding:
    0.62em
    0.18em
    0.58em;

  line-height: 1.4;

  color: currentColor;
  -webkit-text-fill-color: currentColor;
}

.hero-subtitle.text-persian
  .hero-subtitle__text {
  padding:
    0.58em
    0.18em
    0.62em;

  line-height: 1.42;

  color: currentColor;
  -webkit-text-fill-color: currentColor;
}

/* =====================================================
   محصول ـ اندازه اصلاح‌شده دسکتاپ
===================================================== */

.product {
  position: absolute;
  inset: 0;
  z-index: 3;

  display: flex;
  align-items: center;
  justify-content: center;

  pointer-events: none;

  perspective: 1100px;
  transform-style: preserve-3d;
}

.product__stage {
  position: relative;

  width: min(58vw, 820px);
  height: min(74vh, 760px);

  display: flex;
  align-items: center;
  justify-content: center;

  transform-style: preserve-3d;

  animation:
    product-float
    7s
    ease-in-out
    infinite;
}

.hero:not(.hero--paused) .product__stage {
  will-change: transform;
}

.product__stage--static {
  animation: none;
}

.product__layers {
  position: absolute;
  inset: 0;

  display: grid;
  place-items: center;

  isolation: isolate;
  transform-style: preserve-3d;
}

.product__layer {
  grid-area: 1 / 1;

  width: 100%;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;

  pointer-events: none;

  transform:
    translate3d(0, 0, 80px);

  transform-origin: center;
  transform-style: preserve-3d;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.product__image {
  display: block;

  width: auto;
  height: auto;

  /*
    محدودیت اصلی اندازه محصول در دسکتاپ
  */
  max-width: min(52vw, 720px);
  max-height: min(68vh, 700px);

  object-fit: contain;
  object-position: center;

  user-select: none;
  pointer-events: none;

  transform: translate3d(0, 0, 0.1px);
  transform-origin: center;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  filter:
    drop-shadow(
      0 28px 52px rgba(0, 0, 0, 0.58)
    );
}

.product__shadow {
  position: absolute;
  left: 50%;
  bottom: 4%;
  z-index: -1;

  width: min(30vw, 320px);
  height: 34px;

  transform: translateX(-50%);

  border-radius: 50%;

  background: rgba(0, 0, 0, 0.52);
  filter: blur(18px);

  pointer-events: none;
}

/* =====================================================
   پنل اطلاعات ـ اصلاح خروج از صفحه دسکتاپ
===================================================== */

.info-panel {
  position: absolute;

  /*
    فاصله امن از لبه راست و پایین
  */
  right: clamp(36px, 5vw, 90px);
  bottom: clamp(32px, 5vh, 64px);
  z-index: 10;

  /*
    عرض کارت با احتساب padding و border
  */
  width: clamp(300px, 24vw, 370px);
  max-width: calc(100vw - 72px);

  padding: 24px 24px 20px;

  overflow: hidden;

  color: #fff;

  border:
    1px solid
    rgba(255, 255, 255, 0.13);

  border-radius: 20px;

  background: rgba(7, 11, 25, 0.91);

  box-shadow:
    0 20px 55px rgba(0, 0, 0, 0.6);

  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  transform: translate3d(0, 0, 120px);

  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
}

.info-panel:hover {
  transform:
    translate3d(0, -5px, 130px);

  border-color:
    rgba(255, 255, 255, 0.22);
}

.info-panel__line-wrapper {
  width: 100%;

  display: flex;

  margin-bottom: 15px;
}

.info-panel[dir='rtl']
  .info-panel__line-wrapper {
  justify-content: flex-end;
}

.info-panel[dir='ltr']
  .info-panel__line-wrapper {
  justify-content: flex-start;
}

.info-panel__line {
  display: block;

  width: 52px;
  height: 3px;

  border-radius: 100px;

  box-shadow:
    0 0 14px var(--theme-color);

  transition: width 0.3s ease;
}

.info-panel:hover .info-panel__line {
  width: 72px;
}

/*
  توضیحات قدیم و جدید روی یکدیگر قرار می‌گیرند.
*/
.description-slot {
  position: relative;

  width: 100%;

  display: grid;

  isolation: isolate;
}

.description-slot > * {
  grid-area: 1 / 1;
}

.info-panel__description {
  width: 100%;
  min-width: 0;
  min-height: 3.6em;

  margin: 0 0 18px;

  color: rgba(255, 255, 255, 0.9);

  font-size:
    clamp(0.84rem, 1vw, 0.95rem);

  line-height: 1.9;

  white-space: pre-line;
  overflow-wrap: anywhere;
  word-break: normal;

  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.info-panel[dir='rtl']
  .info-panel__description {
  text-align: right;

  font-family:
    'Vazirmatn',
    Tahoma,
    sans-serif;
}

.info-panel[dir='ltr']
  .info-panel__description {
  text-align: left;
}

.info-panel__footer {
  min-width: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 14px;

  padding-top: 14px;

  border-top:
    1px solid
    rgba(255, 255, 255, 0.09);
}

.info-panel__button {
  min-width: 0;

  display: inline-flex;
  align-items: center;

  gap: 8px;

  color: var(--theme-color);
  text-decoration: none;

  font-size: 0.86rem;
  font-weight: 600;

  transition:
    gap 0.25s ease,
    opacity 0.25s ease;
}

.info-panel__button span {
  overflow-wrap: anywhere;
}

.info-panel__button:hover {
  gap: 12px;
  opacity: 0.9;
}

.info-panel__button[dir='rtl']
  .info-panel__button-icon {
  transform: rotate(180deg);
}

.info-panel__button-icon {
  flex: 0 0 auto;
}

/* =====================================================
   شمارنده
===================================================== */

.slide-counter {
  flex: 0 0 auto;

  display: flex;
  align-items: center;

  gap: 4px;

  direction: ltr;

  font-family: monospace;
  font-size: 0.82rem;
}

.slide-counter__current {
  font-weight: 700;
}

.slide-counter__separator,
.slide-counter__total {
  color: rgba(255, 255, 255, 0.4);
}

/* =====================================================
   تایمر
===================================================== */

.hero-timer {
  position: absolute;
  left: 50%;
  bottom: clamp(25px, 4vh, 46px);
  z-index: 9;

  width: 48px;
  height: 48px;

  display: flex;
  align-items: center;
  justify-content: center;

  transform:
    translate3d(-50%, 0, 120px);

  pointer-events: none;
}

.hero-timer > svg {
  transform: rotate(-90deg);
}

.hero-timer__background {
  fill: rgba(0, 0, 0, 0.4);

  stroke: rgba(255, 255, 255, 0.18);
  stroke-width: 2;
}

.hero-timer__progress {
  fill: none;

  stroke-width: 2.5;
  stroke-linecap: round;

  stroke-dasharray: 138;
  stroke-dashoffset: 138;

  animation:
    timer-progress
    linear
    forwards;
}

.hero-timer__icon {
  position: absolute;

  display: flex;
  align-items: center;
  justify-content: center;

  color: rgba(255, 255, 255, 0.7);

  animation:
    timer-bounce
    2s
    ease-in-out
    infinite;
}

/* =====================================================
   گوشه‌ها
===================================================== */

.corner {
  position: absolute;
  z-index: 4;

  width: clamp(110px, 13vw, 200px);
  height: clamp(110px, 13vw, 200px);

  pointer-events: none;
}

.corner--top {
  top: clamp(20px, 4vw, 40px);
  left: clamp(20px, 4vw, 40px);

  border-top:
    1px solid
    rgba(255, 255, 255, 0.15);

  border-left:
    1px solid
    rgba(255, 255, 255, 0.15);
}

.corner--bottom {
  right: clamp(20px, 4vw, 40px);
  bottom: clamp(20px, 4vw, 40px);

  border-right:
    1px solid
    rgba(255, 255, 255, 0.15);

  border-bottom:
    1px solid
    rgba(255, 255, 255, 0.15);
}

/* =====================================================
   Keyframes
===================================================== */

@keyframes product-float {
  0%,
  100% {
    transform:
      translate3d(0, 0, 0)
      rotateY(0deg);
  }

  50% {
    transform:
      translate3d(0, -16px, 18px)
      rotateY(1.3deg);
  }
}

@keyframes timer-progress {
  from {
    stroke-dashoffset: 138;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes timer-bounce {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(3px);
  }
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

/* =====================================================
   ترنزیشن پس‌زمینه ـ Slide
===================================================== */

.background-slide-enter-active,
.background-slide-leave-active {
  transition:
    opacity 1.05s ease,
    transform 1.35s
      cubic-bezier(0.22, 1, 0.36, 1),
    filter 1.05s ease;
}

.background-slide-enter-from {
  opacity: 0;

  transform:
    translate3d(5%, 0, -160px)
    scale(1.12);

  filter:
    brightness(0.22)
    blur(4px);
}

.background-slide-leave-to {
  opacity: 0;

  transform:
    translate3d(-5%, 0, -180px)
    scale(1.08);

  filter:
    brightness(0.18)
    blur(5px);
}

/* =====================================================
   ترنزیشن پس‌زمینه ـ Fade
===================================================== */

.background-fade-enter-active,
.background-fade-leave-active {
  transition:
    opacity 1.2s ease,
    transform 1.45s ease,
    filter 1.2s ease;
}

.background-fade-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 0, -180px)
    scale(1.12);

  filter:
    brightness(0.2)
    blur(10px);
}

.background-fade-leave-to {
  opacity: 0;

  transform:
    translate3d(0, 0, -210px)
    scale(1.06);

  filter:
    brightness(0.16)
    blur(9px);
}

/* =====================================================
   ترنزیشن پس‌زمینه ـ Zoom
===================================================== */

.background-zoom-enter-active,
.background-zoom-leave-active {
  transition:
    opacity 1.1s ease,
    transform 1.5s
      cubic-bezier(0.22, 1, 0.36, 1),
    filter 1.05s ease;
}

.background-zoom-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 0, -260px)
    scale(0.9);

  filter:
    brightness(0.18)
    blur(8px);
}

.background-zoom-leave-to {
  opacity: 0;

  transform:
    translate3d(0, 0, 120px)
    scale(1.2);

  filter:
    brightness(0.2)
    blur(7px);
}

/* =====================================================
   عنوان ـ Slide
===================================================== */

.title-slide-enter-active {
  z-index: 8;

  transition:
    opacity 0.82s ease 0.1s,
    transform 1s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.1s,
    filter 0.76s ease 0.1s;
}

.title-slide-enter-from {
  opacity: 0;

  transform:
    translate3d(-10%, -14px, -170px)
    rotateY(13deg)
    scale(0.92);

  filter: blur(7px);
}

.title-slide-enter-to {
  opacity: 0.9;
  visibility: visible;
}

/* =====================================================
   عنوان ـ Fade
===================================================== */

.title-fade-enter-active {
  z-index: 8;

  transition:
    opacity 0.78s ease 0.14s,
    transform 0.92s ease 0.14s,
    filter 0.76s ease 0.14s;
}

.title-fade-enter-from {
  opacity: 0;

  transform:
    translate3d(0, -20px, -130px)
    scale(0.96);

  filter: blur(11px);
}

.title-fade-enter-to {
  opacity: 0.9;
  visibility: visible;
}

/* =====================================================
   عنوان ـ Zoom
===================================================== */

.title-zoom-enter-active {
  z-index: 8;

  transition:
    opacity 0.84s ease 0.12s,
    transform 1.05s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.12s,
    filter 0.8s ease 0.12s;
}

.title-zoom-enter-from {
  opacity: 0;

  transform:
    translate3d(0, -12px, -260px)
    rotateX(11deg)
    scale(0.74);

  filter: blur(10px);
}

.title-zoom-enter-to {
  opacity: 0.9;
  visibility: visible;
}

/* =====================================================
   زیرعنوان ـ Slide
===================================================== */

.subtitle-slide-enter-active {
  z-index: 8;

  transition:
    opacity 0.78s ease 0.24s,
    transform 1s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.24s,
    filter 0.76s ease 0.24s;
}

.subtitle-slide-enter-from {
  opacity: 0;

  transform:
    translate3d(11%, 20px, -90px)
    rotateY(-11deg)
    scale(0.94);

  filter: blur(8px);
}

.subtitle-slide-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   زیرعنوان ـ Fade
===================================================== */

.subtitle-fade-enter-active {
  z-index: 8;

  transition:
    opacity 0.72s ease 0.28s,
    transform 0.88s ease 0.28s,
    filter 0.72s ease 0.28s;
}

.subtitle-fade-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 22px, -80px)
    scale(0.95);

  filter: blur(12px);
}

.subtitle-fade-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   زیرعنوان ـ Zoom
===================================================== */

.subtitle-zoom-enter-active {
  z-index: 8;

  transition:
    opacity 0.78s ease 0.28s,
    transform 1s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.28s,
    filter 0.75s ease 0.28s;
}

.subtitle-zoom-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 18px, -180px)
    rotateX(-9deg)
    scale(0.8);

  filter: blur(11px);
}

.subtitle-zoom-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   محصول ـ Slide
===================================================== */

.product-slide-enter-active {
  z-index: 8;

  transition:
    opacity 0.92s ease 0.04s,
    transform 1.2s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.04s,
    filter 0.86s ease 0.04s;
}

.product-slide-enter-from {
  opacity: 0;

  transform:
    translate3d(150px, 25px, 210px)
    rotateY(-23deg)
    rotateX(5deg)
    scale(0.84);

  filter:
    blur(10px)
    brightness(0.72);
}

.product-slide-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   محصول ـ Fade
===================================================== */

.product-fade-enter-active {
  z-index: 8;

  transition:
    opacity 1s ease 0.06s,
    transform 1.15s
      cubic-bezier(0.22, 1, 0.36, 1)
      0.06s,
    filter 0.95s ease 0.06s;
}

.product-fade-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 22px, -180px)
    rotateX(6deg)
    scale(0.89);

  filter:
    blur(14px)
    brightness(0.72);
}

.product-fade-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   محصول ـ Zoom
===================================================== */

.product-zoom-enter-active {
  z-index: 8;

  transition:
    opacity 1s ease 0.03s,
    transform 1.25s
      cubic-bezier(0.16, 1, 0.3, 1)
      0.03s,
    filter 0.9s ease 0.03s;
}

.product-zoom-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 20px, 300px)
    rotateY(-13deg)
    rotateX(5deg)
    scale(1.3);

  filter:
    blur(12px)
    brightness(0.76);
}

.product-zoom-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   توضیحات ـ Slide
===================================================== */

.description-slide-enter-active {
  z-index: 5;

  transition:
    opacity 0.55s ease 0.35s,
    transform 0.7s
      cubic-bezier(0.22, 1, 0.36, 1)
      0.35s,
    filter 0.54s ease 0.35s;
}

.description-slide-enter-from {
  opacity: 0;

  transform:
    translate3d(26px, 9px, -45px);

  filter: blur(4px);
}

.description-slide-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   توضیحات ـ Fade
===================================================== */

.description-fade-enter-active {
  z-index: 5;

  transition:
    opacity 0.58s ease 0.4s,
    transform 0.68s ease 0.4s,
    filter 0.58s ease 0.4s;
}

.description-fade-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 11px, -30px);

  filter: blur(6px);
}

.description-fade-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   توضیحات ـ Zoom
===================================================== */

.description-zoom-enter-active {
  z-index: 5;

  transition:
    opacity 0.58s ease 0.42s,
    transform 0.72s
      cubic-bezier(0.22, 1, 0.36, 1)
      0.42s,
    filter 0.58s ease 0.42s;
}

.description-zoom-enter-from {
  opacity: 0;

  transform:
    translate3d(0, 9px, -90px)
    scale(0.94);

  filter: blur(6px);
}

.description-zoom-enter-to {
  opacity: 1;
  visibility: visible;
}

/* =====================================================
   رفع قطعی چشمک نسخه قبلی
===================================================== */

/*
  عنوان قبلی، زیرعنوان قبلی، محصول قبلی و توضیح قبلی
  از همان فریم آغاز خروج مخفی می‌شوند.

  چون لایه‌ها Grid هستند، مخفی‌شدن نسخه قبلی باعث
  پرش، تغییر ارتفاع یا جابه‌جایی نسخه جدید نمی‌شود.
*/

.title-slide-leave-active,
.title-slide-leave-from,
.title-slide-leave-to,
.title-fade-leave-active,
.title-fade-leave-from,
.title-fade-leave-to,
.title-zoom-leave-active,
.title-zoom-leave-from,
.title-zoom-leave-to,

.subtitle-slide-leave-active,
.subtitle-slide-leave-from,
.subtitle-slide-leave-to,
.subtitle-fade-leave-active,
.subtitle-fade-leave-from,
.subtitle-fade-leave-to,
.subtitle-zoom-leave-active,
.subtitle-zoom-leave-from,
.subtitle-zoom-leave-to,

.product-slide-leave-active,
.product-slide-leave-from,
.product-slide-leave-to,
.product-fade-leave-active,
.product-fade-leave-from,
.product-fade-leave-to,
.product-zoom-leave-active,
.product-zoom-leave-from,
.product-zoom-leave-to,

.description-slide-leave-active,
.description-slide-leave-from,
.description-slide-leave-to,
.description-fade-leave-active,
.description-fade-leave-from,
.description-fade-leave-to,
.description-zoom-leave-active,
.description-zoom-leave-from,
.description-zoom-leave-to {
  z-index: 0 !important;

  opacity: 0 !important;
  visibility: hidden !important;

  pointer-events: none !important;

  transition: none !important;
  animation: none !important;
}

/*
  نسخه جدید همیشه بالاتر است.
*/
.title-slide-enter-active,
.title-fade-enter-active,
.title-zoom-enter-active,
.subtitle-slide-enter-active,
.subtitle-fade-enter-active,
.subtitle-zoom-enter-active,
.product-slide-enter-active,
.product-fade-enter-active,
.product-zoom-enter-active,
.description-slide-enter-active,
.description-fade-enter-active,
.description-zoom-enter-active {
  z-index: 8 !important;
  visibility: visible !important;
  pointer-events: none !important;
}

/* =====================================================
   دسکتاپ متوسط و لپ‌تاپ
===================================================== */

@media (max-width: 1280px) {
  .product__stage {
    width: min(55vw, 690px);
    height: min(70vh, 660px);
  }

  .product__image {
    max-width: min(49vw, 620px);
    max-height: min(64vh, 610px);
  }

  .info-panel {
    right: clamp(30px, 4vw, 55px);

    width: clamp(290px, 27vw, 350px);
    max-width: calc(100vw - 60px);
  }
}

/* =====================================================
   تبلت
===================================================== */

@media (max-width: 1024px) {
  .hero {
    min-height: 650px;
  }

  .hero-title {
    font-size: clamp(5rem, 15vw, 9rem);
  }

  .hero-subtitle {
    font-size: clamp(3.8rem, 10vw, 6.5rem);
  }

  .hero-title.text-persian {
    font-size: clamp(4.8rem, 14vw, 8.5rem);
  }

  .hero-subtitle.text-persian {
    font-size: clamp(3.6rem, 10vw, 6.2rem);
  }

  .product__stage {
    width: min(66vw, 650px);
    height: min(66vh, 620px);
  }

  .product__image {
    max-width: min(60vw, 580px);
    max-height: min(59vh, 570px);
  }

  .info-panel {
    right: 28px;
    bottom: 34px;

    width: min(330px, calc(100vw - 56px));
    max-width: calc(100vw - 56px);
  }
}

/* =====================================================
   موبایل
===================================================== */

@media (max-width: 768px) {
  .hero {
    height: 100svh !important;
    min-height: 640px;

    perspective: 1000px;
  }

  .hero__texture {
    display: none;
  }

  .hero__overlay {
    background:
      linear-gradient(
        to bottom,
        rgba(5, 8, 20, 0.12) 0%,
        rgba(5, 8, 20, 0.04) 38%,
        rgba(5, 8, 20, 0.55) 68%,
        rgba(5, 8, 20, 0.97) 100%
      ),
      radial-gradient(
        circle at center,
        transparent 6%,
        rgba(5, 8, 20, 0.35) 66%,
        #050814 100%
      );
  }

  .typography {
    top: 29%;

    transform:
      translate3d(-50%, -50%, -40px);
  }

  .hero-title {
    font-size: 19vw;
  }

  .hero-subtitle {
    font-size: 13vw;
  }

  .hero-title.text-persian {
    font-size: 17vw;
  }

  .hero-subtitle.text-persian {
    margin-top: -0.65em;
    font-size: 12.5vw;
  }

  .hero-title.text-persian
    .hero-title__text {
    padding:
      0.66em
      0.12em
      0.56em;
  }

  .hero-subtitle.text-persian
    .hero-subtitle__text {
    padding:
      0.6em
      0.12em
      0.64em;
  }

  .product {
    align-items: flex-start;
    padding-top: 28vh;
  }

  .product__stage {
    width: 100%;
    height: 43vh;

    animation: none;
  }

  .hero:not(.hero--paused) .product__stage {
    will-change: auto;
  }

  .product__image {
    max-width: 86vw;
    max-height: 52vh;
  }

  .product__shadow {
    width: min(44vw, 250px);
    height: 28px;
  }

  .info-panel {
    right: 0;
    bottom: 0;
    left: 0;

    width: 100%;
    max-width: 100%;

    padding:
      18px
      21px
      max(16px, env(safe-area-inset-bottom));

    border-right: 0;
    border-bottom: 0;
    border-left: 0;

    border-radius: 18px 18px 0 0;

    background: rgba(5, 8, 20, 0.96);

    box-shadow:
      0 -16px 40px
      rgba(0, 0, 0, 0.42);

    backdrop-filter: none;
    -webkit-backdrop-filter: none;

    transform: none;
  }

  .info-panel:hover {
    transform: none;
  }

  .info-panel__description {
    min-height: auto;

    margin-bottom: 12px;

    font-size: 0.85rem;
    line-height: 1.7;
  }

  .info-panel__footer {
    padding-top: 10px;
  }

  .hero-timer {
    top: auto;
    bottom: 190px;
  }

  .corner {
    display: none;
  }

  .product-slide-enter-from {
    transform:
      translate3d(90px, 18px, 130px)
      rotateY(-17deg)
      scale(0.86);
  }

  .product-zoom-enter-from {
    transform:
      translate3d(0, 16px, 210px)
      rotateY(-10deg)
      scale(1.2);
  }
}

/* =====================================================
   موبایل کوچک
===================================================== */

@media (max-width: 480px) {
  .hero {
    min-height: 610px;
  }

  .typography {
    top: 25%;
  }

  .hero-title {
    font-size: 21vw;
    opacity: 0.74;
  }

  .hero-subtitle {
    font-size: 14.5vw;
  }

  .hero-title.text-persian {
    font-size: 19vw;
  }

  .hero-subtitle.text-persian {
    margin-top: -0.68em;
    font-size: 14vw;
  }

  .product {
    padding-top: 27vh;
  }

  .product__stage {
    height: 38vh;
  }

  .product__image {
    max-width: 88vw;
    max-height: 46vh;
  }

  .info-panel {
    padding:
      16px
      18px
      max(14px, env(safe-area-inset-bottom));
  }

  .info-panel__line-wrapper {
    margin-bottom: 9px;
  }

  .info-panel__line {
    width: 46px;
  }

  .info-panel__description {
    margin-bottom: 9px;

    font-size: 0.8rem;
    line-height: 1.6;
  }

  .info-panel__footer {
    padding-top: 8px;
  }

  .info-panel__button {
    font-size: 0.79rem;
  }

  .hero-timer {
    bottom: 175px;
  }
}

/* =====================================================
   نمایشگرهای موبایل کوتاه
===================================================== */

@media (max-width: 768px) and (max-height: 700px) {
  .hero {
    min-height: 570px;
  }

  .typography {
    top: 24%;
  }

  .product {
    padding-top: 25vh;
  }

  .product__stage {
    height: 36vh;
  }

  .product__image {
    max-width: 64vw;
    max-height: 34vh;
  }

  .info-panel {
    padding-top: 12px;
  }

  .info-panel__line-wrapper {
    margin-bottom: 6px;
  }

  .info-panel__description {
    margin-bottom: 7px;

    font-size: 0.77rem;
    line-height: 1.48;
  }

  .info-panel__footer {
    padding-top: 7px;
  }

  .hero-timer {
    display: none;
  }
}

/* =====================================================
   حالت بارگذاری
===================================================== */

.hero-loading {
  width: 100%;
  height: 100svh;
  min-height: 560px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #050814;
}

.hero-loading__spinner {
  width: 44px;
  height: 44px;

  border:
    2px solid
    rgba(255, 255, 255, 0.14);

  border-top-color: #c8aa55;
  border-radius: 50%;

  animation:
    spinner
    0.8s
    linear
    infinite;
}

/* =====================================================
   کاهش حرکت
===================================================== */

@media (prefers-reduced-motion: reduce) {
  .product__stage,
  .hero-loading__spinner,
  .hero-timer__progress,
  .hero-timer__icon {
    animation: none !important;
  }

  .hero__background,
  .hero-title,
  .hero-subtitle,
  .product__layer,
  .info-panel__description {
    transition-duration:
      0.2s !important;

    transition-delay:
      0s !important;

    transform: none;
    filter: none;
  }

  .background-slide-enter-from,
  .background-fade-enter-from,
  .background-zoom-enter-from,
  .title-slide-enter-from,
  .title-fade-enter-from,
  .title-zoom-enter-from,
  .subtitle-slide-enter-from,
  .subtitle-fade-enter-from,
  .subtitle-zoom-enter-from,
  .product-slide-enter-from,
  .product-fade-enter-from,
  .product-zoom-enter-from,
  .description-slide-enter-from,
  .description-fade-enter-from,
  .description-zoom-enter-from {
    opacity: 0;
    transform: none;
    filter: none;
  }
}
</style>
