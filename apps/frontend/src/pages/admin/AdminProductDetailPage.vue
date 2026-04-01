<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../../store/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const product = ref(null)
const loading = ref(true)

const productId = route.params.productId

// Hardcoded options as per discovery doc
const brandOptions = [
  { value: 'samsung', label: 'Samsung' },
  { value: 'apple', label: 'Apple' },
  { value: 'google', label: 'Google' },
]
const categoryOptions = [
  { value: 'smartphone', label: 'Smartphone' },
]
const tagOptions = [
  { value: 'เรือธง', label: 'เรือธง' },
  { value: 'กล้องสวย', label: 'กล้องสวย' },
  { value: 'จอใหญ่', label: 'จอใหญ่' },
  { value: 'แบตอึด', label: 'แบตอึด' },
  { value: 'ราคาถูก', label: 'ราคาถูก' },
]
 const statusOptions = [
    { value: 'draft', label: 'Bản nháp' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'discontinued', label: 'Ngừng kinh doanh' },
]

onMounted(async () => {
  const { success, data } = await adminStore.fetchProduct(productId)
  if (success) {
    product.value = data
  }
  loading.value = false
})

async function handleSubmit() {
  const { success } = await adminStore.updateProduct(productId, product.value)
  if (success) {
    // maybe show a success toast
    router.push({ name: 'admin-products' })
  }
}
</script>

<template>
    <div v-if="loading">Đang tải...</div>
    <form v-else-if="product" @submit.prevent="handleSubmit">
        <div class="space-y-8">
        <div class="border-b border-gray-900/10 pb-8">
            <h2 class="text-base font-semibold leading-7 text-gray-900">Sửa sản phẩm</h2>
            <p class="mt-1 text-sm leading-6 text-gray-600">Cập nhật thông tin sản phẩm.</p>

            <div class="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div class="sm:col-span-3">
                <label for="product-title" class="block text-sm font-medium leading-6 text-gray-900">Tên sản phẩm</label>
                <div class="mt-2">
                <input type="text" v-model="product.title" id="product-title" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                </div>
            </div>

            <div class="sm:col-span-3">
                <label for="product-group-code" class="block text-sm font-medium leading-6 text-gray-900">Mã nhóm sản phẩm</label>
                <div class="mt-2">
                <input type="text" v-model="product.productGroupCode" id="product-group-code" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
                </div>
            </div>

            <div class="sm:col-span-3">
                <label for="brand" class="block text-sm font-medium leading-6 text-gray-900">Thương hiệu</label>
                <div class="mt-2">
                <select v-model="product.brandCode" id="brand" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6">
                    <option v-for="option in brandOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                </div>
            </div>

            <div class="sm:col-span-3">
                <label for="category" class="block text-sm font-medium leading-6 text-gray-900">Danh mục</label>
                <div class="mt-2">
                <select v-model="product.categoryCode" id="category" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6">
                    <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                </div>
            </div>

             <div class="sm:col-span-3">
                <label for="status" class="block text-sm font-medium leading-6 text-gray-900">Trạng thái</label>
                <div class="mt-2">
                <select v-model="product.status" id="status" class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6">
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                </div>
            </div>

            <div class="sm:col-span-6">
                <label class="block text-sm font-medium leading-6 text-gray-900">Tags</label>
                <div class="mt-2 flex flex-wrap gap-2">
                    <div v-for="option in tagOptions" :key="option.value" class="flex items-center">
                        <input type="checkbox" :id="`tag-${option.value}`" :value="option.value" v-model="product.tagCodes" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        <label :for="`tag-${option.value}`" class="ml-2 text-sm text-gray-600">{{ option.label }}</label>
                    </div>
                </div>
            </div>
            </div>
        </div>

        <div v-if="adminStore.error" class="rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-700">{{ adminStore.error }}</p>
        </div>

        <div class="mt-6 flex items-center justify-end gap-x-6">
            <button type="button" @click="router.go(-1)" class="text-sm font-semibold leading-6 text-gray-900">Hủy</button>
            <button type="submit" :disabled="adminStore.loading" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                <span v-if="adminStore.loading">Đang lưu...</span>
                <span v-else>Lưu</span>
            </button>
        </div>
        </div>
    </form>
</template>
