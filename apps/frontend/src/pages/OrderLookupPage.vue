<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { useOrderingStore } from '../store/ordering'
import { formatCurrency, formatDate, formatNumber } from '../services/formatters'

const router = useRouter()
const orderingStore = useOrderingStore()
const lookupForm = reactive({
  orderCode: '',
})
const fieldErrors = ref({})
const submitMessage = ref('')
const submitTone = ref('error')
const result = ref(null)

function resetFeedback() {
  fieldErrors.value = {}
  submitMessage.value = ''
  submitTone.value = 'error'
}

function validateForm() {
  const nextFieldErrors = {}

  if (!lookupForm.orderCode.trim()) {
    nextFieldErrors.orderCode = 'Nhập mã đơn hàng.'
  }

  fieldErrors.value = nextFieldErrors
  return Object.keys(nextFieldErrors).length === 0
}

function mapLookupError(error) {
  if (error?.status === 404) {
    return 'Không tìm thấy đơn phù hợp với mã đơn này.'
  }

  if (Array.isArray(error?.meta?.issues) && error.meta.issues.length > 0) {
    const nextFieldErrors = {}

    for (const issue of error.meta.issues) {
      const fieldName = Array.isArray(issue?.path) ? issue.path[0] : null

      if (fieldName === 'orderCode') {
        nextFieldErrors.orderCode = issue.message
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      fieldErrors.value = {
        ...fieldErrors.value,
        ...nextFieldErrors,
      }
    }
  }

  return error?.message || 'Không thể tra cứu đơn hàng lúc này.'
}

async function handleLookup() {
  resetFeedback()
  result.value = null

  if (!validateForm()) {
    return
  }

  const payload = {
    orderCode: lookupForm.orderCode.trim(),
  }

  const { success, data, error } = await orderingStore.lookupGuestOrder(payload)

  if (!success) {
    submitTone.value = 'error'
    submitMessage.value = mapLookupError(error)
    return
  }

  result.value = data
  submitTone.value = 'success'
  submitMessage.value = 'Đã tìm thấy đơn hàng. Bạn có thể mở ngay trang chi tiết hoặc kiểm tra nhanh bên dưới.'
}

async function openOrderDetail() {
  if (!result.value?.id) {
    return
  }

  await router.push({ name: 'order-detail', params: { orderId: result.value.id } })
}

function getOrderStatusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Đã hoàn tất',
        className: 'lookup-chip lookup-chip--success',
      }
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        className: 'lookup-chip lookup-chip--info',
      }
    case 'cancelled':
      return {
        label: 'Đã hủy',
        className: 'lookup-chip lookup-chip--danger',
      }
    default:
      return {
        label: 'Đang chờ xử lý',
        className: 'lookup-chip lookup-chip--warning',
      }
  }
}

function getPaymentStatusMeta(status) {
  switch (status) {
    case 'paid':
      return {
        label: 'Đã thanh toán',
        className: 'lookup-chip lookup-chip--success-soft',
      }
    case 'failed':
      return {
        label: 'Thanh toán lỗi',
        className: 'lookup-chip lookup-chip--danger-soft',
      }
    case 'cancelled':
      return {
        label: 'Thanh toán đã hủy',
        className: 'lookup-chip lookup-chip--danger-soft',
      }
    default:
      return {
        label: 'Chờ thanh toán',
        className: 'lookup-chip lookup-chip--muted',
      }
  }
}
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <CatalogTopNav />

      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[900px] space-y-6">
          <div class="flex justify-end">
            <RouterLink
              class="catalog-reset-button inline-flex items-center justify-center"
              :to="{ name: 'catalog-products' }"
            >
              Quay lại catalog
            </RouterLink>
          </div>

          <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                Guest order lookup
              </p>
              <h1 class="catalog-display-title mt-2 text-4xl leading-tight">
                Tra cứu đơn hàng guest
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--catalog-text-muted)]">
                Nhập mã định danh backend đã cấp sau khi checkout để mở lại chi tiết đơn hàng.
              </p>
            </div>

            <form class="mt-8 grid gap-5" @submit.prevent="handleLookup">
              <label class="flex flex-col gap-3">
                <span class="block text-sm font-medium text-[var(--catalog-text)]">Order code</span>
                <input
                  v-model="lookupForm.orderCode"
                  type="text"
                  autocomplete="off"
                  placeholder="Ví dụ: ORD-20260402-123456"
                  class="lookup-input"
                  :class="{ 'lookup-input--error': fieldErrors.orderCode }"
                />
                <span v-if="fieldErrors.orderCode" class="text-sm text-[var(--catalog-danger)]">
                  {{ fieldErrors.orderCode }}
                </span>
              </label>

              <div
                v-if="submitMessage"
                class="rounded-[1.5rem] px-4 py-4 text-sm leading-6"
                :class="
                  submitTone === 'success'
                    ? 'bg-[rgba(34,94,56,0.08)] text-[#225e38]'
                    : 'bg-[rgba(186,26,26,0.08)] text-[var(--catalog-danger)]'
                "
              >
                {{ submitMessage }}
              </div>

              <div class="flex flex-wrap gap-3">
                <button
                  type="submit"
                  class="catalog-primary-button inline-flex items-center justify-center"
                  :disabled="orderingStore.loading"
                >
                  {{ orderingStore.loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng' }}
                </button>
                <button
                  type="button"
                  class="catalog-reset-button inline-flex items-center justify-center"
                  @click="lookupForm.orderCode = ''; result = null; resetFeedback()"
                >
                  Xóa dữ liệu
                </button>
              </div>
            </form>
          </section>

          <section
            v-if="result"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8"
          >
            <div class="flex flex-wrap gap-2">
              <span :class="getOrderStatusMeta(result.orderStatus).className">
                {{ getOrderStatusMeta(result.orderStatus).label }}
              </span>
              <span :class="getPaymentStatusMeta(result.paymentStatus).className">
                {{ getPaymentStatusMeta(result.paymentStatus).label }}
              </span>
            </div>

            <div class="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Kết quả tra cứu
                </p>
                <h2 class="catalog-display-title mt-2 text-3xl">{{ result.orderCode }}</h2>
                <p class="mt-3 text-sm text-[var(--catalog-text-muted)]">
                  Đặt lúc {{ formatDate(result.createdAt) }}
                </p>
              </div>

              <button
                type="button"
                class="catalog-primary-button inline-flex items-center justify-center"
                @click="openOrderDetail"
              >
                Mở chi tiết đơn
              </button>
            </div>

            <dl class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div class="lookup-meta-card">
                <dt class="lookup-meta-label">Người nhận</dt>
                <dd class="lookup-meta-value">{{ result.recipientName }}</dd>
              </div>
              <div class="lookup-meta-card">
                <dt class="lookup-meta-label">Tổng tiền</dt>
                <dd class="lookup-meta-value">{{ formatCurrency(result.grandTotal) }}</dd>
              </div>
              <div class="lookup-meta-card">
                <dt class="lookup-meta-label">Số sản phẩm</dt>
                <dd class="lookup-meta-value">{{ formatNumber(result.itemCount) }}</dd>
              </div>
              <div class="lookup-meta-card">
                <dt class="lookup-meta-label">Thanh toán</dt>
                <dd class="lookup-meta-value uppercase">{{ result.paymentMethod }}</dd>
              </div>
              <div class="lookup-meta-card">
                <dt class="lookup-meta-label">Giao tới</dt>
                <dd class="lookup-meta-value lookup-meta-value--address">{{ result.shippingAddressLine }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>

<style scoped>
.lookup-stat-label,
.lookup-meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.lookup-input {
  width: 100%;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.25rem;
  background: var(--catalog-surface-muted);
  padding: 0.95rem 1rem;
  color: var(--catalog-text);
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}

.lookup-input:focus {
  outline: none;
  border-color: rgba(139, 117, 0, 0.42);
  box-shadow: 0 0 0 4px rgba(139, 117, 0, 0.08);
  background: #fff;
}

.lookup-input--error {
  border-color: rgba(186, 26, 26, 0.24);
}

.lookup-chip {
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

.lookup-chip--success {
  background: rgba(34, 94, 56, 0.1);
  color: #225e38;
}

.lookup-chip--success-soft {
  background: rgba(52, 211, 153, 0.12);
  color: #166534;
}

.lookup-chip--info {
  background: rgba(139, 117, 0, 0.14);
  color: var(--catalog-primary-deep);
}

.lookup-chip--warning {
  background: rgba(209, 152, 24, 0.14);
  color: #8a5a00;
}

.lookup-chip--danger,
.lookup-chip--danger-soft {
  background: rgba(186, 26, 26, 0.1);
  color: var(--catalog-danger);
}

.lookup-chip--muted {
  background: var(--catalog-surface-muted);
  color: var(--catalog-text-soft);
}

.lookup-meta-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.35rem;
  padding: 1rem 1.1rem;
  background: var(--catalog-surface-muted);
}

.lookup-meta-value {
  margin-top: 0.65rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.6;
  color: var(--catalog-text);
}

.lookup-meta-value--address {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
