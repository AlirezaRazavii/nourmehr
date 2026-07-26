import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

/** خواندن امن از localStorage — هرگز نباید اپ را کرش کند */
const safeGet = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw === 'undefined' || raw === 'null') return null
    return raw
  } catch { return null }
}

const safeParse = (raw) => {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const safeSet = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* حالت Private Mode یا پر بودن حافظه */ }
}

/** بررسی انقضای JWT بدون کتابخانه‌ی اضافه */
const isTokenExpired = (token) => {
  try {
    const part = token.split('.')[1]
    if (!part) return false
    const json = decodeURIComponent(
      atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(json)
    if (!payload.exp) return false
    return payload.exp * 1000 <= Date.now() + 5000 // ۵ ثانیه حاشیه‌ی امن
  } catch {
    return false // اگر توکن JWT استاندارد نبود، قضاوت نمی‌کنیم
  }
}

let listenerAttached = false

export const useAuth = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const isLoading = ref(false)
  const isReady = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userName = computed(() => user.value?.name || '')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const needsProfile = computed(() => !!user.value && !user.value.isProfileComplete)

  const setAuthData = (newToken, newUser) => {
    token.value = newToken || null
    user.value = newUser || null
    safeSet(TOKEN_KEY, newToken || null)
    safeSet(USER_KEY, newUser ? JSON.stringify(newUser) : null)
  }

  const clearAuth = () => setAuthData(null, null)

  const loadFromStorage = () => {
    const storedToken = safeGet(TOKEN_KEY)
    const storedUser = safeParse(safeGet(USER_KEY))

    if (!storedToken || !storedUser) { clearAuth(); return }
    if (isTokenExpired(storedToken)) { clearAuth(); return }

    token.value = storedToken
    user.value = storedUser
  }

  /** یک بار در شروع اپ صدا زده می‌شود (در main.js قبل از mount) */
  const initialize = async () => {
    loadFromStorage()
    if (token.value) await fetchProfile()
    isReady.value = true
    return user.value
  }

  const handleError = (err, fallback) => {
    const msg = err?.response?.data?.message || err?.friendlyMessage || fallback
    error.value = msg
    return { success: false, error: msg }
  }

  // ---------------- SMS Auth ----------------
  const requestSmsCode = async (phone) => {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/sms/request', { phone })
      return { success: true, message: data.message, remaining: data.remaining || 120 }
    } catch (err) {
      const remaining = err.response?.data?.remaining || 0
      return { ...handleError(err, 'خطا در ارسال کد'), remaining }
    } finally {
      isLoading.value = false
    }
  }

  const verifySmsCode = async (phone, code) => {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/sms/verify', { phone, code })
      setAuthData(data.token, data.user)
      return { success: true, user: data.user, needsProfile: data.needsProfile, isNewUser: data.isNewUser }
    } catch (err) {
      return handleError(err, 'کد وارد شده نامعتبر است')
    } finally {
      isLoading.value = false
    }
  }

  const completeProfile = async (name) => {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/complete-profile', { name })
      setAuthData(token.value, data.user)
      return { success: true, user: data.user }
    } catch (err) {
      return handleError(err, 'خطا در تکمیل پروفایل')
    } finally {
      isLoading.value = false
    }
  }

  // ---------------- Profile ----------------
  let profileInflight = null

  const fetchProfile = async () => {
    if (!token.value) return null
    if (profileInflight) return profileInflight // جلوگیری از درخواست‌های موازی تکراری

    profileInflight = (async () => {
      try {
        const { data } = await api.get('/auth/me')
        setAuthData(token.value, data.user)
        return user.value
      } catch (err) {
        // فقط اگر واقعاً توکن رد شد، سشن را پاک کن؛ خطای شبکه نباید کاربر را بیرون بیندازد
        if (err?.response?.status === 401 || err?.response?.status === 403) clearAuth()
        return null
      } finally {
        profileInflight = null
      }
    })()

    return profileInflight
  }

  const updateProfile = async (payload) => {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.put('/user/profile', payload)
      setAuthData(token.value, data.user)
      return { success: true, user: data.user }
    } catch (err) {
      return handleError(err, 'خطا در بروزرسانی پروفایل')
    } finally {
      isLoading.value = false
    }
  }

  // ---------------- Logout ----------------
  const resetRelatedStores = async () => {
    try {
      const { useWishlist } = await import('./wishlist')
      useWishlist().resetWishlistState?.()
    } catch { /* استور هنوز لود نشده */ }
    try {
      const { useCart } = await import('./cart')
      useCart().resetCartState?.()
    } catch { /* اگر چنین متدی ندارید نادیده گرفته می‌شود */ }
  }

  const logout = async ({ callApi = true } = {}) => {
    try {
      if (callApi && token.value) await api.post('/auth/logout')
    } catch { /* حتی اگر سرور جواب نداد، سمت کلاینت خارج می‌شویم */ }
    finally {
      clearAuth()
      await resetRelatedStores()
    }
  }

  // واکنش به ۴۰۱ سراسری که در api.js منتشر می‌شود
  if (typeof window !== 'undefined' && !listenerAttached) {
    listenerAttached = true
    window.addEventListener('auth:unauthorized', () => {
      if (token.value) logout({ callApi: false })
    })
    // همگام‌سازی بین تب‌های باز مرورگر
    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY) loadFromStorage()
    })
  }

  loadFromStorage()

  return {
    user, token, isLoading, isReady, error,
    isAuthenticated, userName, isAdmin, needsProfile,
    initialize, loadFromStorage,
    requestSmsCode, verifySmsCode, completeProfile,
    logout, fetchProfile, updateProfile,
    setUser: (u) => setAuthData(token.value, u),
    setToken: (t) => setAuthData(t, user.value)
  }
})
