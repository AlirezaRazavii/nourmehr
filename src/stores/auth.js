import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuth = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userName = computed(() => user.value?.name || '')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const needsProfile = computed(() => !!user.value && !user.value.isProfileComplete)

  const setAuthData = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    if (newToken) {
      localStorage.setItem('auth_token', newToken)
    } else {
      localStorage.removeItem('auth_token')
    }
    if (newUser) {
      localStorage.setItem('auth_user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('auth_user')
    }
  }

  const loadFromStorage = () => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
    }
  }

    // درخواست کد پیامک
  const requestSmsCode = async (phone) => {
    isLoading.value = true
    try {
      const response = await api.post('/auth/sms/request', { phone })
      return { success: true, message: response.data.message, remaining: response.data.remaining || 120 }
    } catch (err) {
      // اگر خطای ۴۲۹ (کد فعال) بود، زمان باقی‌مانده را هم برگردان
      const remaining = err.response?.data?.remaining || 0
      return {
        success: false,
        error: err.response?.data?.message || 'خطا در ارسال کد',
        remaining,
      }
    } finally {
      isLoading.value = false
    }
  }

  // تأیید کد پیامک (ورود یا ثبت‌نام خودکار)
  const verifySmsCode = async (phone, code) => {
    isLoading.value = true
    try {
      const response = await api.post('/auth/sms/verify', { phone, code })
      const { token: newToken, user: userData, needsProfile, isNewUser } = response.data
      setAuthData(newToken, userData)
      return { success: true, user: userData, needsProfile, isNewUser }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'کد نامعتبر است' }
    } finally {
      isLoading.value = false
    }
  }

  // تکمیل پروفایل (نام و نام خانوادگی)
  const completeProfile = async (name) => {
    isLoading.value = true
    try {
      const response = await api.post('/auth/complete-profile', { name })
      const updatedUser = response.data.user
      setAuthData(token.value, updatedUser)
      return { success: true, user: updatedUser }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'خطا در تکمیل پروفایل' }
    } finally {
      isLoading.value = false
    }
  }

  // خروج
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setAuthData(null, null)
      // پاک‌سازی state ویش‌لیست هنگام خروج
      try {
        const { useWishlist } = await import('./wishlist')
        useWishlist().resetWishlistState()
      } catch (e) {
        // اگر store هنوز لود نشده باشد مشکلی نیست
      }
    }
  }

  // دریافت پروفایل (اعتبارسنجی توکن)
  const fetchProfile = async () => {
    if (!token.value) return null
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      return user.value
    } catch {
      setAuthData(null, null)
      return null
    }
  }

  // بروزرسانی پروفایل
  const updateProfile = async (data) => {
    try {
      const response = await api.put('/user/profile', data)
      user.value = response.data.user
      localStorage.setItem('auth_user', JSON.stringify(user.value))
      return { success: true, user: user.value }
    } catch (err) {
      return { success: false, error: err.response?.data?.message }
    }
  }

  loadFromStorage()

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    userName,
    isAdmin,
    needsProfile,
    requestSmsCode,
    verifySmsCode,
    completeProfile,
    logout,
    fetchProfile,
    updateProfile,
    setUser: (newUser) => setAuthData(token.value, newUser),
    setToken: (newToken) => setAuthData(newToken, user.value)
  }
})
