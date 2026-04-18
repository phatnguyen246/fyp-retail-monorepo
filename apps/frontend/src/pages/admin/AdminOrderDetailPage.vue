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
    note: 'Order has been created and is awaiting confirmation.',
  },
  {
    key: 'confirmed',
    title: 'Confirmed',
    note: 'Order has been approved and is ready for the next step.',
  },
  {
    key: 'completed',
    title: 'Completed',
    note: 'Order has completed the current workflow.',
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

function getOrderStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return labels[status] || status || 'Not available'
}

function getPaymentStatusLabel(status) {
  const labels = {
    pending: 'Pending payment',
    paid: 'Paid',
    cancelled: 'Cancelled',
    failed: 'Failed',
  }

  return labels[status] || status || 'Not available'
}

function getPaymentMethodLabel(method) {
  const labels = {
    vnpay: 'VNPAY',
    cod: 'Cash on Delivery',
  }

  return labels[method] || method || 'Not available'
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
    setActionMessage(`Order moved to ${getOrderStatusLabel(orderStatus)}.`, 'success')
  } else {
    setActionMessage(result.error, 'danger')
  }

  actionBusy.value = false
}

async function cancelOrder() {
  if (!window.confirm('Confirm cancellation for this order?')) {
    return
  }

  actionBusy.value = true

  const result = await adminStore.cancelOrder(orderId.value)

  if (result.success) {
    order.value = result.data
    setActionMessage('Order cancelled from admin workflow.', 'warning')
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
        ? 'VNPAY reconciliation succeeded and payment status was updated.'
        : result.data.status === 'noop'
          ? 'Payment is no longer in a reconcilable state.'
          : 'Reconciliation request has been sent to VNPAY.',
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
        <p class="admin-page-kicker">Order Details</p>
        <h1 class="admin-page-title">{{ order?.orderCode || 'Order Details' }}</h1>
        <p class="admin-page-subtitle">
          Review full order progress, recipient data, payment information, and change history for accurate handling.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="router.back()">
          Back
        </button>
        <button type="button" class="admin-button admin-button-secondary" @click="loadOrderDetail">
          Reload record
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

    <div v-if="loading" class="admin-empty-state">Loading order record...</div>

    <template v-else-if="order">
      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Workflow Progress</p>
            <h2 class="admin-card-title">Order Workflow</h2>
          </div>

          <div class="admin-status-stack">
            <span class="admin-status-pill" :data-tone="order.orderStatus">
              {{ getOrderStatusLabel(order.orderStatus) }}
            </span>
            <span class="admin-status-pill" :data-tone="paymentTone">
              {{ getPaymentStatusLabel(order.paymentStatus) }}
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
          <p>This order is in Cancelled status and no longer continues in the main workflow.</p>
        </div>
      </section>

      <div class="admin-stat-grid">
        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Order Status</p>
          <p class="admin-stat-value admin-stat-value-small">{{ getOrderStatusLabel(order.orderStatus) }}</p>
          <p class="admin-stat-note">Current processing status of this order.</p>
        </article>

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Payment</p>
          <p class="admin-stat-value admin-stat-value-small">{{ getPaymentMethodLabel(order.paymentMethod) }}</p>
          <p class="admin-stat-note">Status: {{ getPaymentStatusLabel(order.paymentStatus) }}</p>
        </article>

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Total Amount</p>
          <p class="admin-stat-value admin-stat-value-small">{{ formatCurrency(order.grandTotal) }}</p>
          <p class="admin-stat-note">{{ formatNumber(order.itemCount) }} items in this order.</p>
        </article>

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Last Updated</p>
          <p class="admin-stat-value admin-stat-value-small">{{ formatDate(order.updatedAt) || 'Not available' }}</p>
          <p class="admin-stat-note">Most recent update timestamp for this order.</p>
        </article>
      </div>

      <div class="admin-content-grid admin-content-grid-wide-right">
        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Order Items</p>
              <h2 class="admin-card-title">Products and Totals</h2>
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
                  <p class="admin-ledger-subtitle">{{ item.variantLabel || 'No variant description' }}</p>
                  <p class="admin-ledger-subtitle">
                    Qty {{ formatNumber(item.quantity) }} • {{ formatCurrency(item.unitPrice) }}
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
              <span>Subtotal</span>
              <strong>{{ formatCurrency(order.subtotal) }}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{{ formatCurrency(order.discountTotal) }}</strong>
            </div>
            <div>
              <span>Shipping Fee</span>
              <strong>{{ formatCurrency(order.shippingFee) }}</strong>
            </div>
            <div>
              <span>Grand Total</span>
              <strong>{{ formatCurrency(order.grandTotal) }}</strong>
            </div>
          </div>
        </section>

        <div class="admin-order-sidebar">
          <section class="admin-subcard">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Customer Info</p>
                <h2 class="admin-card-title">Recipient Details</h2>
              </div>
            </div>

            <div class="admin-audit-list">
              <div class="admin-audit-row">
                <dt>Recipient</dt>
                <dd>{{ order.recipientName }}</dd>
              </div>
              <div class="admin-audit-row">
                <dt>Phone Number</dt>
                <dd>{{ order.phoneNumber }}</dd>
              </div>
              <div class="admin-audit-row">
                <dt>Address</dt>
                <dd>{{ order.shippingAddressLine || 'Not available' }}</dd>
              </div>
              <div class="admin-audit-row">
                <dt>Created At</dt>
                <dd>{{ formatDate(order.createdAt) }}</dd>
              </div>
            </div>
          </section>

          <section class="admin-subcard">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Order Actions</p>
                <h2 class="admin-card-title">Workflow Actions</h2>
              </div>
            </div>

            <div class="admin-button-column">
              <button
                type="button"
                class="admin-button admin-button-primary"
                :disabled="!canConfirm || actionBusy"
                @click="applyStatus('confirmed')"
              >
                {{ actionBusy && canConfirm ? 'Updating...' : 'Confirm Order' }}
              </button>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                :disabled="!canComplete || actionBusy"
                @click="applyStatus('completed')"
              >
                {{ actionBusy && canComplete ? 'Updating...' : 'Complete Order' }}
              </button>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                :disabled="!canReconcileVnpay || actionBusy"
                @click="reconcileVnpay"
              >
                {{ actionBusy && canReconcileVnpay ? 'Reconciling...' : 'Reconcile VNPAY' }}
              </button>

              <button
                type="button"
                class="admin-button admin-button-danger"
                :disabled="!canCancel || actionBusy"
                @click="cancelOrder"
              >
                {{ actionBusy && canCancel ? 'Cancelling...' : 'Cancel Order' }}
              </button>
            </div>

            <div class="admin-note-block">
              <p>Valid processing order: Pending → Confirmed → Completed.</p>
              <p>For VNPAY orders still in pending payment, the system may temporarily block progression.</p>
            </div>
          </section>
        </div>
      </div>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Workflow History</p>
            <h2 class="admin-card-title">Status Change History</h2>
          </div>
        </div>

        <div v-if="order.statusLogs.length === 0" class="admin-empty-state">
          No status-change history is available for this order.
        </div>

        <div v-else class="admin-table-shell">
          <table class="admin-table">
            <thead>
              <tr>
                <th>From Status</th>
                <th>To Status</th>
                <th>Changed By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(log, index) in order.statusLogs" :key="`${log.changedAt}-${index}`">
                <td>{{ getOrderStatusLabel(log.fromStatus) }}</td>
                <td>{{ getOrderStatusLabel(log.toStatus) }}</td>
                <td>{{ log.changedBy || 'Not available' }}</td>
                <td>{{ formatDate(log.changedAt) || 'Not available' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>
