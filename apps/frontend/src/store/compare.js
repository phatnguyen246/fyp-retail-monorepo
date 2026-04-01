import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCompareStore = defineStore('compare', () => {
  const productIds = ref(new Set())

  function addProduct(productId) {
    if (productIds.value.size < 3) {
      productIds.value.add(productId)
    }
    // Maybe show a notification if the user tries to add more than 3
  }

  function removeProduct(productId) {
    productIds.value.delete(productId)
  }

  function clearCompare() {
    productIds.value.clear()
  }
  
  function isCompared(productId) {
    return productIds.value.has(productId)
  }

  return {
    productIds,
    addProduct,
    removeProduct,
    clearCompare,
    isCompared,
    count: productIds.value.size
  }
})
