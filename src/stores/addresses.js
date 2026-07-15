import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAddresses = defineStore('addresses', () => {
  const addresses = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const fetchAddresses = async () => {
    isLoading.value = true
    try {
      const response = await api.get('/user/addresses')
      addresses.value = response.data.addresses
      return addresses.value
    } catch (err) {
      error.value = err.response?.data?.message
      return []
    } finally {
      isLoading.value = false
    }
  }

  const addAddress = async (addressData) => {
    isLoading.value = true
    try {
      const response = await api.post('/user/addresses', addressData)
      addresses.value = response.data.addresses
      return { success: true, addresses: addresses.value }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const updateAddress = async (addressId, data) => {
    isLoading.value = true
    try {
      const response = await api.put(`/user/addresses/${addressId}`, data)
      addresses.value = response.data.addresses
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const deleteAddress = async (addressId) => {
    isLoading.value = true
    try {
      const response = await api.delete(`/user/addresses/${addressId}`)
      addresses.value = response.data.addresses
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const setDefaultAddress = async (addressId) => {
    isLoading.value = true
    try {
      const response = await api.put(`/user/addresses/${addressId}/default`)
      addresses.value = response.data.addresses
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const defaultAddress = computed(() => addresses.value.find(a => a.isDefault))
  const addressList = computed(() => addresses.value)

  return {
    addresses: addressList,
    defaultAddress,
    isLoading,
    error,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  }
})