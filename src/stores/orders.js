import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useOrders = defineStore('orders', () => {
  const orders = ref([])
  const currentOrder = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const fetchOrders = async () => {
    isLoading.value = true
    try {
      const response = await api.get('/orders')
      orders.value = response.data.data
      return { success: true, data: orders.value }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchOrderById = async (id) => {
    isLoading.value = true
    try {
      const response = await api.get(`/orders/${id}`)
      currentOrder.value = response.data.data
      return { success: true, data: currentOrder.value }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const createOrder = async (orderData) => {
    isLoading.value = true
    try {
      const payload = {
        shippingInfo: orderData.shippingInfo,
        paymentMethod: orderData.paymentMethod || 'online',
        discountCode: orderData.discountCode,
        items: orderData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      }
      const response = await api.post('/orders', payload)
      const newOrder = response.data.order
      orders.value.unshift(newOrder)
      currentOrder.value = newOrder
      return { success: true, order: newOrder }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const cancelOrder = async (id) => {
    try {
      const response = await api.put(`/orders/${id}/cancel`)
      const index = orders.value.findIndex(o => o._id === id || o.id === id)
      if (index !== -1) orders.value[index].status = 'cancelled'
      return { success: true, message: response.data.message }
    } catch (err) {
      return { success: false, error: err.response?.data?.message }
    }
  }

  const getOrderStatus = async (id) => {
    const order = orders.value.find(o => o._id === id || o.id === id)
    return order?.status || null
  }

  const getStatusStyle = (status) => {
    const styles = {
      pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '⏳', text: 'در انتظار' },
      awaiting_payment: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '💰', text: 'در انتظار پرداخت' },
      confirmed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', icon: '✓', text: 'تأیید شده' },
      processing: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', icon: '⚙️', text: 'در حال پردازش' },
      shipped: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', icon: '🚚', text: 'ارسال شده' },
      delivered: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', icon: '📦', text: 'تحویل داده شده' },
      cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: '✕', text: 'لغو شده' },
      refunded: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', icon: '↩', text: 'بازگشت وجه' }
    }
    return styles[status] || styles.pending
  }

  return {
    state: { orders, currentOrder, isLoading, error },
    orders,
    currentOrder,
    isLoading,
    error,
    fetchOrders,
    fetchOrderById,
    createOrder,
    cancelOrder,
    getOrderStatus,
    getStatusStyle
  }
})