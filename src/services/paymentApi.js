import api from './api'

export const paymentApi = {
  // شروع پرداخت آنلاین زرین‌پال — بک‌اند خودش callbackUrl را از ZARINPAL_CALLBACK_URL می‌گیرد
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
  },

  // ---------- ترب‌پی (خرید اقساطی) ----------

  // بررسی صلاحیت نمایش گزینه اقساطی — amount به «تومان» (بک‌اند خودش به ریال تبدیل می‌کند)
  async checkTorobPayEligibility(amount) {
    const res = await api.get('/payments/torobpay/eligible', { params: { amount } })
    return res.data
  },

  // شروع پرداخت اقساطی — خروجی: paymentPageUrl که کاربر باید به آن هدایت شود
  async initiateTorobPayPayment(orderId) {
    const res = await api.post('/payments/torobpay/initiate', { orderId })
    return res.data
  },

  // ---------- اسنپ‌پی (خرید اقساطی) ----------

  // بررسی صلاحیت نمایش گزینه اقساطی اسنپ‌پی — amount به «تومان»
  async checkSnappPayEligibility(amount) {
    const res = await api.get('/payments/snappay/eligible', { params: { amount } })
    return res.data
  },

  // شروع پرداخت اقساطی اسنپ‌پی — خروجی: paymentPageUrl
  async initiateSnappPayPayment(orderId) {
    const res = await api.post('/payments/snappay/initiate', { orderId })
    return res.data
  },
}