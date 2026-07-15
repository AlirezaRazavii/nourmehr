import api from './api'

export const discountApi = {
  async getActiveDiscounts() {
    const res = await api.get('/discounts/active')
    return res.data
  },
}
