<template>
  <section v-if="homeCategories.length" class="hcx-root">
    <!-- هدر -->
    <header class="hcx-head">
      <div class="hcx-head-text">
        <span class="hcx-eyebrow"><i class="dot"></i>{{ t('nav_categories') }}</span>
        <h2 class="hcx-title">{{ t('home_categories_title') }}</h2>
      </div>
      <router-link :to="{ name: 'Products', params: { lang: locale } }" class="hcx-all">
        <span>{{ t('products_all_categories') }}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </router-link>
    </header>

    <!-- کارت شاخص + شبکه -->
    <div class="hcx-layout" :class="{ single: homeCategories.length === 1 }">
      <router-link
        v-if="featured"
        :to="catLink(featured)"
        class="hcx-feature"
      >
        <div class="fx-media">
          <img v-if="featured.image" :src="getImageUrl(featured.image)" :alt="catName(featured)" loading="lazy" />
          <span v-else class="fx-icon">{{ featured.icon || '◆' }}</span>
          <span class="fx-glow"></span>
        </div>
        <div class="fx-body">
          <span class="fx-badge">{{ isFa ? 'مجموعه ویژه' : 'Featured' }}</span>
          <h3 class="fx-name">{{ catName(featured) }}</h3>
          <p v-if="catDesc(featured)" class="fx-desc">{{ catDesc(featured) }}</p>
          <span class="fx-cta">
            {{ t('home_view_all') }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
      </router-link>

      <div v-if="rest.length" class="hcx-grid">
        <router-link
          v-for="(cat, i) in rest"
          :key="cat._id"
          :to="catLink(cat)"
          class="hcx-card"
          :style="{ '--i': i }"
        >
          <span class="hc-media">
            <img v-if="cat.image" :src="getImageUrl(cat.image)" :alt="catName(cat)" loading="lazy" />
            <span v-else class="hc-icon">{{ cat.icon || '◆' }}</span>
          </span>
          <span class="hc-text">
            <span class="hc-name">{{ catName(cat) }}</span>
            <span v-if="catDesc(cat)" class="hc-desc">{{ catDesc(cat) }}</span>
          </span>
          <span class="hc-arrow" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPublicCategories } from '../services/categoryApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, locale } = useI18n()
const isFa = computed(() => locale.value === 'fa')

const allCategories = ref([])

// فقط دسته‌بندی‌های فعال‌شده برای صفحه اصلی + مرتب بر اساس sortOrder
const homeCategories = computed(() =>
  [...allCategories.value]
    .filter((c) => c.showOnHome)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

// اولین دسته = کارت شاخص (بزرگ). بقیه در شبکه می‌آیند.
const featured = computed(() => homeCategories.value[0] || null)
const rest = computed(() => homeCategories.value.slice(1))

const pickText = (v) => {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v[locale.value] || v.fa || v.en || ''
}
const catName = (cat) => pickText(cat?.name)
const catDesc = (cat) => pickText(cat?.description)

const catLink = (cat) => ({
  name: 'Products',
  params: { lang: locale.value },
  query: { category: cat.slug },
})

onMounted(async () => {
  try {
    allCategories.value = await getPublicCategories()
  } catch (e) {
    console.error('[HomeCategories] خطا:', e)
  }
})
</script>

<style scoped>
.hcx-root {
  padding: 64px clamp(16px, 4vw, 60px);
  max-width: 1460px;
  margin: 0 auto;
}

/* ---------- هدر ---------- */
.hcx-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 18px; flex-wrap: wrap; margin-bottom: 26px;
}
.hcx-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 0.76rem; letter-spacing: 2.5px; color: #c5a059;
}
.hcx-eyebrow .dot {
  width: 6px; height: 6px; border-radius: 50%; background: #c5a059;
  box-shadow: 0 0 10px rgba(197,160,89,.8);
}
.hcx-title {
  margin: 8px 0 0; font-size: clamp(1.35rem, 2.6vw, 1.95rem);
  font-weight: 800; color: #fff; line-height: 1.35;
}
.hcx-all {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 18px; border-radius: 999px; text-decoration: none;
  border: 1px solid rgba(197,160,89,.35); color: #facc6b;
  font-size: .85rem; font-weight: 600; white-space: nowrap;
  transition: background .25s ease, transform .25s ease;
}
.hcx-all:hover { background: rgba(197,160,89,.12); transform: translateY(-2px); }

/* ---------- چیدمان ---------- */
.hcx-layout {
  display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr);
  gap: 20px; align-items: stretch;
}
.hcx-layout.single { grid-template-columns: 1fr; }

/* ---------- کارت شاخص ---------- */
.hcx-feature {
  position: relative; display: flex; flex-direction: column;
  text-decoration: none; color: inherit; overflow: hidden;
  border-radius: 22px; border: 1px solid rgba(197,160,89,.22);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(197,160,89,.14), transparent 62%),
    linear-gradient(165deg, rgba(20,24,38,.96), rgba(7,9,16,.99));
  transition: transform .35s cubic-bezier(.16,1,.3,1), border-color .35s ease;
}
.hcx-feature:hover { transform: translateY(-5px); border-color: rgba(197,160,89,.55); }
.fx-media {
  position: relative; flex: 1; min-height: 230px;
  display: flex; align-items: center; justify-content: center; padding: 26px;
}
.fx-media img {
  max-width: 100%; max-height: 260px; object-fit: contain;
  filter: drop-shadow(0 18px 34px rgba(0,0,0,.55));
  transition: transform .5s cubic-bezier(.16,1,.3,1);
}
.hcx-feature:hover .fx-media img { transform: scale(1.07) rotate(-1deg); }
.fx-icon { font-size: 4rem; color: #c5a059; text-shadow: 0 0 34px rgba(197,160,89,.55); }
.fx-glow {
  position: absolute; inset-inline: 12%; bottom: 6px; height: 26px;
  background: radial-gradient(50% 100% at 50% 50%, rgba(197,160,89,.28), transparent 70%);
  filter: blur(6px); pointer-events: none;
}
.fx-body { padding: 0 24px 24px; }
.fx-badge {
  display: inline-block; padding: 4px 12px; border-radius: 999px;
  background: rgba(197,160,89,.14); color: #facc6b; font-size: .72rem; font-weight: 600;
}
.fx-name { margin: 10px 0 0; font-size: 1.3rem; font-weight: 800; color: #fff; }
.fx-desc {
  margin: 8px 0 0; font-size: .88rem; line-height: 1.9;
  color: rgba(255,255,255,.6);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.fx-cta {
  display: inline-flex; align-items: center; gap: 7px; margin-top: 14px;
  color: #c5a059; font-size: .85rem; font-weight: 600;
}
.hcx-feature:hover .fx-cta { color: #facc6b; }

/* ---------- شبکه ---------- */
.hcx-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
.hcx-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border-radius: 16px; text-decoration: none; color: inherit;
  background: linear-gradient(160deg, rgba(18,22,36,.9), rgba(8,10,18,.96));
  border: 1px solid rgba(255,255,255,.06);
  transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .3s ease, background .3s ease;
}
.hcx-card:hover {
  transform: translateY(-3px);
  border-color: rgba(197,160,89,.4);
  background: linear-gradient(160deg, rgba(26,30,46,.95), rgba(10,12,20,.98));
}
.hc-media {
  flex-shrink: 0; width: 62px; height: 62px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 35%, rgba(197,160,89,.12), rgba(255,255,255,.02) 70%);
  border: 1px solid rgba(255,255,255,.05);
}
.hc-media img { width: 82%; height: 82%; object-fit: contain; transition: transform .35s ease; }
.hcx-card:hover .hc-media img { transform: scale(1.1); }
.hc-icon { font-size: 1.6rem; color: #c5a059; }
.hc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hc-name {
  font-size: .95rem; font-weight: 700; color: #f2f2f2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hcx-card:hover .hc-name { color: #facc6b; }
.hc-desc {
  font-size: .76rem; color: rgba(255,255,255,.45);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hc-arrow {
  flex-shrink: 0; color: rgba(197,160,89,.5);
  opacity: 0; transform: translateX(6px);
  transition: opacity .3s ease, transform .3s ease;
}
[dir="rtl"] .hc-arrow { transform: translateX(-6px); }
.hcx-card:hover .hc-arrow { opacity: 1; transform: translateX(0); }

/* ---------- ریسپانسیو ---------- */
@media (max-width: 1024px) {
  .hcx-layout { grid-template-columns: 1fr; }
  .fx-media { min-height: 200px; }
  .fx-media img { max-height: 210px; }
}
@media (max-width: 768px) {
  .hcx-root { padding: 44px 14px 50px; }
  .hcx-head { align-items: flex-start; }
  .hcx-grid { grid-template-columns: 1fr; gap: 10px; }
  .hcx-card { padding: 12px 14px; }
  .hc-media { width: 54px; height: 54px; }
  .fx-body { padding: 0 18px 20px; }
  .fx-name { font-size: 1.12rem; }
}
@media (prefers-reduced-motion: reduce) {
  .hcx-feature, .hcx-card, .fx-media img, .hc-media img, .hcx-all { transition: none; }
}
</style>