import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export const useCompareStore = defineStore('compare', () => {
  const STORAGE_KEY = 'fyp_retail_compare_v2'

  // 1. Initial State from Storage
  const productIds = ref([])
  const productTypes = ref({})

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return

      const parsed = JSON.parse(saved)
      if (parsed && Array.isArray(parsed.productIds)) {
        productIds.value = parsed.productIds
      }
      if (parsed && parsed.productTypes && typeof parsed.productTypes === 'object') {
        productTypes.value = parsed.productTypes
      }
    } catch (error) {
      console.error('Failed to load comparison data from localStorage:', error)
    }
  }

  // Load immediately
  loadFromStorage()

  // 2. Persist Changes to Storage
  watch(
    () => ({
      productIds: productIds.value,
      productTypes: productTypes.value
    }),
    (state) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (error) {
        console.error('Failed to save comparison data to localStorage:', error)
      }
    },
    { deep: true }
  )

  const count = computed(() => productIds.value.length)

  function addProduct(product) {
    const id = product.id || product.productId
    const type = product.productType || 'smartphone'

    if (productIds.value.includes(id)) return

    if (productIds.value.length >= 3) {
      alert('You can compare up to 3 products only.')
      return
    }

    // Check type consistency
    if (productIds.value.length > 0) {
      const existingTypes = Object.values(productTypes.value)
      if (existingTypes.length > 0 && !existingTypes.includes(type)) {
        alert('You can only compare products of the same type.')
        return
      }
    }

    productIds.value.push(id)
    // Create a new reference for productTypes to ensure reactivity
    productTypes.value = {
      ...productTypes.value,
      [id]: type
    }
  }

  function removeProduct(productId) {
    productIds.value = productIds.value.filter(id => id !== productId)
    
    const newTypes = { ...productTypes.value }
    delete newTypes[productId]
    productTypes.value = newTypes
  }

  function clearCompare() {
    productIds.value = []
    productTypes.value = {}
  }
  
  function isCompared(productId) {
    return productIds.value.includes(productId)
  }

  return {
    productIds,
    addProduct,
    removeProduct,
    clearCompare,
    isCompared,
    count
  }
})
