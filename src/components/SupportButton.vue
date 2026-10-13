<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORT_CONFIG } from '../config/support'

const { t, locale } = useI18n()

const isOpen = ref(false)
const showFirstHint = ref(false)
const rootRef = ref(null)

const HINT_SEEN_KEY = 'nourmehr_support_hint_seen'

/* تبدیل ارقام لاتین به فارسی */
const toFaDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d])

/* ---------- بررسی ساعات کاری (به وقت ایران) ---------- */
const isWithinWorkingHours = () => {
  try {
    const { timezone, startHour, endHour, offDays } = SUPPORT_CONFIG.workingHours
    const iran = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    if (offDays.includes(iran.getDay())) return false
    const h = iran.getHours()
    return h >= startHour && h < endHour
  } catch { return true /* در صورت خطا هشدار نشان نده */ }
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

/* ---------- باز و بسته شدن پنل ---------- */
const togglePanel = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) dismissHint()
}
const closePanel = () => { isOpen.value = false }

const dismissHint = () => {
  showFirstHint.value = false
  try { localStorage.setItem(HINT_SEEN_KEY, '1') } catch { /* حالت خصوصی */ }
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
  /* راهنمای اولین بازدید: فقط بار اول نمایش داده می‌شود */
  try {
    if (!localStorage.getItem(HINT_SEEN_KEY)) {
      setTimeout(() => { showFirstHint.value = true }, 1200)
      setTimeout(() => { showFirstHint.value = false }, 11200)
    }
  } catch { /* ignore */ }

  /* بروزرسانی وضعیت ساعات کاری هر دقیقه */
  hoursTimer = setInterval(() => { isWorkingNow.value = isWithinWorkingHours() }, 60000)

  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  clearInterval(hoursTimer)
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="support-fab-wrap">

    <!-- پنل پشتیبانی -->
    <Transition name="support-panel">
      <div v-if="isOpen" class="support-panel" role="dialog" aria-modal="false">

        <div class="sp-header">
          <h3>{{ t('support_widget_title') }}</h3>
          <button class="sp-close" type="button" :aria-label="t('support_widget_close')" @click="closePanel">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- هشدار خارج از ساعات کاری -->
        <div v-if="!isWorkingNow" class="sp-offline">
          <span class="sp-offline-icon">⚠️</span>
          <div class="sp-offline-text">
            <strong>{{ t('support_widget_offline_title') }}</strong>
            <p>{{ t('support_widget_offline_desc') }}</p>
          </div>
        </div>

        <!-- گزینه‌های ارتباط -->
        <div class="sp-options">

          <a :href="phoneLink" class="sp-option" @click="closePanel">
            <span class="sp-icon sp-icon-phone">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </span>
            <span class="sp-text">
              <span class="sp-name">{{ t('support_widget_phone') }}</span>
              <span class="sp-desc" dir="ltr">{{ phoneDisplay }}</span>
            </span>
            <span class="sp-arrow">↗</span>
          </a>

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
            <span class="sp-arrow">↗</span>
          </a>

          <a :href="instagramLink" target="_blank" rel="noopener noreferrer" class="sp-option" @click="closePanel">
            <span class="sp-icon sp-icon-instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </span>
            <span class="sp-text">
              <span class="sp-name">{{ t('support_widget_instagram') }}</span>
              <span class="sp-desc" dir="ltr">{{ instagramHandle }}</span>
            </span>
            <span class="sp-arrow">↗</span>
          </a>

          <a :href="emailLink" class="sp-option" @click="closePanel">
            <span class="sp-icon sp-icon-email">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </span>
            <span class="sp-text">
              <span class="sp-name">{{ t('support_widget_email') }}</span>
              <span class="sp-desc" dir="ltr">{{ emailDisplay }}</span>
            </span>
            <span class="sp-arrow">↗</span>
          </a>
        </div>

        <!-- ساعات کاری -->
        <div class="sp-hours">
          <span class="sp-hours-icon">🕐</span>
          <div class="sp-hours-text">
            <span class="sp-hours-label">{{ t('support_widget_hours') }}:</span>
            <span class="sp-hours-value">{{ t('support_widget_hours_value') }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- راهنمای اولین بازدید -->
    <Transition name="support-hint">
      <div v-if="showFirstHint && !isOpen" class="first-hint">
        {{ t('support_widget_hint') }}
      </div>
    </Transition>

    <!-- دکمه شناور -->
    <button
      class="support-fab"
      :class="{ active: isOpen }"
      type="button"
      :aria-label="t('support_widget_title')"
      @click="togglePanel"
    >
      <!-- آیکون هدست (حالت بسته) -->
      <svg v-if="!isOpen" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      </svg>
      <!-- آیکون بستن (حالت باز) -->
      <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* 🔧 برای جابه‌جایی دکمه فقط این ۴ مقدار را تغییر بده */
.support-fab-wrap {
  --fab-size: 58px;
  --fab-bottom: 24px;
  --fab-right: 24px;

  position: fixed;
  bottom: var(--fab-bottom);
  right: var(--fab-right);
  z-index: 1400; /* بالای محتوا، پایین‌تر از مودال‌ها (2000+) */
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  direction: rtl;
}

/* ---------- دکمه شناور ---------- */
.support-fab {
  width: var(--fab-size);
  height: var(--fab-size);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1206;
  background: linear-gradient(135deg, #facc6b, #c5a059);
  box-shadow: 0 8px 24px rgba(197, 160, 89, 0.45);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: fab-pulse 2.6s infinite;
  flex-shrink: 0;
}
.support-fab:hover { transform: scale(1.08); }
.support-fab.active {
  animation: none;
  background: rgba(15, 18, 32, 0.95);
  color: #facc6b;
  border: 1px solid rgba(197, 160, 89, 0.5);
}

@keyframes fab-pulse {
  0%   { box-shadow: 0 8px 24px rgba(197,160,89,0.45), 0 0 0 0 rgba(197,160,89,0.45); }
  70%  { box-shadow: 0 8px 24px rgba(197,160,89,0.45), 0 0 0 16px rgba(197,160,89,0); }
  100% { box-shadow: 0 8px 24px rgba(197,160,89,0.45), 0 0 0 0 rgba(197,160,89,0); }
}

@media (prefers-reduced-motion: reduce) {
  .support-fab { animation: none; }
}

/* ---------- راهنمای اولین بازدید ---------- */
.first-hint {
  background: rgba(15, 18, 32, 0.95);
  border: 1px solid rgba(197, 160, 89, 0.4);
  color: #facc6b;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  position: relative;
}
.first-hint::after {
  content: '';
  position: absolute;
  bottom: -6px;
  right: 22px;
  width: 12px;
  height: 12px;
  background: rgba(15, 18, 32, 0.95);
  border-right: 1px solid rgba(197, 160, 89, 0.4);
  border-bottom: 1px solid rgba(197, 160, 89, 0.4);
  transform: rotate(45deg);
}

/* ---------- پنل ---------- */
.support-panel {
  width: 310px;
  max-width: calc(100vw - 32px);
  background: rgba(12, 15, 28, 0.97);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(135deg, rgba(197,160,89,0.12), transparent);
}
.sp-header h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #facc6b;
}
.sp-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.sp-close:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }

/* هشدار خارج از ساعات کاری */
.sp-offline {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 12px 14px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.sp-offline-icon { font-size: 1.1rem; line-height: 1; }
.sp-offline-text strong {
  display: block;
  font-size: 0.8rem;
  color: #fbbf24;
  margin-bottom: 3px;
}
.sp-offline-text p {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

/* گزینه‌ها */
.sp-options { padding: 12px 10px 8px; display: flex; flex-direction: column; gap: 4px; }

.sp-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 10px;
  border-radius: 14px;
  text-decoration: none;
  transition: background 0.2s;
}
.sp-option:hover { background: rgba(255, 255, 255, 0.05); }

.sp-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sp-icon-phone    { background: rgba(197,160,89,0.15); color: #facc6b; }
.sp-icon-whatsapp { background: rgba(37,211,102,0.15); color: #25D366; }
.sp-icon-instagram{
  background: linear-gradient(135deg, rgba(240,148,51,0.18), rgba(220,39,67,0.18), rgba(129,52,175,0.18));
  color: #e1306c;
}
.sp-icon-email    { background: rgba(59,130,246,0.15); color: #60a5fa; }

.sp-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sp-name { font-size: 0.9rem; font-weight: 600; color: #fff; }
.sp-desc {
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sp-arrow {
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.9rem;
  flex-shrink: 0;
}
.sp-option:hover .sp-arrow { color: #facc6b; }

/* ساعات کاری */
.sp-hours {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
}
.sp-hours-icon { font-size: 1rem; }
.sp-hours-text { display: flex; flex-direction: column; gap: 1px; }
.sp-hours-label { font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
.sp-hours-value { font-size: 0.8rem; color: rgba(255, 255, 255, 0.75); }

/* ---------- انیمیشن‌ها ---------- */
.support-panel-enter-active { transition: all 0.28s cubic-bezier(0.34, 1.4, 0.5, 1); }
.support-panel-leave-active { transition: all 0.18s ease; }
.support-panel-enter-from,
.support-panel-leave-to { opacity: 0; transform: translateY(14px) scale(0.92); }

.support-hint-enter-active,
.support-hint-leave-active { transition: all 0.3s ease; }
.support-hint-enter-from,
.support-hint-leave-to { opacity: 0; transform: translateX(12px); }

/* ---------- موبایل ---------- */
@media (max-width: 768px) {
  .support-fab-wrap {
    /* 🔧 اگر با نوار خرید پایین صفحه تداخل داشت فقط این عدد را زیاد کن */
    --fab-size: 50px;
    --fab-bottom: 96px;
    --fab-right: 16px;
    gap: 10px;
  }
  .support-fab svg { width: 22px; height: 22px; }
  .support-panel { width: 290px; }
  .first-hint::after { right: 18px; }
}
</style>