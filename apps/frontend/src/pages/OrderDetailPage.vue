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
    alert(result.error?.message || 'Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.')
  }
  
  isOpeningPayment.value = false
}

const paymentMethodLabel = computed(() => {
  if (!order.value?.paymentMethod) {
    return 'Chưa xác định'
  }

  return order.value.paymentMethod === 'vnpay' ? 'VNPAY' : 'Thanh toán khi nhận hàng'
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
    return 'hệ thống'
  }

  const normalizedActor = actor.trim().toLowerCase()

  if (normalizedActor.startsWith('admin:')) {
    return 'admin'
  }

  if (normalizedActor.startsWith('customer:')) {
    return 'khách hàng'
  }

  return normalizedActor === 'guest' ? 'khách' : actor.trim()
}

function getOrderStatusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Đã hoàn tất',
        className: 'detail-chip detail-chip--success',
      }
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        className: 'detail-chip detail-chip--info',
      }
    case 'cancelled':
      return {
        label: 'Đã hủy',
        className: 'detail-chip detail-chip--danger',
      }
    default:
      return {
        label: 'Đang chờ xử lý',
        className: 'detail-chip detail-chip--warning',
      }
  }
}

function getPaymentStatusMeta(status) {
  switch (status) {
    case 'paid':
      return {
        label: 'Đã thanh toán',
        className: 'detail-chip detail-chip--success-soft',
      }
    case 'failed':
      return {
        label: 'Thanh toán lỗi',
        className: 'detail-chip detail-chip--danger-soft',
      }
    case 'cancelled':
      return {
        label: 'Thanh toán đã hủy',
        className: 'detail-chip detail-chip--danger-soft',
      }
    default:
      return {
        label: 'Chờ thanh toán',
        className: 'detail-chip detail-chip--muted',
      }
  }
}

function getTimelineLabel(log) {
  if (!log?.toStatus) {
    return 'Đã cập nhật trạng thái'
  }

  return `Đơn hàng chuyển sang trạng thái ${getOrderStatusMeta(log.toStatus).label.toLowerCase()}`
}

async function handleCancelOrder() {
  if (!canCancelOrder.value) {
    return
  }

  const shouldCancel = window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')
  if (!shouldCancel) {
    return
  }

  isCancellingOrder.value = true

  const result = await orderingStore.cancelOrder(props.orderId)
  if (result.success) {
    order.value = result.data
    alert('Đơn hàng đã được hủy thành công.')
  } else {
    alert(result.error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại sau.')
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
              Không tìm thấy dữ liệu
            </p>
            <h1 class="catalog-display-title mt-3 text-3xl">Không tìm thấy đơn hàng.</h1>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Đơn hàng có thể không thuộc tài khoản hiện tại, hoặc mã `orderId` trên route không còn hợp lệ.
            </p>
            <div class="mt-8">
              <RouterLink class="catalog-primary-button inline-flex" :to="{ name: 'order-history' }">
                Quay lại lịch sử đơn hàng
              </RouterLink>
            </div>
          </section>

          <div v-else class="space-y-6">
            <div>
              <RouterLink
                :to="{ name: 'order-history' }"
                class="catalog-reset-button inline-flex items-center justify-center"
              >
                Quay lại danh sách đơn
              </RouterLink>
            </div>

            <div class="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_25rem]">
            <section class="space-y-6">
              <header class="detail-hero">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                      Chi tiết đơn hàng
                    </p>
                    <h1 class="catalog-display-title mt-2 text-4xl leading-tight lg:text-5xl">
                      {{ order.orderCode }}
                    </h1>
                    <p class="mt-4 text-sm leading-7 text-[var(--catalog-text-muted)]">
                      Đặt lúc {{ formatDate(order.createdAt) }}. Trang này phản ánh trực tiếp dữ liệu backend cho order,
                      payment status và timeline trạng thái.
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
                          ? 'Đang hủy đơn...'
                          : canCancelOrder
                            ? 'Hủy đơn hàng'
                            : 'Không thể hủy đơn'
                      }}
                    </button>
                  </div>
                </div>

                <div class="mt-8 border-t border-[var(--catalog-border-soft)] pt-6">
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Lịch sử trạng thái
                  </p>
                  <h2 class="catalog-display-title mt-2 text-3xl">Timeline xử lý</h2>

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
                              Cập nhật bởi {{ formatTimelineActor(log.changedBy) }}
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
                      Sản phẩm trong đơn
                    </p>
                    <h2 class="catalog-display-title mt-2 text-3xl">Order items</h2>
                  </div>
                  <div class="rounded-full bg-[var(--catalog-surface-muted)] px-4 py-2 text-sm text-[var(--catalog-text-muted)]">
                    {{ formatNumber(order.itemCount) }} sản phẩm
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
                              Thành tiền
                            </p>
                            <p class="mt-2 text-xl font-semibold text-[var(--catalog-text)]">
                              {{ formatCurrency(item.lineTotal) }}
                            </p>
                          </div>
                        </div>

                        <dl class="mt-5 grid gap-3 sm:grid-cols-3">
                          <div class="detail-line-card">
                            <dt class="detail-line-label">Đơn giá</dt>
                            <dd class="detail-line-value">{{ formatCurrency(item.unitPrice) }}</dd>
                          </div>
                          <div class="detail-line-card">
                            <dt class="detail-line-label">Số lượng</dt>
                            <dd class="detail-line-value">{{ formatNumber(item.quantity) }}</dd>
                          </div>
                          <div class="detail-line-card">
                            <dt class="detail-line-label">Biến thể</dt>
                            <dd class="detail-line-value">{{ item.variantLabel || 'Không có nhãn biến thể' }}</dd>
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
                  <h2 class="text-xl font-bold text-[var(--catalog-text)]">Thanh toán ngay</h2>
                </div>
                <p class="mt-3 text-sm leading-6 text-[var(--catalog-text-muted)]">
                  Đơn hàng của bạn đang chờ thanh toán qua VNPAY. Hãy hoàn tất giao dịch để chúng tôi có thể xác nhận đơn hàng sớm nhất.
                </p>
                <button
                  type="button"
                  class="catalog-primary-button mt-6 flex w-full items-center justify-center gap-2"
                  :disabled="isOpeningPayment"
                  @click="handlePayNow"
                >
                  <span v-if="isOpeningPayment" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></span>
                  {{ isOpeningPayment ? 'Đang mở VNPAY...' : 'Tiếp tục thanh toán' }}
                </button>
              </section>

              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Payment
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Thông tin thanh toán</h2>

                <dl class="mt-6 space-y-5">
                  <div>
                    <dt class="detail-side-label">Trạng thái thanh toán</dt>
                    <dd class="mt-3">
                      <span :class="getPaymentStatusMeta(order.paymentStatus).className">
                        {{ getPaymentStatusMeta(order.paymentStatus).label }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Phương thức thanh toán</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ paymentMethodLabel }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Tạm tính</dt>
                    <dd class="mt-2 text-sm leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.subtotal) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Giảm giá</dt>
                    <dd class="mt-2 text-sm leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.discountTotal) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Phí vận chuyển</dt>
                    <dd class="mt-2 text-sm leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.shippingFee) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Tổng cộng</dt>
                    <dd class="mt-2 text-lg leading-7 font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.grandTotal) }}</dd>
                  </div>
                </dl>
              </section>

              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Delivery + payment
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Thông tin vận hành</h2>

                <dl class="mt-6 space-y-5">
                  <div>
                    <dt class="detail-side-label">Mã đơn hàng</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.orderCode }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Thời gian đặt</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ formatDate(order.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Người nhận</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.recipientName }}</dd>
                  </div>
                   <div>
                    <dt class="detail-side-label">Email đặt hàng</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.email || 'Không có' }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Số điện thoại</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.phoneNumber }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Địa chỉ giao hàng</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.shippingAddressLine }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Trạng thái đơn hàng</dt>
                    <dd class="mt-3">
                      <span :class="getOrderStatusMeta(order.orderStatus).className">
                        {{ getOrderStatusMeta(order.orderStatus).label }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Số sản phẩm</dt>
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
