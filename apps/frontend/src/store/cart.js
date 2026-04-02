import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { http } from '../services/http'
import { useAuthStore } from './auth'

export const useCartStore = defineStore('cart', () => {
  const cart = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const authStore = useAuthStore()

  function normalizeCart(payload) {
    if (!payload || typeof payload !== 'object') {
      return {
        id: null,
        items: [],
        summary: {
          totalQuantity: 0,
          selectedQuantity: 0,
          totalAmount: 0,
        },
      }
    }

    const items = Array.isArray(payload.items) ? payload.items : []
    const rawSummary = payload.summary ?? {}

    return {
      id: payload.id ?? null,
      items,
      summary: {
        totalQuantity: Number(rawSummary.totalQuantity) || 0,
        selectedQuantity: Number(rawSummary.selectedQuantity) || 0,
        totalAmount: Number(rawSummary.totalAmount) || 0,
      },
    }
  }

  function extractPayload(response) {
    return normalizeCart(response?.data?.data)
  }

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
      totalQuantity: cart.value.summary?.totalQuantity ?? 0,
      selectedQuantity: cart.value.summary?.selectedQuantity ?? 0,
      totalAmount: cart.value.summary?.totalAmount ?? 0,
      currency: items.value[0]?.currency || 'VND',
    }
  })

  async function fetchCart() {
    loading.value = true
    error.value = null
    try {
      const response = await http.get('/cart')
      cart.value = extractPayload(response)
    } catch (e) {
      if (e.response?.status === 404) {
        cart.value = normalizeCart()
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
      await http.post('/cart/items', { variantId, quantity })
      await fetchCart()
      return { success: true }
    } catch (e) {
      return {
        success: false,
        error: e.response?.data ?? null,
      }
    } finally {
      loading.value = false
    }
  }

  async function updateItem({ variantId, quantity }) {
    if (!cartId.value) {
      return {
        success: false,
        error: null,
      }
    }
    // Optimistic update
    const originalItems = JSON.parse(JSON.stringify(items.value))
    const item = items.value.find((i) => i.variantId === variantId)
    if (item) {
      item.quantity = quantity
    }

    try {
      await http.patch(`/cart/items/${variantId}`, { quantity })
      await fetchCart()
      return { success: true }
    } catch (e) {
      if (cart.value) {
        cart.value.items = originalItems // Rollback
      }
      await fetchCart()
      return {
        success: false,
        error: e.response?.data ?? null,
      }
    }
  }

  async function removeItem(variantId) {
    if (!cartId.value) {
      return {
        success: false,
        error: null,
      }
    }
    const originalCart = JSON.parse(JSON.stringify(cart.value))
    cart.value.items = cart.value.items.filter((i) => i.variantId !== variantId)

    try {
      await http.delete(`/cart/items/${variantId}`)
      await fetchCart()
      return { success: true }
    } catch (e) {
      cart.value = originalCart // Rollback
      await fetchCart()
      return {
        success: false,
        error: e.response?.data ?? null,
      }
    }
  }

  async function clearCart() {
    if (!cartId.value) {
      return {
        success: false,
        error: null,
      }
    }
    try {
      await http.delete('/cart')
      cart.value = normalizeCart()
      return { success: true }
    } catch (e) {
      return {
        success: false,
        error: e.response?.data ?? null,
      }
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
