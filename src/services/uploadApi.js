import api from './api'
export async function uploadFile(file) {
  const fd = new FormData()
  fd.append('image', file)
  const res = await api.post('/admin/categories/upload-image', fd)
  const filePath = res.data?.filePath || res.data?.url
  if (!res.data?.success || !filePath) throw new Error(res.data?.message || 'آپلود ناموفق بود')
  return filePath
}