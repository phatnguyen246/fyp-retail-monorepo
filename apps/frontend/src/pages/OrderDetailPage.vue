<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { useOrderingStore } from '../store/ordering'
import { formatCurrency, formatDate, formatNumber } from '../services/formatters'

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },
})

const orderingStore = useOrderingStore()
const order = ref(null)
const loading = ref(true)

const paymentMethodLabel = computed(() => {
  if (!order.value?.paymentMethod) {
    return 'Chưa xác định'
  }

  return order.value.paymentMethod === 'vnpay' ? 'VNPAY' : 'Thanh toán khi nhận hàng'
})

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

onMounted(async () => {
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

          <div v-else class="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_25rem]">
            <section class="space-y-6">
              <header class="detail-hero">
                <div class="flex flex-wrap gap-2">
                  <span :class="getOrderStatusMeta(order.orderStatus).className">
                    {{ getOrderStatusMeta(order.orderStatus).label }}
                  </span>
                  <span :class="getPaymentStatusMeta(order.paymentStatus).className">
                    {{ getPaymentStatusMeta(order.paymentStatus).label }}
                  </span>
                </div>

                <div class="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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

                  <RouterLink
                    :to="{ name: 'order-history' }"
                    class="catalog-reset-button inline-flex items-center justify-center"
                  >
                    Quay lại danh sách đơn
                  </RouterLink>
                </div>

                <dl class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div class="detail-meta-card">
                    <dt class="detail-meta-label">Tổng tiền</dt>
                    <dd class="detail-meta-value">{{ formatCurrency(order.grandTotal) }}</dd>
                  </div>
                  <div class="detail-meta-card">
                    <dt class="detail-meta-label">Số sản phẩm</dt>
                    <dd class="detail-meta-value">{{ formatNumber(order.itemCount) }}</dd>
                  </div>
                  <div class="detail-meta-card">
                    <dt class="detail-meta-label">Phương thức</dt>
                    <dd class="detail-meta-value">{{ paymentMethodLabel }}</dd>
                  </div>
                  <div class="detail-meta-card">
                    <dt class="detail-meta-label">Người nhận</dt>
                    <dd class="detail-meta-value">{{ order.recipientName }}</dd>
                  </div>
                  <div class="detail-meta-card">
                    <dt class="detail-meta-label">Số điện thoại</dt>
                    <dd class="detail-meta-value">{{ order.phoneNumber }}</dd>
                  </div>
                </dl>
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

              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8">
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
                            Cập nhật bởi {{ log.changedBy || 'hệ thống' }}
                          </p>
                        </div>
                        <time class="text-sm text-[var(--catalog-text-soft)]" :datetime="log.changedAt">
                          {{ formatDate(log.changedAt) }}
                        </time>
                      </div>
                    </div>
                  </li>
                </ol>
              </section>
            </section>

            <aside class="space-y-6">
              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Delivery + payment
                </p>
                <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Thông tin vận hành</h2>

                <dl class="mt-6 space-y-5">
                  <div>
                    <dt class="detail-side-label">Người nhận</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.recipientName }}</dd>
                  </div>
                  <div>
                    <dt class="detail-side-label">Địa chỉ giao hàng</dt>
                    <dd class="mt-2 text-sm leading-7 text-[var(--catalog-text)]">{{ order.shippingAddressLine }}</dd>
                  </div>
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
                </dl>
              </section>

              <section class="rounded-[2rem] border border-[rgba(139,117,0,0.18)] bg-[linear-gradient(135deg,rgba(255,249,235,0.9),rgba(244,237,216,0.88))] p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-primary-deep)]">
                  Tóm tắt tài chính
                </p>

                <dl class="mt-5 space-y-4 text-sm">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Tạm tính</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.subtotal) }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Giảm giá</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.discountTotal) }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Phí vận chuyển</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.shippingFee) }}</dd>
                  </div>
                  <div class="border-t border-[rgba(139,117,0,0.14)] pt-4">
                    <div class="flex items-center justify-between gap-4">
                      <dt class="text-base font-semibold text-[var(--catalog-text)]">Tổng cộng</dt>
                      <dd class="text-xl font-semibold text-[var(--catalog-text)]">{{ formatCurrency(order.grandTotal) }}</dd>
                    </div>
                  </div>
                </dl>
              </section>
            </aside>
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

.detail-meta-card,
.detail-line-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.35rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 255, 255, 0.84);
}

.detail-meta-label,
.detail-line-label,
.detail-side-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.detail-meta-value,
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
