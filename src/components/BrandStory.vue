<script setup>
import { useI18n } from 'vue-i18n'
import logo from '../assests/logo/Nourmehr-gold.webp'
import storyImage from '../assests/logo/Screenshot 2026-07-30 012554.webp'

const { t } = useI18n()

const stats = [
  { valueKey: 'story_stat_1_value', labelKey: 'story_stat_1_label' },
  { valueKey: 'story_stat_2_value', labelKey: 'story_stat_2_label' },
  { valueKey: 'story_stat_3_value', labelKey: 'story_stat_3_label' },
]
</script>

<template>
  <section class="story">
    <div class="story__card">

      <!-- ── تصویر ── -->
      <figure class="story__media">
        <img
          :src="storyImage"
          :alt="t('brand_name')"
          class="story__img"
          loading="lazy"
          decoding="async"
        />

        <div class="years">
          <span class="years__value">{{ t('story_years_value') }}</span>
          <span class="years__label">{{ t('story_years_label') }}</span>
        </div>
      </figure>

      <!-- ── پنل طلایی ── -->
      <div class="story__panel">
        <header class="panel__head">
          <div class="panel__titles">
            <h2 class="panel__title">{{ t('brand_name') }}</h2>
            <p class="panel__tagline">{{ t('brand_tagline') }}</p>
          </div>

          <span class="seal">
            <img :src="logo" :alt="t('brand_name')" loading="lazy" decoding="async" />
          </span>
        </header>

        <p class="panel__text">{{ t('story_p1') }}</p>
        <p class="panel__text">{{ t('story_p2') }}</p>

        <div class="panel__stats">
          <div v-for="(s, i) in stats" :key="i" class="stat">
            <span class="stat__value">{{ t(s.valueKey) }}</span>
            <span class="stat__label">{{ t(s.labelKey) }}</span>
          </div>
        </div>

        <router-link to="/about" class="panel__cta">
          {{ t('story_cta') }}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </router-link>
      </div>

    </div>
  </section>
</template>

<style scoped>
.story {
  --gold: #d8b46a;
  --gold-light: #e7ca8f;   /* سر روشن گرادیان */
  --gold-dark:  #b6974f;   /* سر تیره گرادیان */
  --gold-line: rgba(216, 180, 106, 0.22);
  --ink: #211705;                 /* متن روی پنل طلایی */
  --ink-soft: rgba(33, 23, 5, 0.74);
  --surface: #0d0d10;
  --title-color: #f4efe6;
  --desc-color: rgba(244, 239, 230, 0.55);

  padding: clamp(36px, 5vw, 84px) clamp(12px, 4vw, 32px);
  direction: rtl;
}

/* ── کارت اصلی ── */
.story__card {
  position: relative;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  max-width: 1080px;
  margin: 0 auto;
  padding: clamp(12px, 1.6vw, 20px);
  border: 1px solid var(--gold-line);
  border-radius: 26px;
  background: var(--surface);
}

/* ── تصویر ── */
.story__media {
  position: relative;
  z-index: 1;
  margin: 0;
  border-radius: 18px;
  overflow: visible;
}

.story__img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 18px;
}

/* کارت شناور سال‌ها */
.years {
  position: absolute;
  z-index: 3;
  inset-inline-start: clamp(-8px, -1vw, 0px);
  top: clamp(14px, 2.4vw, 26px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 18px;
  border: 1px solid var(--gold-line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.32);
}

.years__value {
  font-size: clamp(1rem, 3vw, 1.3rem);
  font-weight: 700;
  line-height: 1;
  color: var(--gold);
}
.years__label {
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: var(--desc-color);
}

/* ── پنل طلایی ── */
.story__panel {
  position: relative;
  z-index: 2;
  margin-inline-start: clamp(-72px, -5vw, -32px);
  padding: clamp(20px, 2.6vw, 32px);
  border-radius: 18px;
  background-color: #d8b46a;   /* پشتیبان مطلق */
  background-image: linear-gradient(
    152deg,
    var(--gold-light) 0%,
    var(--gold) 46%,
    var(--gold-dark) 100%
  );
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: clamp(12px, 1.8vw, 18px);
  margin-bottom: clamp(12px, 1.8vw, 18px);
  border-bottom: 1px solid rgba(33, 23, 5, 0.2);
}

.panel__title {
  margin: 0 0 4px;
  font-size: clamp(1.05rem, 3vw, 1.35rem);
  font-weight: 700;
  color: var(--ink);
}

.panel__tagline {
  margin: 0;
  font-size: clamp(0.7rem, 2vw, 0.8rem);
  color: var(--ink-soft);
}

/* مدال لوگو */
.seal {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: clamp(52px, 8vw, 66px);
  height: clamp(52px, 8vw, 66px);
  border-radius: 16px;
  background: #14110c;
  box-shadow: inset 0 0 0 1px rgba(216, 180, 106, 0.4);
}
.seal img { width: 66%; height: auto; display: block; }

.panel__text {
  margin: 0 0 10px;
  font-size: clamp(0.76rem, 2vw, 0.88rem);
  line-height: 1.95;
  color: var(--ink-soft);
  text-align: justify;
}
.panel__text:last-of-type { margin-bottom: 0; }

/* آمارها */
.panel__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: clamp(16px, 2.2vw, 22px) 0;
  padding: clamp(12px, 1.6vw, 16px) 0;
  border-top: 1px solid rgba(33, 23, 5, 0.2);
  border-bottom: 1px solid rgba(33, 23, 5, 0.2);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-inline-start: 1px solid rgba(33, 23, 5, 0.18);
}
.stat:first-child { border-inline-start: 0; }

.stat__value {
  font-size: clamp(0.85rem, 2.4vw, 1.05rem);
  font-weight: 700;
  color: var(--ink);
}
.stat__label {
  font-size: clamp(0.62rem, 1.8vw, 0.72rem);
  color: var(--ink-soft);
  text-align: center;
}

/* ── CTA ── */
.panel__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 999px;
  background: #14110c;
  font-size: 0.8rem;
  color: var(--gold);
  text-decoration: none;
  transition: background-color 0.25s ease, color 0.25s ease;
}
.panel__cta svg { width: 15px; height: 15px; }

@media (hover: hover) and (pointer: fine) {
  .panel__cta:hover { background: #241d10; color: #f0dcae; }
}

/* ── موبایل: جمع و جور ── */
@media (max-width: 900px) {
  .story__card { grid-template-columns: 1fr; padding: 10px; border-radius: 22px; }
  .story__img { aspect-ratio: 16 / 11; }
  .story__panel {
    margin-inline-start: 0;
    margin-top: clamp(-34px, -6vw, -20px);
    margin-inline: clamp(6px, 2vw, 14px);
    padding: 18px 16px;
  }
}

@media (max-width: 520px) {
  .story { padding: 28px 12px; }
  .panel__text { text-align: right; font-size: 0.78rem; line-height: 1.85; }
  .years { padding: 9px 14px; top: 12px; }
  .panel__stats { padding: 10px 0; margin: 14px 0; }
  .panel__cta { width: 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .panel__cta { transition: none; }
}
</style>
