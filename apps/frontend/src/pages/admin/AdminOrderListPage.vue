<script setup>
import { onMounted } from 'vue'
import { useAdminStore } from '../../store/admin'
import { formatCurrency, formatDate } from '../../services/formatters'
import { RouterLink } from 'vue-router'

const adminStore = useAdminStore()

onMounted(() => {
  adminStore.fetchOrders()
})
</script>

<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">Đơn hàng</h1>
        <p class="mt-2 text-sm text-gray-700">Danh sách tất cả đơn hàng trong hệ thống.</p>
      </div>
    </div>
    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Mã đơn hàng</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ngày đặt</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Trạng thái đơn hàng</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Trạng thái thanh toán</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tổng tiền</th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-if="adminStore.loading">
                    <td colspan="6" class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">Đang tải...</td>
                </tr>
                <tr v-else-if="adminStore.error">
                    <td colspan="6" class="whitespace-nowrap px-3 py-4 text-sm text-red-500 text-center">{{ adminStore.error }}</td>
                </tr>
                <tr v-for="order in adminStore.orders" :key="order.id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{{ order.orderCode }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatDate(order.createdAt) }}</td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span class="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">{{ order.orderStatus }}</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                     <span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5" :class="order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'">{{ order.paymentStatus }}</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{{ formatCurrency(order.grandTotal) }}</td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <RouterLink :to="{ name: 'admin-order-detail', params: { orderId: order.id } }" class="text-indigo-600 hover:text-indigo-900">
                        Xem
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
