<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useOrderingStore } from '../store/ordering'

const VNPAY_CONTEXT_STORAGE_KEY = 'checkout:vnpay-context'

const route = useRoute()
const router = useRouter()
const orderingStore = useOrderingStore()

const pageState = ref('loading')
const heading = ref('Dang xac nhan thanh toan')
const message = ref('Vui long doi trong giay lat trong khi he thong cap nhat ket qua thanh toan cua ban.')
const orderId = ref(null)
const orderCode = ref(null)
const paymentResult = ref(null)

const hasOrderContext = computed(() => Boolean(orderId.value))

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

function applyOrderContext(context) {
  orderId.value = context?.orderId ?? null
  orderCode.value = context?.orderCode ?? null
}

function mergeOrderContext(context) {
  const nextOrderId = context?.orderId ?? orderId.value
  const nextOrderCode = context?.orderCode ?? orderCode.value

  orderId.value = nextOrderId
  orderCode.value = nextOrderCode

  if (!nextOrderId) {
    return
  }

  localStorage.setItem(
    VNPAY_CONTEXT_STORAGE_KEY,
    JSON.stringify({
      orderId: nextOrderId,
      orderCode: nextOrderCode ?? null,
      createdAt: new Date().toISOString(),
    }),
  )
}

function clearStoredContext() {
  localStorage.removeItem(VNPAY_CONTEXT_STORAGE_KEY)
}

async function redirectToOrderDetail(delay = 1600) {
  if (!orderId.value) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, delay))
  await router.replace({ name: 'order-detail', params: { orderId: orderId.value } })
}

async function refetchOrderStatusWithRetry(targetOrderId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await orderingStore.fetchOrder(targetOrderId)
    if (result.success && result.data) {
      const paymentStatus = result.data.paymentStatus

      if (paymentStatus === 'paid') {
        return { resolved: true, order: result.data }
      }

      if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
        return { resolved: true, order: result.data }
      }
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  return { resolved: false, order: null }
}

async function handleReturn() {
  const storedContext = readStoredContext()
  applyOrderContext(storedContext)

  const result = await orderingStore.handleVnpayReturn(route.query)

  if (!result.success) {
    pageState.value = 'error'
    heading.value = 'Khong the xu ly callback'
    message.value = result.error?.message || 'Da co loi khi kiem tra ket qua thanh toan. Vui long thu lai sau it phut.'
    return
  }

  paymentResult.value = result.data
  mergeOrderContext({
    orderId: result.data?.orderId ?? null,
    orderCode: result.data?.orderCode ?? null,
  })

  if (result.data?.code === '97') {
    pageState.value = 'invalid'
    heading.value = 'Callback khong hop le'
    message.value = 'Thong tin tra ve tu cong thanh toan khong hop le. Neu ban da bi tru tien, hay kiem tra lai don hang.'
    return
  }

  if (result.data?.success === true) {
    if (orderId.value) {
      const orderCheck = await refetchOrderStatusWithRetry(orderId.value)

      if (orderCheck.resolved && orderCheck.order?.paymentStatus === 'paid') {
        pageState.value = 'paid'
        heading.value = 'Thanh toan da duoc ghi nhan'
        message.value = 'Don hang cua ban da duoc cap nhat thanh cong. Ban co the mo chi tiet don hang de theo doi tiep.'
        clearStoredContext()
        await redirectToOrderDetail()
        return
      }
    }

    pageState.value = 'pending'
    heading.value = 'Da nhan ket qua thanh toan'
    message.value = 'He thong dang hoan tat cap nhat don hang. Neu can, ban co the kiem tra lai sau giay lat.'
    await redirectToOrderDetail()
    return
  }

  pageState.value = 'failed'
  heading.value = 'Thanh toan chua thanh cong'
  message.value =
    'Giao dich chua hoan tat. Ban co the mo chi tiet don hang de kiem tra va thu lai neu can.'
  await redirectToOrderDetail()
}

onMounted(() => {
  handleReturn()
})
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_52%,#ffffff_100%)] px-4 py-12 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <section class="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div class="bg-[linear-gradient(135deg,#082f49_0%,#0f172a_58%,#164e63_100%)] px-6 py-8 text-white sm:px-8">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Ket qua thanh toan</p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight">{{ heading }}</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{{ message }}</p>
        </div>

        <div class="space-y-6 px-6 py-8 sm:px-8">
          <div class="grid gap-4 sm:grid-cols-3">
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Trang thai page</p>
              <p class="mt-2 text-lg font-semibold text-slate-950">{{ pageState }}</p>
            </article>
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Order ID</p>
              <p class="mt-2 break-all text-sm font-medium text-slate-950">{{ orderId || 'Khong co context' }}</p>
            </article>
            <article class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Order code</p>
              <p class="mt-2 break-all text-sm font-medium text-slate-950">{{ orderCode || 'Khong co context' }}</p>
            </article>
          </div>

          <div
            class="rounded-[24px] border px-5 py-5 text-sm leading-6 text-slate-700"
            :class="
              pageState === 'paid'
                ? 'border-emerald-200 bg-emerald-50'
                : pageState === 'pending'
                  ? 'border-amber-200 bg-amber-50'
                  : pageState === 'failed' || pageState === 'invalid' || pageState === 'error'
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-slate-200 bg-slate-50'
            "
          >
            Chung toi khuyen ban mo chi tiet don hang de theo doi trang thai moi nhat va cac buoc tiep theo.
          </div>

          <div v-if="paymentResult" class="rounded-[24px] border border-slate-200 bg-white px-5 py-5">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Du lieu callback</p>
            <dl class="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-sm text-slate-500">Response code</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-950">{{ paymentResult.code || 'N/A' }}</dd>
              </div>
              <div>
                <dt class="text-sm text-slate-500">Transaction status</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-950">{{ paymentResult.transactionStatus || 'N/A' }}</dd>
              </div>
            </dl>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <RouterLink
              v-if="hasOrderContext"
              :to="{ name: 'order-detail', params: { orderId } }"
              class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Mo chi tiet don hang
            </RouterLink>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="handleReturn"
            >
              Kiem tra lai
            </button>

            <RouterLink
              :to="{ name: 'catalog-products' }"
              class="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Tiep tuc mua sam
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
