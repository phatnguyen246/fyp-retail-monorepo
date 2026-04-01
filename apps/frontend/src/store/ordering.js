import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { http } from '../services/http'
import { useCartStore } from './cart'

export const useOrderingStore = defineStore('ordering', () => {
  const order = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const cartStore = useCartStore()

  async function createOrder(orderDetails) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/orders', orderDetails)
      order.value = response.data
      cartStore.fetchCart() // Refresh cart after successful order
      return { success: true, order: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not create order.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function createVnPayUrl(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/payments/vnpay/create-url', { orderId })
      return { success: true, paymentUrl: response.data.paymentUrl }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not create VNPAY payment URL.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function handleVnpayReturn(query) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get('/payment/vnpay/return', { params: query })
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'VNPAY return handling failed.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get(`/orders/${orderId}`)
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch order.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }
  
  async function getOrderById(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get(`/orders/${orderId}`);
      order.value = response.data;
      return { success: true, data: response.data };
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch order.';
      return { success: false, error: error.value };
    } finally {
      loading.value = false
    }
  }
  
  async function fetchOrders() {
    loading.value = true;
    error.value = null;
    try {
      const response = await http.get('/orders');
      return { success: true, data: response.data };
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch orders.';
      return { success: false, error: error.value };
    } finally {
      loading.value = false;
    }
  }

  return {
    order: readonly(order),
    loading: readonly(loading),
    error: readonly(error),
    createOrder,
    createVnPayUrl,
    handleVnpayReturn,
    fetchOrder,
    getOrderById,
    fetchOrders,
  }
})
