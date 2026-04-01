<script setup>
import { useCartStore } from '../store/cart'
import { onMounted } from 'vue'
import { formatCurrency } from '../services/formatters'
import { RouterLink } from 'vue-router'

const cartStore = useCartStore()

onMounted(() => {
  if (!cartStore.cart) {
    cartStore.fetchCart()
  }
})

function handleQuantityUpdate(variantId, quantity) {
  const newQuantity = Math.max(1, quantity);
  cartStore.updateItem({ variantId, quantity: newQuantity });
}
</script>

<template>
  <div class="bg-gray-50">
    <div class="mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-6 lg:max-w-7xl lg:px-8">
      <h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Giỏ hàng</h1>
      <div v-if="cartStore.loading && !cartStore.items.length" class="mt-12">
        <p>Đang tải giỏ hàng...</p>
      </div>
      <div v-else-if="!cartStore.items.length" class="mt-12">
        <p class="text-gray-500">Giỏ hàng của bạn đang trống.</p>
        <div class="mt-6">
          <RouterLink
            :to="{ name: 'catalog-products' }"
            class="text-base font-medium text-[var(--catalog-primary)] hover:text-[var(--catalog-primary-deep)]"
          >
            Tiếp tục mua sắm
            <span aria-hidden="true"> &rarr;</span>
          </RouterLink>
        </div>
      </div>
      <form v-else class="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
        <section aria-labelledby="cart-heading" class="lg:col-span-7">
          <h2 id="cart-heading" class="sr-only">Items in your shopping cart</h2>

          <ul role="list" class="divide-y divide-gray-200 border-b border-t border-gray-200">
            <li v-for="item in cartStore.items" :key="item.variantId" class="flex py-6 sm:py-10">
              <div class="flex-shrink-0">
                <img
                  :src="item.thumbnailUrl"
                  :alt="item.productName"
                  class="h-24 w-24 rounded-md object-cover object-center sm:h-48 sm:w-48"
                />
              </div>

              <div class="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                <div class="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                  <div>
                    <div class="flex justify-between">
                      <h3 class="text-sm">
                        <RouterLink :to="`/products/${item.productId}`" class="font-medium text-gray-700 hover:text-gray-800">{{ item.productName }}</RouterLink>
                      </h3>
                    </div>
                    <div class="mt-1 flex text-sm">
                      <p class="text-gray-500">{{ item.variantLabel }}</p>
                    </div>
                    <p class="mt-1 text-sm font-medium text-gray-900">{{ formatCurrency(item.unitPrice) }}</p>
                  </div>

                  <div class="mt-4 sm:mt-0 sm:pr-9">
                    <label :for="`quantity-${item.variantId}`" class="sr-only">Quantity, {{ item.productName }}</label>
                    <input
                      :id="`quantity-${item.variantId}`"
                      type="number"
                      class="max-w-[5rem] rounded-md border border-gray-300 py-1.5 text-left text-base font-medium leading-5 text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                      :value="item.quantity"
                      min="1"
                      @change="handleQuantityUpdate(item.variantId, $event.target.value)"
                    />
                    <div v-if="!item.isAvailable" class="mt-1 text-sm text-red-600">
                        {{ item.availabilityMessage }}
                    </div>
                  </div>

                  <div class="absolute right-0 top-0">
                    <button type="button" class="-m-2 inline-flex p-2 text-gray-400 hover:text-gray-500" @click="cartStore.removeItem(item.variantId)">
                      <span class="sr-only">Remove</span>
                      <span class="material-symbols-outlined h-5 w-5">close</span>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <!-- Order summary -->
        <section
          aria-labelledby="summary-heading"
          class="mt-16 rounded-lg bg-gray-100 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
        >
          <h2 id="summary-heading" class="text-lg font-medium text-gray-900">Tóm tắt đơn hàng</h2>

          <dl class="mt-6 space-y-4">
            <div class="flex items-center justify-between">
              <dt class="text-sm text-gray-600">Tổng tiền</dt>
              <dd class="text-sm font-medium text-gray-900">{{ formatCurrency(cartStore.summary.totalAmount) }}</dd>
            </div>
            <!-- Add other summary details like shipping, taxes if available -->
          </dl>

          <div class="mt-6">
            <RouterLink
              :to="{ name: 'checkout' }"
              class="w-full rounded-md border border-transparent bg-[var(--catalog-primary)] px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-[var(--catalog-primary-deep)] focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="{'opacity-50 cursor-not-allowed': cartStore.summary.selectedQuantity === 0}"
            >
              Tiến hành thanh toán
            </RouterLink>
          </div>
        </section>
      </form>
    </div>
  </div>
</template>
