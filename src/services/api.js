import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const isDev = import.meta.env.DEV

// مسیرهایی که ۴۰۱ آن‌ها «انقضای سشن» نیست، بلکه خطای ورود است
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/send-otp', '/auth/verify-otp', '/auth/google']

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`
    }

    config.headers['Accept-Language'] = localStorage.getItem('app_lang') || 'fa'

    // اصلاح باگ آپلود: اجازه بده axios خودش boundary را بسازد
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
    if (isFormData) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
      config.timeout = 120000 // آپلود عکس زمان بیشتری لازم دارد
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    const isAuthCall = AUTH_ENDPOINTS.some(p => url.includes(p))

    if (status === 401 && !isAuthCall) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      // هدایت همچنان بر عهده‌ی روتر/کامپوننت است
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    if (!error.response && error.code !== 'ERR_CANCELED') {
      error.friendlyMessage = 'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.'
    } else if (status === 429) {
      error.friendlyMessage = 'تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید.'
    } else if (status >= 500) {
      error.friendlyMessage = 'خطای سرور. لطفاً بعداً تلاش کنید.'
    }

    if (isDev && error.code !== 'ERR_CANCELED') {
      console.warn(`[API] ${status || 'network'} on ${url}`, error.response?.data?.message || error.message)
    }

    return Promise.reject(error)
  }
)

export default api
