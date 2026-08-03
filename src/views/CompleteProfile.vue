<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuth } from '../stores/auth'
import Toast from '../components/Toast.vue'
import { sanitizeRedirect } from '../utils/safeRedirect'


const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuth()
const { isLoading } = storeToRefs(authStore)
const { completeProfile } = authStore

const name = ref('')
const toast = ref({ show: false, message: '', type: 'success' })
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const handleSubmit = async () => {
  const trimmed = name.value.trim()
  if (trimmed.length < 3) {
    showToast(t('profile_err_name') || 'نام و نام خانوادگی باید حداقل ۳ حرف باشد', 'warning')
    return
  }
  const result = await completeProfile(trimmed)
  if (!result.success) {
    showToast(result.error || 'خطا در ثبت اطلاعات', 'error')
    return
  }
  showToast(t('profile_success') || 'خوش آمدید!', 'success')
  setTimeout(() => {
    const redirect = sanitizeRedirect(router.currentRoute.value.query.redirect, '')
    if (redirect) {
      window.location.href = redirect
    } else {
      router.push({ name: 'UserDashboard', params: { lang: locale.value } })
    }
  }, 600)
}
</script>

<template>
  <section class="profile-page">
    <div class="profile-bg"></div>
    <div class="profile-container">
      <div class="form-card">
        <div class="brand-logo"><span class="logo-icon">◆</span></div>
        <div class="form-header">
          <h2>{{ $t('profile_title') || 'تکمیل ثبت‌نام' }}</h2>
          <p>{{ $t('profile_subtitle') || 'برای ادامه، نام و نام خانوادگی خود را وارد کنید' }}</p>
        </div>

        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-group">
            <label for="name">{{ $t('profile_label_name') || 'نام و نام خانوادگی' }}</label>
            <div class="input-wrapper">
              <svg viewBox="0 0 24 24" class="input-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
              <input
                id="name"
                v-model="name"
                type="text"
                maxlength="60"
                :placeholder="$t('profile_placeholder_name') || 'مثال: علی رضایی'"
                autofocus
              />
            </div>
          </div>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else>{{ $t('profile_submit') || 'تکمیل و ورود' }}</span>
          </button>
        </form>
      </div>
    </div>

    <Teleport to="body">
      <Toast :show="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
    </Teleport>
  </section>
</template>

<style scoped>
.profile-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #050814; color: #fff; position: relative; overflow: hidden; padding: 20px;
}
.profile-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at top right, rgba(197,160,89,0.15), transparent 50%),
    radial-gradient(circle at bottom left, rgba(56,189,248,0.1), transparent 50%);
}
.profile-container { position: relative; width: 100%; max-width: 440px; }
.form-card {
  background: rgba(8,10,18,0.85); border: 1px solid rgba(197,160,89,0.2);
  border-radius: 24px; padding: 40px 32px; box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
.brand-logo {
  width: 70px; height: 70px; margin: 0 auto 20px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(197,160,89,0.3), rgba(197,160,89,0.1));
  border: 2px solid rgba(197,160,89,0.5); display: flex; align-items: center; justify-content: center;
}
.logo-icon { font-size: 2rem; color: #facc6b; }
.form-header { margin-bottom: 24px; text-align: center; }
.form-header h2 { font-size: 1.4rem; margin: 0 0 8px; }
.form-header p { font-size: 0.9rem; opacity: 0.7; margin: 0; }
.auth-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.85rem; font-weight: 500; }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; right: 14px; width: 18px; height: 18px; color: rgba(255,255,255,0.4); pointer-events: none; }
.input-wrapper input {
  width: 100%; padding: 14px 44px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.12); background: rgba(15,23,42,0.8);
  color: #fff; font-size: 0.95rem; font-family: inherit; outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.input-wrapper input::placeholder { color: rgba(255,255,255,0.35); }
.input-wrapper input:focus { border-color: rgba(197,160,89,0.6); box-shadow: 0 0 0 3px rgba(197,160,89,0.15); }
.submit-btn {
  width: 100%; padding: 16px; border-radius: 999px; border: none;
  background: linear-gradient(135deg, #c5a059, #8f7032); color: #000;
  font-size: 1rem; font-weight: 600; cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex; align-items: center; justify-content: center;
}
.submit-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(197,160,89,0.5); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.loading-spinner {
  width: 20px; height: 20px; border: 2px solid rgba(0,0,0,0.2);
  border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 480px) { .form-card { padding: 32px 20px; } }
</style>
