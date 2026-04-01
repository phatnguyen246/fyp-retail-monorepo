<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../store/cart'
import { useOrderingStore } from '../store/ordering'
import { useAuthStore } from '../store/auth'
import { formatCurrency } from '../services/formatters'

const cartStore = useCartStore()
const orderingStore = useOrderingStore()
const authStore = useAuthStore()
const router = useRouter()

const shippingInfo = ref({
  phoneNumber: '',
  shippingAddressLine: '',
})
const paymentMethod = ref('cod') // 'cod' or 'vnpay'

const selectedItems = computed(() => cartStore.items.filter(item => item.selected))
const cartVariantIds = computed(() => selectedItems.value.map(item => item.variantId))

async function handlePlaceOrder() {
  const orderDetails = {
    ...shippingInfo.value,
    paymentMethod: paymentMethod.value,
    cartVariantIds: cartVariantIds.value,
  }

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
}
</script>

<template>
  <div class="bg-gray-50">
    <main class="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl lg:max-w-none">
        <h1 class="sr-only">Checkout</h1>

        <form @submit.prevent="handlePlaceOrder" class="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
          <div>
            <div>
              <h2 class="text-lg font-medium text-gray-900">Thông tin giao hàng</h2>

              <div class="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div class="sm:col-span-2">
                  <label for="phone-number" class="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <div class="mt-1">
                    <input type="text" id="phone-number" v-model="shippingInfo.phoneNumber" required class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>

                <div class="sm:col-span-2">
                  <label for="address" class="block text-sm font-medium text-gray-700">Địa chỉ</label>
                  <div class="mt-1">
                    <input type="text" id="address" v-model="shippingInfo.shippingAddressLine" required class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-10 border-t border-gray-200 pt-10">
              <h2 class="text-lg font-medium text-gray-900">Phương thức thanh toán</h2>

              <fieldset class="mt-4">
                <legend class="sr-only">Payment type</legend>
                <div class="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
                  <div class="flex items-center">
                    <input id="cod" type="radio" v-model="paymentMethod" value="cod" checked class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label for="cod" class="ml-3 block text-sm font-medium text-gray-700">Thanh toán khi nhận hàng (COD)</label>
                  </div>
                  <div class="flex items-center">
                    <input id="vnpay" type="radio" v-model="paymentMethod" value="vnpay" class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label for="vnpay" class="ml-3 block text-sm font-medium text-gray-700">VNPAY</label>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          <!-- Order summary -->
          <div class="mt-10 lg:mt-0">
            <h2 class="text-lg font-medium text-gray-900">Tóm tắt đơn hàng</h2>

            <div class="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
              <h3 class="sr-only">Items in your cart</h3>
              <ul role="list" class="divide-y divide-gray-200">
                <li v-for="item in selectedItems" :key="item.variantId" class="flex px-4 py-6 sm:px-6">
                  <div class="flex-shrink-0">
                    <img :src="item.thumbnailUrl" class="w-20 rounded-md" />
                  </div>

                  <div class="ml-6 flex flex-1 flex-col">
                    <div class="flex">
                      <div class="min-w-0 flex-1">
                        <h4 class="text-sm">
                          <a :href="`/products/${item.productId}`" class="font-medium text-gray-700 hover:text-gray-800">{{ item.productName }}</a>
                        </h4>
                        <p class="mt-1 text-sm text-gray-500">{{ item.variantLabel }}</p>
                        <p class="mt-1 text-sm text-gray-500">Số lượng: {{ item.quantity }}</p>
                      </div>
                    </div>
                  </div>
                  <p class="flex-shrink-0 text-sm font-medium text-gray-900">{{ formatCurrency(item.lineTotal) }}</p>
                </li>
              </ul>
              <dl class="space-y-6 border-t border-gray-200 px-4 py-6 sm:px-6">
                <div class="flex items-center justify-between">
                  <dt class="text-sm">Tổng tiền</dt>
                  <dd class="text-sm font-medium text-gray-900">{{ formatCurrency(cartStore.summary.totalAmount) }}</dd>
                </div>
              </dl>

              <div class="border-t border-gray-200 px-4 py-6 sm:px-6">
                <button type="submit" class="w-full rounded-md border border-transparent bg-[var(--catalog-primary)] px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-[var(--catalog-primary-deep)] focus:outline-none focus:ring-2 focus:ring-offset-2">
                  <span v-if="orderingStore.loading">Đang xử lý...</span>
                  <span v-else>Đặt hàng</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
