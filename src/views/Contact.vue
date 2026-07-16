<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../services/api'

const { t, locale } = useI18n()

// لیست زبان‌های راست‌به‌چپ
const rtlLocales = ['fa', 'ar', 'he']

// تشخیص جهت زبان (برای انیمیشن‌ها و چیدمان)
const isRTL = computed(() => rtlLocales.includes(locale.value))

// تنظیم جهت و زبان روی تگ <html> برای رفع مشکل چپ‌نویس شدن هنگام لود اولیه
const applyDirection = (loc) => {
  const dir = rtlLocales.includes(loc) ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', loc)
}

// اجرای فوری هنگام ساخت کامپوننت + واکنش به تغییر زبان
watch(locale, (newLocale) => {
  applyDirection(newLocale)
}, { immediate: true })

// تابع کمکی برای استخراج متن از دیتای دوزبانه
const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value[locale.value] || value.fa || value.en || ''
  }
  return ''
}

const form = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
})

const isSubmitting = ref(false)
const submitted = ref(false)

// سیستم پیام داخلی به‌جای alert
const formError = ref('')

const subjects = [
  { key: 'contact_subject_1' },
  { key: 'contact_subject_2' },
  { key: 'contact_subject_3' },
  { key: 'contact_subject_4' },
  { key: 'contact_subject_5' }
]

const settings = ref(null)
onMounted(async () => {
  try {
    const res = await api.get('/settings')
    if (res.data?.success) settings.value = res.data.data
  } catch (e) {
    // در صورت عدم دسترسی به بک‌اند، از مقادیر پیش‌فرض استفاده می‌شود
  }
})

const contactInfo = computed(() => {
  const s = settings.value || {}
  const items = [
    {
      icon: '📍',
      title: t('contact_info_address'),
      value: getLocalizedText(s.address) || t('contact_default_address'),
      link: null
    }
  ]
  if (s.contactPhone) {
    items.push({
      icon: '📞',
      title: t('contact_info_phone'),
      value: s.contactPhone,
      link: 'tel:' + s.contactPhone
    })
  }
  if (s.contactEmail) {
    items.push({
      icon: '📧',
      title: t('contact_info_email'),
      value: s.contactEmail,
      link: 'mailto:' + s.contactEmail
    })
  }
  items.push({
    icon: '⏰',
    title: t('contact_info_hours'),
    value: getLocalizedText(s.contactHours) || t('contact_default_hours'),
    link: null
  })
  return items
})

const social = computed(() => (settings.value && settings.value.socialMedia) || {})
const mapUrl = computed(() => settings.value?.mapUrl || '')

// اعتبارسنجی ایمیل
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const handleSubmit = async () => {
  formError.value = ''

  // ولیدیشن فیلدهای ضروری
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.message.trim()) {
    formError.value = t('contact_form_error')
    return
  }

  // ولیدیشن فرمت ایمیل
  if (!isValidEmail(form.value.email)) {
    formError.value = t('contact_email_invalid')
    return
  }

  isSubmitting.value = true

  try {
    const res = await api.post('/contact', {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim(),
      subject: form.value.subject || t('contact_subject_1'),
      message: form.value.message.trim()
    })
    if (!res.data?.success) {
      throw new Error(res.data?.message || t('contact_submit_error'))
    }

    submitted.value = true
    form.value = { name: '', email: '', phone: '', subject: '', message: '' }
  } catch (err) {
    formError.value =
      t('contact_submit_error') + ': ' + (err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  submitted.value = false
  formError.value = ''
}

const faqItems = [
  { qKey: 'contact_faq_q1', aKey: 'contact_faq_a1' },
  { qKey: 'contact_faq_q2', aKey: 'contact_faq_a2' },
  { qKey: 'contact_faq_q3', aKey: 'contact_faq_a3' },
  { qKey: 'contact_faq_q4', aKey: 'contact_faq_a4' }
]
</script>

<template>
  <section class="contact-page" :dir="isRTL ? 'rtl' : 'ltr'">
    <!-- هیرو -->
    <div class="hero-section">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-overlay" aria-hidden="true"></div>

      <div class="hero-content">
        <span class="hero-badge glass">{{ $t('contact_badge') }}</span>
        <h1 class="hero-title">{{ $t('contact_hero_title') }}</h1>
        <p class="hero-desc">{{ $t('contact_hero_desc') }}</p>
      </div>
    </div>

    <!-- محتوای اصلی -->
    <div class="main-content">
      <div class="container">
        <div class="content-layout">
          <!-- فرم تماس -->
          <div class="form-section">
            <div class="form-card glass">
              <Transition name="fade" mode="out-in">
                <!-- پیام موفقیت -->
                <div v-if="submitted" key="success" class="success-message">
                  <div class="success-icon" aria-hidden="true">✓</div>
                  <h3>{{ $t('contact_success_title') }}</h3>
                  <p>{{ $t('contact_success_desc') }}</p>
                  <button class="reset-btn" @click="resetForm">
                    {{ $t('contact_new_message') }}
                  </button>
                </div>

                <!-- فرم -->
                <form v-else key="form" @submit.prevent="handleSubmit" class="contact-form" novalidate>
                  <h2 class="form-title">{{ $t('contact_form_title') }}</h2>
                  <p class="form-subtitle">{{ $t('contact_form_subtitle') }}</p>

                  <!-- نمایش خطا به‌صورت داخلی -->
                  <Transition name="fade">
                    <div v-if="formError" class="form-alert" role="alert">
                      {{ formError }}
                    </div>
                  </Transition>

                  <div class="form-grid">
                    <div class="form-group">
                      <label for="name">
                        {{ $t('contact_label_name') }} <span class="required">*</span>
                      </label>
                      <input
                        id="name"
                        v-model="form.name"
                        type="text"
                        autocomplete="name"
                        :placeholder="$t('contact_placeholder_name')"
                        required
                      />
                    </div>

                    <div class="form-group">
                      <label for="email">
                        {{ $t('contact_label_email') }} <span class="required">*</span>
                      </label>
                      <input
                        id="email"
                        v-model="form.email"
                        type="email"
                        autocomplete="email"
                        placeholder="example@email.com"
                        required
                      />
                    </div>

                    <div class="form-group">
                      <label for="phone">{{ $t('contact_label_phone') }}</label>
                      <input
                        id="phone"
                        v-model="form.phone"
                        type="tel"
                        autocomplete="tel"
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      />
                    </div>

                    <div class="form-group">
                      <label for="subject">{{ $t('contact_label_subject') }}</label>
                      <select id="subject" v-model="form.subject">
                        <option value="">{{ $t('contact_select_option') }}</option>
                        <option v-for="sub in subjects" :key="sub.key" :value="$t(sub.key)">
                          {{ $t(sub.key) }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group full-width">
                    <label for="message">
                      {{ $t('contact_label_message') }} <span class="required">*</span>
                    </label>
                    <textarea
                      id="message"
                      v-model="form.message"
                      :placeholder="$t('contact_placeholder_message')"
                      rows="5"
                      required
                    ></textarea>
                  </div>

                  <button type="submit" class="submit-btn" :disabled="isSubmitting">
                    <span v-if="isSubmitting" class="loading-spinner" aria-hidden="true"></span>
                    <span v-else class="btn-inner">
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      {{ $t('contact_submit_btn') }}
                    </span>
                  </button>
                </form>
              </Transition>
            </div>
          </div>

          <!-- اطلاعات تماس -->
          <div class="info-section">
            <div class="info-card glass">
              <h3 class="info-title">{{ $t('contact_info_title') }}</h3>

              <div class="contact-list">
                <component
                  :is="info.link ? 'a' : 'div'"
                  v-for="info in contactInfo"
                  :key="info.title"
                  :href="info.link || undefined"
                  class="contact-item"
                  :class="{ 'no-link': !info.link }"
                >
                  <span class="contact-icon" aria-hidden="true">{{ info.icon }}</span>
                  <div class="contact-content">
                    <span class="contact-label">{{ info.title }}</span>
                    <span class="contact-value">{{ info.value }}</span>
                  </div>
                </component>
              </div>
            </div>

            <!-- شبکه‌های اجتماعی -->
            <div class="social-card glass">
              <h3 class="social-title">{{ $t('contact_social_title') }}</h3>
              <p class="social-desc">{{ $t('contact_social_desc') }}</p>

              <div class="social-links">
                <a
                  v-if="social.instagram"
                  :href="social.instagram"
                  target="_blank"
                  rel="noopener"
                  class="social-link"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
                    <circle cx="18" cy="6" r="1" fill="currentColor"/>
                  </svg>
                </a>
                <a
                  v-if="social.telegram"
                  :href="social.telegram"
                  target="_blank"
                  rel="noopener"
                  class="social-link"
                  aria-label="Telegram"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                    <path d="M21 5L2 12.5l7 2M21 5l-4 15-6-7.5M21 5L9 14.5m0 0V21l3.5-4" fill="none" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </a>
                <a
                  v-if="social.whatsapp"
                  :href="social.whatsapp"
                  target="_blank"
                  rel="noopener"
                  class="social-link"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="none" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </a>
              </div>
            </div>

            <!-- نقشه -->
            <div class="map-card glass">
              <h3 class="map-title">{{ $t('contact_map_title') }}</h3>
              <a
                v-if="mapUrl"
                :href="mapUrl"
                target="_blank"
                rel="noopener"
                class="map-placeholder map-link"
              >
                <span class="map-icon" aria-hidden="true">🗺️</span>
                <p>{{ $t('contact_view_map') }}</p>
              </a>
              <div v-else class="map-placeholder">
                <span class="map-icon" aria-hidden="true">🗺️</span>
                <p>{{ $t('contact_no_map') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ -->
    <div class="faq-section">
      <div class="container">
        <div class="section-header">
          <span class="section-badge">FAQ</span>
          <h2 class="section-title">{{ $t('contact_faq_title') }}</h2>
        </div>

        <div class="faq-grid">
          <div v-for="(item, index) in faqItems" :key="index" class="faq-item glass">
            <h4>{{ $t(item.qKey) }}</h4>
            <p>{{ $t(item.aKey) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>


<style scoped>
.contact-page {
  min-height: 100vh;
  background: #050814;
  color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

/* هیرو */
.hero-section {
  position: relative;
  padding: 160px 0 80px;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(197,160,89,0.15), transparent 50%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at bottom, #050814, transparent);
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(197,160,89,0.5);
  font-size: 0.85rem;
  color: #facc6b;
  margin-bottom: 20px;
}

.hero-title {
  font-size: clamp(1.75rem, 5vw, 3rem);
  margin: 0 0 16px;
  line-height: 1.2;
}

.hero-desc {
  font-size: clamp(0.95rem, 2.5vw, 1.1rem);
  opacity: 0.85;
  max-width: 500px;
  margin: 0 auto;
  padding: 0 16px;
}

/* محتوای اصلی */
.main-content {
  padding: 40px 0 80px;
}

.content-layout {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 40px;
  align-items: start;
}

/* فرم */
.form-card {
  padding: 40px;
  border-radius: 24px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}

.form-title {
  font-size: 1.5rem;
  margin: 0 0 8px;
}

.form-subtitle {
  font-size: 0.9rem;
  opacity: 0.7;
  margin: 0 0 24px;
}

/* پیام خطای داخلی */
.form-alert {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.4);
  color: #fca5a5;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 500;
}

.required {
  color: #ef4444;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(15,23,42,0.8);
  color: #fff;
  font-size: 16px; /* جلوگیری از زوم خودکار در iOS */
  font-family: inherit;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  width: 100%;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: rgba(255,255,255,0.4);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: rgba(197,160,89,0.6);
  box-shadow: 0 0 0 3px rgba(197,160,89,0.15);
}

.form-group select {
  cursor: pointer;
}

.form-group select option {
  background: #0f172a;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  margin-top: 10px;
}

.btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(197,160,89,0.5);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* پیام موفقیت */
.success-message {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: #fff;
  box-shadow: 0 10px 40px rgba(16,185,129,0.4);
}

.success-message h3 {
  font-size: 1.4rem;
  margin: 0 0 12px;
}

.success-message p {
  opacity: 0.8;
  margin: 0 0 24px;
}

.reset-btn {
  padding: 12px 24px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.3);
  background: transparent;
  color: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.25s ease;
}

.reset-btn:hover {
  background: rgba(255,255,255,0.1);
}

/* اطلاعات تماس */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card,
.social-card,
.map-card {
  padding: 28px;
  border-radius: 20px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.08);
}

.info-title,
.social-title,
.map-title {
  font-size: 1.15rem;
  margin: 0 0 20px;
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(15,23,42,0.5);
  text-decoration: none;
  color: #fff;
  transition: background 0.25s ease, transform 0.25s ease;
}

/* استفاده از خاصیت منطقی برای پشتیبانی خودکار RTL/LTR */
.contact-item:not(.no-link):hover {
  background: rgba(197,160,89,0.15);
  transform: translateX(4px);
}

[dir="rtl"] .contact-item:not(.no-link):hover {
  transform: translateX(-4px);
}

.contact-item.no-link {
  cursor: default;
}

.contact-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.contact-content {
  min-width: 0;
}

.contact-label {
  display: block;
  font-size: 0.8rem;
  opacity: 0.6;
  margin-bottom: 2px;
}

.contact-value {
  font-size: 0.95rem;
  word-break: break-word;
}

/* شبکه‌های اجتماعی */
.social-desc {
  font-size: 0.85rem;
  opacity: 0.7;
  margin: -10px 0 20px;
}

.social-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.social-link {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(15,23,42,0.8);
  color: #facc6b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.social-link:hover {
  background: #c5a059;
  color: #000;
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(197,160,89,0.4);
}

/* نقشه */
.map-placeholder {
  height: 150px;
  border-radius: 12px;
  background: rgba(15,23,42,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.map-link {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: background 0.25s ease, transform 0.25s ease;
}

.map-link:hover {
  background: rgba(197,160,89,0.12);
  transform: translateY(-2px);
}

.map-icon {
  font-size: 2rem;
}

.map-placeholder p {
  font-size: 0.85rem;
  opacity: 0.6;
  margin: 0;
}

/* FAQ */
.faq-section {
  padding: 80px 0;
  background: radial-gradient(circle at center, rgba(197,160,89,0.08), transparent 60%);
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(197,160,89,0.15);
  color: #facc6b;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.section-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  margin: 0;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.faq-item {
  padding: 24px;
  border-radius: 16px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(255,255,255,0.08);
  transition: border-color 0.25s ease;
}

.faq-item:hover {
  border-color: rgba(197,160,89,0.4);
}

.faq-item h4 {
  font-size: 1rem;
  margin: 0 0 10px;
  color: #facc6b;
}

.faq-item p {
  font-size: 0.9rem;
  line-height: 1.8;
  opacity: 0.85;
  margin: 0;
}

/* انیمیشن Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ریسپانسیو */
@media (max-width: 1024px) {
  .content-layout {
    grid-template-columns: 1fr;
  }
  .form-card {
    padding: 30px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 20px;
  }
  .hero-section {
    padding: 130px 0 50px;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-group.full-width {
    grid-column: span 1;
  }
  .faq-grid {
    grid-template-columns: 1fr;
  }
  .faq-section {
    padding: 60px 0;
  }
}

/* موبایل‌های کوچک و پایین‌رده */
@media (max-width: 480px) {
  .container {
    padding: 0 16px;
  }
  .form-card {
    padding: 20px;
  }
  .info-card,
  .social-card,
  .map-card {
    padding: 20px;
  }
  .hero-section {
    padding: 110px 0 40px;
  }
}

/* بهینه‌سازی برای کاربرانی که انیمیشن کمتر می‌خواهند */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .submit-btn:hover:not(:disabled),
  .social-link:hover,
  .map-link:hover,
  .contact-item:not(.no-link):hover {
    transform: none;
  }
}
</style>
