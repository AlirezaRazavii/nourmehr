// src/services/blogApi.js
import api from './api'

export const getBlogs = async () => {
  const res = await api.get('/blogs')
  return res.data
}

export const getHomeBlogs = async () => {
  const res = await api.get('/blogs/home')
  return res.data
}

export const getBlogBySlug = async (slug) => {
  const res = await api.get(`/blogs/${slug}`)
  return res.data
}