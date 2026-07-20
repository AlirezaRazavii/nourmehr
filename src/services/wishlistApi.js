import api from './api'

export const wishlistApi = {
  // دریافت لیست کامل علاقه‌مندی‌ها (با اطلاعات محصول)
  getAll: () => api.get('/wishlist'),

  // دریافت فقط شناسه‌ها (برای همگام‌سازی سریع state)
  getIds: () => api.get('/wishlist/ids'),

  // افزودن محصول
  add: (productId) => api.post('/wishlist/add', { productId }),

  // تغییر وضعیت (اضافه/حذف در یک درخواست)
  toggle: (productId) => api.post('/wishlist/toggle', { productId }),

  // حذف یک محصول
  remove: (productId) => api.delete(`/wishlist/${productId}`),

  // پاک‌سازی کامل
  clear: () => api.delete('/wishlist/clear'),
}

export default wishlistApi
