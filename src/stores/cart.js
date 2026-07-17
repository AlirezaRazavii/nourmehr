import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { getImageUrl } from '../utils/imageUrl'

export const useCart = defineStore('cart', () => {
  const items = ref([])
  const serverCart = ref({ subtotal: 0, shipping: 0, discount: 0, total: 0 })
  const isLoading = ref(false)
  const isOpen = ref(false)

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
      let item = findLocalItem(productId, color, size)
      if (item?._id) {
        await api.put(`/cart/item/${item._id}`, { quantity })
        await fetchCart()
      } else {
        await addToCart(productId, quantity, color, size)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message, status: err.response?.status }
    }
  }

  const removeFromCart = async (productId, color = null, size = null) => {
    try {
      const item = findLocalItem(productId, color, size)
      if (item?._id) {
        await api.delete(`/cart/item/${item._id}`)
        await fetchCart()
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message, status: err.response?.status }
    }
  }

  const clearCart = async () => {
    try {
      await api.delete('/cart/clear')
      await fetchCart()
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
    openMiniCart,
    closeMiniCart,
    toggleMiniCart,
    handleMiniCartMouseEnter,
    handleMiniCartMouseLeave,
    resetCartState,
    formatPrice: safePrice,
  }
})
