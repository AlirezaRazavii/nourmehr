import api from './api'

export const adminApi = {
  async getDashboardStats() {
    const res = await api.get('/admin/dashboard')
    return res.data
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/admin/orders${query ? '?' + query : ''}`)
    return res.data
  },

  async getOrderById(id) {
    const res = await api.get(`/admin/orders/${id}`)
    return res.data
  },

  async updateOrderStatus(id, status) {
    const res = await api.put(`/admin/orders/${id}/status`, { status })
    return res.data
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/admin/users${query ? '?' + query : ''}`)
    return res.data
  },

  async updateUserStatus(id, status) {
    const res = await api.put(`/admin/users/${id}/status`, { status })
    return res.data
  },

  async updateUserRole(id, role) {
    const res = await api.put(`/admin/users/${id}/role`, { role })
    return res.data
  },

  async getPayments(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/admin/payments${query ? '?' + query : ''}`)
    return res.data
  },

  async verifyPayment(id) {
    const res = await api.post(`/admin/payments/${id}/verify`)
    return res.data
  },

  async refundPayment(id) {
    const res = await api.post(`/admin/payments/${id}/refund`)
    return res.data
  },

  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/admin/tickets${query ? '?' + query : ''}`)
    return res.data
  },

  async getTicketById(id) {
    const res = await api.get(`/admin/tickets/${id}`)
    return res.data
  },

  async replyToTicket(ticketId, text) {
    const res = await api.post(`/admin/tickets/${ticketId}/reply`, { text })
    return res.data
  },

  async updateTicketStatus(ticketId, status) {
    const res = await api.put(`/admin/tickets/${ticketId}/status`, { status })
    return res.data
  },

  async getDiscounts() {
    const res = await api.get('/admin/discounts')
    return res.data
  },

  async createDiscount(data) {
    const res = await api.post('/admin/discounts', data)
    return res.data
  },

  async updateDiscount(id, data) {
    const res = await api.put(`/admin/discounts/${id}`, data)
    return res.data
  },

  async deleteDiscount(id) {
    const res = await api.delete(`/admin/discounts/${id}`)
    return res.data
  },

  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/admin/products${query ? '?' + query : ''}`)
    return res.data
  },

  async getProductById(id) {
    const res = await api.get(`/admin/products/${id}`)
    return res.data
  },

  async createProduct(data) {
    const res = await api.post('/admin/products', data)
    return res.data
  },

  async updateProduct(id, data) {
    const res = await api.put(`/admin/products/${id}`, data)
    return res.data
  },

  async deleteProduct(id) {
    const res = await api.delete(`/admin/products/${id}`)
    return res.data
  },

  async uploadProductImage(data) {
    const res = await api.post('/admin/products/upload-image', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async getSettings() {
    const res = await api.get('/admin/settings')
    return res.data
  },

  async updateSettings(data) {
    const res = await api.put('/admin/settings', data)
    return res.data
  },

  async getCategories() {
    const res = await api.get('/admin/categories')
    return res.data
  },

  async createCategory(data) {
    const res = await api.post('/admin/categories', data)
    return res.data
  },

  async updateCategory(id, data) {
    const res = await api.put(`/admin/categories/${id}`, data)
    return res.data
  },

  async deleteCategory(id) {
    const res = await api.delete(`/admin/categories/${id}`)
    return res.data
  },

 async getCollections() {
    const res = await api.get('/admin/collections')
    return res.data
  },

  async createCollection(data) {
    const res = await api.post('/admin/collections', data)
    return res.data
  },

  async updateCollection(id, data) {
    const res = await api.put(`/admin/collections/${id}`, data)
    return res.data
  },

  async deleteCollection(id) {
    const res = await api.delete(`/admin/collections/${id}`)
    return res.data
  },

  async setCollectionProducts(id, productIds) {
    const res = await api.put(`/admin/collections/${id}/products`, { productIds })
    return res.data
  },


  async updateUserPermissions(id, permissions) {
    const res = await api.put(`/admin/users/${id}/permissions`, { permissions })
    return res.data
  },

  async getPermissionList() {
    const res = await api.get('/admin/permissions')
    return res.data
  }

}