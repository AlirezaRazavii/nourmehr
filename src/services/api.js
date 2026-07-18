import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const isDev = import.meta.env.DEV

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// افزودن توکن و زبان به هر درخواست
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`
    }
    const lang = localStorage.getItem('app_lang') || 'fa'
    config.headers['Accept-Language'] = lang
    return config
  },
  (error) => Promise.reject(error)
)

// مدیریت پاسخ‌ها: فقط پاک‌سازی توکن نامعتبر — هدایت به عهده کامپوننت/روتر
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      // توکن نامعتبر یا منقضی؛ پاک‌سازی می‌کنیم تا وضعیت تمیز بماند
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    if (isDev) {
      console.warn(`[API] ${status || 'network'} on ${error.config?.url}`)
    }
    return Promise.reject(error)
  }
)

export default api
