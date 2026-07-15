<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const testimonials = computed(() => [
  {
    id: 1,
    name: t('test_item_1_name'),
    role: t('test_item_1_role'),
    avatar: '👩',
    rating: 5,
    text: t('test_item_1_text')
  },
  {
    id: 2,
    name: t('test_item_2_name'),
    role: t('test_item_2_role'),
    avatar: '👨',
    rating: 5,
    text: t('test_item_2_text')
  },
  {
    id: 3,
    name: t('test_item_3_name'),
    role: t('test_item_3_role'),
    avatar: '👩‍🦰',
    rating: 5,
    text: t('test_item_3_text')
  }
])

const revealed = ref(false)
const sectionRef = ref(null)
let observer = null

onMounted(() => {
  // اگر IntersectionObserver پشتیبانی نشود، بلافاصله نمایش بده (fallback برای SSR/مرورگر قدیمی)
  if (typeof IntersectionObserver === 'undefined') {
    revealed.value = true
    return
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        revealed.value = true
        // پس از یک بار نمایش، دیگر نیازی به رصد نیست
        observer?.disconnect()
      }
    },
    { threshold: 0.15 }
  )

  if (sectionRef.value) observer.observe(sectionRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section
    ref="sectionRef"
    class="testimonials-section"
    :class="{ revealed }"
    :aria-label="$t('testimonials_title')"
  >
    <div class="ts-container">
      <!-- تزئینات پس‌زمینه -->
      <div class="bg-glow" aria-hidden="true"></div>

      <!-- عنوان بخش -->
      <div class="ts-header">
        <span class="ts-eyebrow">{{ $t('testimonials_eyebrow') }}</span>
        <h2 class="ts-title">
          <span class="title-line" aria-hidden="true"></span>
          {{ $t('testimonials_title') }}
          <span class="title-line" aria-hidden="true"></span>
        </h2>
        <p class="ts-subtitle">{{ $t('testimonials_subtitle') }}</p>
      </div>

      <!-- گرید نظرات -->
      <div class="ts-grid">
        <article
          v-for="(item, i) in testimonials"
          :key="item.id"
          class="ts-card"
          :style="{ '--d': i }"
        >
          <!-- آیکون نقل قول -->
          <div class="quote-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          <div class="card-content">
            <!-- ستاره‌ها -->
            <div
              class="stars"
              role="img"
              :aria-label="`${item.rating} ${$t('testimonials_stars_label')}`"
            >
              <span v-for="n in item.rating" :key="n" aria-hidden="true">★</span>
            </div>

            <!-- متن نظر -->
            <blockquote class="ts-text">"{{ item.text }}"</blockquote>

            <!-- اطلاعات کاربر -->
            <div class="user-info">
              <div class="user-avatar" aria-hidden="true">{{ item.avatar }}</div>
              <div class="user-details">
                <strong>{{ item.name }}</strong>
                <span>{{ item.role }}</span>
              </div>
            </div>
          </div>

          <!-- خط گرادیان پایین -->
          <div class="bottom-line" aria-hidden="true"></div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.testimonials-section {
  position: relative;
  padding: 100px 20px;
  background: #040609;
  color: #fff;
  overflow: hidden;
  font-family: 'Vazirmatn', sans-serif;
}

.ts-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* پس‌زمینه: به‌جای blur سنگین از گرادیان آماده استفاده شده */
.bg-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(197, 160, 89, 0.06), transparent 60%);
  z-index: 0;
  pointer-events: none;
}

/* هدر */
.ts-header {
  text-align: center;
  margin-bottom: 60px;
}

.ts-eyebrow {
  display: inline-block;
  font-size: 0.8rem;
  letter-spacing: 3px;
  color: #c5a059;
  margin-bottom: 12px;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s;
}

.ts-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0 0 12px;
  background: linear-gradient(135deg, #fff, #c5a059);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #c5a059; /* fallback برای مرورگرهایی که background-clip را پشتیبانی نمی‌کنند */
}

.title-line {
  display: block;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #c5a059);
}

.ts-title .title-line:last-child {
  background: linear-gradient(90deg, #c5a059, transparent);
}

.ts-subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  max-width: 500px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s;
}

.revealed .ts-eyebrow,
.revealed .ts-subtitle {
  opacity: 1;
  transform: translateY(0);
}

/* گرید */
.ts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* کارت */
.ts-card {
  position: relative;
  background: linear-gradient(145deg, rgba(18, 22, 36, 0.95), rgba(8, 10, 18, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 32px;
  overflow: hidden;
  /* فقط transform و opacity انیمیت می‌شوند تا روی دستگاه‌های ضعیف روان بماند */
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s ease,
              box-shadow 0.3s ease;
  opacity: 0;
  transform: translateY(40px) scale(0.97);
}

.revealed .ts-card {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition-delay: calc(var(--d) * 0.15s + 0.3s);
}

.ts-card:hover {
  transform: translateY(-8px);
  border-color: rgba(197, 160, 89, 0.3);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(197, 160, 89, 0.05);
}

.quote-icon {
  position: absolute;
  top: 24px;
  /* از inset-inline استفاده شده تا در حالت RTL/LTR درست بچرخد */
  inset-inline-start: 24px;
  color: rgba(197, 160, 89, 0.15);
  transition: color 0.3s ease, transform 0.3s ease;
}

.ts-card:hover .quote-icon {
  color: rgba(197, 160, 89, 0.25);
  transform: scale(1.1);
}

.card-content {
  position: relative;
  z-index: 1;
}

/* ستاره‌ها */
.stars {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  color: #c5a059;
  font-size: 1.2rem;
  filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.3));
}

/* متن */
.ts-text {
  font-size: 0.95rem;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 28px 0;
  font-style: italic;
}

/* اطلاعات کاربر */
.user-info {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(197, 160, 89, 0.2), rgba(197, 160, 89, 0.05));
  border: 1px solid rgba(197, 160, 89, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-details strong {
  color: #fff;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.user-details span {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
}

/* خط پایین */
.bottom-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #c5a059, #facc6b, #c5a059);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.ts-card:hover .bottom-line {
  transform: scaleX(1);
}

/* ریسپانسیو */
@media (max-width: 768px) {
  .testimonials-section {
    padding: 60px 16px;
  }
  .ts-title {
    font-size: 1.6rem;
    gap: 12px;
  }
  .ts-card {
    padding: 24px;
  }
}

/* احترام به تنظیمات کاهش حرکت کاربر (دسترس‌پذیری + عملکرد) */
@media (prefers-reduced-motion: reduce) {
  .ts-eyebrow,
  .ts-subtitle,
  .ts-card,
  .bottom-line,
  .quote-icon {
    transition: none !important;
    transition-delay: 0s !important;
  }
  .ts-eyebrow,
  .ts-subtitle {
    opacity: 1;
    transform: none;
  }
  .ts-card {
    opacity: 1;
    transform: none;
  }
}
</style>
