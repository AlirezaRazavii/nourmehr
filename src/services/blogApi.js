// src/services/blogApi.js
import api from './api'

export const getBlogs = async (params = {}) => {
  const res = await api.get('/blogs', { params })
  return res.data
}

export const getHomeBlogs = async () => {
  const res = await api.get('/blogs/home')
  return res.data
}

export const getBlogCategories = async () => {
  const res = await api.get('/blogs/categories')
  return res.data
}

export const getBlogBySlug = async (slug) => {
  const res = await api.get(`/blogs/${slug}`)
  return res.data
}

export const getRelatedBlogs = async (slug) => {
  const res = await api.get(`/blogs/${slug}/related`)
  return res.data
}

export const getAdjacentBlogs = async (slug) => {
  const res = await api.get(`/blogs/${slug}/adjacent`)
  return res.data
}

export const getBlogComments = async (slug) => {
  const res = await api.get(`/blogs/${slug}/comments`)
  return res.data
}

export const createBlogComment = async (slug, comment) => {
  const res = await api.post(`/blogs/${slug}/comments`, { comment })
  return res.data
}

/* ------------------------------- ادمین ------------------------------- */

export const adminGetBlogs = async (params = {}) => {
  const res = await api.get('/admin/blogs', { params })
  return res.data
}

export const adminGetBlog = async (id) => {
  const res = await api.get(`/admin/blogs/${id}`)
  return res.data
}

export const adminCreateBlog = async (payload) => {
  const res = await api.post('/admin/blogs', payload)
  return res.data
}

export const adminUpdateBlog = async (id, payload) => {
  const res = await api.put(`/admin/blogs/${id}`, payload)
  return res.data
}

export const adminDeleteBlog = async (id) => {
  const res = await api.delete(`/admin/blogs/${id}`)
  return res.data
}

export const adminBulkBlogs = async (action, ids) => {
  const res = await api.post('/admin/blogs/bulk', { action, ids })
  return res.data
}

export const adminBlogStats = async () => {
  const res = await api.get('/admin/blogs-stats')
  return res.data
}

export const adminGetCategories = async () => {
  const res = await api.get('/admin/blog-categories')
  return res.data
}

export const adminCreateCategory = async (payload) => {
  const res = await api.post('/admin/blog-categories', payload)
  return res.data
}

export const adminUpdateCategory = async (id, payload) => {
  const res = await api.put(`/admin/blog-categories/${id}`, payload)
  return res.data
}

export const adminDeleteCategory = async (id) => {
  const res = await api.delete(`/admin/blog-categories/${id}`)
  return res.data
}

export const adminGetComments = async (params = {}) => {
  const res = await api.get('/admin/blogs-comments', { params })
  return res.data
}

export const adminApproveComment = async (id) => {
  const res = await api.put(`/admin/blogs-comments/${id}/approve`)
  return res.data
}

export const adminUnapproveComment = async (id) => {
  const res = await api.put(`/admin/blogs-comments/${id}/unapprove`)
  return res.data
}

export const adminDeleteComment = async (id) => {
  const res = await api.delete(`/admin/blogs-comments/${id}`)
  return res.data
}
