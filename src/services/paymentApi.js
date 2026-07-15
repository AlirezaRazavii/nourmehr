import api from './api'

export const paymentApi = {
  // شروع پرداخت آنلاین — بک‌اند خودش callbackUrl را از ZARINPAL_CALLBACK_URL می‌گیرد
  async initiatePayment(orderId) {
    const res = await api.post('/payments/initiate', { orderId })
    return res.data
  },

  // استعلام وضعیت یک پرداخت بر اساس authority (نیازمند لاگین؛ فقط صاحب پرداخت یا ادمین)
  async checkPaymentStatus(authority) {
    const res = await api.get(`/payments/status/${authority}`)
    return res.data
  },

  // تلاش مجدد پرداخت برای یک سفارش پرداخت‌نشده
  async retryPayment(orderId) {
    return this.initiatePayment(orderId)
  }
}
