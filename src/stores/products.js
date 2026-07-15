import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useProductStore = defineStore('products', () => {
  const products = ref([])
  const categories = ref([])
  const currentProduct = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const pagination = ref({ page: 1, limit: 12, total: 0, pages: 0 })

  const featuredProducts = computed(() => products.value.filter(p => p.isFeatured).slice(0, 4))
  const productsByCategory = (catSlug) => products.value.filter(p => p.category?.slug === catSlug)

  const fetchProducts = async (params = {}) => {
    isLoading.value = true
    error.value = null
    try {
      const query = new URLSearchParams(params).toString()
      const response = await api.get(`/products${query ? `?${query}` : ''}`)
      products.value = response.data.data
      pagination.value = {
        page: params.page || 1,
        limit: params.limit || 12,
        total: response.data.total,
        pages: Math.ceil(response.data.total / (params.limit || 12))
      }
      return { success: true, data: products.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'خطا در دریافت محصولات'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchProduct = async (idOrSlug) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get(`/products/${idOrSlug}`)
      currentProduct.value = response.data.data
      return { success: true, data: currentProduct.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'محصول یافت نشد'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories')
      categories.value = response.data.data
      return { success: true, data: categories.value }
    } catch (err) {
      console.error('خطا در دریافت دسته‌بندی‌ها:', err)
      return { success: false }
    }
  }

  return {
    products,
    categories,
    currentProduct,
    isLoading,
    error,
    pagination,
    featuredProducts,
    productsByCategory,
    fetchProducts,
    fetchProduct,
    fetchCategories
  }
})