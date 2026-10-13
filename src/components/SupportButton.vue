<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORT_CONFIG } from '../config/support'

const { t, locale } = useI18n()

const isOpen = ref(false)
const showFirstHint = ref(false)
const rootRef = ref(null)

const HINT_SEEN_KEY = 'nourmehr_support_hint_seen'

const toFaDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])

/* ---------- ساعات کاری ---------- */
const isWithinWorkingHours = () => {
  try {
    const { timezone, startHour, endHour, offDays } = SUPPORT_CONFIG.workingHours
    const iran = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    if (offDays.includes(iran.getDay())) return false
    const h = iran.getHours()
    return h >= startHour && h < endHour
  } catch { return true }
}

const isWorkingNow = ref(isWithinWorkingHours())
let hoursTimer = null

/* ---------- لینک‌ها ---------- */
const phoneDisplay = computed(() =>
  locale.value === 'fa' ? toFaDigits(SUPPORT_CONFIG.phone.display) : SUPPORT_CONFIG.phone.display)

const phoneLink = computed(() => `tel:${SUPPORT_CONFIG.phone.international}`)
const whatsappLink = computed(() =>
  `https://wa.me/${SUPPORT_CONFIG.whatsapp.number}?text=${encodeURIComponent(SUPPORT_CONFIG.whatsapp.defaultMessage)}`)
const instagramLink = computed(() => `https://instagram.com/${SUPPORT_CONFIG.instagram.username}`)
const emailLink = computed(() =>
  `mailto:${SUPPORT_CONFIG.email.address}?subject=${encodeURIComponent(SUPPORT_CONFIG.email.subject)}`)
const instagramHandle = computed(() => `@${SUPPORT_CONFIG.instagram.username}`)
const emailDisplay = computed(() => SUPPORT_CONFIG.email.address)

/* ---------- کنترل پنل ---------- */
const openPanel = () => {
  isOpen.value = true
  dismissHint()
}
const closePanel = () => { isOpen.value = false }
const togglePanel = () => { isOpen.value ? closePanel() : openPanel() }

const dismissHint = () => {
  showFirstHint.value = false
  try { localStorage.setItem(HINT_SEEN_KEY, '1') } catch { /* ignore */ }
}

const onClickOutside = (e) => {
  if (!isOpen.value) return
  if (rootRef.value?.contains(e.target)) return
  closePanel()
}

const onKeydown = (e) => {
  if (e.key === 'Escape' && isOpen.value) closePanel()
}

onMounted(() => {
  try {
    if (!localStorage.getItem(HINT_SEEN_KEY)) {
      setTimeout(() => { showFirstHint.value = true }, 1800)
      setTimeout(() => { showFirstHint.value = false }, 10800)
    }
  } catch { /* ignore */ }

  hoursTimer = setInterval(() => { isWorkingNow.value = isWithinWorkingHours() }, 60000)

  setTimeout(() => document.addEventListener('click', onClickOutside), 100)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  clearInterval(hoursTimer)
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <!-- 🔑 Teleport: دکمه کاملاً از DOM صفحه جدا می‌شود -->
  <Teleport to="body">
    <div ref="rootRef" class="sp-root" :class="{ 'is-open': isOpen }">

      <!-- ============ پنل ============ -->
      <Transition name="sp-panel">
        <div v-if="isOpen" class="sp-panel">

          <!-- هدر -->
          <div class="sp-header">
            <div class="sp-header-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <h3>{{ t('support_widget_title') }}</h3>
            </div>
            <button class="sp-close" type="button" :aria-label="t('support_widget_close')" @click="closePanel">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- هشدار خارج از ساعت کاری -->
          <Transition name="sp-warning">
            <div v-if="!isWorkingNow" class="sp-offline">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sp-offline-icon">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div class="sp-offline-text">
                <strong>{{ t('support_widget_offline_title') }}</strong>
                <p>{{ t('support_widget_offline_desc') }}</p>
              </div>
            </div>
          </Transition>

          <!-- گزینه‌ها -->
          <div class="sp-options">

            <!-- تماس -->
            <a :href="phoneLink" class="sp-option" @click="closePanel">
              <span class="sp-icon sp-icon-phone">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </span>
              <span class="sp-text">
                <span class="sp-name">{{ t('support_widget_phone') }}</span>
                <span class="sp-desc" dir="ltr">{{ phoneDisplay }}</span>
              </span>
              <svg class="sp-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>

            <!-- واتساپ -->
            <a :href="whatsappLink" target="_blank" rel="noopener noreferrer" class="sp-option" @click="closePanel">
              <span class="sp-icon sp-icon-whatsapp">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </span>
              <span class="sp-text">
                <span class="sp-name">{{ t('support_widget_whatsapp') }}</span>
                <span class="sp-desc">{{ t('support_widget_whatsapp_desc') }}</span>
              </span>
              <svg class="sp-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>

            <!-- اینستاگرام -->
            <a :href="instagramLink" target="_blank" rel="noopener noreferrer" class="sp-option" @click="closePanel">
              <span class="sp-icon sp-icon-instagram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </span>
              <span class="sp-text">
                <span class="sp-name">{{ t('support_widget_instagram') }}</span>
                <span class="sp-desc" dir="ltr">{{ instagramHandle }}</span>
              </span>
              <svg class="sp-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>

            <!-- ایمیل -->
            <a :href="emailLink" class="sp-option" @click="closePanel">
              <span class="sp-icon sp-icon-email">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <span class="sp-text">
                <span class="sp-name">{{ t('support_widget_email') }}</span>
                <span class="sp-desc" dir="ltr">{{ emailDisplay }}</span>
              </span>
              <svg class="sp-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>
          </div>

          <!-- ساعات کاری -->
          <div class="sp-hours">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sp-hours-icon">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div class="sp-hours-text">
              <span class="sp-hours-label">{{ t('support_widget_hours') }}:</span>
              <span class="sp-hours-value">{{ t('support_widget_hours_value') }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ============ راهنمای اولین بازدید ============ -->
      <Transition name="sp-hint">
        <div v-if="showFirstHint && !isOpen" class="sp-hint">
          <span class="sp-hint-text">{{ t('support_widget_hint') }}</span>
          <span class="sp-hint-dot"></span>
        </div>
      </Transition>

      <!-- ============ دکمه اصلی ============ -->
      <button class="sp-btn" type="button" :aria-label="t('support_widget_title')" @click="togglePanel">
        <!-- آیکون هدست -->
        <Transition name="sp-icon" mode="out-in">
          <svg v-if="!isOpen" key="headset" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sp-btn-icon">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
          </svg>
          <!-- آیکون بستن -->
          <svg v-else key="close" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="sp-btn-icon">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </Transition>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/* ================================================================
   🔧 تنظیمات — فقط این بخش را تغییر بده
================================================================ */
.sp-root {
  --btn-size: 56px;
  --btn-bottom: 24px;
  --btn-right: 24px;
  --panel-width: 320px;

  position: fixed;
  bottom: var(--btn-bottom);
  right: var(--btn-right);
  z-index: 1500;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;

  direction: rtl;
  font-family: inherit;

  /* 🔑 مهم: سایز ثابت — باعث می‌شود هیچ پرشی نداشته باشد */
  width: auto;
  height: auto;
}

/* ================================================================
   دکمه اصلی
================================================================ */
.sp-btn {
  width: var(--btn-size);
  height: var(--btn-size);
  min-width: var(--btn-size);
  min-height: var(--btn-size);
  max-width: var(--btn-size);
  max-height: var(--btn-size);

  border-radius: 50%;
  border: none;
  outline: none;
  cursor: pointer;
  padding: 0;
  margin: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  color: #1a1206;
  background: linear-gradient(135deg, #facc6b, #c5a059);
  box-shadow: 0 6px 24px rgba(197, 160, 89, 0.45);

  /* انیمیشن نرم */
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s ease,
              background 0.3s ease;

  /* نبض ملایم */
  animation: sp-breathe 3s ease-in-out infinite;

  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.sp-btn:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 8px 32px rgba(197, 160, 89, 0.6);
}

.sp-btn:active {
  transform: scale(0.95);
}

/* حالت باز */
.sp-root.is-open .sp-btn {
  animation: none;
  background: #0f1220;
  color: #facc6b;
  border: 2px solid rgba(197, 160, 89, 0.5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* نبض */
@keyframes sp-breathe {
  0%, 100% {
    box-shadow: 0 6px 24px rgba(197,160,89,0.45),
                0 0 0 0 rgba(197,160,89,0.35);
  }
  50% {
    box-shadow: 0 6px 24px rgba(197,160,89,0.45),
                0 0 0 14px rgba(197,160,89,0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sp-btn { animation: none; }
  .sp-btn:hover { transform: none; }
}

.sp-btn-icon {
  display: block;
  pointer-events: none;
}

/* تبادل آیکون با انیمیشن نرم */
.sp-icon-enter-active {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.25s ease;
}
.sp-icon-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.sp-icon-enter-from {
  transform: rotate(-120deg) scale(0.3);
  opacity: 0;
}
.sp-icon-leave-to {
  transform: rotate(120deg) scale(0.3);
  opacity: 0;
}

/* ================================================================
   راهنمای اولین بازدید
================================================================ */
.sp-hint {
  display: flex;
  align-items: center;
  gap: 10px;

  background: rgba(15, 18, 32, 0.97);
  border: 1px solid rgba(197, 160, 89, 0.45);
  color: #facc6b;
  font-size: 0.82rem;
  font-weight: 600;

  padding: 9px 16px;
  border-radius: 14px;
  white-space: nowrap;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  animation: sp-hint-bounce 2s ease-in-out infinite;
}

.sp-hint-text { pointer-events: none; }

/* نقطه کوچک که به دکمه اشاره می‌کند */
.sp-hint-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #facc6b;
  flex-shrink: 0;
}

@keyframes sp-hint-bounce {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-6px); }
}

.sp-hint-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sp-hint-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.sp-hint-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.8);
}
.sp-hint-leave-to {
  opacity: 0;
  transform: translateX(10px) scale(0.9);
}

/* ================================================================
   پنل
================================================================ */
.sp-panel {
  width: var(--panel-width);
  max-width: calc(100vw - 32px);

  background: rgba(13, 16, 30, 0.98);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);

  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(197, 160, 89, 0.08) inset;

  overflow: hidden;
}

/* انیمیشن باز شدن پنل */
.sp-panel-enter-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.sp-panel-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 1, 1),
              transform 0.2s cubic-bezier(0.4, 0, 1, 1);
}
.sp-panel-enter-from {
  opacity: 0;
  transform: translateY(20px) translateX(20px) scale(0.85);
}
.sp-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) translateX(12px) scale(0.9);
}

/* ---------- هدر ---------- */
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(197,160,89,0.18), transparent 70%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sp-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #facc6b;
}

.sp-header-title h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #facc6b;
}

.sp-close {
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;

  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sp-close:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
  transform: rotate(90deg) scale(1.05);
}

.sp-close:active { transform: scale(0.9); }

/* ---------- هشدار خارج از ساعت کاری ---------- */
.sp-offline {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 12px 14px 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.sp-offline-icon { flex-shrink: 0; margin-top: 2px; }

.sp-offline-text strong {
  display: block;
  font-size: 0.8rem;
  color: #fbbf24;
  margin-bottom: 4px;
}

.sp-offline-text p {
  margin: 0;
  font-size: 0.73rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.5);
}

.sp-warning-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.sp-warning-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---------- گزینه‌ها ---------- */
.sp-options {
  padding: 12px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sp-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 12px;
  border-radius: 14px;
  text-decoration: none;

  /* انیمیشن ورود پلکانی */
  animation: sp-option-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.sp-option:nth-child(1) { animation-delay: 0.06s; }
.sp-option:nth-child(2) { animation-delay: 0.12s; }
.sp-option:nth-child(3) { animation-delay: 0.18s; }
.sp-option:nth-child(4) { animation-delay: 0.24s; }

@keyframes sp-option-in {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.sp-option:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(-4px);
}

.sp-option {
  transition: background 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

/* آیکون‌ها */
.sp-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sp-option:hover .sp-icon {
  transform: scale(1.1) rotate(-5deg);
}

.sp-icon-phone {
  background: rgba(197, 160, 89, 0.15);
  color: #facc6b;
  border: 1px solid rgba(197, 160, 89, 0.25);
}

.sp-icon-whatsapp {
  background: rgba(37, 211, 102, 0.12);
  color: #25D366;
  border: 1px solid rgba(37, 211, 102, 0.25);
}

.sp-icon-instagram {
  background: linear-gradient(135deg,
    rgba(240, 148, 51, 0.15),
    rgba(220, 39, 67, 0.15),
    rgba(129, 52, 175, 0.15));
  color: #e1306c;
  border: 1px solid rgba(225, 48, 108, 0.25);
}

.sp-icon-email {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

/* متن */
.sp-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.sp-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
}

.sp-desc {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* فلش */
.sp-arrow {
  color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;

  transition: color 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sp-option:hover .sp-arrow {
  color: #facc6b;
  transform: translate(-3px, -3px) scale(1.15);
}

/* ---------- ساعات کاری ---------- */
.sp-hours {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
}

.sp-hours-icon {
  color: rgba(197, 160, 89, 0.7);
  flex-shrink: 0;
}

.sp-hours-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sp-hours-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.sp-hours-value {
  font-size: 0.79rem;
  color: rgba(255, 255, 255, 0.75);
}

/* ================================================================
   موبایل
================================================================ */
@media (max-width: 768px) {
  .sp-root {
    /* 🔧 اگر با نوار خرید تداخل داشت --btn-bottom را زیاد کن */
    --btn-size: 50px;
    --btn-bottom: 90px;
    --btn-right: 16px;
    --panel-width: 290px;
    gap: 10px;
  }

  .sp-btn-icon { width: 22px !important; height: 22px !important; }

  .sp-hint {
    font-size: 0.76rem;
    padding: 7px 12px;
  }

  .sp-panel {
    border-radius: 18px;
  }

  .sp-option {
    padding: 10px 10px;
    gap: 12px;
  }

  .sp-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
  }
}

/* صفحات خیلی کوچک */
@media (max-width: 380px) {
  .sp-root {
    --panel-width: calc(100vw - 24px);
    --btn-right: 12px;
  }
}
</style>