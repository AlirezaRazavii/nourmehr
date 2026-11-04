// src/services/articleApi.js — کلاینت API ماژول رسانه‌ای جدید
// آینه‌ی blogApi.js با همان الگوی خروجی { success, data, meta }
import api from './api'

/* -------------------------------- عمومی -------------------------------- */

export const getArticles = async (params = {}, config = {}) => {
  // config برای انتقال AbortSignal استفاده می‌شود (بی‌نهایت اسکرول)
  const res = await api.get('/articles', { params, ...config })
  return res.data
}

export const getHomeArticles = async () => {
  const res = await api.get('/articles/home')
  return res.data
}

export const getArticleCategories = async () => {
  const res = await api.get('/articles/categories')
  return res.data
}

export const getArticleTags = async () => {
  const res = await api.get('/articles/tags')
  return res.data
}

export const getArticleBySlug = async (slug, lang) => {
  const res = await api.get(`/articles/${slug}`, {
    headers: { 'Accept-Language': lang || undefined }
  })
  return res.data
}

export const getRelatedArticles = async (slug) => {
  const res = await api.get(`/articles/${slug}/related`)
  return res.data
}

export const getAdjacentArticles = async (slug) => {
  const res = await api.get(`/articles/${slug}/adjacent`)
  return res.data
}

export const getAuthor = async (id) => {
  const res = await api.get(`/articles/author/${id}`)
  return res.data
}

/* -------------------------------- ادمین -------------------------------- */

export const adminGetArticles = async (params = {}) => {
  const res = await api.get('/admin/articles', { params })
  return res.data
}

export const adminGetArticle = async (id) => {
  const res = await api.get(`/admin/articles/${id}`)
  return res.data
}

export const adminCreateArticle = async (payload) => {
  const res = await api.post('/admin/articles', payload)
  return res.data
}

export const adminUpdateArticle = async (id, payload) => {
  const res = await api.put(`/admin/articles/${id}`, payload)
  return res.data
}

export const adminDeleteArticle = async (id) => {
  const res = await api.delete(`/admin/articles/${id}`)
  return res.data
}

export const adminBulkArticles = async (action, ids) => {
  const res = await api.post('/admin/articles/bulk', { action, ids })
  return res.data
}

export const adminArticleStats = async () => {
  const res = await api.get('/admin/articles-stats')
  return res.data
}

// آپلود تصویر مقاله — خروجی: url + variants (srcset) + placeholder
export const adminUploadArticleImage = async (file, alt = '') => {
  const fd = new FormData()
  fd.append('image', file)
  fd.append('alt', alt)
  const res = await api.post('/admin/articles/upload-image', fd)
  return res.data
}

// جستجوی لینک داخلی (محصول/مقاله) برای دکمه 🔗 ادیتور
export const adminLinkSearch = async (q) => {
  const res = await api.get('/admin/articles/link-search', { params: { q } })
  return res.data
}

// بازگردانی نسخه
export const adminRestoreRevision = async (id, index) => {
  const res = await api.post(`/admin/articles/${id}/revisions/${index}/restore`)
  return res.data
}

// دسته‌بندی‌ها — از همان اندپوینت موجود بلاگ (BlogCategory مشترک است)
export const adminGetCategories = async () => {
  const res = await api.get('/admin/blog-categories')
  return res.data
}

// پیش‌نمایش چشم گوگل‌بات (HTML خام)
export const adminBotPreview = async (id, lang = 'fa') => {
  const res = await api.get(`/admin/articles/${id}/bot-preview`, { params: { lang } })
  return res.data
}
