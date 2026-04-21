import re

file_path = "apps/frontend/src/pages/ComparePage.vue"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update script logic
old_script_start = "const products = ref([])"
new_script_start = """const products = ref([])
const specsCategories = ref([])"""
content = content.replace(old_script_start, new_script_start)

old_fetch = """async function fetchProducts() {
  loading.value = true
  const productIds = Array.from(compareStore.productIds)
  if (productIds.length > 0) {
    products.value = await catalogStore.fetchProductsForCompare(productIds)
  } else {
    products.value = []
  }
  loading.value = false
}"""

new_fetch = """async function fetchProducts() {
  loading.value = true
  const productIds = Array.from(compareStore.productIds)
  if (productIds.length > 0) {
    const response = await catalogStore.fetchProductsForCompare(productIds)
    // Extract actual product detail from backend structure { items: [{ product, defaultVariant }] }
    products.value = (response?.items || []).map(item => ({
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
}"""

content = content.replace(old_fetch, new_fetch)

# 2. Update template to use specsCategories
old_tbody = """                <tbody class="divide-y divide-gray-200">
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
                </tbody>"""

new_tbody = """                <tbody class="divide-y divide-gray-200">
                    <!-- Product Header -->
                    <tr>
                        <td class="w-1/4 py-4 pr-4 align-top font-medium text-gray-900 bg-gray-50/50"></td>
                        <td v-for="product in products" :key="product.id" class="w-1/4 px-4 py-6 align-top">
                            <div class="flex flex-col items-center">
                                <div class="relative h-48 w-full flex items-center justify-center bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4">
                                    <img :src="product.defaultVariant?.thumbnail || product.listingVariantSnapshot?.thumbnail" :alt="product.title" class="max-h-full max-w-full object-contain"/>
                                </div>
                                <h3 class="text-center text-sm font-bold text-gray-900 line-clamp-2 min-h-[2.5rem]">{{ product.title }}</h3>
                                <button @click="compareStore.removeProduct(product.id)" class="mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors">
                                    <span class="material-symbols-outlined text-sm">delete</span>
                                    Gỡ bỏ
                                </button>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Categorized Attributes -->
                    <template v-for="category in specsCategories" :key="category.title">
                        <tr class="bg-gray-50/80">
                            <td :colspan="products.length + 1" class="px-4 py-3 text-sm font-bold text-gray-900 uppercase tracking-wider">
                                {{ category.title }}
                            </td>
                        </tr>
                        <tr v-for="attr in category.attributes" :key="attr.label">
                            <th class="py-4 pr-4 align-top text-xs font-semibold text-gray-500 uppercase tracking-tight pl-4">{{ attr.label }}</th>
                            <td v-for="product in products" :key="product.id" class="px-4 py-4 align-top text-sm text-gray-900 font-medium">
                                <template v-if="attr.getValue">
                                    {{ attr.getValue(product) }}
                                </template>
                                <template v-else>
                                    {{ attr.formatter ? attr.formatter(getProductAttribute(product, attr.key)) : getProductAttribute(product, attr.key) }}
                                </template>
                            </td>
                        </tr>
                    </template>
                </tbody>"""

content = content.replace(old_tbody, new_tbody)

# Remove unused const attributes
content = re.sub(r"const attributes = \[.*?\]", "", content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(content)
