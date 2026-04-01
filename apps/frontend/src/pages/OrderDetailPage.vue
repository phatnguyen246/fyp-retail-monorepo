<script setup>
import { onMounted, ref } from 'vue'
import { useOrderingStore } from '../store/ordering'
import { formatCurrency, formatDate } from '../services/formatters'

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
})

const orderingStore = useOrderingStore()
const order = ref(null)
const loading = ref(true)

onMounted(async () => {
  const { success, data } = await orderingStore.fetchOrder(props.orderId)
  if (success) {
    order.value = data
  }
  loading.value = false
})
</script>

<template>
  <div class="bg-gray-50">
    <div class="mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-6 lg:max-w-7xl lg:px-8">
      <div v-if="loading">
        <p>Đang tải chi tiết đơn hàng...</p>
      </div>
      <div v-else-if="!order">
        <p>Không tìm thấy đơn hàng.</p>
      </div>
      <div v-else>
        <div class="space-y-2 sm:flex sm:items-baseline sm:justify-between sm:space-y-0">
          <div class="flex sm:items-baseline sm:space-x-4">
            <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Đơn hàng #{{ order.orderCode }}</h1>
          </div>
          <p class="text-sm text-gray-600">
            Đặt lúc
            <time :datetime="order.createdAt" class="font-medium text-gray-900">{{ formatDate(order.createdAt) }}</time>
          </p>
        </div>

        <div class="mt-12">
            <h2 class="sr-only">Sản phẩm đã đặt</h2>
            <ul role="list" class="divide-y divide-gray-200 border-b border-t border-gray-200">
                <li v-for="item in order.items" :key="item.variantId" class="flex py-6 sm:py-10">
                    <div class="flex-shrink-0">
                        <img :src="item.thumbnailUrl" class="h-24 w-24 rounded-md object-cover object-center sm:h-48 sm:w-48" />
                    </div>
                    <div class="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                        <div class="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                            <div>
                                <h3 class="text-sm font-medium text-gray-700">{{ item.productName }}</h3>
                                <p class="mt-1 text-sm text-gray-500">{{ item.variantLabel }}</p>
                                <p class="mt-1 text-sm text-gray-500">Số lượng: {{ item.quantity }}</p>
                            </div>
                             <p class="mt-1 text-sm font-medium text-gray-900">{{ formatCurrency(item.unitPrice) }}</p>
                        </div>
                    </div>
                </li>
            </ul>
        </div>

        <!-- Billing -->
        <div class="mt-10">
          <h2 class="text-lg font-medium text-gray-900">Thông tin đơn hàng</h2>

          <div class="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
            <dl class="grid grid-cols-2 gap-x-6 px-4 py-6 text-sm sm:px-6">
              <div>
                <dt class="font-medium text-gray-900">Địa chỉ giao hàng</dt>
                <dd class="mt-2 text-gray-700">
                  <address class="not-italic">
                    <span class="block">{{ order.shippingAddressLine }}</span>
                  </address>
                </dd>
              </div>
              <div>
                <dt class="font-medium text-gray-900">Thông tin thanh toán</dt>
                <dd class="mt-2 text-gray-700">
                  <p>{{ order.paymentMethod.toUpperCase() }}</p>
                  <p>
                    <span :class="order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'">{{ order.paymentStatus }}</span>
                  </p>
                </dd>
              </div>
            </dl>

            <dl class="space-y-6 border-t border-gray-200 px-4 py-6 text-sm sm:px-6">
              <div class="flex justify-between">
                <dt class="font-medium">Tổng tiền sản phẩm</dt>
                <dd class="text-gray-700">{{ formatCurrency(order.grandTotal) }}</dd>
              </div>
              <div class="flex justify-between font-medium">
                <dt>Tổng cộng</dt>
                <dd class="text-gray-900">{{ formatCurrency(order.grandTotal) }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Status timeline -->
        <div class="mt-10">
            <h2 class="text-lg font-medium text-gray-900">Lịch sử trạng thái</h2>
             <div class="mt-4 flow-root">
                <ul role="list" class="-mb-8">
                    <li v-for="(log, logIdx) in order.statusLogs" :key="log.id">
                        <div class="relative pb-8">
                            <span v-if="logIdx !== order.statusLogs.length - 1" class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            <div class="relative flex space-x-3">
                                <div>
                                    <span class="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                        <span class="material-symbols-outlined text-white">receipt_long</span>
                                    </span>
                                </div>
                                <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p class="text-sm text-gray-500">
                                            Đơn hàng đã chuyển sang trạng thái <span class="font-medium text-gray-900">{{ log.status }}</span>
                                        </p>
                                    </div>
                                    <div class="whitespace-nowrap text-right text-sm text-gray-500">
                                        <time :datetime="log.createdAt">{{ formatDate(log.createdAt) }}</time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
