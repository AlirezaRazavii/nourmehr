/**
 * useMedia — خانواده کامپوزبل‌های ماژول رسانه‌ای (همه بر پایه IntersectionObserver)
 *
 * شامل:
 *  ۱) useTOC          → ساخت فهرست مطالب از h2/h3 محتوای رندرشده + هایلایت فعال
 *  ۲) useReadingProgress → نوار پیشرفت مطالعه (اسکرول)
 *  ۳) useReveal       → انیمیشن ورود کارت‌ها هنگام ورود به viewport
 *  ۴) useInfiniteScroll → بارگذاری بی‌پایان با سنتینل + لغو درخواست‌ها (AbortController)
 *  ۵) useHoverPrefetch → پیش‌واکشی جزئیات مقاله در هاور کارت (کش ماژول)
 *
 * نکته: همه به‌صورت lazy پاک می‌شوند (unobserve/disconnect) — بدون نشتی حافظه.
 */
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

/* ------------------------------ ۱) فهرست مطالب ------------------------------ */
/**
 * @param {import('vue').Ref<HTMLElement|null>} contentEl — المنت والد محتوا
 * @returns {{ items, activeId, injectIds }}
 *  injectIds باید بعد از رندر محتوا (nextTick) صدا زده شود:
 *  id های h2/h3 ساخته/تزریق می‌شوند تا لینک‌های TOC کار کنند.
 */
export function useTOC(contentEl) {
  const items = ref([]) // [{ id, text, level }]
  const activeId = ref('')

  const slug = (text, i) => {
    const base = String(text || '')
      .trim()
      .replace(/[\s\u200c]+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .slice(0, 60)
    return `h-${base || 'sec'}-${i}`
  }

  const injectIds = async () => {
    await nextTick()
    const root = contentEl.value
    if (!root) return
    const heads = [...root.querySelectorAll('h2, h3')]
    items.value = heads.map((h, i) => {
      const id = slug(h.textContent, i)
      h.id = id
      return { id, text: h.textContent.trim(), level: h.tagName === 'H2' ? 2 : 3 }
    })
  }

  let observer = null
  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        // آخرین تیتری که از بالای صفحه عبور کرده = تیتر فعال
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length) activeId.value = visible[0].target.id
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )
    // عناصر بعد از injectIds مشاهده می‌شوند
    const watch = () => {
      const root = contentEl.value
      if (!root || !observer) return
      observer.disconnect()
      root.querySelectorAll('h2, h3').forEach(h => observer.observe(h))
    }
    // تلاش‌های متعدد چون محتوا async رندر می‌شود
    const timers = [200, 600, 1200].map(t => setTimeout(watch, t))
    onBeforeUnmount(() => timers.forEach(clearTimeout))
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { items, activeId, injectIds }
}

/* ---------------------------- ۲) نوار پیشرفت مطالعه ---------------------------- */
/** درصد مطالعه (0..100) بر اساس موقعیت اسکرول نسبت به ارتفاع سند */
export function useReadingProgress() {
  const progress = ref(0)
  let raf = null

  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = null
      const doc = document.documentElement
      const total = doc.scrollHeight - window.innerHeight
      progress.value = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0
    })
  }

  onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    if (raf) cancelAnimationFrame(raf)
  })

  return { progress }
}

/* ------------------------------ ۳) نمایش تدریجی ------------------------------ */
/**
 * عناصر دارای کلاس reveal وقتی وارد viewport شوند کلاس revealed می‌گیرند.
 * چون کارت‌ها بعد از لود async ظاهر می‌شوند، بعد از هر بار لود داده
 * باید refresh() صدا زده شود تا عناصر جدید زیر نظر گرفته شوند.
 */
export function useReveal() {
  let observer = null

  const refresh = () => {
    if (!observer) return
    document.querySelectorAll('.reveal:not(.revealed)').forEach(el => observer.observe(el))
  }

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            observer.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    )
    refresh()
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { refresh }
}

/* --------------------------- ۴) بارگذاری بی‌پایان --------------------------- */
/**
 * @param {Function} loadMore - تابع بارگذاری صفحه بعد؛ باید Promise برگرداند
 * @param {{enabled?: import('vue').Ref<boolean>}} opts
 *
 * هر بار اسکرول به سنتینل، loadMore صدا زده می‌شود؛ درخواست قبلی با
 * AbortController لغو می‌شود تا پاسخ‌های قدیمی/زودهنگام صفحه را خراب نکنند.
 */
export function useInfiniteScroll(loadMore, opts = {}) {
  const sentinel = ref(null)
  const loading = ref(false)
  const done = ref(false)
  let observer = null
  let abortController = null

  const currentSignal = () => {
    abortController?.abort()
    abortController = new AbortController()
    return abortController.signal
  }

  const trigger = async () => {
    if (loading.value || done.value) return
    loading.value = true
    try {
      const hasMore = await loadMore(currentSignal())
      if (hasMore === false) done.value = true
    } catch {
      // درخواست لغو شده (AbortError) یا خطای گذرای شبکه — بی‌صدا
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) trigger()
      },
      { rootMargin: '600px 0px' } // قبل از رسیدن به انتها شروع می‌کند
    )
    if (sentinel.value) observer.observe(sentinel.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    abortController?.abort()
  })

  return { sentinel, loading, done, trigger }
}

/* ---------------------------- ۵) پیش‌واکشی در هاور ---------------------------- */
/**
 * کش ماژول‌سطحی جزئیات مقاله — هاور روی کارت → GET جزئیات در پس‌زمینه؛
 * کلیک → پاسخ فوری از کش. TTL = 5 دقیقه.
 */
const detailCache = new Map() // slug → { at, data }
const TTL = 5 * 60 * 1000

export function useHoverPrefetch(fetcher) {
  const prefetched = (key) => {
    const hit = detailCache.get(key)
    return hit && Date.now() - hit.at < TTL ? hit.data : null
  }

  const prefetch = (key) => {
    if (detailCache.has(key)) {
      const hit = detailCache.get(key)
      if (Date.now() - hit.at < TTL) return
    }
    fetcher(key)
      .then(data => { detailCache.set(key, { at: Date.now(), data }) })
      .catch(() => { /* بی‌صدا — پیش‌واکشی اختیاری است */ })
  }

  return { prefetch, prefetched }
}
