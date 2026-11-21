import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { getImageUrl } from '../utils/imageUrl'

export const useCart = defineStore('cart', () => {
  const items = ref([])
  const serverCart = ref({ subtotal: 0, shipping: 0, discount: 0, total: 0 })
  const isLoading = ref(false)
  const isOpen = ref(false)
  // ثبت وضعیت کامل سبد خرید در Matomo
  const trackMatomoCartUpdate = () => {
    if (
      typeof window === 'undefined' ||
      !window._paq ||
      typeof window._paq.push !== 'function'
    ) {
      console.warn('[Matomo] Tracker is not available')
      return
    }

    // پاک کردن اطلاعات قبلی سبد در Tracker
    window._paq.push(['clearEcommerceCart'])

    // ثبت تمام محصولات موجود در سبد
    items.value.forEach((item) => {
      if (!item.productId) return

      const sku = [
        item.productId,
        item.color || '',
        item.size || ''
      ].join('::')

      const rawName = item.name

      const productName = typeof rawName === 'string'
        ? rawName
        : rawName && typeof rawName === 'object'
          ? rawName.fa || rawName.en || sku
          : sku

      const priceInToman = Number(item.unitPrice)
      const quantity = Number(item.quantity)

      if (
        !Number.isFinite(priceInToman) ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) return

      window._paq.push([
        'addEcommerceItem',
        sku,
        productName,
        false,
        priceInToman * 10,
        quantity
      ])
    })

    // مجموع سبد به ریال
    const cartTotalInRial = Number(serverCart.value.total || 0) * 10

    if (!Number.isFinite(cartTotalInRial)) return

    window._paq.push([
      'trackEcommerceCartUpdate',
      cartTotalInRial
    ])
  }

  const safePrice = (n) => Number(n || 0).toLocaleString('fa-IR')

  const fetchCart = async () => {
    isLoading.value = true
    try {
      const { data } = await api.get('/cart')
      const cart = data.cart
      items.value = (cart.items || []).map((item) => ({
        _id: item._id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        color: item.color || '',
        size: item.size || '',
        image: getImageUrl(item.image),
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        stock: item.stock,
        inStock: item.inStock,
      }))
      serverCart.value = {
        subtotal: cart.subtotal || 0,
        shipping: cart.shippingCost || 0,
        discount: cart.discount || 0,
        total: cart.total || 0,
      }
    } catch (err) {
      console.error('خطا در دریافت سبد خرید:', err)
    } finally {
      isLoading.value = false
    }
  }

  const addToCart = async (productId, quantity = 1, color = null, size = null) => {
    try {
      await api.post('/cart/add', { productId, quantity, color, size })
      await fetchCart()

      // ثبت وضعیت جدید سبد در Matomo
      trackMatomoCartUpdate()

      // رویداد «افزودن به سبد» برای قیف فروش در Matomo
      if (window._paq) {
        window._paq.push(['trackEvent', 'Cart', 'add', String(productId)])
      }

      openMiniCart()
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message,
        status: err.response?.status,
      }
    }
  }

  // پیدا کردن آیتم از استیت محلی (بدون درخواست اضافه)
  const findLocalItem = (productId, color, size) =>
    items.value.find(
      (i) =>
        i.productId === productId &&
        (i.color || '') === (color || '') &&
        (i.size || '') === (size || '')
    )

  const updateQuantity = async (productId, quantity, color = null, size = null) => {
    try {
      const item = findLocalItem(productId, color, size)

      if (item?._id) {
        await api.put(`/cart/item/${item._id}`, { quantity })
        await fetchCart()

        // ثبت وضعیت جدید سبد در Matomo
        trackMatomoCartUpdate()
      } else {
        // در صورت نبودن محصول، افزودن به سبد
        return await addToCart(productId, quantity, color, size)
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message,
        status: err.response?.status
      }
    }
  }

  const removeFromCart = async (productId, color = null, size = null) => {
    try {
      const item = findLocalItem(productId, color, size)

      if (item?._id) {
        await api.delete(`/cart/item/${item._id}`)
        await fetchCart()

        // ثبت وضعیت جدید سبد در Matomo
        trackMatomoCartUpdate()

        // رویداد «حذف از سبد» برای تحلیل رفتار در Matomo
        if (window._paq) {
          window._paq.push(['trackEvent', 'Cart', 'remove', String(productId)])
        }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message,
        status: err.response?.status
      }
    }
  }

  const clearCart = async () => {
    try {
      await api.delete('/cart/clear')
      await fetchCart()

      // ثبت خالی شدن سبد در Matomo
      trackMatomoCartUpdate()
    } catch (err) {
      console.error(err)
    }
  }

  const totalItems = computed(() => items.value.reduce((acc, i) => acc + i.quantity, 0))
  const totalPrice = computed(() => serverCart.value.total)
  const totalPriceFormatted = computed(() => safePrice(totalPrice.value))
  const isEmpty = computed(() => items.value.length === 0)

  const cartItems = computed(() =>
    items.value.map((item) => ({
      ...item,
      product: {
        mainImage: item.image,
        name: item.name,
        priceFormatted: safePrice(item.unitPrice),
      },
    }))
  )

  let closeTimer = null
  const openMiniCart = () => {
    isOpen.value = true
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => { isOpen.value = false }, 4000)
  }
  const closeMiniCart = () => { clearTimeout(closeTimer); isOpen.value = false }
  const toggleMiniCart = () => { isOpen.value ? closeMiniCart() : openMiniCart() }
  const handleMiniCartMouseEnter = () => { clearTimeout(closeTimer) }
  const handleMiniCartMouseLeave = () => {
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => { isOpen.value = false }, 1500)
  }

  const resetCartState = () => {
    items.value = []
    serverCart.value = { subtotal: 0, shipping: 0, discount: 0, total: 0 }
    isOpen.value = false
  }

  const authToken = localStorage.getItem('auth_token')
  if (authToken && authToken !== 'null' && authToken !== 'undefined') {
    fetchCart()
  }

  return {
    state: { isOpen, serverCart },
    isOpen,
    items,
    cartItems,
    totalItems,
    totalPrice,
    totalPriceFormatted,
    isEmpty,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,
    trackMatomoCartUpdate,
    openMiniCart,
    closeMiniCart,
    toggleMiniCart,
    handleMiniCartMouseEnter,
    handleMiniCartMouseLeave,
    resetCartState,
    formatPrice: safePrice,
  }
})
