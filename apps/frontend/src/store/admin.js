import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { http } from '../services/http'

export const useAdminStore = defineStore('admin', () => {
  const products = ref([])
  const orders = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const response = await http.get('/admin/catalog/products')
      products.value = response.data.items
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch products.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function createProduct(productData) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/admin/catalog/products', productData)
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not create product.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function fetchProduct(productId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get(`/admin/catalog/products/${productId}`)
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch product.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function updateProduct(productId, productData) {
    loading.value = true
    error.value = null
    try {
      const response = await http.patch(`/admin/catalog/products/${productId}`, productData)
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not update product.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function fetchOrders() {
    loading.value = true
    error.value = null
    try {
      const response = await http.get('/admin/orders')
      orders.value = response.data
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch orders.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(orderId) {
    loading.value = true
    error.value = null
    try {
      const response = await http.get(`/admin/orders/${orderId}`)
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not fetch order.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  async function updateOrderStatus(orderId, { status }) {
    loading.value = true
    error.value = null
    try {
      const response = await http.patch(`/admin/orders/${orderId}/status`, { status })
      return { success: true, data: response.data }
    } catch (e) {
      error.value = e.response?.data?.message || 'Could not update order status.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    products: readonly(products),
    orders: readonly(orders),
    loading: readonly(loading),
    error: readonly(error),
    fetchProducts,
    createProduct,
    fetchProduct,
    updateProduct,
    fetchOrders,
    fetchOrder,
    updateOrderStatus,
  }
})
