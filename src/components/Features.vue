<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const features = [
  {
    id: 1,
    titleKey: 'features_quality_title',
    descKey: 'features_quality_desc',
    paths: ['M6 3h12l3 6-9 12L3 9z', 'M9 3 6 9l6 12 6-12-3-6', 'M3 9h18'],
  },
  {
    id: 2,
    titleKey: 'features_warranty_title',
    descKey: 'features_warranty_desc',
    paths: ['M12 3l7 3v5c0 4.5-2.9 8.1-7 10-4.1-1.9-7-5.5-7-10V6l7-3z', 'M9 12l2.2 2.2L15.5 10'],
  },
  {
    id: 3,
    titleKey: 'features_installment_title',
    descKey: 'features_installment_desc',
    paths: ['M2.5 7.5A2 2 0 0 1 4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z', 'M2.5 10.5h19', 'M6 15h4'],
  },
  {
    id: 4,
    titleKey: 'features_shipping_title',
    descKey: 'features_shipping_desc',
    paths: ['M21 8l-9-5-9 5v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 21V13'],
  },
]
</script>

<template>
  <section class="features-section">
    <div class="features-grid">
      <article v-for="item in features" :key="item.id" class="feature-card">
        <div class="feature-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path v-for="(d, i) in item.paths" :key="i" :d="d" />
          </svg>
        </div>

        <h3 class="feature-title">{{ t(item.titleKey) }}</h3>
        <p class="feature-desc">{{ t(item.descKey) }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
/* ─── Palette (اینجا رنگ‌ها را با تم سایت هماهنگ کنید) ─── */
.features-section {
  --gold: var(--brand-gold, #facc6b);
  --gold-line: rgba(250, 204, 107, 0.28);
  --gold-line-strong: rgba(250, 204, 107, 0.55);
  --title-color: var(--text-main, #ffffff);
  --desc-color: var(--text-muted, rgba(255, 255, 255, 0.55));

  padding: clamp(30px, 5vw, 64px) clamp(14px, 4vw, 32px);
  background: transparent;
}

/* ─── Grid: ۴ ستون دسکتاپ / ۲ ستون تبلت و موبایل ─── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 2vw, 22px);
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .features-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)); /* موبایل هم دوتایی */
    gap: 10px;
  }
}

/* ─── Card: فقط خط نازک طلایی ─── */
.feature-card {
  padding: clamp(16px, 3vw, 30px) clamp(10px, 2vw, 20px);
  text-align: center;
  border: 1px solid var(--gold-line);
  border-radius: 16px;
  background: transparent;
  transition: border-color 0.2s ease; /* در صورت نیاز حذف کنید */
}

@media (hover: hover) and (pointer: fine) {
  .feature-card:hover { border-color: var(--gold-line-strong); }
}

/* ─── Icon ─── */
.feature-icon {
  width: clamp(38px, 8vw, 46px);
  height: clamp(38px, 8vw, 46px);
  margin: 0 auto clamp(10px, 2vw, 16px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gold-line);
  border-radius: 50%;
  color: var(--gold);
}

.feature-icon svg {
  width: 50%;
  height: 50%;
  display: block;
}

/* ─── Text ─── */
.feature-title {
  margin: 0 0 6px;
  font-size: clamp(0.85rem, 2.4vw, 1.02rem);
  font-weight: 600;
  color: var(--title-color);
  letter-spacing: 0.01em;
}

.feature-desc {
  margin: 0;
  font-size: clamp(0.72rem, 2vw, 0.86rem);
  line-height: 1.7;
  color: var(--desc-color);
}
</style>
