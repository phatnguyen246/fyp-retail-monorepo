import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { http } from '../services/http'
import { useAuthStore } from './auth'

export const useCartStore = defineStore('cart', () => {
  const cart = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const authStore = useAuthStore()

  const cartId = computed(() => cart.value?.id)
  const items = computed(() => cart.value?.items || [])
  const summary = computed(() => {
    if (!cart.value) {
      return {
        totalQuantity: 0,
        selectedQuantity: 0,
        totalAmount: 0,
        currency: 'VND',
      }
    }
    return {
      totalQuantity: cart.value.totalQuantity,
      selectedQuantity: cart.value.selectedQuantity,
      totalAmount: cart.value.totalAmount,
      currency: items.value[0]?.currency || 'VND',
    }
  })

  async function fetchCart() {
    loading.value = true
    error.value = null
    try {
      const response = await http.get('/cart')
      cart.value = response.data
    } catch (e) {
      if (e.response?.status === 404) {
        cart.value = null // A 404 means the user has no cart yet, which is a valid state
      } else {
        error.value = 'Could not fetch cart.'
      }
    } finally {
      loading.value = false
    }
  }

  async function addItem({ variantId, quantity }) {
    loading.value = true
    try {
      const response = await http.post('/cart/items', { variantId, quantity })
      cart.value = response.data
      return true
    } catch (e) {
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateItem({ variantId, quantity }) {
    if (!cartId.value) return false
    // Optimistic update
    const originalItems = JSON.parse(JSON.stringify(items.value))
    const item = items.value.find((i) => i.variantId === variantId)
    if (item) {
      item.quantity = quantity
    }

    try {
      const response = await http.patch(`/cart/items/${variantId}`, { quantity })
      cart.value = response.data
      return true
    } catch (e) {
      cart.value.items = originalItems // Rollback
      return false
    }
  }

  async function removeItem(variantId) {
    if (!cartId.value) return false
    const originalCart = JSON.parse(JSON.stringify(cart.value))
    cart.value.items = cart.value.items.filter((i) => i.variantId !== variantId)

    try {
      const response = await http.delete(`/cart/items/${variantId}`)
      cart.value = response.data
    } catch (e) {
      cart.value = originalCart // Rollback
    }
  }

  async function clearCart() {
    if (!cartId.value) return
    try {
      await http.delete('/cart')
      cart.value = null
    } catch (e) {
      // Handle error
    }
  }
  
  // When user logs in, we should refetch the cart
  authStore.$subscribe((mutation, state) => {
    if(state.user) {
        fetchCart()
    }
  })


  return {
    cart: readonly(cart),
    loading: readonly(loading),
    error: readonly(error),
    items,
    summary,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
  }
})
