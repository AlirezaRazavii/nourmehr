<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Bg1 from '../assests/backgrounds/IMG_3308.jpg'
import Bg2 from '../assests/backgrounds/IMG_3306.jpg'
import Bg3 from '../assests/backgrounds/IMG_3309.jpg'

const currentSlide = ref(0)
let slideInterval = null

const slides = computed(() => [
  {
    id: 1, title: 'PERSIAN', subtitle: 'LUXURY ART',
    descKey: 'hero_slide1_desc', image: '/hero/hero2.webp',
    themeColor: '#0db9e9', bgImage: Bg1,
  },
  {
    id: 2, title: 'TIMELESS', subtitle: 'MASTERPIECE',
    descKey: 'hero_slide2_desc', image: '/hero/hero1.webp',
    themeColor: '#df884e', bgImage: Bg2,
  },
  {
    id: 3, title: 'ROYAL', subtitle: 'HERITAGE',
    descKey: 'hero_slide3_desc', image: '/hero/hero3.webp',
    themeColor: '#a99a2e', bgImage: Bg3,
  },
])

const active = computed(() => slides.value[currentSlide.value] || slides.value[0])

const nextSlide = () => {
  stopAutoSlide()
  currentSlide.value = (currentSlide.value + 1) % slides.value.length
  startAutoSlide()
}

const startAutoSlide = () => {
  slideInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.value.length
  }, 7000)
}

const stopAutoSlide = () => {
  if (slideInterval) clearInterval(slideInterval)
}

onMounted(startAutoSlide)
onUnmounted(stopAutoSlide)

const bgStyle = computed(() => ({
  backgroundImage: `url(${active.value.bgImage || active.value.image})`,
}))

const fillTextStyle = computed(() => ({
  background: `linear-gradient(to right, ${active.value.themeColor}, #ffffff)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
}))
</script>

<template>
  <section class="hero-immersive" @click="nextSlide">
    <div class="bg-layer" :style="bgStyle"></div>
    <div class="bg-overlay"></div>

    <div class="content-wrapper">
      <div class="big-typography">
        <transition name="text-slide" mode="out-in">
          <h1 class="stroke-text" :key="active.id">{{ active.title }}</h1>
        </transition>
        <transition name="text-slide" mode="out-in">
          <h2 class="fill-text" :style="fillTextStyle" :key="active.id">{{ active.subtitle }}</h2>
        </transition>
      </div>

      <div class="model-stage">
        <transition name="hero-image" mode="out-in">
          <img
            :key="active.id"
            :src="active.image"
            :alt="active.title"
            class="viewer-image"
            width="1170"
            height="2532"
            fetchpriority="high"
          />
        </transition>
      </div>

      <div class="timer-logo">
        <svg width="50" height="50" viewBox="0 0 50 50" :key="currentSlide">
          <circle cx="25" cy="25" r="22" class="timer-bg" />
          <circle cx="25" cy="25" r="22" class="timer-progress" :style="{ stroke: active.themeColor }" />
        </svg>
        <div class="timer-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </div>

      <div class="info-panel">
        <div class="line-deco" :style="{ background: active.themeColor }"></div>

        <transition name="fade-text" mode="out-in">
          <p class="description" :key="active.id">{{ $t(active.descKey) }}</p>
        </transition>

        <div class="panel-footer">
          <router-link to="/products" class="explore-btn" :style="{ color: active.themeColor }">
            <span>{{ $t('hero_explore_btn') }}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </router-link>

          <div class="slide-counter">
            <span class="cur" :style="{ color: active.themeColor }">0{{ currentSlide + 1 }}</span>
            <span class="sep">/</span>
            <span class="total">0{{ slides.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="corner-deco top-left"></div>
    <div class="corner-deco bottom-right"></div>
  </section>
</template>

<style scoped>
.hero-immersive {
  position: relative;
  height: 100svh;
  min-height: 560px;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #050814;
  cursor: pointer;
}

.bg-layer {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: brightness(0.35);
  transition: opacity 0.6s ease;
  z-index: 0;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, transparent 8%, rgba(5, 8, 20, 0.75) 70%, #050814 100%);
  z-index: 1;
}

.content-wrapper {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1600px;
  height: 100%;
  padding: 0 5%;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
}

.model-stage {
  width: 100%;
  height: 85vh;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6));
  animation: float 7s ease-in-out infinite;
  will-change: transform;
}

.viewer-image {
  max-height: 80vh;
  max-width: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.big-typography {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: -1;
  pointer-events: none;
  width: 100%;
}

.stroke-text {
  font-family: 'Times New Roman', serif;
  font-size: 13vw;
  line-height: 0.8;
  margin: 0;
  background: linear-gradient(to right, rgba(197, 160, 89, 0.55), rgba(92, 196, 218, 0.45));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
  opacity: 0.9;
}

.fill-text {
  font-family: 'Times New Roman', serif;
  font-size: 9vw;
  line-height: 1;
  color: transparent;
  background-clip: text;
  -webkit-background-clip: text;
  margin: 0;
  letter-spacing: 5px;
}

/* ---- پنل اطلاعات (بازطراحی‌شده) ---- */
.info-panel {
  position: absolute;
  bottom: 60px;
  right: 60px;
  width: 340px;
  padding: 28px 26px 22px;
  border-radius: 18px;
  background: rgba(10, 14, 28, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  color: #fff;
  z-index: 20;
  transition: transform 0.3s ease;
  will-change: transform;
}

.info-panel:hover {
  transform: translateY(-6px);
}

.line-deco {
  width: 48px;
  height: 3px;
  margin-bottom: 18px;
  border-radius: 999px;
  transition: background 0.5s, width 0.5s;
}

.info-panel:hover .line-deco {
  width: 72px;
}

.description {
  font-size: 0.92rem;
  line-height: 1.9;
  opacity: 0.88;
  margin: 0 0 22px;
  min-height: 3.4em; /* ارتفاع ثابت تا موقع تعویض اسلاید کارت نپرد */
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.explore-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.88rem;
  transition: gap 0.25s ease;
}

.explore-btn svg {
  transition: transform 0.25s ease;
}

.explore-btn:hover {
  gap: 12px;
}

.explore-btn:hover svg {
  transform: translateX(3px);
}

.slide-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  direction: ltr;
}

.slide-counter .cur {
  font-weight: 700;
  transition: color 0.5s;
}

.slide-counter .sep {
  opacity: 0.4;
}

.corner-deco {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  z-index: 4;
  pointer-events: none;
}

.top-left { top: 40px; left: 40px; border-right: none; border-bottom: none; }
.bottom-right { bottom: 40px; right: 40px; border-left: none; border-top: none; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.timer-logo {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.timer-logo svg { transform: rotate(-90deg); }
.timer-bg { fill: rgba(0, 0, 0, 0.4); stroke: rgba(255, 255, 255, 0.15); stroke-width: 2; }

.timer-progress {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 138;
  stroke-dashoffset: 138;
  animation: countdown 7s linear forwards;
}

.timer-icon {
  position: absolute;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounce 2s infinite;
}

@keyframes countdown {
  from { stroke-dashoffset: 138; }
  to { stroke-dashoffset: 0; }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-3px); }
  60% { transform: translateY(-2px); }
}

.hero-image-enter-active,
.hero-image-leave-active {
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.hero-image-enter-from { opacity: 0; transform: translateY(15px) scale(0.97); }
.hero-image-leave-to { opacity: 0; transform: translateY(-15px) scale(1.02); }

.text-slide-enter-active,
.text-slide-leave-active { transition: all 0.6s ease; }
.text-slide-enter-from { opacity: 0; transform: translateY(30px); }
.text-slide-leave-to { opacity: 0; transform: translateY(-30px); }

.fade-text-enter-active,
.fade-text-leave-active { transition: opacity 0.6s ease; }
.fade-text-enter-from,
.fade-text-leave-to { opacity: 0; }

@media (max-width: 1024px) {
  .stroke-text { font-size: 16vw; }
  .fill-text { font-size: 11vw; }
}

@media (max-width: 768px) {
  .model-stage { height: 48vh; margin-top: -90px; animation: none; }
  .viewer-image { max-height: 46vh; max-width: 80%; }
  .big-typography { top: 30%; }
  .stroke-text { font-size: 19vw; }
  .fill-text { font-size: 13vw; }

  .info-panel {
    bottom: 0; right: 0; left: 0; width: 100%;
    border-radius: 18px 18px 0 0;
    background: rgba(5, 8, 20, 0.95);
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .corner-deco { display: none; }
  .timer-logo { bottom: auto; top: 62vh; }
}

@media (max-width: 480px) {
  .model-stage { height: 40vh; margin-top: -70px; }
  .viewer-image { max-height: 38vh; max-width: 70%; }
  .big-typography { top: 26%; }
  .stroke-text { font-size: 22vw; opacity: 0.7; }
  .fill-text { font-size: 15vw; }
  .description { margin-bottom: 16px; }
  .timer-logo { top: 70vh; }
}

@media (prefers-reduced-motion: reduce) {
  .model-stage,
  .timer-icon { animation: none; }
  .timer-progress { animation-duration: 7s; }
  .hero-image-enter-active,
  .hero-image-leave-active,
  .text-slide-enter-active,
  .text-slide-leave-active { transition: opacity 0.3s ease; }
  .text-slide-enter-from,
  .text-slide-leave-to { transform: none; }
}
</style>
