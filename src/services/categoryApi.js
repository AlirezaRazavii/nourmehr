import api from './api'

const TTL = 10 * 60 * 1000

let cache = { data: null, at: 0 }
let inflight = null

const isFresh = () => cache.data && Date.now() - cache.at < TTL

/** لیست دسته‌بندی‌های فعال — با کش حافظه‌ای و single-flight */
export const getPublicCategories = async ({ force = false } = {}) => {
  if (!force && isFresh()) return cache.data
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await api.get('/categories')
      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      cache = { data: list, at: Date.now() }
      return list
    } catch (err) {
      // در صورت خطا، داده‌ی کهنه بهتر از منوی خالی است
      if (cache.data) return cache.data
      throw err
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export const getCategoryBySlug = async (slug) => {
  if (!slug) return null
  const cached = cache.data?.find(c => c.slug === slug)
  if (cached) return cached

  const res = await api.get(`/categories/${encodeURIComponent(slug)}`)
  return res?.data?.data || null
}

export const clearCategoriesCache = () => { cache = { data: null, at: 0 } }

export default { getPublicCategories, getCategoryBySlug, clearCategoriesCache }
