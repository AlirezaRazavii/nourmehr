import api from './api'

// لیست همه کالکشن‌های فعال
export const getCollections = async () => {
  const res = await api.get('/collections')
  return res.data.data || []
}

// کالکشن‌های صفحه هوم همراه با چند محصول هرکدام
export const getHomeCollections = async (previewLimit = 10) => {
  const res = await api.get(`/collections/home?previewLimit=${previewLimit}`)
  return res.data.data || []
}

// یک کالکشن مشخص + محصولاتش (با slug یا id)
export const getCollection = async (slug, params = {}) => {
  const query = new URLSearchParams(params).toString()
  const res = await api.get(`/collections/${slug}${query ? `?${query}` : ''}`)
  return res.data.data
}
