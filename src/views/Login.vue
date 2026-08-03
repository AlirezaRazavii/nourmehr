<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuth } from '../stores/auth'
import Toast from '../components/Toast.vue'
import logoImg from '../assests/logo/Nourmehr-gold.webp'
import { sanitizeRedirect } from '../utils/safeRedirect'


const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuth()
const { isLoading } = storeToRefs(authStore)
const { requestSmsCode, verifySmsCode } = authStore

const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const step = ref('phone') // phone | code
const phone = ref('')
const code = ref('')
const resendCountdown = ref(0)
let countdownTimer = null

const startCountdown = (seconds = 120) => {
  resendCountdown.value = seconds
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    resendCountdown.value--
    if (resendCountdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

const validatePhone = (value) => /^09\d{9}$/.test(value)

const redirectAfterLogin = (result) => {
  // fallback خالی می‌دهیم تا بتوانیم «مقصدی وجود ندارد» را از «/» تشخیص دهیم
  const redirect = sanitizeRedirect(router.currentRoute.value.query.redirect, '')

  if (result.needsProfile) {
    router.push({
      name: 'CompleteProfile',
      params: { lang: locale.value },
      // مقصد را حفظ می‌کنیم تا بعد از تکمیل پروفایل گم نشود
      query: redirect ? { redirect } : {},
    })
    return
  }

  if (redirect) {
    window.location.href = redirect
    return
  }

  if (result.user?.role === 'admin') {
    window.location.href = '/admin/dashboard'
  } else {
    router.push({ name: 'UserDashboard', params: { lang: locale.value } })
  }
}


const handleSendCode = async () => {
  if (!validatePhone(phone.value)) {
    showToast(t('login_err_phone_invalid') || 'شماره موبایل معتبر نیست', 'warning')
    return
  }
  const result = await requestSmsCode(phone.value)

  if (!result.success) {
    if (result.remaining && result.remaining > 0) {
      step.value = 'code'
      startCountdown(result.remaining)
      showToast(result.error, 'warning')
      return
    }
    showToast(result.error || 'خطا در ارسال کد', 'error')
    return
  }

  step.value = 'code'
  startCountdown(result.remaining || 120)
  showToast(result.message || 'کد تایید ارسال شد', 'success')
}
const handleVerify = async () => {
  if (!/^\d{6}$/.test(code.value)) {
    showToast(t('login_err_code_invalid') || 'کد تایید باید ۶ رقم باشد', 'warning')
    return
  }
  const result = await verifySmsCode(phone.value, code.value)
  if (!result.success) {
    showToast(result.error || 'کد نامعتبر است', 'error')
    return
  }
  redirectAfterLogin(result)
}

const handleResend = async () => {
  if (resendCountdown.value > 0) return
  await handleSendCode()
}

const changeNumber = () => {
  step.value = 'phone'
  code.value = ''
  clearInterval(countdownTimer)
  resendCountdown.value = 0
}
</script>

<template>
  <section class="login-page">
    <div class="login-bg"></div>
    <div class="login-overlay"></div>

    <div class="login-container">
      <div class="form-card glass">
        <div class="login-logo-wrapper">
          <img :src="logoImg" alt="Nourmehr Logo" class="login-logo" />
        </div>

        <!-- مرحله ۱: وارد کردن شماره -->
        <div v-if="step === 'phone'" class="form-step">
          <div class="form-header">
            <h2>{{ $t('login_title') || 'ورود / ثبت‌نام' }}</h2>
            <p>{{ $t('login_phone_subtitle') || 'شماره موبایل خود را وارد کنید' }}</p>
          </div>

          <form @submit.prevent="handleSendCode" class="auth-form">
            <div class="form-group">
              <label for="phone">{{ $t('login_label_phone') || 'شماره موبایل' }}</label>
              <div class="input-wrapper">
                <svg viewBox="0 0 24 24" class="input-icon">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
                <input
                  id="phone"
                  v-model="phone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="11"
                  placeholder="09123456789"
                  autofocus
                />
              </div>
            </div>

            <button type="submit" class="submit-btn" :disabled="isLoading">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>{{ $t('login_send_code') || 'دریافت کد تایید' }}</span>
            </button>
          </form>
        </div>

        <!-- مرحله ۲: وارد کردن کد -->
        <div v-else class="form-step">
          <div class="form-header">
            <h2>{{ $t('login_code_title') || 'کد تایید' }}</h2>
            <p>{{ $t('login_code_subtitle') || 'کد ارسال‌شده به شماره زیر را وارد کنید' }}</p>
            <span class="phone-display">{{ phone }}</span>
          </div>

          <form @submit.prevent="handleVerify" class="auth-form">
            <div class="form-group">
              <label for="code">{{ $t('login_label_sms_code') || 'کد تایید' }}</label>
              <div class="input-wrapper">
                <svg viewBox="0 0 24 24" class="input-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
                <input
                  id="code"
                  v-model="code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="------"
                  class="code-input"
                  autofocus
                />
              </div>
            </div>

            <button type="submit" class="submit-btn" :disabled="isLoading">
              <span v-if="isLoading" class="loading-spinner"></span>
              <span v-else>{{ $t('login_verify_btn') || 'تایید و ورود' }}</span>
            </button>

            <div class="code-actions">
              <button type="button" class="text-btn" @click="changeNumber">
                {{ $t('login_change_number') || 'تغییر شماره' }}
              </button>
              <button
                type="button"
                class="text-btn"
                :disabled="resendCountdown > 0"
                @click="handleResend"
              >
                <span v-if="resendCountdown > 0">
                  {{ $t('login_resend_in') || 'ارسال مجدد تا' }} {{ resendCountdown }}
                </span>
                <span v-else>{{ $t('login_resend') || 'ارسال مجدد کد' }}</span>
              </button>
            </div>
          </form>
        </div>

        <router-link :to="{ name: 'Home', params: { lang: locale } }" class="back-home">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>{{ $t('login_back_home') || 'بازگشت به خانه' }}</span>
        </router-link>
      </div>
    </div>

    <Teleport to="body">
      <Toast :show="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
    </Teleport>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #050814;
  color: #fff;
  position: relative;
  overflow: hidden;
  padding: 20px;
}
.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, rgba(197,160,89,0.15), transparent 50%),
    radial-gradient(circle at bottom left, rgba(56,189,248,0.1), transparent 50%);
}
.login-overlay { position: absolute; inset: 0; opacity: 0.03; }
.login-container {
  position: relative;
  width: 100%;
  max-width: 440px;
}
.form-card {
  background: rgba(8,10,18,0.85);
  border: 1px solid rgba(197,160,89,0.2);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
.login-logo-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}
.login-logo {
  width: 130px;
  height: auto;
  object-fit: contain;
}
.form-header { margin-bottom: 24px; text-align: center; }
.form-header h2 { font-size: 1.4rem; margin: 0 0 8px; }
.form-header p { font-size: 0.9rem; opacity: 0.7; margin: 0; }
.phone-display { display: inline-block; margin-top: 8px; color: #facc6b; font-weight: 600; direction: ltr; }
.auth-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.85rem; font-weight: 500; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; right: 14px; width: 18px; height: 18px; color: rgba(255,255,255,0.4); pointer-events: none; }
.input-wrapper input {
  width: 100%; padding: 14px 44px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(15,23,42,0.8); color: #fff;
  font-size: 0.95rem; font-family: inherit; outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  direction: ltr; text-align: center;
}
.input-wrapper input::placeholder { color: rgba(255,255,255,0.35); }
.input-wrapper input:focus { border-color: rgba(197,160,89,0.6); box-shadow: 0 0 0 3px rgba(197,160,89,0.15); }
.code-input { letter-spacing: 0.5em; font-size: 1.3rem; }
.submit-btn {
  width: 100%; padding: 16px; border-radius: 999px; border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000; font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex; align-items: center; justify-content: center;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(197,160,89,0.5); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.loading-spinner {
  width: 20px; height: 20px; border: 2px solid rgba(0,0,0,0.2);
  border-top-color: #000; border-radius: 50%;
  animation: spin 0.8s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.code-actions { display: flex; justify-content: space-between; align-items: center; }
.text-btn { background: none; border: none; color: #facc6b; font-size: 0.85rem; cursor: pointer; }
.text-btn:disabled { color: rgba(255,255,255,0.4); cursor: not-allowed; }
.back-home {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 24px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem;
  transition: color 0.2s;
}
.back-home:hover { color: #facc6b; }
@media (max-width: 480px) {
  .form-card { padding: 32px 20px; }
}
</style>
