import api from './api'

const CACHE_TTL = 60 * 1000
const MAX_CACHE = 40
const cache = new Map()

export const MIN_QUERY_LENGTH = 2

const normalize = (p) => ({
  _id: p._id,
  id: p._id,
  slug: p.slug || '',
  name: p.name,
  shortDesc: p.shortDesc,
  mainImage: p.mainImage || '',
  price: Number(p.price) || 0,
  finalPrice: Number(p.finalPrice ?? p.price) || 0,
  priceFormatted: p.priceFormatted || '',
  finalPriceFormatted: p.finalPriceFormatted || '',
  discountPercent: Number(p.discountPercent) || 0,
  stock: Number(p.stock) || 0,
  status: p.status || 'active',
  category: p.category || null,
})

const isCanceled = (err) =>
  err?.code === 'ERR_CANCELED' ||
  err?.name === 'CanceledError' ||
  err?.name === 'AbortError' ||
  err?.message === 'canceled'

/**
 * جستجوی زندهٔ محصولات برای دراپ‌دان نوبار
 * @param {string} query
 * @param {{ limit?: number, signal?: AbortSignal, force?: boolean }} options
 * @returns {Promise<{ items: Array, total: number }>}
 */
export const searchProducts = async (query, { limit = 6, signal, force = false } = {}) => {
  const q = String(query || '').trim()

  if (q.length < MIN_QUERY_LENGTH) {
    return { items: [], total: 0 }
  }

  const key = `${q.toLowerCase()}|${limit}`
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < CACHE_TTL) {
    return hit.data
  }

  const res = await api.get('/products', {
    params: { search: q, page: 1, limit },
    signal,
  })

  const list = Array.isArray(res?.data?.data) ? res.data.data : []
  const data = {
    items: list.map(normalize),
    total: Number(res?.data?.total) || list.length,
  }

  cache.set(key, { at: Date.now(), data })
  if (cache.size > MAX_CACHE) {
    cache.delete(cache.keys().next().value)
  }

  return data
}

export const clearSearchCache = () => cache.clear()

export { isCanceled as isSearchCanceled }

export default { searchProducts, clearSearchCache, isSearchCanceled: isCanceled, MIN_QUERY_LENGTH }
