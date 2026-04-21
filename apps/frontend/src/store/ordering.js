import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { http } from '../services/http'
import { useCartStore } from './cart'

export const useOrderingStore = defineStore('ordering', () => {
  const order = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const cartStore = useCartStore()

  function unwrapPayload(response) {
    return response?.data?.data ?? null
  }

  function extractErrorPayload(e, fallbackMessage) {
    const payload = e?.response?.data ?? null

    return {
      message: payload?.message || fallbackMessage,
      code: payload?.code ?? null,
      meta: payload?.meta ?? null,
      status: e?.response?.status ?? null,
      payload,
    }
  }

  async function createOrder(orderDetails) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/orders', orderDetails)
      const payload = unwrapPayload(response)
      order.value = payload
      await cartStore.fetchCart()
      return { success: true, order: payload }
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not create order.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload }
    } finally {
      loading.value = false
    }
  }

  async function createVnPayUrl(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/payments/vnpay/create-url', { orderId })
      const payload = unwrapPayload(response)
      return { success: true, ...payload }
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not create VNPAY payment URL.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload }
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
      const errorPayload = extractErrorPayload(e, 'VNPAY return handling failed.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload }
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get(`/orders/${orderId}`)
      const payload = unwrapPayload(response)
      order.value = payload
      return { success: true, data: payload }
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not fetch order.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload }
    } finally {
      loading.value = false
    }
  }

  async function lookupGuestOrder(criteria) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/orders/lookup', criteria)
      const payload = unwrapPayload(response)
      order.value = payload
      return { success: true, data: payload }
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not find guest order.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload }
    } finally {
      loading.value = false
    }
  }
  
  async function getOrderById(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get(`/orders/${orderId}`);
      const payload = unwrapPayload(response)
      order.value = payload
      return { success: true, data: payload };
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not fetch order.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload };
    } finally {
      loading.value = false
    }
  }
  
  async function fetchOrders() {
    loading.value = true;
    error.value = null;
    try {
      const response = await http.get('/orders');
      return { success: true, data: unwrapPayload(response) ?? [] };
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not fetch orders.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload };
    } finally {
      loading.value = false;
    }
  }

  async function cancelOrder(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post(`/orders/${orderId}/cancel`)
      const payload = unwrapPayload(response)
      order.value = payload
      return { success: true, data: payload }
    } catch (e) {
      const errorPayload = extractErrorPayload(e, 'Could not cancel order.')
      error.value = errorPayload.message
      return { success: false, error: errorPayload }
    } finally {
      loading.value = false
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
    lookupGuestOrder,
    getOrderById,
    fetchOrders,
    cancelOrder,
  }
})
