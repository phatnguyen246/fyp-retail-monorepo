<script setup>
import { onMounted, ref } from 'vue'
import { useOrderingStore } from '../store/ordering'
import { formatDate, formatCurrency } from '../services/formatters'
import { RouterLink } from 'vue-router'

const orderingStore = useOrderingStore()
const orders = ref([])
const loading = ref(true)

onMounted(async () => {
  const { success, data } = await orderingStore.fetchOrders()
  if (success) {
    orders.value = data
  }
  loading.value = false
})
</script>

<template>
  <div class="bg-white">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:pb-24">
      <div class="max-w-xl">
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Lịch sử đơn hàng</h1>
        <p class="mt-2 text-sm text-gray-500">
          Kiểm tra trạng thái của các đơn hàng gần đây, quản lý và xem chi tiết.
        </p>
      </div>

      <div class="mt-16">
        <h2 class="sr-only">Đơn hàng gần đây</h2>

        <div v-if="loading">
          <p>Đang tải lịch sử đơn hàng...</p>
        </div>
        <div v-else-if="!orders.length">
          <p>Bạn chưa có đơn hàng nào.</p>
        </div>
        <div v-else class="space-y-20">
          <div v-for="order in orders" :key="order.id">
            <h3 class="sr-only">
              Đơn hàng đặt lúc <time :datetime="order.createdAt">{{ formatDate(order.createdAt) }}</time>
            </h3>

            <div
              class="rounded-lg bg-gray-50 px-4 py-6 sm:flex sm:items-center sm:justify-between sm:space-x-6 sm:px-6 lg:space-x-8"
            >
              <dl
                class="flex-auto space-y-6 divide-y divide-gray-200 text-sm text-gray-600 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:space-y-0 sm:divide-y-0 lg:w-full lg:flex-none lg:grid-cols-4 lg:gap-x-8"
              >
                <div class="flex justify-between sm:block">
                  <dt class="font-medium text-gray-900">Ngày đặt</dt>
                  <dd class="sm:mt-1">
                    <time :datetime="order.createdAt">{{ formatDate(order.createdAt) }}</time>
                  </dd>
                </div>
                <div class="flex justify-between pt-6 sm:block sm:pt-0">
                  <dt class="font-medium text-gray-900">Mã đơn hàng</dt>
                  <dd class="sm:mt-1">{{ order.orderCode }}</dd>
                </div>
                <div class="flex justify-between pt-6 font-medium text-gray-900 sm:block sm:pt-0">
                  <dt>Tổng tiền</dt>
                  <dd class="sm:mt-1">{{ formatCurrency(order.grandTotal) }}</dd>
                </div>
                 <div class="flex justify-between pt-6 font-medium text-gray-900 sm:block sm:pt-0">
                  <dt>Trạng thái</dt>
                  <dd class="sm:mt-1">{{ order.orderStatus }}</dd>
                </div>
              </dl>
              <RouterLink
                :to="{ name: 'order-detail', params: { orderId: order.id } }"
                class="mt-6 flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-4 sm:mt-0 sm:w-auto"
              >
                Xem chi tiết
              </RouterLink>
            </div>

            <ul role="list" class="mt-6 divide-y divide-gray-200 border-t border-gray-200">
              <li v-for="item in order.items.slice(0,1)" :key="item.variantId" class="flex space-x-6 py-6">
                <img
                  :src="item.thumbnailUrl"
                  class="h-24 w-24 flex-none rounded-md bg-gray-100 object-cover object-center"
                />
                <div class="flex-auto space-y-1">
                  <h4 class="text-sm font-medium text-gray-900">
                    <a :href="`/products/${item.productId}`">{{ item.productName }}</a>
                  </h4>
                  <p class="text-sm text-gray-500">{{ item.variantLabel }}</p>
                </div>
                <p class="flex-auto space-y-1 text-sm text-gray-500">x{{ item.quantity }}</p>
                <p class="flex-none text-sm font-medium text-gray-900">{{ formatCurrency(item.lineTotal) }}</p>
              </li>
               <li v-if="order.items.length > 1" class="text-sm text-gray-500 py-2">
                và {{ order.items.length - 1}} sản phẩm khác...
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
