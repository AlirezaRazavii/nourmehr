// src/i18n.js
import { createI18n } from 'vue-i18n'
import fa from './assests/locales/fa.json'
import en from './assests/locales/en.json'

const messages = { fa, en }

const savedLanguage = localStorage.getItem('app_lang') || 'fa'

// تنظیم جهت صفحه روی تگ <html> از همان ابتدا (رفع مشکل چپ‌نویس شدن هنگام لود اولیه)
const rtlLocales = ['fa', 'ar', 'he']
document.documentElement.setAttribute(
  'dir',
  rtlLocales.includes(savedLanguage) ? 'rtl' : 'ltr'
)
document.documentElement.setAttribute('lang', savedLanguage)

const i18n = createI18n({
  legacy: false,
  locale: savedLanguage,
  fallbackLocale: 'en',
  messages,
})

export default i18n
