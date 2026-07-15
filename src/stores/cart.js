import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { getImageUrl } from '../utils/imageUrl'

export const useCart = defineStore('cart', () => {
  const items = ref([])
  const serverCart = ref({ subtotal: 0, shipping: 0, discount: 0, total: 0 })
  const isLoading = ref(false)
  const isOpen = ref(false)

  const fetchCart = async () => {
    isLoading.value = true
    try {
      const response = await api.get('/cart')
      const cart = response.data.cart
      items.value = cart.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        color: item.color,
        size: item.size || '',
        image: getImageUrl(item.image),
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        stock: item.stock,
        inStock: item.inStock
      }))
      serverCart.value = {
        subtotal: cart.subtotal,
        shipping: cart.shippingCost,
        discount: cart.discount,
        total: cart.total
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
      return { success: false, error: err.response?.data?.message }
    }
  }

    const updateQuantity = async (productId, quantity, color = null, size = null) => {
    try {
      const cartRes = await api.get('/cart')
      const item = cartRes.data.cart.items.find(i => 
        i.productId === productId && 
        (i.color || '') === (color || '') && 
        (i.size || '') === (size || '')
      )
      if (item && item._id) {
        await api.put(`/cart/item/${item._id}`, { quantity })
        await fetchCart()
      } else {
        await addToCart(productId, quantity, color, size)
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message }
    }
  }

  const removeFromCart = async (productId, color = null, size = null) => {
    try {
      const cartRes = await api.get('/cart')
      const item = cartRes.data.cart.items.find(i => 
        i.productId === productId && 
        (i.color || '') === (color || '') && 
        (i.size || '') === (size || '')
      )
      if (item && item._id) {
        await api.delete(`/cart/item/${item._id}`)
        await fetchCart()
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.message }
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
  const totalPriceFormatted = computed(() => totalPrice.value.toLocaleString('fa-IR'))
  const isEmpty = computed(() => items.value.length === 0)

   const cartItems = computed(() => items.value.map(item => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    color: item.color,
    size: item.size || '',
    image: item.image,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    stock: item.stock,
    inStock: item.inStock,
    product: {
      mainImage: item.image,
      name: item.name,
      priceFormatted: item.unitPrice.toLocaleString('fa-IR')
    }
  })))

  let closeTimer = null
  const openMiniCart = () => {
    isOpen.value = true
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => { isOpen.value = false }, 4000)
  }
  const closeMiniCart = () => { clearTimeout(closeTimer); isOpen.value = false }
  const toggleMiniCart = () => { isOpen.value ? closeMiniCart() : openMiniCart() }
  // تا وقتی موس روی پاپ‌آپ است باز بماند؛ با خروج موس بعد از کمی بسته شود
  const handleMiniCartMouseEnter = () => { clearTimeout(closeTimer) }
  const handleMiniCartMouseLeave = () => { clearTimeout(closeTimer); closeTimer = setTimeout(() => { isOpen.value = false }, 1500) }

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
    closeMiniCart,
    toggleMiniCart,
    handleMiniCartMouseEnter,
    handleMiniCartMouseLeave,
    resetCartState,
    formatPrice: (n) => Number(n).toLocaleString('fa-IR')
  }
})