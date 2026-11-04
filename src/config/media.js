/**
 * تنظیمات ماژول رسانه‌ای جدید
 *
 * سوییچ فعال‌سازی:
 *  - در فایل .env پروژه (سمت فرانت):  VITE_NEW_MEDIA=true
 *  - سپس دوباره build بگیرید:  npm run build
 *  - false (یا حذف متغیر) = همان ماژول قدیمی News/NewsDetails می‌ماند
 *
 * این الگو «feature flag بیلد-تایم» است: هر دو ماژول در کد حضور دارند،
 * فقط ماژول فعال باندل می‌شود؛ برگشت (rollback) فقط با یک build قبلی.
 */
export const USE_NEW_MEDIA = import.meta.env.VITE_NEW_MEDIA === 'true'

/* پالت برند — استخراج‌شده از سایت فعلی (#050814 سرمه‌ای، #c5a059 طلایی) */
export const PALETTE = {
  bg: '#050814',
  bgSoft: '#0a0f24',
  surface: 'rgba(5, 8, 20, 0.8)',
  line: 'rgba(255, 255, 255, 0.08)',
  gold: '#c5a059',
  goldLight: '#facc6b',
  teal: '#2bbf9e',
  blue: '#60a5fa',
  text: '#ffffff'
}

/* تنظیمات هاب اخبار */
export const NEWS = {
  PAGE_SIZE: 9,
  SEARCH_DEBOUNCE: 300, // میلی‌ثانیه
  PREFETCH_DELAY: 120   // هاور روی کارت → پیش‌واکشی جزئیات
}
