<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const orderId = computed(() => route.params.orderId)
const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionTone = ref('success')
const actionBusy = ref(false)
const order = ref(null)

const workflowSteps = [
  {
    key: 'pending',
    title: 'Pending',
    note: 'Đơn vừa tạo và đang chờ xác nhận.',
  },
  {
    key: 'confirmed',
    title: 'Confirmed',
    note: 'Đơn đã được duyệt và đủ điều kiện xử lý tiếp.',
  },
  {
    key: 'completed',
    title: 'Completed',
    note: 'Đơn đã hoàn tất theo state machine hiện tại.',
  },
]

const canConfirm = computed(() => order.value?.orderStatus === 'pending')
const canComplete = computed(() => order.value?.orderStatus === 'confirmed')
const canCancel = computed(() => ['pending', 'confirmed'].includes(order.value?.orderStatus))
const canReconcileVnpay = computed(
  () => order.value?.paymentMethod === 'vnpay' && order.value?.paymentStatus === 'pending',
)

const paymentTone = computed(() => {
  if (order.value?.paymentStatus === 'paid') {
    return 'success'
  }

  if (order.value?.paymentStatus === 'pending') {
    return 'warning'
  }

  if (order.value?.paymentStatus === 'cancelled') {
    return 'danger'
  }

  return 'muted'
})

function setActionMessage(message, tone = 'success') {
  actionMessage.value = message
  actionTone.value = tone
}

function workflowStepState(stepKey) {
  const status = order.value?.orderStatus
  const currentIndex = workflowSteps.findIndex((step) => step.key === status)
  const stepIndex = workflowSteps.findIndex((step) => step.key === stepKey)

  if (status === 'cancelled') {
    return 'cancelled'
  }

  if (stepIndex < currentIndex) {
    return 'done'
  }

  if (stepIndex === currentIndex) {
    return 'active'
  }

  return 'upcoming'
}

async function loadOrderDetail() {
  loading.value = true
  errorMessage.value = ''

  const result = await adminStore.fetchOrderDetail(orderId.value)

  if (result.success) {
    order.value = result.data
  } else {
    errorMessage.value = result.error
  }

  loading.value = false
}

async function applyStatus(orderStatus) {
  actionBusy.value = true

  const result = await adminStore.updateOrderStatus(orderId.value, orderStatus)

  if (result.success) {
    order.value = result.data
    setActionMessage(`Đã chuyển order sang trạng thái \`${orderStatus}\`.`, 'success')
  } else {
    setActionMessage(result.error, 'danger')
  }

  actionBusy.value = false
}

async function cancelOrder() {
  if (!window.confirm('Hủy đơn hàng này? Backend sẽ restock nếu nghiệp vụ cho phép.')) {
    return
  }

  actionBusy.value = true

  const result = await adminStore.cancelOrder(orderId.value)

  if (result.success) {
    order.value = result.data
    setActionMessage('Đã hủy đơn hàng theo luồng admin.', 'warning')
  } else {
    setActionMessage(result.error, 'danger')
  }

  actionBusy.value = false
}

async function reconcileVnpay() {
  actionBusy.value = true

  const result = await adminStore.reconcileVnpayPayment(orderId.value)

  if (result.success) {
    setActionMessage(
      result.data.status === 'paid'
        ? 'Đã reconcile VNPAY thành công và cập nhật trạng thái thanh toán.'
        : result.data.status === 'noop'
          ? 'Payment không còn ở trạng thái cần reconcile.'
          : 'Đã gửi yêu cầu reconcile tới VNPAY.',
      result.data.status === 'paid' ? 'success' : 'warning',
    )
    await loadOrderDetail()
  } else {
    setActionMessage(result.error, 'danger')
  }

  actionBusy.value = false
}

onMounted(() => {
  loadOrderDetail()
})
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Order Detail</p>
        <h1 class="admin-page-title">{{ order?.orderCode || 'Chi tiết đơn hàng' }}</h1>
        <p class="admin-page-subtitle">
          Trang detail tập trung vào workflow đơn hàng, thông tin khách, payment state và status log để thao tác nghiệp vụ không bị mơ hồ.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="router.back()">
          Quay lại
        </button>
        <button type="button" class="admin-button admin-button-secondary" @click="loadOrderDetail">
          Tải lại hồ sơ
        </button>
      </div>
    </header>

    <div
      v-if="actionMessage"
      class="admin-alert"
      :class="{
        'admin-alert-success': actionTone === 'success',
        'admin-alert-warning': actionTone === 'warning',
        'admin-alert-danger': actionTone === 'danger',
      }"
    >
      {{ actionMessage }}
    </div>

    <div v-if="errorMessage" class="admin-alert admin-alert-danger">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="admin-empty-state">Đang tải hồ sơ đơn hàng...</div>

    <template v-else-if="order">
      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">State Machine</p>
            <h2 class="admin-card-title">Workflow xử lý đơn</h2>
          </div>

          <div class="admin-status-stack">
            <span class="admin-status-pill" :data-tone="order.orderStatus">
              {{ order.orderStatus }}
            </span>
            <span class="admin-status-pill" :data-tone="paymentTone">
              {{ order.paymentStatus || 'N/A' }}
            </span>
          </div>
        </div>

        <div class="admin-workflow-strip">
          <article
            v-for="step in workflowSteps"
            :key="step.key"
            class="admin-workflow-step"
            :class="{
              'admin-workflow-step-done': workflowStepState(step.key) === 'done',
              'admin-workflow-step-active': workflowStepState(step.key) === 'active',
              'admin-workflow-step-cancelled': workflowStepState(step.key) === 'cancelled',
            }"
          >
            <span class="admin-workflow-node">{{ step.title.slice(0, 1) }}</span>
            <div class="admin-workflow-body">
              <strong class="admin-workflow-title">{{ step.title }}</strong>
              <span class="admin-workflow-note">{{ step.note }}</span>
            </div>
          </article>
        </div>

        <div v-if="order.orderStatus === 'cancelled'" class="admin-note-block">
          <p>Đơn hàng đã chuyển sang nhánh kết thúc `cancelled` và không còn tiếp tục trong luồng chính.</p>
        </div>
      </section>

      <div class="admin-stat-grid">
        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Order status</p>
          <p class="admin-stat-value admin-stat-value-small">{{ order.orderStatus }}</p>
          <p class="admin-stat-note">Lifecycle chính của đơn hàng.</p>
        </article>

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Payment</p>
          <p class="admin-stat-value admin-stat-value-small">{{ order.paymentMethod || 'N/A' }}</p>
          <p class="admin-stat-note">Trạng thái: {{ order.paymentStatus || 'N/A' }}</p>
        </article>

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Tổng tiền</p>
          <p class="admin-stat-value admin-stat-value-small">{{ formatCurrency(order.grandTotal) }}</p>
          <p class="admin-stat-note">{{ formatNumber(order.itemCount) }} dòng hàng trong order.</p>
        </article>

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Cập nhật cuối</p>
          <p class="admin-stat-value admin-stat-value-small">{{ formatDate(order.updatedAt) || 'N/A' }}</p>
          <p class="admin-stat-note">Mốc thời gian gần nhất backend ghi nhận thay đổi.</p>
        </article>
      </div>

      <div class="admin-content-grid admin-content-grid-wide-right">
        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Order Items</p>
              <h2 class="admin-card-title">Sản phẩm và tiền hàng</h2>
            </div>
          </div>

          <div class="admin-ledger-list">
            <article v-for="item in order.items" :key="item.variantId" class="admin-ledger-entry">
              <div class="admin-ledger-entry-main">
                <img
                  v-if="item.thumbnailUrl"
                  :src="item.thumbnailUrl"
                  :alt="item.productName || item.sku || 'Variant image'"
                  class="admin-order-item-thumb"
                />
                <div>
                  <p class="admin-ledger-title">{{ item.productName || item.sku || item.variantId }}</p>
                  <p class="admin-ledger-subtitle">{{ item.variantLabel || 'Không có nhãn variant' }}</p>
                  <p class="admin-ledger-subtitle">
                    SL {{ formatNumber(item.quantity) }} • {{ formatCurrency(item.unitPrice) }}
                  </p>
                </div>
              </div>

              <div class="admin-ledger-trailing">
                <p class="admin-ledger-amount">{{ formatCurrency(item.lineTotal) }}</p>
              </div>
            </article>
          </div>

          <div class="admin-order-total-grid">
            <div>
              <span>Tạm tính</span>
              <strong>{{ formatCurrency(order.subtotal) }}</strong>
            </div>
            <div>
              <span>Giảm giá</span>
              <strong>{{ formatCurrency(order.discountTotal) }}</strong>
            </div>
            <div>
              <span>Phí vận chuyển</span>
              <strong>{{ formatCurrency(order.shippingFee) }}</strong>
            </div>
            <div>
              <span>Tổng cộng</span>
              <strong>{{ formatCurrency(order.grandTotal) }}</strong>
            </div>
          </div>
        </section>

        <div class="admin-order-sidebar">
          <section class="admin-subcard">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Customer</p>
                <h2 class="admin-card-title">Thông tin người nhận</h2>
              </div>
            </div>

            <div class="admin-audit-list">
              <div class="admin-audit-row">
                <dt>Người nhận</dt>
                <dd>{{ order.recipientName }}</dd>
              </div>
              <div class="admin-audit-row">
                <dt>Số điện thoại</dt>
                <dd>{{ order.phoneNumber }}</dd>
              </div>
              <div class="admin-audit-row">
                <dt>Địa chỉ</dt>
                <dd>{{ order.shippingAddressLine || 'N/A' }}</dd>
              </div>
              <div class="admin-audit-row">
                <dt>Tạo lúc</dt>
                <dd>{{ formatDate(order.createdAt) }}</dd>
              </div>
            </div>
          </section>

          <section class="admin-subcard">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Actions</p>
                <h2 class="admin-card-title">Hành động nghiệp vụ</h2>
              </div>
            </div>

            <div class="admin-button-column">
              <button
                type="button"
                class="admin-button admin-button-primary"
                :disabled="!canConfirm || actionBusy"
                @click="applyStatus('confirmed')"
              >
                {{ actionBusy && canConfirm ? 'Đang cập nhật...' : 'Xác nhận đơn' }}
              </button>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                :disabled="!canComplete || actionBusy"
                @click="applyStatus('completed')"
              >
                {{ actionBusy && canComplete ? 'Đang cập nhật...' : 'Hoàn tất đơn' }}
              </button>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                :disabled="!canReconcileVnpay || actionBusy"
                @click="reconcileVnpay"
              >
                {{ actionBusy && canReconcileVnpay ? 'Đang reconcile...' : 'Reconcile VNPAY' }}
              </button>

              <button
                type="button"
                class="admin-button admin-button-danger"
                :disabled="!canCancel || actionBusy"
                @click="cancelOrder"
              >
                {{ actionBusy && canCancel ? 'Đang hủy...' : 'Hủy đơn hàng' }}
              </button>
            </div>

            <div class="admin-note-block">
              <p>Transition hợp lệ hiện tại: `pending -> confirmed -> completed`.</p>
              <p>Nếu payment `vnpay` vẫn `pending`, backend có thể từ chối chuyển trạng thái xử lý.</p>
            </div>
          </section>
        </div>
      </div>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Status Log</p>
            <h2 class="admin-card-title">Lịch sử thay đổi trạng thái</h2>
          </div>
        </div>

        <div v-if="order.statusLogs.length === 0" class="admin-empty-state">
          Backend chưa ghi log thay đổi trạng thái nào cho order này.
        </div>

        <div v-else class="admin-table-shell">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Từ trạng thái</th>
                <th>Sang trạng thái</th>
                <th>Thay đổi bởi</th>
                <th>Thời điểm</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, index) in order.statusLogs" :key="`${log.changedAt}-${index}`">
                <td>{{ log.fromStatus || 'N/A' }}</td>
                <td>{{ log.toStatus || 'N/A' }}</td>
                <td>{{ log.changedBy || 'N/A' }}</td>
                <td>{{ formatDate(log.changedAt) || 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>
