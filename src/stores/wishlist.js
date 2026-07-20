import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import wishlistApi from '../services/wishlistApi'
import { getImageUrl } from '../utils/imageUrl'

export const useWishlist = defineStore('wishlist', () => {
  // آرایه شناسه محصولات (برای بررسی سریع وضعیت قلب)
  const ids = ref([])
  // آرایه محصولات کامل (برای صفحه علاقه‌مندی‌ها)
  const items = ref([])
  const isLoading = ref(false)

  const safePrice = (n) => Number(n || 0).toLocaleString('fa-IR')

  // بررسی اینکه آیا محصول در لیست هست یا نه
  const isInWishlist = (productId) => ids.value.includes(String(productId))

  // تعداد کل
  const totalItems = computed(() => ids.value.length)
  const isEmpty = computed(() => ids.value.length === 0)

  // آیا کاربر لاگین کرده؟
  const hasToken = () => {
    const t = localStorage.getItem('auth_token')
    return t && t !== 'null' && t !== 'undefined'
  }

  // دریافت فقط شناسه‌ها (سبک و سریع - هنگام لود اپ)
  const fetchIds = async () => {
    if (!hasToken()) {
      ids.value = []
      return
    }
    try {
      const { data } = await wishlistApi.getIds()
      ids.value = (data.ids || []).map(String)
    } catch (err) {
      console.error('خطا در دریافت شناسه‌های علاقه‌مندی:', err)
    }
  }

  // دریافت لیست کامل محصولات (برای صفحه علاقه‌مندی‌ها)
  const fetchWishlist = async () => {
    if (!hasToken()) {
      items.value = []
      ids.value = []
      return
    }
    isLoading.value = true
    try {
      const { data } = await wishlistApi.getAll()
      items.value = (data.wishlist || []).map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        price: p.price || 0,
        oldPrice: p.oldPrice || null,
        discountPercent: p.discountPercent || 0,
        priceFormatted: safePrice(p.price),
        image: getImageUrl(p.mainImage),
        stock: p.stock,
        status: p.status,
        ratingAverage: p.ratingAverage || 0,
        ratingCount: p.ratingCount || 0,
        inStock: (p.stock || 0) > 0 && p.status === 'active',
      }))
      // همگام‌سازی شناسه‌ها
      ids.value = items.value.map((p) => String(p._id))
    } catch (err) {
      console.error('خطا در دریافت لیست علاقه‌مندی‌ها:', err)
    } finally {
      isLoading.value = false
    }
  }

  // افزودن
  const add = async (productId) => {
    if (!hasToken()) {
      return { success: false, needAuth: true }
    }
    try {
      await wishlistApi.add(productId)
      const pid = String(productId)
      if (!ids.value.includes(pid)) ids.value.push(pid)
      return { success: true, added: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message, status: err.response?.status }
    }
  }

  // حذف
  const remove = async (productId) => {
    if (!hasToken()) {
      return { success: false, needAuth: true }
    }
    try {
      await wishlistApi.remove(productId)
      const pid = String(productId)
      ids.value = ids.value.filter((id) => id !== pid)
      items.value = items.value.filter((p) => String(p._id) !== pid)
      return { success: true, added: false }
    } catch (err) {
      return { success: false, error: err.response?.data?.message, status: err.response?.status }
    }
  }

  // تغییر وضعیت (اصلی‌ترین تابع برای دکمه قلب)
  const toggle = async (productId) => {
    if (!hasToken()) {
      return { success: false, needAuth: true }
    }
    const pid = String(productId)
    // آپدیت خوش‌بینانه (Optimistic UI) برای واکنش سریع
    const wasIn = ids.value.includes(pid)
    if (wasIn) {
      ids.value = ids.value.filter((id) => id !== pid)
    } else {
      ids.value.push(pid)
    }

    try {
      const { data } = await wishlistApi.toggle(productId)
      // همگام‌سازی با پاسخ سرور
      if (data.added && !ids.value.includes(pid)) {
        ids.value.push(pid)
      } else if (!data.added) {
        ids.value = ids.value.filter((id) => id !== pid)
        items.value = items.value.filter((p) => String(p._id) !== pid)
      }
      return { success: true, added: data.added }
    } catch (err) {
      // برگرداندن تغییر در صورت خطا (Rollback)
      if (wasIn) {
        ids.value.push(pid)
      } else {
        ids.value = ids.value.filter((id) => id !== pid)
      }
      return { success: false, error: err.response?.data?.message, status: err.response?.status }
    }
  }

  // پاک‌سازی کامل
  const clear = async () => {
    if (!hasToken()) return { success: false, needAuth: true }
    try {
      await wishlistApi.clear()
      ids.value = []
      items.value = []
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message }
    }
  }

  // ریست state (هنگام logout)
  const resetWishlistState = () => {
    ids.value = []
    items.value = []
  }

  // لود اولیه شناسه‌ها اگر کاربر لاگین است
  if (hasToken()) {
    fetchIds()
  }

  return {
    ids,
    items,
    isLoading,
    totalItems,
    isEmpty,
    isInWishlist,
    fetchIds,
    fetchWishlist,
    add,
    remove,
    toggle,
    clear,
    resetWishlistState,
    formatPrice: safePrice,
  }
})
