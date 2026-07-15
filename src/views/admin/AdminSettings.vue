<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../../services/adminApi'

const loading = ref(true)
const saving = ref(false)
const settings = ref({
  siteName: '',
  siteTagline: '',
  currency: 'تومان',
  currencySymbol: 'ت',
  enableRegistration: true,
  enableGoogleLogin: false,
  enableSmsLogin: false,
  paymentMethods: [],
  shippingMethods: [],
  contactPhone: '',
  contactEmail: '',
  address: '',
  contactHours: '',
  mapUrl: '',
  socialMedia: { instagram: '', telegram: '', whatsapp: '' },
  seo: { title: '', description: '' },
})

const ensureNested = (data) => ({
  ...settings.value,
  ...data,
  socialMedia: {
    instagram: '',
    telegram: '',
    whatsapp: '',
    ...(data?.socialMedia || {})
  },
  seo: {
    title: '',
    description: '',
    ...(data?.seo || {})
  },
  paymentMethods: data?.paymentMethods || [],
  shippingMethods: data?.shippingMethods || []
})

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await adminApi.getSettings()
    if (res.success && res.data) {
      // merge با مقادیر پیش‌فرض تا فیلدهای nested هرگز undefined نشن
      settings.value = {
        ...settings.value,
        ...res.data,
        socialMedia: {
          instagram: '',
          telegram: '',
          whatsapp: '',
          ...(res.data.socialMedia || {})
        },
        seo: {
          title: '',
          description: '',
          ...(res.data.seo || {})
        },
        paymentMethods: res.data.paymentMethods || [],
        shippingMethods: res.data.shippingMethods || []
      }
    }
  } catch (err) {
    console.error('[Settings] fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchSettings)

const saveSettings = async () => {
  saving.value = true
  try {
    const res = await adminApi.updateSettings(settings.value)
    if (res.success) {
      alert('تنظیمات با موفقیت ذخیره شد!')
    } else {
      throw new Error(res.message || 'خطا در ذخیره')
    }
  } catch (err) {
    alert('خطا: ' + (err.response?.data?.message || err.message || 'ذخیره ناموفق بود'))
  } finally {
    saving.value = false
  }
}

const addTag = (field) => {
  const value = prompt(field === 'paymentMethods' ? 'نام روش پرداخت جدید:' : 'نام روش ارسال جدید:')
  if (value && value.trim()) {
    if (!settings.value[field]) settings.value[field] = []
    settings.value[field].push(value.trim())
  }
}

const removeTag = (field, idx) => {
  settings.value[field].splice(idx, 1)
}
</script>

<template>
  <div class="admin-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">تنظیمات سایت</h1>
        <p class="page-subtitle">مدیریت تنظیمات general سایت</p>
      </div>
      <button class="submit-btn" :disabled="saving" @click="saveSettings">
        <span v-if="saving" class="loading-spinner"></span>
        <span v-else>ذخیره تغییرات</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else class="settings-content">
      <div class="settings-section glass-card">
        <h3 class="section-title">اطلاعات اصلی</h3>
        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">نام سایت</label>
            <input v-model="settings.siteName" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">شعار سایت</label>
            <input v-model="settings.siteTagline" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">واحد پول</label>
            <input v-model="settings.currency" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">نماد واحد پول</label>
            <input v-model="settings.currencySymbol" type="text" class="form-input" />
          </div>
        </div>
      </div>

      <div class="settings-section glass-card">
        <h3 class="section-title">تنظیمات کاربران</h3>
        <div class="toggle-group">
          <div class="toggle-item">
            <div class="toggle-info">
              <span class="toggle-label">ثبت‌نام کاربران</span>
              <span class="toggle-desc">امکان ثبت‌نام جدید کاربران در سایت</span>
            </div>
            <label class="toggle-switch">
              <input v-model="settings.enableRegistration" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <span class="toggle-label">ورود با گوگل</span>
              <span class="toggle-desc">فعال کردن ورود با حساب گوگل</span>
            </div>
            <label class="toggle-switch">
              <input v-model="settings.enableGoogleLogin" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="toggle-item">
            <div class="toggle-info">
              <span class="toggle-label">ورود با پیامک</span>
              <span class="toggle-desc">فعال کردن ورود با شماره موبایل</span>
            </div>
            <label class="toggle-switch">
              <input v-model="settings.enableSmsLogin" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-section glass-card">
        <h3 class="section-title">روش‌های پرداخت</h3>
        <div class="tags-group">
          <span v-for="(method, idx) in settings.paymentMethods" :key="idx" class="tag" @click="removeTag('paymentMethods', idx)" title="برای حذف کلیک کنید">{{ method }} ×</span>
          <button class="add-tag-btn" @click="addTag('paymentMethods')">+ افزودن</button>
        </div>
      </div>

      <div class="settings-section glass-card">
        <h3 class="section-title">روش‌های ارسال</h3>
        <div class="tags-group">
          <span v-for="(method, idx) in settings.shippingMethods" :key="idx" class="tag" @click="removeTag('shippingMethods', idx)" title="برای حذف کلیک کنید">{{ method }} ×</span>
          <button class="add-tag-btn" @click="addTag('shippingMethods')">+ افزودن</button>
        </div>
      </div>

      <div class="settings-section glass-card">
        <h3 class="section-title">تماس با ما</h3>
        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">شماره تماس</label>
            <input v-model="settings.contactPhone" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">ایمیل</label>
            <input v-model="settings.contactEmail" type="email" class="form-input" />
          </div>
          <div class="form-group full">
            <label class="form-label">آدرس</label>
            <input v-model="settings.address" type="text" class="form-input" />
          </div>
          <div class="form-group full">
            <label class="form-label">ساعات کاری</label>
            <input v-model="settings.contactHours" type="text" class="form-input" placeholder="مثلاً شنبه تا پنج‌شنبه: ۹ تا ۱۸" />
          </div>
          <div class="form-group full">
            <label class="form-label">لینک نقشه / موقعیت مکانی</label>
            <input v-model="settings.mapUrl" type="text" class="form-input" placeholder="لینک گوگل‌مپ موقعیت فروشگاه (https://maps.app.goo.gl/... یا https://maps.google.com/...)" />
          </div>
        </div>
      </div>

      <div class="settings-section glass-card">
        <h3 class="section-title">شبکه‌های اجتماعی</h3>
        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">اینستاگرام</label>
            <input v-model="settings.socialMedia.instagram" type="text" class="form-input" placeholder="https://instagram.com/..." />
          </div>
          <div class="form-group">
            <label class="form-label">تلگرام</label>
            <input v-model="settings.socialMedia.telegram" type="text" class="form-input" placeholder="https://t.me/..." />
          </div>
          <div class="form-group">
            <label class="form-label">واتساپ</label>
            <input v-model="settings.socialMedia.whatsapp" type="text" class="form-input" placeholder="https://wa.me/..." />
          </div>
        </div>
      </div>

      <div class="settings-section glass-card">
        <h3 class="section-title">SEO</h3>
        <div class="settings-grid">
          <div class="form-group full">
            <label class="form-label">عنوان سایت</label>
            <input v-model="settings.seo.title" type="text" class="form-input" />
          </div>
          <div class="form-group full">
            <label class="form-label">توضیحات متا</label>
            <textarea v-model="settings.seo.description" class="form-input form-textarea" rows="3"></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  opacity: 0.5;
  margin: 4px 0 0;
}

.submit-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(197,160,89,0.5);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  padding: 24px;
  border-radius: 16px;
  background: rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.06);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px;
  color: #facc6b;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.form-input {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: rgba(197,160,89,0.5);
}

.form-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.toggle-item:last-child {
  border-bottom: none;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-size: 0.95rem;
  font-weight: 500;
}

.toggle-desc {
  font-size: 0.8rem;
  opacity: 0.5;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.1);
  border-radius: 999px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: #c5a059;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
  background: #000;
}

.tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tag {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(197,160,89,0.1);
  border: 1px solid rgba(197,160,89,0.3);
  color: #facc6b;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.4);
  color: #f87171;
}

.add-tag-btn {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px dashed rgba(255,255,255,0.2);
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.add-tag-btn:hover {
  border-color: rgba(197,160,89,0.5);
  color: #facc6b;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: rgba(255,255,255,0.5);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(197,160,89,0.2);
  border-top-color: #c5a059;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
