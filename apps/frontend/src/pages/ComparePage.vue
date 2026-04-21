<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useCompareStore } from '../store/compare'
import { useCatalogStore } from '../store/catalog'
import { formatCurrency } from '../services/formatters'
import { RouterLink } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'

const compareStore = useCompareStore()
const catalogStore = useCatalogStore()
const products = ref([])
const specsCategories = ref([])
const loading = ref(true)

const comparisonSlots = computed(() => {
  const slots = [...products.value]
  while (slots.length < 3) {
    slots.push(null)
  }
  return slots
})

async function fetchProducts() {
  loading.value = true
  const productIds = [...compareStore.productIds]
  if (productIds.length > 0) {
    const items = await catalogStore.fetchProductsForCompare(productIds)
    
    products.value = items.map(item => ({
        ...item.product,
        defaultVariant: item.defaultVariant
    }))
    
    generateSpecsCategories()
  } else {
    products.value = []
    specsCategories.value = []
  }
  loading.value = false
}

function generateSpecsCategories() {
    if (products.value.length === 0) return
    
    // Group specs for display (Smartphone centric for now)
    const smartphoneSpecs = [
        { label: 'Màn hình', keys: ['specs.screen.size', 'specs.screen.technology', 'specs.screen.resolution', 'specs.screen.refreshRate'] },
        { label: 'Vi xử lý & Đồ họa', keys: ['specs.chipset', 'specs.cpu', 'specs.gpu'] },
        { label: 'Camera sau', keys: ['specs.rearCamera'] },
        { label: 'Camera trước', keys: ['specs.frontCamera'] },
        { label: 'Pin & Sạc', keys: ['specs.battery', 'specs.charging'] },
        { label: 'Hệ điều hành', keys: ['specs.operatingSystem'] },
        { label: 'Thiết kế & Trọng lượng', keys: ['specs.dimensions', 'specs.weight', 'specs.material'] },
        { label: 'Khác', keys: ['specs.sim', 'specs.network', 'specs.waterResistance'] }
    ]

    specsCategories.value = [
        {
            title: 'Thông tin chung',
            attributes: [
                { key: 'brand.name', label: 'Thương hiệu' },
                { key: 'defaultVariant.salePrice', label: 'Giá ưu đãi', formatter: formatCurrency },
                { key: 'defaultVariant.variantAttributes.ram', label: 'RAM' },
                { key: 'defaultVariant.variantAttributes.rom', label: 'Dung lượng (ROM)' },
                { key: 'defaultVariant.variantAttributes.colorFullName', label: 'Màu sắc' }
            ]
        },
        {
            title: 'Thông số kỹ thuật chi tiết',
            attributes: smartphoneSpecs.map(spec => ({
                label: spec.label,
                getValue: (product) => {
                    const parts = spec.keys.map(k => getProductAttribute(product, k)).filter(v => v !== 'N/A' && v !== '')
                    return parts.length > 0 ? parts.join(' • ') : 'N/A'
                }
            }))
        }
    ]
}

// Watch for changes in product selection and reload data
watch(() => [...compareStore.productIds], () => {
  fetchProducts()
})

onMounted(fetchProducts)



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
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)] min-h-screen">
    <div class="catalog-shell">
      <CatalogTopNav />

      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[1440px]">
          <!-- Breadcrumb -->
          <div class="mb-8 flex flex-wrap items-center gap-2 text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--catalog-text-soft)]">
            <RouterLink class="transition-colors hover:text-[var(--catalog-primary)]" :to="{ name: 'catalog-products' }">
              Catalog
            </RouterLink>
            <span class="material-symbols-outlined text-[12px]">chevron_right</span>
            <span class="font-medium text-[var(--catalog-text)]">So sánh sản phẩm</span>
          </div>

          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h1 class="catalog-display-title text-4xl lg:text-5xl text-gray-900">So sánh sản phẩm</h1>
              <p class="mt-3 text-gray-500 max-w-2xl">
                Đối chiếu thông số kỹ thuật, giá bán và tính năng giữa các sản phẩm để tìm ra lựa chọn phù hợp nhất với nhu cầu của bạn.
              </p>
            </div>
          </div>

          <div v-if="loading" class="py-24 text-center">
            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--catalog-primary)] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p class="mt-4 text-sm font-medium text-gray-500 tracking-widest uppercase">Đang tải dữ liệu so sánh...</p>
          </div>

          <div v-else-if="products.length === 0" class="mt-8 text-center px-4 py-24 bg-white rounded-[2rem] border border-[var(--catalog-border-soft)] shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
            <span class="material-symbols-outlined text-6xl text-gray-200 mb-6">compare_arrows</span>
            <p class="text-2xl font-bold text-gray-900">Danh sách so sánh đang trống</p>
            <p class="mt-3 text-gray-500 max-w-md mx-auto">Hãy quay lại cửa hàng và chọn các sản phẩm bạn đang phân vân để bắt đầu so sánh chi tiết.</p>
            <RouterLink
                :to="{ name: 'catalog-products' }"
                class="catalog-primary-button mt-10 inline-flex items-center gap-3 rounded-full px-10 py-4 shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
                <span class="material-symbols-outlined text-xl">add</span>
                Khám phá sản phẩm
            </RouterLink>
          </div>

          <section v-else aria-labelledby="comparison-heading">
            <div class="mb-8 flex items-center justify-between bg-white p-6 rounded-2xl border border-[var(--catalog-border-soft)] shadow-sm">
                <div>
                    <h2 id="comparison-heading" class="text-lg font-bold text-gray-900">Chi tiết bảng thông số</h2>
                    <p class="text-xs font-bold text-[var(--catalog-primary)] uppercase tracking-widest mt-1">Đang so sánh {{ products.length }} sản phẩm</p>
                </div>
                <button 
                    v-if="products.length > 0"
                    @click="compareStore.clearCompare()"
                    class="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-100 text-xs font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest"
                >
                    <span class="material-symbols-outlined text-lg">delete_sweep</span>
                    Xóa tất cả
                </button>
            </div>

            <div class="overflow-x-auto rounded-[2rem] border border-[var(--catalog-border-soft)] shadow-[0_20px_60px_rgba(26,28,28,0.05)] bg-white">
                <table class="w-full border-collapse text-left table-fixed min-w-[64rem]">
                    <thead>
                        <tr>
                            <th class="w-[16%] py-8 pr-4 bg-gray-50/30 pl-8"></th>
                            <th v-for="(product, index) in comparisonSlots" :key="index" class="w-[28%] px-6 py-10 border-l border-gray-50 first:border-l-0">
                                <div v-if="product" class="flex flex-col items-center">
                                    <div class="relative h-64 w-full flex items-center justify-center bg-white rounded-3xl p-6 mb-8 transition-transform hover:scale-105 duration-500">
                                        <img 
                                            :src="product.defaultSelectedVariant?.thumbnail || product.defaultVariant?.media?.[0]?.url || product.listingVariantSnapshot?.thumbnail" 
                                            :alt="product.title" 
                                            class="max-h-full max-w-full object-contain drop-shadow-2xl"
                                        />
                                    </div>
                                    <h3 class="text-center text-lg font-bold text-gray-900 line-clamp-2 min-h-[3.5rem] px-2 leading-tight">{{ product.title }}</h3>
                                    <button @click="compareStore.removeProduct(product.id)" class="mt-6 flex items-center gap-2 text-[0.65rem] font-black text-gray-400 hover:text-red-500 transition-all uppercase tracking-widest">
                                        <span class="material-symbols-outlined text-lg">cancel</span>
                                        Gỡ bỏ
                                    </button>
                                </div>
                                <div v-else class="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 h-full">
                                    <span class="material-symbols-outlined text-4xl text-gray-200 mb-4">add_circle</span>
                                    <p class="text-xs font-bold text-gray-300 uppercase tracking-widest text-center">Trống</p>
                                    <RouterLink :to="{ name: 'catalog-products' }" class="mt-4 text-[0.65rem] font-black text-[var(--catalog-primary)] hover:underline uppercase tracking-widest">Thêm sản phẩm</RouterLink>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <!-- Categorized Attributes -->
                        <template v-for="category in specsCategories" :key="category.title">
                            <tr class="bg-gray-50/50">
                                <td colspan="4" class="px-8 py-5 text-[0.7rem] font-black text-gray-900 uppercase tracking-[0.25em]">
                                    {{ category.title }}
                                </td>
                            </tr>
                            <tr v-for="attr in category.attributes" :key="attr.label" class="hover:bg-blue-50/10 transition-colors">
                                <th class="py-6 pr-8 align-top text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest pl-8 border-r border-gray-50/50 w-[16%]">
                                    {{ attr.label }}
                                </th>
                                <td v-for="(product, index) in comparisonSlots" :key="index" class="px-8 py-6 align-top text-sm text-gray-900 font-semibold border-l border-gray-50 first:border-l-0 w-[28%]">
                                    <template v-if="product">
                                        <template v-if="attr.getValue">
                                            <div class="leading-relaxed whitespace-pre-line">{{ attr.getValue(product) }}</div>
                                        </template>
                                        <template v-else>
                                            <div class="leading-relaxed">{{ attr.formatter ? attr.formatter(getProductAttribute(product, attr.key)) : getProductAttribute(product, attr.key) }}</div>
                                        </template>
                                    </template>
                                    <template v-else>
                                        <div class="text-gray-200">—</div>
                                    </template>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
          </section>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>
