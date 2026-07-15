<template>
  <section v-if="collections.length" class="lx-root" ref="rootRef">
    <div class="lx-ambient">
      <div class="lx-orb orb-a"></div>
      <div class="lx-orb orb-b"></div>
      <div class="lx-grid"></div>
    </div>

    <div
      v-for="(col, ci) in collections"
      :key="col._id"
      class="lx-block"
      :class="{ revealed: revealed[ci] }"
      :ref="el => setBlockRef(el, ci)"
      :data-idx="ci"
      :style="{ '--accent': col.bgColor || '#c5a059', '--ci': ci }"
    >
      <!-- HEADER -->
      <header class="lx-head">
        <div class="head-main">
          <div class="head-icon">
            <span class="icon-glyph">{{ col.icon || '✦' }}</span>
            <span class="icon-ring"></span>
            <span class="icon-ring ring-2"></span>
          </div>
          <div class="head-text">
            <span v-if="col.subtitle" class="head-eyebrow">
              <span class="eyebrow-dot"></span>{{ getLocalizedText(col.subtitle) }}
            </span>
            <h2 class="head-title">{{ getLocalizedText(col.title || col.name) }}</h2>
          </div>
        </div>

        <div class="head-side">
          <div class="head-nav">
            <button class="nav-btn" @click="scrollRow(ci, -1)" :aria-label="$t('home_prev_aria')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button class="nav-btn" @click="scrollRow(ci, 1)" :aria-label="$t('home_next_aria')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </button>
          </div>
          <router-link :to="{ name: 'CollectionView', params: { lang: locale, slug: col.slug } }" class="head-link">
            <span class="link-label">{{ $t('home_view_all') }}</span>
            <span class="link-arrow">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </span>
          </router-link>
        </div>
      </header>

      <div class="lx-divider"><span></span><i>◆</i><span></span></div>

      <!-- ROW -->
      <div class="lx-row" :ref="el => setRowRef(el, ci)">
        <!-- کارت محصول: دقیقاً مثل صفحه‌ی محصولات -->
        <article
          v-for="(product, pi) in col.products"
          :key="product._id"
          class="product-card"
          :style="{ '--pi': pi }"
          @click="goToProduct(product)"
        >
          <div class="card-inner">
            <div class="card-image-wrapper">
              <img
                class="card-image"
                :src="getImageUrl(product.mainImage || product.image)"
                :alt="getLocalizedText(product.name)"
                loading="lazy"
              />
              <div v-if="product.discountPercent" class="discount-tag">{{ formatNumber(product.discountPercent) }}%</div>
              <div v-if="product.category" class="card-badge">
                <span class="badge-icon">{{ getCategoryIcon(product.category) }}</span>
                <span>{{ getLocalizedText(product.category?.name || product.category) }}</span>
              </div>
            </div>

            <div class="card-content">
              <h2 class="product-title">{{ getLocalizedText(product.name) }}</h2>
              <div class="title-underline"></div>

              <div class="desc-box">
                <span class="desc-label">{{ $t('products_description') }}</span>
                <p class="short-desc">{{ getLocalizedText(product.shortDesc) || $t('products_no_description') }}</p>
              </div>

              <div class="card-footer">
                <router-link :to="{ name: 'ProductDetails', params: { lang: locale, id: product._id || product.id || product.slug } }" class="view-btn" @click.stop>
                  <span class="view-text">{{ $t('products_view') }}</span>
                  <span class="view-arrow">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </router-link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getHomeCollections } from '../services/collectionApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, locale } = useI18n()
const router = useRouter()

const collections = ref([])
const revealed = ref({})
const rootRef = ref(null)
const blockRefs = ref([])
const rowRefs = ref([])
let observer = null

const setBlockRef = (el, ci) => {
  if (el) blockRefs.value[ci] = el
}
const setRowRef = (el, ci) => {
  if (el) rowRefs.value[ci] = el
}

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[locale.value] || value.fa || ''
  }
  return ''
}

const formatNumber = (n) => Number(n || 0).toLocaleString(locale.value === 'fa' ? 'fa-IR' : 'en-US')

// آیکون دسته (سازگار با آبجکت یا رشته)
const getCategoryIcon = (category) => {
  if (category && typeof category === 'object' && category.icon) return category.icon
  return '◆'
}

const goToProduct = (p) => {
  if (p?._id || p?.id) {
    router.push({ name: 'ProductDetails', params: { lang: locale.value, id: p._id || p.id } })
  }
}

const scrollRow = (ci, dir) => {
  const row = rowRefs.value[ci]
  if (!row) return
  const isRTL = getComputedStyle(row).direction === 'rtl'
  const amount = Math.min(row.clientWidth * 0.8, 600) * dir * (isRTL ? -1 : 1)
  row.scrollBy({ left: amount, behavior: 'smooth' })
}

onMounted(async () => {
  try {
    collections.value = await getHomeCollections(10)
  } catch (e) {
    console.error('[HomeCollections] خطا:', e)
    collections.value = []
  }

  await nextTick()

  if (typeof IntersectionObserver === 'undefined') {
    collections.value.forEach((_, i) => { revealed.value[i] = true })
    return
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        const idx = Number(en.target.dataset.idx)
        revealed.value[idx] = true
        observer.unobserve(en.target)
      }
    })
  }, { threshold: 0.15 })

  blockRefs.value.forEach((el) => { if (el) observer.observe(el) })
})

onUnmounted(() => { if (observer) observer.disconnect() })
</script>

<style scoped>
.lx-root {
  position: relative;
  background: #040609;
  padding: 80px clamp(16px, 4vw, 60px) 90px;
  font-family: 'Vazirmatn', 'Inter', system-ui, sans-serif;
  overflow: hidden;
}

.lx-ambient { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

.lx-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.28; }
.orb-a { width: 500px; height: 500px; top: -150px; right: -100px; background: radial-gradient(circle, rgba(197,160,89,0.4), transparent 70%); }
.orb-b { width: 420px; height: 420px; bottom: -150px; left: -120px; background: radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%); }

.lx-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
  background-size: 70px 70px;
  -webkit-mask-image: radial-gradient(ellipse at center, black 25%, transparent 75%);
  mask-image: radial-gradient(ellipse at center, black 25%, transparent 75%);
}

.lx-block {
  position: relative; z-index: 1;
  max-width: 1460px;
  margin: 0 auto 80px;
  opacity: 0;
  transform: translateY(50px);
  transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
  will-change: transform, opacity;
}
.lx-block.revealed { opacity: 1; transform: translateY(0); }
.lx-block:last-child { margin-bottom: 0; }

.lx-head { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.head-main { display: flex; align-items: center; gap: 20px; }

.head-icon { position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-glyph {
  font-size: 1.9rem; color: #fff; z-index: 2;
  text-shadow: 0 0 20px rgba(197,160,89,0.5);
  text-shadow: 0 0 28px color-mix(in srgb, var(--accent) 70%, transparent);
}
.icon-ring {
  position: absolute; inset: 6px; border-radius: 50%;
  border: 1px solid rgba(197,160,89,0.4);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
}
.icon-ring.ring-2 {
  inset: -2px; border-style: dashed;
  border-color: rgba(197,160,89,0.22);
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
}

.head-text { display: flex; flex-direction: column; gap: 6px; }
.head-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 0.78rem; letter-spacing: 2.5px; color: var(--accent); text-transform: uppercase; font-weight: 600; }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }

.head-title {
  position: relative; margin: 0;
  font-size: clamp(1.5rem, 2.8vw, 2.2rem); font-weight: 800; letter-spacing: -0.01em;
  background: linear-gradient(120deg, #fff 30%, var(--accent) 60%, #fff 90%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  color: var(--accent);
}

.head-side { display: flex; align-items: center; gap: 14px; }
.head-nav { display: flex; gap: 8px; }
.nav-btn {
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
  padding: 0 !important;
}
.nav-btn:hover { background: var(--accent); border-color: var(--accent); color: #000; transform: scale(1.08); }
.nav-btn:active { transform: scale(0.94); }

.head-link {
  position: relative; display: inline-flex; align-items: center; gap: 10px;
  padding: 12px 14px 12px 24px; border-radius: 999px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.12);
  color: #fff; text-decoration: none; font-size: 0.85rem; font-weight: 600;
  overflow: hidden; transition: color 0.4s, border-color 0.4s, box-shadow 0.4s;
}
.head-link::before {
  content: ''; position: absolute; inset: 0;
  background: var(--accent);
  opacity: 0; transition: opacity 0.4s ease; z-index: 0;
}
.head-link:hover::before { opacity: 1; }
.head-link:hover { color: #000; border-color: transparent; }
.link-label, .link-arrow { position: relative; z-index: 1; }
.link-arrow {
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.08); transition: background 0.4s, transform 0.4s;
}
.head-link:hover .link-arrow { background: rgba(0,0,0,0.18); transform: translateX(-4px); }

.lx-divider { display: flex; align-items: center; gap: 16px; margin: 26px 0 30px; }
.lx-divider span { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent); }
.lx-divider i { font-size: 0.6rem; color: var(--accent); }

.lx-row {
  display: flex; gap: 20px;
  overflow-x: auto; padding: 10px 6px 22px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: rgba(197,160,89,0.4) transparent;
  -webkit-overflow-scrolling: touch;
  align-items: stretch;
}
.lx-row::-webkit-scrollbar { height: 6px; }
.lx-row::-webkit-scrollbar-track { background: transparent; }
.lx-row::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.4); border-radius: 999px; }

/* ===== کارت محصول: کپی دقیق از صفحه‌ی محصولات، فقط برای اسکرول افقی flex شده ===== */
.product-card {
  flex: 0 0 230px;
  scroll-snap-align: start;
  position: relative;
  border-radius: 16px;
  cursor: pointer;
  opacity: 0;
  transform: translateY(30px);
  animation: cardReveal 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
  animation-delay: calc(var(--pi) * 0.06s + 0.2s);
}
@keyframes cardReveal { to { opacity: 1; transform: translateY(0); } }

.card-inner {
  position: relative; z-index: 1; border-radius: 16px;
  background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98));
  border: 1px solid rgba(255,255,255,0.05); overflow: hidden;
  display: flex; flex-direction: column; height: 100%;
  transition: transform 0.3s ease, border-color 0.3s, box-shadow 0.3s;
}

@media (hover: hover) and (pointer: fine) {
  .product-card:hover .card-inner { transform: translateY(-6px); border-color: rgba(197,160,89,0.15); box-shadow: 0 18px 50px rgba(0,0,0,0.5), 0 0 30px rgba(197,160,89,0.05); }
  .product-card:hover .card-image { transform: scale(1.08); }
  .product-card:hover .title-underline { width: 34px; }
}

.card-image-wrapper {
  position: relative; overflow: hidden; aspect-ratio: 1/1; width: 100%;
  display: flex; align-items: center; justify-content: center; padding: 14px;
  background: radial-gradient(circle at 50% 35%, rgba(197,160,89,0.06), transparent 65%);
}
.card-image {
  width: 100%; height: 100%; object-fit: contain;
  filter: drop-shadow(0 12px 26px rgba(0,0,0,0.4));
  transition: transform 0.5s ease;
}

.discount-tag { position: absolute; top: 10px; left: 10px; z-index: 3; padding: 4px 9px; border-radius: 9px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; font-size: 0.7rem; font-weight: 800; box-shadow: 0 4px 14px rgba(239,68,68,0.4); }
.card-badge { position: absolute; bottom: 10px; right: 10px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9px; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); font-size: 0.62rem; color: #f5d78e; font-weight: 500; max-width: calc(100% - 20px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.badge-icon { font-size: 0.7rem; flex-shrink: 0; }

.card-content { padding: clamp(10px,1.2vw,14px); display: flex; flex-direction: column; gap: 7px; flex: 1; }
.product-title { font-size: clamp(0.82rem,1vw,0.95rem); font-weight: 700; color: #f0f0f0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.title-underline { width: 28px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, #c5a059, transparent); transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }

.desc-box { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 10px 9px; background: rgba(255,255,255,0.02); }
.desc-label { display: inline-block; font-size: 0.6rem; color: #c5a059; letter-spacing: 1px; margin-bottom: 4px; }
.short-desc { font-size: clamp(0.7rem,0.85vw,0.78rem); color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.card-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }

.view-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 11px; background: linear-gradient(135deg, #2bbf9e, #1a8f78); border: none; color: #fff; text-decoration: none; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.35s cubic-bezier(0.16,1,0.3,1); flex-shrink: 0; }
.view-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(43,191,158,0.3); }
.view-arrow { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.18); transition: transform 0.35s; }
.view-btn:hover .view-arrow { transform: translateX(-3px); }

@media (max-width: 1024px) { .lx-block { margin-bottom: 60px; } }
@media (max-width: 768px) {
  .lx-root { padding: 56px 16px 64px; }
  .head-icon { width: 56px; height: 56px; }
  .icon-glyph { font-size: 1.5rem; }
  .head-nav { display: none; }
  .product-card { flex: 0 0 200px; }
  .lx-divider { margin: 18px 0 22px; }
  .lx-orb { display: none; }
}
@media (max-width: 480px) {
  .lx-root { padding: 44px 12px 50px; }
  .head-main { gap: 14px; }
  .head-icon { width: 48px; height: 48px; }
  .icon-glyph { font-size: 1.25rem; }
  .head-title { font-size: 1.35rem; }
  .head-link { padding: 10px 12px 10px 18px; font-size: 0.8rem; }
  .product-card { flex: 0 0 180px; }
}

@media (hover: none) {
  .product-card:hover .card-inner { transform: none !important; box-shadow: none; }
  .product-card:hover .card-image { transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lx-block,
  .product-card {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .lx-orb { display: none; }
}
</style>
