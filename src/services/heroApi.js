import api from './api'

// ---- عمومی ----
export const getPublicHero = () => api.get('/hero')

// ---- ادمین ----
export const getHeroAdmin       = () => api.get('/admin/hero')
export const updateHeroSettings = (data) => api.put('/admin/hero/settings', data)
export const addHeroSlide       = (data) => api.post('/admin/hero/slides', data)
export const updateHeroSlide    = (id, data) => api.put(`/admin/hero/slides/${id}`, data)
export const deleteHeroSlide    = (id) => api.delete(`/admin/hero/slides/${id}`)
export const reorderHeroSlides  = (order) => api.put('/admin/hero/slides-order', { order })

// آپلود تصویر (فیلد 'image')
export const uploadHeroImage = (file) => {
  const fd = new FormData()
  fd.append('image', file)
  return api.post('/admin/hero/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
