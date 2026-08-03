const FALLBACK = '/'

/**
 * فقط مسیرهای داخلی و نسبی را می‌پذیرد.
 * هر URL خارجی، protocol-relative یا اسکیم خطرناک رد می‌شود.
 *
 * @param {unknown} raw       مقدار خام از query string
 * @param {string}  fallback  مقدار جایگزین در صورت رد شدن
 * @returns {string}          مسیر امن داخلی یا fallback
 */
export const sanitizeRedirect = (raw, fallback = FALLBACK) => {
  if (typeof raw !== 'string') return fallback

  // حذف کاراکترهای کنترلی که برای دور زدن فیلترها استفاده می‌شوند
  // مثال: "\n//evil.com" یا "java\tscript:alert(1)"
  const value = raw.trim().replace(/[\u0000-\u001F\u007F]/g, '')
  if (!value) return fallback

  // لایه ۱: باید با اسلش شروع شود
  // این javascript: و data: و https:// و //evil.com را رد می‌کند
  if (value[0] !== '/') return fallback

  // لایه ۲: //evil.com و /\evil.com هر دو protocol-relative هستند
  // مرورگر آن‌ها را به عنوان آدرس خارجی تفسیر می‌کند
  if (value[1] === '/' || value[1] === '\\') return fallback

  // لایه ۳: بازبینی نهایی با WHATWG URL
  // اگر origin عوض شد یعنی چیزی از فیلترهای بالا رد شده
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}

export default sanitizeRedirect
