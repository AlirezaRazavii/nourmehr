/**
 * useTheme — حالت روشن/تاریک سیستم رسانه‌ای
 *
 * - پیش‌فرض: تاریک (هویت فعلی برند #050814)
 * - انتخاب کاربر در localStorage (nm-theme) ذخیره می‌شود
 * - اعمال با data-theme روی <html> — متغیرهای media.css این را می‌خوانند
 * - ترجیح سیستمی (prefers-color-scheme) فقط بار اول در نظر گرفته می‌شود
 */
import { ref, readonly } from 'vue'

const STORAGE_KEY = 'nm-theme'

const getInitial = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    // کاربر انتخابی نکرده → پیش‌فرض برند: تاریک
    return 'dark'
  } catch {
    return 'dark'
  }
}

const theme = ref(getInitial())

const apply = () => {
  try {
    document.documentElement.setAttribute('data-theme', theme.value)
    document.documentElement.style.colorScheme = theme.value
  } catch { /* SSR/تست — بی‌خطر */ }
}

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(STORAGE_KEY, theme.value) } catch { /* بی‌خطر */ }
    apply()
  }

  const set = (value) => {
    if (value !== 'light' && value !== 'dark') return
    theme.value = value
    try { localStorage.setItem(STORAGE_KEY, theme.value) } catch { /* بی‌خطر */ }
    apply()
  }

  // اعمال اولیه (در setup هر کامپوننت صدا زده می‌شود — idempotent)
  apply()

  return {
    theme: readonly(theme),
    toggle,
    set
  }
}
