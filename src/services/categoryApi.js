import api from './api'

// لیست همه دسته‌بندی‌های فعال (برای منو و فیلترها)
export const getPublicCategories = async () => {
  const res = await api.get('/categories')
  return res.data.data || []
}