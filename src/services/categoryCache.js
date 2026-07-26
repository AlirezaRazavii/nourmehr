import { getPublicCategories } from './categoryApi'

const TTL = 10 * 60 * 1000
let cache = { data: null, at: 0 }
let inflight = null

export const fetchCategoriesCached = async (force = false) => {
  if (!force && cache.data && Date.now() - cache.at < TTL) return cache.data
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const data = await getPublicCategories()
      cache = { data: Array.isArray(data) ? data : [], at: Date.now() }
      return cache.data
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export const clearCategoriesCache = () => { cache = { data: null, at: 0 } }
