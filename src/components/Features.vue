<script setup>
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const { t } = useI18n()

const features = [
  {
    id: 1,
    titleKey: 'features_quality_title',
    descKey: 'features_quality_desc',
    iconPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    color: '#facc6b',
  },
  {
    id: 2,
    titleKey: 'features_warranty_title',
    descKey: 'features_warranty_desc',
    iconPath: 'M20 6L9 17l-5-5',
    color: '#34d399',
    isStroke: true,
  },
  {
    id: 3,
    titleKey: 'features_custom_title',
    descKey: 'features_custom_desc',
    iconPath: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z',
    color: '#a78bfa',
  },
  {
    id: 4,
    titleKey: 'features_shipping_title',
    descKey: 'features_shipping_desc',
    iconPath: 'M5 12h14M12 5l7 7-7 7',
    color: '#38bdf8',
    isStroke: true,
  },
]

const cardRefs = ref([])
const isVisible = ref(false)

onMounted(() => {
  // اگر IntersectionObserver پشتیبانی نشود، مستقیم نمایش بده
  if (typeof IntersectionObserver === 'undefined') {
    isVisible.value = true
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          observer.disconnect()
        }
      })
    },
    { threshold: 0.15 }
  )

  cardRefs.value.forEach((el) => {
    if (el) observer.observe(el)
  })
})

</script>

<template>
  <section class="features-section">
    <div class="features-grid">
      <article
        v-for="(item, index) in features"
        :key="item.id"
        ref="cardRefs"
        class="feature-card glass"
        :class="{ 'is-visible': isVisible }"
        :style="{ '--delay': `${index * 0.12}s`, '--accent': item.color }"
      >

        <div class="feature-icon">
          <svg
            viewBox="0 0 24 24"
            :fill="item.isStroke ? 'none' : item.color"
            :stroke="item.isStroke ? item.color : 'none'"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path :d="item.iconPath" />
          </svg>

          <span class="icon-ring"></span>
        </div>

        <h3 class="feature-title">{{ $t(item.titleKey) }}</h3>
        <p class="feature-desc">{{ $t(item.descKey) }}</p>

        <div class="feature-underline"></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
/* ─── Section ─────────────────────────────────────────────── */
.features-section {
  position: relative;
  padding: clamp(40px, 6vw, 80px) clamp(16px, 4vw, 40px);
  background: transparent;
}

/* ─── Grid ────────────────────────────────────────────────── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 2.5vw, 26px);
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .features-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

/* ─── Card ────────────────────────────────────────────────── */
.feature-card {
  --accent: #facc6b;

  position: relative;
  padding: clamp(22px, 3.5vw, 32px) clamp(16px, 2.5vw, 24px);
  text-align: center;
  border-radius: 20px;
  overflow: hidden;
  cursor: default;
  isolation: isolate;

  /* Entry animation */
  opacity: 0;
  transform: translateY(32px) scale(0.97);
  transition:
    opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.4s ease,
    border-color 0.4s ease;
  transition-delay: var(--delay, 0s);
  will-change: transform, opacity;
}

.feature-card.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Hover lift — فقط روی دستگاه‌هایی که واقعاً hover دارند */
@media (hover: hover) and (pointer: fine) {
  .feature-card:hover {
    transform: translateY(-10px) scale(1.02);
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.75),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    border-color: rgba(250, 204, 107, 0.6); /* fallback */
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  }
}


/* ─── Icon ────────────────────────────────────────────────── */
.feature-icon {
  position: relative;
  width: 52px;
  height: 52px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.feature-icon svg {
  width: 26px;
  height: 26px;
  display: block;
  flex-shrink: 0;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease;
  filter: drop-shadow(0 0 6px rgba(250, 204, 107, 0.6)); /* fallback */
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover .feature-icon svg {
    transform: scale(1.25) rotate(-8deg);
    filter: drop-shadow(0 0 14px color-mix(in srgb, var(--accent) 90%, transparent));
  }
}

/* Icon circular background */
.feature-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(250, 204, 107, 0.35); /* fallback */
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  background: radial-gradient(
    circle at top,
    color-mix(in srgb, var(--accent) 18%, transparent) 0%,
    rgba(255, 255, 255, 0.04) 60%,
    transparent 100%
  );
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover .feature-icon::before {
    border-color: color-mix(in srgb, var(--accent) 65%, transparent);
    box-shadow:
      0 6px 24px rgba(0, 0, 0, 0.55),
      0 0 20px color-mix(in srgb, var(--accent) 25%, transparent);
  }
}

/* Pulse ring animation */
.icon-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px solid rgba(250, 204, 107, 0.5); /* fallback */
  border: 1.5px solid color-mix(in srgb, var(--accent) 50%, transparent);
  opacity: 0;
  transform: scale(0.85);
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover .icon-ring {
    animation: pulse-ring 1.6s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
  }
}

@keyframes pulse-ring {
  0%   { opacity: 0.7; transform: scale(0.85); }
  100% { opacity: 0;   transform: scale(1.55); }
}

/* ─── Text ────────────────────────────────────────────────── */
.feature-title {
  position: relative;
  font-size: clamp(0.95rem, 2.2vw, 1.1rem);
  font-weight: 700;
  margin: 0 0 10px;
  color: #fff;
  letter-spacing: 0.01em;
  z-index: 1;
  transition: color 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover .feature-title {
    color: color-mix(in srgb, var(--accent) 90%, #fff);
  }
}

.feature-desc {
  position: relative;
  font-size: clamp(0.82rem, 1.8vw, 0.9rem);
  line-height: 1.75;
  color: var(--text-muted, rgba(255, 255, 255, 0.58));
  margin: 0;
  z-index: 1;
  transition: color 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover .feature-desc {
    color: rgba(255, 255, 255, 0.78);
  }
}

/* ─── Underline ───────────────────────────────────────────── */
.feature-underline {
  position: relative;
  margin: 20px auto 0;
  width: 28px;
  height: 2px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  z-index: 1;
  transition: width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.feature-underline::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    to right,
    var(--accent),
    color-mix(in srgb, var(--accent) 30%, transparent)
  );
  transform: translateX(-100%);
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover .feature-underline {
    width: 64px;
  }
  .feature-card:hover .feature-underline::after {
    transform: translateX(0);
  }
}

/* روی موبایل/تاچ، خط تزئینی همیشه پر باشد چون hover نداریم */
@media (hover: none) {
  .feature-underline::after {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-card,
  .feature-icon svg,
  .feature-underline,
  .feature-underline::after {
    transition: none !important;
    animation: none !important;
  }

  .feature-card.is-visible {
    opacity: 1;
    transform: none;
  }
}
</style>
