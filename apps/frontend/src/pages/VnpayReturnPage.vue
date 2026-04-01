<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderingStore } from '../store/ordering'

const route = useRoute()
const router = useRouter()
const orderingStore = useOrderingStore()
const status = ref('Đang xử lý...')
const message = ref('Vui lòng đợi trong khi chúng tôi xác nhận thanh toán của bạn.')
const orderId = ref(route.query.vnp_TxnRef)

onMounted(async () => {
  const { success, order } = await orderingStore.createOrder(orderDetails)

  if (success) {
    if (order.paymentMethod === 'vnpay') {
      const { success: vnPaySuccess, paymentUrl } = await orderingStore.createVnPayUrl(order.id)
      if (vnPaySuccess) {
        window.location.href = paymentUrl
      }
      // Handle VNPAY URL creation failure later
    } else {
      await router.push({ name: 'order-detail', params: { orderId: order.id } })
    }
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
      <h1 class="text-2xl font-bold text-gray-900">{{ status }}</h1>
      <p class="mt-4 text-gray-600">{{ message }}</p>
      <div v-if="orderId" class="mt-6">
        <RouterLink
          :to="{ name: 'order-detail', params: { orderId } }"
          class="text-base font-medium text-[var(--catalog-primary)] hover:text-[var(--catalog-primary-deep)]"
        >
          Xem chi tiết đơn hàng
        </RouterLink>
      </div>
    </div>
  </div>
</template>
