<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { useOrderingStore } from '../store/ordering'
import { formatDate, formatCurrency, formatNumber } from '../services/formatters'

const orderingStore = useOrderingStore()
const orders = ref([])
const loading = ref(true)

const totalSpent = computed(() =>
  orders.value.reduce((total, order) => total + (Number(order?.grandTotal) || 0), 0),
)

function getOrderStatusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Đã hoàn tất',
        className: 'order-chip order-chip--success',
      }
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        className: 'order-chip order-chip--info',
      }
    case 'cancelled':
      return {
        label: 'Đã hủy',
        className: 'order-chip order-chip--danger',
      }
    default:
      return {
        label: 'Đang chờ xử lý',
        className: 'order-chip order-chip--warning',
      }
  }
}

function getPaymentStatusMeta(status) {
  switch (status) {
    case 'paid':
      return {
        label: 'Đã thanh toán',
        className: 'order-chip order-chip--success-soft',
      }
    case 'cancelled':
      return {
        label: 'Thanh toán đã hủy',
        className: 'order-chip order-chip--danger-soft',
      }
    case 'failed':
      return {
        label: 'Thanh toán lỗi',
        className: 'order-chip order-chip--danger-soft',
      }
    default:
      return {
        label: 'Chờ thanh toán',
        className: 'order-chip order-chip--muted',
      }
  }
}

onMounted(async () => {
  const { success, data } = await orderingStore.fetchOrders()
  if (success) {
    orders.value = data
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
          <header class="order-hero">
            <div class="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div class="max-w-3xl">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Storefront Orders
                </p>
                <h1 class="catalog-display-title mt-3 text-4xl leading-tight lg:text-5xl">
                  Lịch sử đơn hàng
                </h1>
                <p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--catalog-text-muted)] sm:text-base">
                  Theo dõi toàn bộ đơn bạn đã đặt, kiểm tra trạng thái xử lý và mở lại từng đơn để xem chi tiết sản
                  phẩm, thanh toán và lịch sử cập nhật.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <article class="order-stat-card">
                  <p class="order-stat-label">Tổng đơn</p>
                  <p class="order-stat-value">{{ formatNumber(orders.length) }}</p>
                  <p class="order-stat-note">Đồng bộ từ `GET /orders`</p>
                </article>
                <article class="order-stat-card order-stat-card--accent">
                  <p class="order-stat-label">Đang xử lý</p>
                  <p class="order-stat-value">
                    {{ formatNumber(orders.filter((order) => order.orderStatus === 'pending').length) }}
                  </p>
                  <p class="order-stat-note">Cần theo dõi thêm</p>
                </article>
                <article class="order-stat-card order-stat-card--warm">
                  <p class="order-stat-label">Tổng chi tiêu</p>
                  <p class="order-stat-value order-stat-value--compact">{{ formatCurrency(totalSpent) }}</p>
                  <p class="order-stat-note">Theo giá trị đơn đã tạo</p>
                </article>
              </div>
            </div>
          </header>

          <section
            v-if="loading"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <div class="space-y-4">
              <div class="cart-skeleton h-6 w-48 rounded-full"></div>
              <div class="cart-skeleton h-36 w-full rounded-[1.5rem]"></div>
              <div class="cart-skeleton h-36 w-full rounded-[1.5rem]"></div>
            </div>
          </section>

          <section
            v-else-if="orderingStore.error && !orders.length"
            class="rounded-[2rem] border border-[rgba(186,26,26,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-danger)]">
              Không thể tải đơn hàng
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-[var(--catalog-text)]">
              Không lấy được lịch sử đơn hàng hiện tại.
            </h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Frontend đang không nhận được order list từ backend. Hãy kiểm tra đăng nhập hoặc trạng thái API `GET /orders`.
            </p>
          </section>

          <section
            v-else-if="!orders.length"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-10"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
              Chưa có đơn nào
            </p>
            <h2 class="catalog-display-title mt-3 text-3xl">Bạn chưa phát sinh đơn hàng.</h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Khi hoàn tất checkout, các đơn mới sẽ xuất hiện tại đây để bạn theo dõi trạng thái và mở lại chi tiết.
            </p>
            <div class="mt-8">
              <RouterLink class="catalog-primary-button inline-flex" :to="{ name: 'catalog-products' }">
                Tiếp tục mua sắm
              </RouterLink>
            </div>
          </section>

          <section v-else class="space-y-6">
            <article
              v-for="order in orders"
              :key="order.id"
              class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8"
            >
              <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap gap-2">
                    <span :class="getOrderStatusMeta(order.orderStatus).className">
                      {{ getOrderStatusMeta(order.orderStatus).label }}
                    </span>
                    <span :class="getPaymentStatusMeta(order.paymentStatus).className">
                      {{ getPaymentStatusMeta(order.paymentStatus).label }}
                    </span>
                  </div>

                  <div class="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--catalog-text-soft)]">
                        Mã đơn
                      </p>
                      <h2 class="mt-2 text-3xl font-semibold leading-tight text-[var(--catalog-text)]">
                        {{ order.orderCode }}
                      </h2>
                      <p class="mt-3 text-sm text-[var(--catalog-text-muted)]">
                        Đặt lúc {{ formatDate(order.createdAt) }}
                      </p>
                    </div>

                    <RouterLink
                      :to="{ name: 'order-detail', params: { orderId: order.id } }"
                      class="catalog-primary-button inline-flex items-center justify-center"
                    >
                      Xem chi tiết
                    </RouterLink>
                  </div>

                  <dl class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div class="order-meta-card">
                      <dt class="order-meta-label">Người nhận</dt>
                      <dd class="order-meta-value">{{ order.recipientName }}</dd>
                    </div>
                    <div class="order-meta-card">
                      <dt class="order-meta-label">Tổng tiền</dt>
                      <dd class="order-meta-value">{{ formatCurrency(order.grandTotal) }}</dd>
                    </div>
                    <div class="order-meta-card">
                      <dt class="order-meta-label">Số dòng hàng</dt>
                      <dd class="order-meta-value">{{ formatNumber(order.itemCount) }}</dd>
                    </div>
                    <div class="order-meta-card">
                      <dt class="order-meta-label">Thanh toán</dt>
                      <dd class="order-meta-value uppercase">{{ order.paymentMethod }}</dd>
                    </div>
                    <div class="order-meta-card">
                      <dt class="order-meta-label">Giao tới</dt>
                      <dd class="order-meta-value order-meta-value--address">{{ order.shippingAddressLine }}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div class="mt-8 grid gap-4 lg:grid-cols-3">
                <div class="order-summary-card">
                  <p class="order-summary-label">Phone nhận hàng</p>
                  <p class="order-summary-value">{{ order.phoneNumber }}</p>
                </div>
                <div class="order-summary-card">
                  <p class="order-summary-label">Cập nhật gần nhất</p>
                  <p class="order-summary-value">{{ formatDate(order.updatedAt) }}</p>
                </div>
                <div class="order-summary-card">
                  <p class="order-summary-label">Phạm vi đơn</p>
                  <p class="order-summary-value">
                    {{ order.itemCount > 1 ? `${formatNumber(order.itemCount)} sản phẩm` : '1 sản phẩm' }}
                  </p>
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>

<style scoped>
.order-hero {
  margin-bottom: 2rem;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 2rem;
  padding: 2rem;
  background:
    radial-gradient(circle at top right, rgba(139, 117, 0, 0.1), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(249, 246, 239, 0.96));
  box-shadow: 0 20px 60px rgba(26, 28, 28, 0.05);
}

.order-stat-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.5rem;
  padding: 1.1rem 1.15rem;
  background: rgba(255, 255, 255, 0.9);
}

.order-stat-card--accent {
  background: rgba(255, 249, 235, 0.84);
  border-color: rgba(139, 117, 0, 0.16);
}

.order-stat-card--warm {
  background: rgba(244, 237, 216, 0.82);
  border-color: rgba(139, 117, 0, 0.22);
}

.order-stat-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.order-stat-value {
  margin-top: 0.7rem;
  font-size: 2rem;
  line-height: 1;
  font-weight: 700;
  color: var(--catalog-text);
}

.order-stat-value--compact {
  font-size: 1.45rem;
  line-height: 1.2;
}

.order-stat-note {
  margin-top: 0.45rem;
  font-size: 0.9rem;
  color: var(--catalog-text-muted);
}

.order-chip {
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

.order-chip--success {
  background: rgba(34, 94, 56, 0.1);
  color: #225e38;
}

.order-chip--success-soft {
  background: rgba(52, 211, 153, 0.12);
  color: #166534;
}

.order-chip--info {
  background: rgba(139, 117, 0, 0.14);
  color: var(--catalog-primary-deep);
}

.order-chip--warning {
  background: rgba(209, 152, 24, 0.14);
  color: #8a5a00;
}

.order-chip--danger {
  background: rgba(186, 26, 26, 0.12);
  color: var(--catalog-danger);
}

.order-chip--danger-soft {
  background: rgba(186, 26, 26, 0.08);
  color: var(--catalog-danger);
}

.order-chip--muted {
  background: var(--catalog-surface-muted);
  color: var(--catalog-text-soft);
}

.order-meta-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.4rem;
  padding: 1rem 1.1rem;
  background: var(--catalog-surface-muted);
}

.order-meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.order-meta-value {
  margin-top: 0.7rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--catalog-text);
}

.order-meta-value--address {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.order-summary-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.4rem;
  padding: 1rem 1.1rem;
  background: var(--catalog-surface-muted);
}

.order-summary-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.order-summary-value {
  margin-top: 0.7rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--catalog-text);
}
</style>
