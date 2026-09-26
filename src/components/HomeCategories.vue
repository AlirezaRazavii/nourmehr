<template>
  <section v-if="homeCategories.length" class="hca-root">
    <h2 class="hca-title">{{ t('home_categories_title') }}</h2>

    <div class="hca-grid">
      <router-link
        v-for="cat in homeCategories"
        :key="cat._id"
        :to="{ name: 'Products', params: { lang: locale }, query: { category: cat.slug } }"
        class="cat-card"
      >
        <div class="cat-thumb">
          <img
            v-if="cat.image"
            :src="getImageUrl(cat.image)"
            :alt="catName(cat)"
            loading="lazy"
          />
          <span v-else class="cat-icon">{{ cat.icon || '◆' }}</span>
        </div>
        <span class="cat-name">{{ catName(cat) }}</span>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPublicCategories } from '../services/categoryApi'
import { getImageUrl } from '../utils/imageUrl'

const { t, locale } = useI18n()

const allCategories = ref([])

// فقط دسته‌بندی‌های فعال‌شده برای صفحه اصلی + مرتب بر اساس sortOrder
const homeCategories = computed(() =>
  allCategories.value
    .filter((c) => c.showOnHome)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
)

// استخراج نام بر اساس زبان فعلی
const catName = (cat) => {
  const name = cat?.name
  if (!name) return ''
  if (typeof name === 'string') return name
  return name[locale.value] || name.fa || ''
}

onMounted(async () => {
  try {
    allCategories.value = await getPublicCategories()
  } catch (e) {
    console.error('[HomeCategories] خطا:', e)
  }
})
</script>

<style scoped>
.hca-root {
  padding: 60px clamp(16px, 4vw, 60px);
  max-width: 1460px;
  margin: 0 auto;
}

.hca-title {
  text-align: center;
  font-size: clamp(1.3rem, 2.5vw, 1.8rem);
  font-weight: 800;
  color: #fff;
  margin-bottom: 2rem;
}

.hca-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* کارت ساده — مطابق عکس */
.cat-card {
  text-decoration: none;
  color: inherit;
  background: linear-gradient(165deg, rgba(18,22,36,0.95), rgba(8,10,18,0.98));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  overflow: hidden;
  text-align: center;
  transition: transform 0.3s ease, border-color 0.3s ease;
}
.cat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(197,160,89,0.35);
}

/* عکس */
.cat-thumb {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: radial-gradient(circle at 50% 35%, rgba(197,160,89,0.06), transparent 65%);
}
.cat-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 26px rgba(0,0,0,0.4));
  transition: transform 0.4s ease;
}
.cat-card:hover .cat-thumb img {
  transform: scale(1.06);
}

/* آیکون برای دسته‌بندی بدون عکس */
.cat-icon {
  font-size: 2.4rem;
  color: #c5a059;
  text-shadow: 0 0 25px rgba(197,160,89,0.5);
}

/* اسم زیر عکس */
.cat-name {
  display: block;
  padding: 12px 10px;
  font-weight: 700;
  font-size: 0.95rem;
  color: #f0f0f0;
  border-top: 1px solid rgba(255,255,255,0.04);
  transition: color 0.3s;
}
.cat-card:hover .cat-name {
  color: #facc6b;
}

/* ریسپانسیو */
@media (max-width: 1024px) {
  .hca-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .hca-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
}
</style>