import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

// پاک‌سازی پارامترهای خالی/undefined قبل از ساخت query string
const buildQuery = (params = {}) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all') return
    sp.append(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const useProductStore = defineStore('products', () => {
  const products = ref([])
  const categories = ref([])
  const currentProduct = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const pagination = ref({ page: 1, limit: 12, total: 0, pages: 0 })

  // کنترل درخواست‌های همزمان
  let listController = null
  let listSeq = 0
  let categoriesLoadedAt = 0
  const CATEGORIES_TTL = 10 * 60 * 1000
  const productCache = new Map() // idOrSlug -> product

  const featuredProducts = computed(() => products.value.filter(p => p.isFeatured).slice(0, 4))
  const productsByCategory = (catSlug) => products.value.filter(p => p.category?.slug === catSlug)

  const isCanceled = (err) =>
    err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.message === 'canceled'

  const fetchProducts = async (params = {}) => {
    // لغو درخواست قبلی تا پاسخ کهنه روی داده‌ی جدید ننشیند
    if (listController) listController.abort()
    listController = new AbortController()
    const seq = ++listSeq

    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.get(`/products${buildQuery(params)}`, { signal: listController.signal })
      if (seq !== listSeq) return { success: false, stale: true } // پاسخ کهنه

      const list = Array.isArray(data?.data) ? data.data : []
      const limit = Number(params.limit) || 12
      const total = Number(data?.total ?? data?.pagination?.total ?? list.length) || 0

      products.value = list
      pagination.value = {
        page: Number(params.page) || 1,
        limit,
        total,
        pages: Number(data?.pages) || Math.max(Math.ceil(total / limit), 1)
      }
      return { success: true, data: list }
    } catch (err) {
      if (isCanceled(err)) return { success: false, canceled: true }
      error.value = err.response?.data?.message || 'خطا در دریافت محصولات'
      products.value = []
      return { success: false, error: error.value }
    } finally {
      if (seq === listSeq) isLoading.value = false
    }
  }

  const fetchProduct = async (idOrSlug, { force = false } = {}) => {
    if (!idOrSlug) return { success: false, error: 'شناسه محصول نامعتبر است' }

    if (!force && productCache.has(idOrSlug)) {
      currentProduct.value = productCache.get(idOrSlug)
      return { success: true, data: currentProduct.value, cached: true }
    }

    isLoading.value = true
    error.value = null
    try {
      const { data } = await api.get(`/products/${encodeURIComponent(idOrSlug)}`)
      currentProduct.value = data?.data || null
      if (currentProduct.value) {
        productCache.set(idOrSlug, currentProduct.value)
        if (currentProduct.value.slug) productCache.set(currentProduct.value.slug, currentProduct.value)
      }
      return { success: true, data: currentProduct.value }
    } catch (err) {
      if (isCanceled(err)) return { success: false, canceled: true }
      error.value = err.response?.data?.message || 'محصول یافت نشد'
      currentProduct.value = null
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchCategories = async (force = false) => {
    const fresh = Date.now() - categoriesLoadedAt < CATEGORIES_TTL
    if (!force && categories.value.length && fresh) {
      return { success: true, data: categories.value, cached: true }
    }
    try {
      const { data } = await api.get('/products/categories')
      categories.value = Array.isArray(data?.data) ? data.data : []
      categoriesLoadedAt = Date.now()
      return { success: true, data: categories.value }
    } catch (err) {
      console.error('خطا در دریافت دسته‌بندی‌ها:', err)
      return { success: false }
    }
  }

  const invalidate = () => {
    productCache.clear()
    categoriesLoadedAt = 0
  }

  return {
    products, categories, currentProduct, isLoading, error, pagination,
    featuredProducts, productsByCategory,
    fetchProducts, fetchProduct, fetchCategories, invalidate
  }
})
