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

/* ---------- باز و بسته شدن پنل ---------- */
const togglePanel = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) dismissHint()
}
const closePanel = () => { isOpen.value = false }

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
      setTimeout(() => { showFirstHint.value = true }, 1500)
      setTimeout(() => { showFirstHint.value = false }, 11000)
    }
  } catch { /* ignore */ }

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
  <div ref="rootRef" class="support-widget">

    <!-- ======================= پنل ======================= -->
    <Transition name="panel">
      <div v-if="isOpen" class="support-panel">

        <!-- هدر -->
        <div class="panel-header">
          <div class="panel-title-box">
            <span class="panel-title-icon">💬</span>
            <span class="panel-title-text">{{ t('support_widget_title') }}</span>
          </div>
          <button class="panel-close-btn" type="button" @click="closePanel">✕</button>
        </div>

        <!-- هشدار خارج از ساعات کاری -->
        <div v-if="!isWorkingNow" class="offline-warning">
          <span class="offline-icon">⚠️</span>
          <div class="offline-text">
            <strong>{{ t('support_widget_offline_title') }}</strong>
            <p>{{ t('support_widget_offline_desc') }}</p>
          </div>
        </div>

        <!-- گزینه‌های ارتباط -->
        <div class="panel-options">

          <!-- تماس -->
          <a :href="phoneLink" class="option-row" @click="closePanel">
            <span class="option-icon" style="background: rgba(197,160,89,0.15); color: #facc6b;">📞</span>
            <span class="option-info">
              <span class="option-name">{{ t('support_widget_phone') }}</span>
              <span class="option-detail" dir="ltr">{{ phoneDisplay }}</span>
            </span>
            <span class="option-go">›</span>
          </a>

          <!-- واتساپ -->
          <a :href="whatsappLink" target="_blank" rel="noopener noreferrer" class="option-row" @click="closePanel">
            <span class="option-icon" style="background: rgba(37,211,102,0.15); color: #25D366;">🟢</span>
            <span class="option-info">
              <span class="option-name">{{ t('support_widget_whatsapp') }}</span>
              <span class="option-detail">{{ t('support_widget_whatsapp_desc') }}</span>
            </span>
            <span class="option-go">›</span>
          </a>

          <!-- اینستاگرام -->
          <a :href="instagramLink" target="_blank" rel="noopener noreferrer" class="option-row" @click="closePanel">
            <span class="option-icon" style="background: linear-gradient(135deg, rgba(240,148,51,0.18), rgba(220,39,67,0.18), rgba(129,52,175,0.18)); color: #e1306c;">📷</span>
            <span class="option-info">
              <span class="option-name">{{ t('support_widget_instagram') }}</span>
              <span class="option-detail" dir="ltr">{{ instagramHandle }}</span>
            </span>
            <span class="option-go">›</span>
          </a>

          <!-- ایمیل -->
          <a :href="emailLink" class="option-row" @click="closePanel">
            <span class="option-icon" style="background: rgba(59,130,246,0.15); color: #60a5fa;">✉️</span>
            <span class="option-info">
              <span class="option-name">{{ t('support_widget_email') }}</span>
              <span class="option-detail" dir="ltr">{{ emailDisplay }}</span>
            </span>
            <span class="option-go">›</span>
          </a>
        </div>

        <!-- ساعات کاری -->
        <div class="panel-footer">
          <span class="footer-icon">🕐</span>
          <div class="footer-text">
            <span class="footer-label">{{ t('support_widget_hours') }}:</span>
            <span class="footer-value">{{ t('support_widget_hours_value') }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ======================= راهنمای اولین بازدید ======================= -->
    <Transition name="hint">
      <div v-if="showFirstHint && !isOpen" class="first-hint">
        {{ t('support_widget_hint') }}
      </div>
    </Transition>

    <!-- ======================= دکمه شناور ======================= -->
    <button class="fab-btn" type="button" :aria-label="t('support_widget_title')" @click="togglePanel">
      <span v-if="!isOpen" class="fab-icon">💬</span>
      <span v-else class="fab-icon">✕</span>
    </button>
  </div>
</template>

<style scoped>
/* ================================================================
   🔧 تنظیمات موقعیت — فقط این بخش را تغییر بده
================================================================ */
.support-widget {
  --fab-size: 56px;      /* اندازه دکمه */
  --fab-bottom: 24px;    /* فاصله از پایین */
  --fab-right: 24px;     /* فاصله از راست */

  position: fixed;
  bottom: var(--fab-bottom);
  right: var(--fab-right);
  z-index: 1400;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  direction: rtl;
  /* این مهم است: باعث می‌شود دکمه ثابت بماند و پرش نداشته باشد */
  pointer-events: auto;
}

/* ================================================================
   دکمه شناور (FAB)
================================================================ */
.fab-btn {
  width: var(--fab-size);
  height: var(--fab-size);
  min-width: var(--fab-size);
  min-height: var(--fab-size);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  color: #1a1206;
  background: linear-gradient(135deg, #facc6b, #c5a059);
  box-shadow: 0 6px 20px rgba(197, 160, 89, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fab-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 28px rgba(197, 160, 89, 0.55);
}

.fab-icon {
  font-size: 1.5rem;
  line-height: 1;
  display: block;
}

/* ================================================================
   راهنمای اولین بازدید
================================================================ */
.first-hint {
  background: rgba(12, 15, 28, 0.96);
  border: 1px solid rgba(197, 160, 89, 0.4);
  color: #facc6b;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 12px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

/* ================================================================
   پنل پشتیبانی
================================================================ */
.support-panel {
  width: 300px;
  max-width: calc(100vw - 32px);
  background: #0f1220;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* ---------- هدر پنل ---------- */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(197, 160, 89, 0.15), transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.panel-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title-icon {
  font-size: 1.1rem;
}

.panel-title-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: #facc6b;
}

/* دکمه بستن — مشکل قبلی حل شد: متن ساده ✕ */
.panel-close-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.2s;
}

.panel-close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* ---------- هشدار خارج از ساعات کاری ---------- */
.offline-warning {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 12px 14px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.offline-icon {
  font-size: 1rem;
  line-height: 1.3;
}

.offline-text strong {
  display: block;
  font-size: 0.78rem;
  color: #fbbf24;
  margin-bottom: 3px;
}

.offline-text p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
}

/* ---------- گزینه‌های ارتباط ---------- */
.panel-options {
  padding: 10px 10px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  text-decoration: none;
  transition: background 0.2s;
}

.option-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.option-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
}

.option-detail {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-go {
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.2rem;
  font-weight: 300;
  flex-shrink: 0;
}

.option-row:hover .option-go {
  color: #facc6b;
}

/* ---------- ساعات کاری (فوتر پنل) ---------- */
.panel-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
}

.footer-icon {
  font-size: 0.95rem;
}

.footer-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.footer-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.footer-value {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.75);
}

/* ================================================================
   انیمیشن‌ها
================================================================ */
.panel-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* ================================================================
   موبایل
================================================================ */
@media (max-width: 768px) {
  .support-widget {
    /* 🔧 اگر با نوار خرید تداخل داشت فقط --fab-bottom را زیاد کن */
    --fab-size: 48px;
    --fab-bottom: 92px;
    --fab-right: 14px;
    gap: 10px;
  }

  .fab-icon {
    font-size: 1.25rem;
  }

  .support-panel {
    width: 280px;
  }

  .first-hint {
    font-size: 0.78rem;
    padding: 7px 12px;
  }
}
</style>