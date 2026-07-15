import { defineStore } from 'pinia'
import { ref } from 'vue'
import { contentApi } from '../services/api'

export const useContentStore = defineStore('content', () => {
  // State
  const sliders = ref([])
  const banners = ref([])
  const settings = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Actions
  const fetchPublicSliders = async () => {
    try {
      const response = await contentApi.getSliders()
      sliders.value = response.data
    } catch (err) {
      console.error('Error fetching sliders:', err)
      // Use default slides as fallback
      sliders.value = getDefaultSlides()
    }
  }

  const fetchPublicBanners = async () => {
    try {
      const response = await contentApi.getBanners()
      banners.value = response.data
    } catch (err) {
      console.error('Error fetching banners:', err)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await contentApi.getSettings()
      settings.value = response.data
    } catch (err) {
      console.error('Error fetching settings:', err)
    }
  }

  // Admin actions
  const fetchAdminSliders = async () => {
    isLoading.value = true
    try {
      const response = await contentApi.getAdminSliders()
      sliders.value = response.data
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const createSlider = async (sliderData) => {
    isLoading.value = true
    try {
      const response = await contentApi.createSlider(sliderData)
      sliders.value.push(response.data)
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const updateSlider = async (id, sliderData) => {
    isLoading.value = true
    try {
      const response = await contentApi.updateSlider(id, sliderData)
      const index = sliders.value.findIndex(s => s._id === id)
      if (index !== -1) {
        sliders.value[index] = response.data
      }
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const deleteSlider = async (id) => {
    isLoading.value = true
    try {
      await contentApi.deleteSlider(id)
      sliders.value = sliders.value.filter(s => s._id !== id)
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const fetchAdminBanners = async () => {
    isLoading.value = true
    try {
      const response = await contentApi.getAdminBanners()
      banners.value = response.data
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const createBanner = async (bannerData) => {
    isLoading.value = true
    try {
      const response = await contentApi.createBanner(bannerData)
      banners.value.push(response.data)
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const updateBanner = async (id, bannerData) => {
    isLoading.value = true
    try {
      const response = await contentApi.updateBanner(id, bannerData)
      const index = banners.value.findIndex(b => b._id === id)
      if (index !== -1) {
        banners.value[index] = response.data
      }
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  const deleteBanner = async (id) => {
    isLoading.value = true
    try {
      await contentApi.deleteBanner(id)
      banners.value = banners.value.filter(b => b._id !== id)
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Default slides for fallback
  const getDefaultSlides = () => [
    {
      id: 1,
      title: 'PERSIAN',
      subtitle: 'LUXURY ART',
      desc: 'تلاقی هنر اصیل فیروزه‌کوبی با طراحی مینیمال و مدرن.',
      image: '/hero/hero2.png',
      themeColor: '#0db9e9ff',
      isActive: true,
      order: 1
    },
    {
      id: 2,
      title: 'TIMELESS',
      subtitle: 'MASTERPIECE',
      desc: 'شاهکارهای الماس‌تراش برای فضاهای لوکس و ماندگار.',
      image: '/hero/hero1.png',
      themeColor: '#df884eff',
      isActive: true,
      order: 2
    },
    {
      id: 3,
      title: 'ROYAL',
      subtitle: 'HERITAGE',
      desc: 'خاتم‌کاری‌های دست‌ساز؛ میراثی ارزشمند برای نسل‌ها.',
      image: '/hero/hero3.png',
      themeColor: '#7d7322ff',
      isActive: true,
      order: 3
    }
  ]

  return {
    // State
    sliders,
    banners,
    settings,
    isLoading,
    error,
    // Public actions
    fetchPublicSliders,
    fetchPublicBanners,
    fetchSettings,
    // Admin slider actions
    fetchAdminSliders,
    createSlider,
    updateSlider,
    deleteSlider,
    // Admin banner actions
    fetchAdminBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    // Helpers
    getDefaultSlides
  }
})
