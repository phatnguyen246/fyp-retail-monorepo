<script setup>
import { onMounted, ref, watch } from 'vue'
import { useCompareStore } from '../store/compare'
import { useCatalogStore } from '../store/catalog'
import { formatCurrency } from '../services/formatters'
import { RouterLink } from 'vue-router'

const compareStore = useCompareStore()
const catalogStore = useCatalogStore()
const products = ref([])
const loading = ref(true)

async function fetchProducts() {
  loading.value = true
  const productIds = Array.from(compareStore.productIds)
  if (productIds.length > 0) {
    products.value = await catalogStore.fetchProductsForCompare(productIds)
  } else {
    products.value = []
  }
  loading.value = false
}

watch(() => compareStore.productIds, fetchProducts, { deep: true })

onMounted(fetchProducts)

const attributes = [
    { key: 'brand.name', label: 'Thương hiệu' },
    { key: 'defaultVariant.salePrice', label: 'Giá', formatter: formatCurrency },
    { key: 'defaultVariant.variantAttributes.ram', label: 'RAM' },
    { key: 'defaultVariant.variantAttributes.rom', label: 'ROM' },
    { key: 'defaultVariant.variantAttributes.color', label: 'Màu' },
]

function getProductAttribute(product, key) {
    const keys = key.split('.')
    let value = product
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k]
        } else {
            return 'N/A'
        }
    }
    return value
}
</script>

<template>
  <div class="bg-white">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold tracking-tight text-gray-900">So sánh sản phẩm</h1>

      <div v-if="loading" class="mt-8">
        <p>Đang tải sản phẩm so sánh...</p>
      </div>
      <div v-else-if="products.length < 2" class="mt-8 text-center">
        <p class="text-lg text-gray-500">Thêm ít nhất 2 sản phẩm để so sánh.</p>
        <RouterLink
            :to="{ name: 'catalog-products' }"
            class="mt-4 inline-block rounded-md border border-transparent bg-[var(--catalog-primary)] px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-[var(--catalog-primary-deep)]"
        >
            Khám phá sản phẩm
        </RouterLink>
      </div>

      <section v-else aria-labelledby="comparison-heading" class="mt-8">
        <h2 id="comparison-heading" class="sr-only">Product comparison</h2>

        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left">
                <thead class="sr-only">
                    <tr>
                        <th>Product</th>
                        <th v-for="product in products" :key="product.id">
                            <span class="sr-only">{{ product.title }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <!-- Product Image and Name -->
                    <tr>
                        <td class="w-1/4 py-4 pr-4 align-top font-medium text-gray-900"></td>
                        <td v-for="product in products" :key="product.id" class="w-1/4 px-4 py-4 align-top">
                            <div class="flex flex-col items-center">
                                <img :src="product.defaultVariant.thumbnail" :alt="product.title" class="h-48 w-48 object-contain"/>
                                <h3 class="mt-2 text-lg font-semibold text-gray-800">{{ product.title }}</h3>
                                 <button @click="compareStore.removeProduct(product.id)" class="mt-2 text-sm text-red-600 hover:underline">
                                    Xóa
                                </button>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Attributes -->
                    <tr v-for="attr in attributes" :key="attr.key">
                        <th class="py-4 pr-4 align-top text-sm font-medium text-gray-900">{{ attr.label }}</th>
                        <td v-for="product in products" :key="product.id" class="px-4 py-4 align-top text-sm text-gray-500">
                             {{ attr.formatter ? attr.formatter(getProductAttribute(product, attr.key)) : getProductAttribute(product, attr.key) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
      </section>
    </div>
  </div>
</template>
