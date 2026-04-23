<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useOrderingStore } from '../store/ordering'

const VNPAY_CONTEXT_STORAGE_KEY = 'checkout:vnpay-context'

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
})

const router = useRouter()
const orderingStore = useOrderingStore()

const status = ref('Preparing payment')
const message = ref('Please wait a moment while we connect you to VNPAY.')
const isLoading = ref(true)
const paymentUrl = ref('')

function readStoredContext() {
  try {
    const raw = localStorage.getItem(VNPAY_CONTEXT_STORAGE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch (_error) {
    return null
  }
}

async function beginPayment() {
  isLoading.value = true
  status.value = 'Preparing payment'
  message.value = 'Please wait a moment while we connect you to VNPAY.'

  const result = await orderingStore.createVnPayUrl(props.orderId)

  if (!result.success || !result.paymentUrl) {
    isLoading.value = false
    status.value = 'Unable to open payment gateway'
    message.value =
      result.error?.message || 'Payment link is temporarily unavailable. You can retry or view order details.'
    paymentUrl.value = ''
    return
  }

  paymentUrl.value = result.paymentUrl
  status.value = 'Redirecting to VNPAY'
  message.value = 'If your browser does not open automatically, use the button below to continue payment.'
  window.location.href = result.paymentUrl
}

function openPaymentUrl() {
  if (!paymentUrl.value) {
    return
  }

  window.location.href = paymentUrl.value
}

async function goToOrderDetail() {
  await router.push({ name: 'order-detail', params: { orderId: props.orderId } })
}

onMounted(() => {
  const context = readStoredContext()
  if (context?.orderId && context.orderId !== props.orderId) {
    localStorage.setItem(
      VNPAY_CONTEXT_STORAGE_KEY,
      JSON.stringify({
        ...context,
        orderId: props.orderId,
      }),
    )
  }

  beginPayment()
})
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_52%,#ffffff_100%)] px-4 py-12 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-2xl">
      <section class="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div class="bg-[linear-gradient(135deg,#082f49_0%,#0f172a_58%,#164e63_100%)] px-6 py-8 text-white sm:px-8">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Payment VNPAY</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight">{{ status }}</h1>
          <p class="mt-3 text-sm leading-6 text-slate-200">{{ message }}</p>
        </div>

        <div class="space-y-6 px-6 py-8 sm:px-8">
          <div class="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
            <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Order</p>
            <p class="mt-2 break-all text-sm font-semibold text-slate-950">{{ props.orderId }}</p>
          </div>

          <div
            class="rounded-[24px] border px-5 py-5 text-sm leading-6"
            :class="isLoading ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700'"
          >
            {{ isLoading
              ? 'The system is creating a payment link for your order.'
              : 'If you were not redirected, click continue payment or return to order details.' }}
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              :disabled="!paymentUrl"
              @click="openPaymentUrl"
            >
              Continue payment
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="goToOrderDetail"
            >
              View order details
            </button>

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
