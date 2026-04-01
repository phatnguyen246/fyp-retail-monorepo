<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminStore } from '../../store/admin'
import { formatCurrency, formatDate } from '../../services/formatters'

const route = useRoute()
const adminStore = useAdminStore()
const order = ref(null)
const loading = ref(true)

const orderId = route.params.orderId

const statusOptions = [
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
]

onMounted(async () => {
  const { success, data } = await adminStore.fetchOrder(orderId)
  if (success) {
    order.value = data
  }
  loading.value = false
})

async function handleStatusUpdate() {
    const { success } = await adminStore.updateOrderStatus(orderId, { status: order.value.orderStatus })
    if (success) {
        // show toast
    }
}
</script>

<template>
    <div v-if="loading">Đang tải...</div>
    <div v-else-if="!order">Không tìm thấy đơn hàng.</div>
    <div v-else>
        <div class="space-y-8">
            <div>
                <h1 class="text-2xl font-bold">Đơn hàng #{{ order.orderCode }}</h1>
                <p class="text-sm text-gray-500">Đặt lúc {{ formatDate(order.createdAt) }}</p>
            </div>

            <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div class="lg:col-span-2">
                    <div class="rounded-lg border bg-white p-6">
                         <h2 class="text-lg font-medium text-gray-900">Sản phẩm</h2>
                        <ul role="list" class="mt-6 divide-y divide-gray-200">
                            <li v-for="item in order.items" :key="item.variantId" class="flex space-x-6 py-6">
                                <img :src="item.thumbnailUrl" class="h-24 w-24 flex-none rounded-md bg-gray-100 object-cover object-center" />
                                <div class="flex-auto space-y-1">
                                <h4 class="text-sm font-medium text-gray-900">{{ item.productName }}</h4>
                                <p class="text-sm text-gray-500">{{ item.variantLabel }}</p>
                                </div>
                                <p class="flex-none text-sm font-medium text-gray-900">{{ formatCurrency(item.lineTotal) }}</p>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="space-y-8">
                     <div class="rounded-lg border bg-white p-6">
                        <h2 class="text-lg font-medium text-gray-900">Thông tin khách hàng</h2>
                        <dl class="mt-4 space-y-2 text-sm">
                            <dt class="font-medium text-gray-900">Số điện thoại</dt>
                            <dd class="text-gray-700">{{ order.phoneNumber }}</dd>
                             <dt class="font-medium text-gray-900">Địa chỉ</dt>
                            <dd class="text-gray-700">{{ order.shippingAddressLine }}</dd>
                        </dl>
                    </div>

                    <div class="rounded-lg border bg-white p-6">
                         <h2 class="text-lg font-medium text-gray-900">Trạng thái</h2>
                         <div class="mt-4 space-y-4">
                             <div>
                                <label for="order-status" class="block text-sm font-medium text-gray-700">Trạng thái đơn hàng</label>
                                <select id="order-status" v-model="order.orderStatus" class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                                </select>
                            </div>
                            <button @click="handleStatusUpdate" :disabled="adminStore.loading" class="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                                Cập nhật
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
