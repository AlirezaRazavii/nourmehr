import api from './api'

export const ticketApi = {
  async getMyTickets() {
    const res = await api.get('/tickets')
    return res.data
  },

  async getTicketById(id) {
    const res = await api.get(`/tickets/${id}`)
    return res.data
  },

  async createTicket(data) {
    const res = await api.post('/tickets', data)
    return res.data
  },

  async replyToTicket(id, text) {
    const res = await api.post(`/tickets/${id}/reply`, { text })
    return res.data
  },

  async closeTicket(id) {
    const res = await api.put(`/tickets/${id}/close`)
    return res.data
  },
}
