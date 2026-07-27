// src/i18n.js
import { createI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = ['fa', 'en']
export const DEFAULT_LOCALE = 'fa'

const loaders = {
  fa: () => import('./assests/locales/fa.json'),
  en: () => import('./assests/locales/en.json'),
}

export function getSavedLocale() {
  let saved = null
  try {
    saved = localStorage.getItem('app_lang')
  } catch (e) {
    saved = null
  }
  return SUPPORTED_LOCALES.includes(saved) ? saved : DEFAULT_LOCALE
}

export function applyDirection(lang) {
  const dir = lang === 'fa' ? 'rtl' : 'ltr'
  const el = document.documentElement
  if (el.getAttribute('dir') !== dir) el.setAttribute('dir', dir)
  if (el.getAttribute('lang') !== lang) el.setAttribute('lang', lang)
}

const initialLocale = getSavedLocale()
applyDirection(initialLocale)

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: initialLocale,
  messages: {},
  missingWarn: false,
  fallbackWarn: false,
  silentTranslationWarn: true,
})

const loaded = new Set()
const pending = new Map()

export function loadLocaleMessages(lang) {
  const target = SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE
  if (loaded.has(target)) return Promise.resolve(target)
  if (pending.has(target)) return pending.get(target)

  const task = loaders[target]()
    .then((mod) => {
      i18n.global.setLocaleMessage(target, mod.default || mod)
      loaded.add(target)
      pending.delete(target)
      return target
    })
    .catch((err) => {
      pending.delete(target)
      throw err
    })

  pending.set(target, task)
  return task
}

export async function setLocale(lang) {
  const target = SUPPORTED_LOCALES.includes(lang) ? lang : DEFAULT_LOCALE
  await loadLocaleMessages(target)
  i18n.global.locale.value = target
  i18n.global.fallbackLocale.value = target
  try {
    localStorage.setItem('app_lang', target)
  } catch (e) {}
  applyDirection(target)
  return target
}

export default i18n
