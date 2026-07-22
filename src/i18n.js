// src/i18n.js
import { createI18n } from 'vue-i18n'
import fa from './assests/locales/fa.json'
import en from './assests/locales/en.json'

const messages = { fa, en }

const savedLanguage = localStorage.getItem('app_lang') || 'fa'

export function applyDirection(lang) {
  const dir = lang === 'fa' ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', lang)
}

applyDirection(savedLanguage)

const i18n = createI18n({
  legacy: false,
  locale: savedLanguage,
  fallbackLocale: 'en',
  messages,
})

export default i18n
