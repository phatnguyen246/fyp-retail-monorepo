<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const canCloseWindow = ref(false)

const orderId = computed(() => {
  const value = route.query.orderId
  return typeof value === 'string' ? value : ''
})

const orderCode = computed(() => {
  const value = route.query.orderCode
  return typeof value === 'string' ? value : ''
})

function detectClosableWindow() {
  if (typeof window === 'undefined') {
    canCloseWindow.value = false
    return
  }

  canCloseWindow.value = window.opener !== null || window.history.length <= 1
}

function closeThisPage() {
  if (typeof window === 'undefined') {
    return
  }

  window.close()
}

onMounted(() => {
  detectClosableWindow()
})
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#ecfdf5_0%,#f8fafc_52%,#ffffff_100%)] px-4 py-12 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <section class="overflow-hidden rounded-[32px] border border-emerald-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div class="bg-[linear-gradient(135deg,#065f46_0%,#047857_55%,#10b981_100%)] px-6 py-8 text-white sm:px-8">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">Payment success</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight">Your payment was completed successfully</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
            VNPAY confirmed the transaction and your order has been updated. Close this page and return to your order detail tab.
          </p>
        </div>

        <div class="space-y-6 px-6 py-8 sm:px-8">
          <div class="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm leading-6 text-emerald-900">
            <span class="font-semibold">Close this page.</span>
            You can continue tracking the order from the storefront tab.
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Order ID</p>
              <p class="mt-2 break-all text-sm font-medium text-slate-950">{{ orderId || 'Not available' }}</p>
            </article>
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Order code</p>
              <p class="mt-2 break-all text-sm font-medium text-slate-950">{{ orderCode || 'Not available' }}</p>
            </article>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              v-if="canCloseWindow"
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              @click="closeThisPage"
            >
              Close this page
            </button>

            <RouterLink
              v-if="orderId"
              :to="{ name: 'order-detail', params: { orderId } }"
              class="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open order details
            </RouterLink>

            <RouterLink
              :to="{ name: 'catalog-products' }"
              class="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Continue shopping
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
