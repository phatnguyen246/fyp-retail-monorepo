<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { useOrderingStore } from '../store/ordering'
import { useAuthStore } from '../store/auth'
import { formatCurrency, formatDate, formatNumber } from '../services/formatters'

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
})

const orderingStore = useOrderingStore()
const authStore = useAuthStore()
const order = ref(null)
const loading = ref(true)
const isOpeningPayment = ref(false)
const isCancellingOrder = ref(false)

const isVnpayPending = computed(() => {
  return (
    order.value?.paymentMethod === 'vnpay' &&
    ['pending', 'failed', 'cancelled'].includes(order.value?.paymentStatus) &&
    order.value?.orderStatus !== 'cancelled'
  )
})

async function handlePayNow() {
  if (isOpeningPayment.value) return
  isOpeningPayment.value = true
  
  const result = await orderingStore.createVnPayUrl(props.orderId)
  if (result.success && result.paymentUrl) {
    window.open(result.paymentUrl, '_blank')
  } else {
    alert(result.error?.message || 'Unable to create the payment link. Please try again later.')
  }
  
  isOpeningPayment.value = false
}

const paymentMethodLabel = computed(() => {
  if (!order.value?.paymentMethod) {
    return 'Unknown'
  }

  return order.value.paymentMethod === 'vnpay' ? 'VNPAY' : 'Cash on delivery'
})

const canCancelOrder = computed(() => {
  return (
    authStore.isAuthenticated &&
    authStore.user?.role === 'customer' &&
    ['pending', 'confirmed'].includes(order.value?.orderStatus) &&
    !isCancellingOrder.value
  )
})

const shouldShowCancelOrderButton = computed(() => {
  return authStore.isAuthenticated && authStore.user?.role === 'customer' && Boolean(order.value?.id)
})

function formatTimelineActor(actor) {
  if (typeof actor !== 'string' || actor.trim().length === 0) {
    return 'system'
  }

  const normalizedActor = actor.trim().toLowerCase()

  if (normalizedActor.startsWith('admin:')) {
    return 'admin'
  }

  if (normalizedActor.startsWith('customer:')) {
    return 'customer'
  }

  return normalizedActor === 'guest' ? 'guest' : actor.trim()
}

function getOrderStatusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        className: 'detail-chip detail-chip--success',
      }
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'detail-chip detail-chip--info',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'detail-chip detail-chip--danger',
      }
    default:
      return {
        label: 'Pending',
        className: 'detail-chip detail-chip--warning',
      }
  }
}

function getPaymentStatusMeta(status) {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid',
        className: 'detail-chip detail-chip--success-soft',
      }
    case 'failed':
      return {
        label: 'Payment failed',
        className: 'detail-chip detail-chip--danger-soft',
      }
    case 'cancelled':
      return {
        label: 'Payment cancelled',
        className: 'detail-chip detail-chip--danger-soft',
      }
    default:
      return {
        label: 'Pending payment',
        className: 'detail-chip detail-chip--muted',
      }
  }
}

function getTimelineLabel(log) {
  if (!log?.toStatus) {
    return 'Status updated'
  }

  return `Order moved to status ${getOrderStatusMeta(log.toStatus).label.toLowerCase()}`
}

async function handleCancelOrder() {
  if (!canCancelOrder.value) {
    return
  }

  const shouldCancel = window.confirm('Are you sure you want to cancel this order?')
  if (!shouldCancel) {
    return
  }

  isCancellingOrder.value = true

  const result = await orderingStore.cancelOrder(props.orderId)
  if (result.success) {
    order.value = result.data
    alert('Order cancelled successfully.')
  } else {
    alert(result.error?.message || 'Unable to cancel the order. Please try again later.')
  }

  isCancellingOrder.value = false
}

onMounted(async () => {
  await authStore.initialize('auto')

  const { success, data } = await orderingStore.fetchOrder(props.orderId)
  if (success) {
    order.value = data
  }
  loading.value = false
})
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <CatalogTopNav />

      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[1440px]">
          <section
            v-if="loading"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <div class="space-y-4">
              <div class="cart-skeleton h-7 w-56 rounded-full"></div>
              <div class="cart-skeleton h-48 w-full rounded-[1.5rem]"></div>
              <div class="cart-skeleton h-48 w-full rounded-[1.5rem]"></div>
            </div>
          </section>

          <section
            v-else-if="!order"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-10"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
              Data not found
            </p>
            <h1 class="catalog-display-title mt-3 text-3xl">Order not found.</h1>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              This order may not belong to the current account, or the `orderId` in the route is no longer valid.
            </p>
            <div class="mt-8">
              <RouterLink class="catalog-primary-button inline-flex" :to="{ name: 'order-history' }">
                Back to order history
              </RouterLink>
            </div>
          </section>

          <div v-else class="space-y-6">
            <div>
              <RouterLink
                :to="{ name: 'order-history' }"
                class="catalog-reset-button inline-flex items-center justify-center"
              >
                Back to orders list
              </RouterLink>
            </div>

            <div class="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_25rem]">
            <section class="space-y-6">
              <header class="detail-hero">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                      Order details
                    </p>
                    <h1 class="catalog-display-title mt-2 text-4xl leading-tight lg:text-5xl">
                      {{ order.orderCode }}
                    </h1>
                    <p class="mt-4 text-sm leading-7 text-[var(--catalog-text-muted)]">
                      Placed at {{ formatDate(order.createdAt) }}. This page reflects backend data for the order,
                      payment status, and status timeline.
                    </p>
                  </div>

                  <div v-if="shouldShowCancelOrderButton" class="flex justify-start lg:justify-end">
                    <button
                      type="button"
                      class="catalog-reset-button inline-flex items-center justify-center"
                      :disabled="!canCancelOrder"
                      @click="handleCancelOrder"
                    >
                      {{
                        isCancellingOrder
                          ? 'Cancelling order...'
                          : canCancelOrder
                            ? 'Cancel order'
                            : 'Cannot cancel order'
                      }}
                    </button>
                  </div>
                </div>

                <div class="mt-8 border-t border-[var(--catalog-border-soft)] pt-6">
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Status history
                  </p>
                  <h2 class="catalog-display-title mt-2 text-3xl">Processing timeline</h2>

                  <ol class="mt-8 space-y-5">
                    <li
                      v-for="(log, index) in order.statusLogs"
                      :key="`${log.changedAt}-${index}`"
                      class="detail-timeline-item"
                    >
                      <div class="detail-timeline-marker">
                        <span class="material-symbols-outlined text-lg text-[var(--catalog-primary-deep)]">receipt_long</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p class="text-base font-semibold text-[var(--catalog-text)]">
                              {{ getTimelineLabel(log) }}
                            </p>
                            <p class="mt-1 text-sm text-[var(--catalog-text-muted)]">
                              Updated by {{ formatTimelineActor(log.changedBy) }}
                            </p>
                          </div>
                          <time class="text-sm text-[var(--catalog-text-soft)]" :datetime="log.changedAt">
                            {{ formatDate(log.changedAt) }}
                          </time>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              </header>

              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                      Products in this order
                    </p>
                    <h2 class="catalog-display-title mt-2 text-3xl">Order items</h2>
                  </div>
                  <div class="rounded-full bg-[var(--catalog-surface-muted)] px-4 py-2 text-sm text-[var(--catalog-text-muted)]">
                    {{ formatNumber(order.itemCount) }} products
                  </div>
                </div>

                <ul role="list" class="mt-8 space-y-4">
                  <li
                    v-for="item in order.items"
                    :key="item.variantId"
                    class="rounded-[1.6rem] border border-[var(--catalog-border-soft)] bg-[var(--catalog-surface-muted)] p-4 md:p-5"
                  >
                    <div class="flex flex-col gap-4 md:flex-row">
                      <div class="detail-item-media">
                        <img
                          v-if="item.thumbnailUrl"
                          :src="item.thumbnailUrl"
                          :alt="item.productName"
                          class="h-full w-full object-cover"
                        />
                        <span v-else class="material-symbols-outlined text-4xl text-[var(--catalog-text-soft)]">
                          inventory_2
                        </span>
                      </div>

                      <div class="min-w-0 flex-1">
                        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h3 class="text-xl font-semibold text-[var(--catalog-text)]">{{ item.productName }}</h3>
                            <p class="mt-2 text-sm text-[var(--catalog-text-muted)]">{{ item.variantLabel }}</p>
                            <p class="mt-2 text-sm text-[var(--catalog-text-muted)]">SKU {{ item.sku }}</p>
                          </div>

                          <div class="text-left lg:text-right">
                            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                              Line total
                            </p>
                            <p class="mt-2 text-xl font-semibold text-[var(--catalog-text)]">
                              {{ formatCurrency(item.lineTotal) }}
                            </p>
                          </div>
                        </div>

                        <dl class="mt-5 grid gap-3 sm:grid-cols-3">
                          <div class="detail-line-card">
                            <dt class="detail-line-label">Unit price</dt>
                            <dd class="detail-line-value">{{ formatCurrency(item.unitPrice) }}</dd>
                          </div>
                          <div class="detail-line-card">
                            <dt class="detail-line-label">Quantity</dt>
                            <dd class="detail-line-value">{{ formatNumber(item.quantity) }}</dd>
                          </div>
                          <div class="detail-line-card">
                            <dt class="detail-line-label">Variant</dt>
                            <dd class="detail-line-value">{{ item.variantLabel || 'No variant label' }}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </li>
                </ul>
              </section>

            </section>

            <aside class="space-y-6">
              <section 
                v-if="isVnpayPending"
                class="rounded-[2rem] border border-[var(--catalog-primary)] bg-white p-6 shadow-[0_20px_60px_rgba(139,117,0,0.08)]"
              >
                <div class="flex items-center gap-3">
                  <span class="material-symbols-outlined text-[var(--catalog-primary)]">payments</span>
                  <h2 class="text-xl font-bold text-[var(--catalog-text)]">Pay now</h2>
                </div>
                <p class="mt-3 text-sm leading-6 text-[var(--catalog-text-muted)]">
                  Your order is waiting for VNPAY payment. Please complete the transaction so we can confirm your order.
                </p>
                <button
                  type="button"
                  class="catalog-primary-button mt-6 flex w-full items-center justify-center gap-2"
                  :disabled="isOpeningPayment"
                  @click="handlePayNow"
                >
                  <span v-if="isOpeningPayment" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></span>
                  {{ isOpeningPayment ? 'Opening VNPAY...' : 'Continue payment' }}
                </button>
              </section>

              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Payment
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Payment information</h2>

                <dl class="mt-6 space-y-5">
                  <div>
                    <dt class="detail-side-label">Payment status</dt>
                    <dd class="mt-3">
                      <span :class="getPaymentStatusMeta(order.paymentStatus).className">
                        {{ getPaymentStatusMeta(order.paymentStatus).label }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Payment method</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ paymentMethodLabel }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Subtotal</dt>
                    <dd class="mt-2 text-sm leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.subtotal) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Discount</dt>
                    <dd class="mt-2 text-sm leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.discountTotal) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Shipping fee</dt>
                    <dd class="mt-2 text-sm leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.shippingFee) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Grand total</dt>
                    <dd class="mt-2 text-lg leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.grandTotal) }}</dd>
                  </div>
                </dl>
              </section>

              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Delivery + payment
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Operational info</h2>

                <dl class="mt-6 space-y-5">
                  <div>
                    <dt class="detail-side-label">Order code</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.orderCode }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Order time</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ formatDate(order.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Recipient</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.recipientName }}</dd>
                  </div>
                   <div>
                    <dt class="detail-side-label">Order email</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.email || 'N/A' }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Phone number</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.phoneNumber }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Shipping address</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.shippingAddressLine }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Order status</dt>
                    <dd class="mt-3">
                      <span :class="getOrderStatusMeta(order.orderStatus).className">
                        {{ getOrderStatusMeta(order.orderStatus).label }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Item count</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ formatNumber(order.itemCount) }}</dd>
                  </div>
                </dl>
              </section>
            </aside>
            </div>
          </div>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>

<style scoped>
.detail-hero {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 2rem;
  padding: 2rem;
  background:
    radial-gradient(circle at top right, rgba(139, 117, 0, 0.1), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(249, 246, 239, 0.96));
  box-shadow: 0 20px 60px rgba(26, 28, 28, 0.05);
}

.detail-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.detail-chip--success {
  background: rgba(34, 94, 56, 0.1);
  color: #225e38;
}

.detail-chip--success-soft {
  background: rgba(52, 211, 153, 0.12);
  color: #166534;
}

.detail-chip--info {
  background: rgba(139, 117, 0, 0.14);
  color: var(--catalog-primary-deep);
}

.detail-chip--warning {
  background: rgba(209, 152, 24, 0.14);
  color: #8a5a00;
}

.detail-chip--danger {
  background: rgba(186, 26, 26, 0.12);
  color: var(--catalog-danger);
}

.detail-chip--danger-soft {
  background: rgba(186, 26, 26, 0.08);
  color: var(--catalog-danger);
}

.detail-chip--muted {
  background: var(--catalog-surface-muted);
  color: var(--catalog-text-soft);
}

.detail-line-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.35rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 255, 255, 0.84);
}

.detail-line-label,
.detail-side-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.detail-line-value {
  margin-top: 0.65rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.6;
  color: var(--catalog-text);
}

.detail-item-media {
  display: flex;
  height: 7.5rem;
  width: 7.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.5rem;
  background: #fff;
}

.detail-timeline-item {
  display: flex;
  gap: 1rem;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.5rem;
  padding: 1rem 1.1rem;
  background: var(--catalog-surface-muted);
}

.detail-timeline-marker {
  display: flex;
  height: 2.75rem;
  width: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(139, 117, 0, 0.12);
  border: 1px solid rgba(139, 117, 0, 0.16);
}
</style>
