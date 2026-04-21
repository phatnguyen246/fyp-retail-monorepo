<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminPopup } from '../../composables/useAdminPopup'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const { notify } = useAdminPopup()

const orderId = computed(() => route.params.orderId)
const loading = ref(true)
const actionBusy = ref(false)
const order = ref(null)

const canConfirm = computed(() => order.value?.orderStatus === 'pending')
const canComplete = computed(() => order.value?.orderStatus === 'confirmed')
const canCancel = computed(() => ['pending', 'confirmed'].includes(order.value?.orderStatus))
const canReconcileVnpay = computed(
  () => order.value?.paymentMethod === 'vnpay' && order.value?.paymentStatus === 'pending',
)

function setActionMessage(message, tone = 'success') {
  notify(message, tone)
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

  const result = await adminStore.fetchOrderDetail(orderId.value)

  if (result.success) {
    order.value = result.data
  } else {
    notify(result.error, 'danger')
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

    <div v-if="loading" class="admin-empty-state">Loading order record...</div>

    <template v-else-if="order">
      <div class="admin-stat-grid admin-order-detail-stat-grid">
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

        <article class="admin-stat-card">
          <p class="admin-stat-eyebrow">Created At</p>
          <p class="admin-stat-value admin-stat-value-small">{{ formatDate(order.createdAt) || 'Not available' }}</p>
          <p class="admin-stat-note">Initial creation timestamp for this order.</p>
        </article>
      </div>

      <div class="admin-content-grid admin-content-grid-wide-right">
        <section class="admin-card admin-order-items-card">
          <div class="admin-card-header">
            <div class="admin-order-items-heading">
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

          <dl class="admin-order-total-lines">
            <div class="admin-order-total-line">
              <dt>Subtotal</dt>
              <dd>{{ formatCurrency(order.subtotal) }}</dd>
            </div>
            <div class="admin-order-total-line">
              <dt>Discount</dt>
              <dd>{{ formatCurrency(order.discountTotal) }}</dd>
            </div>
            <div class="admin-order-total-line">
              <dt>Shipping Fee</dt>
              <dd>{{ formatCurrency(order.shippingFee) }}</dd>
            </div>
            <div class="admin-order-total-line admin-order-total-line-grand">
              <dt>Grand Total</dt>
              <dd>{{ formatCurrency(order.grandTotal) }}</dd>
            </div>
          </dl>
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
                <dt>Email</dt>
                <dd>{{ order.email || 'Not available' }}</dd>
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

<style scoped>
.admin-order-items-heading {
  display: inline-grid;
  width: fit-content;
  max-width: 100%;
}

.admin-content-grid-wide-right {
  align-items: start;
}

.admin-order-items-card {
  height: auto;
  align-content: start;
}

.admin-order-total-lines {
  margin-top: 1.25rem;
  border-top: 1px solid var(--admin-border-color, #e2e8f0);
  padding-top: 0.85rem;
}

.admin-order-total-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.28);
}

.admin-order-total-line dt {
  font-size: 0.85rem;
  color: var(--admin-text-muted, #64748b);
}

.admin-order-total-line dd {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--admin-text, #0f172a);
}

.admin-order-total-line-grand {
  border-bottom: none;
  padding-bottom: 0.1rem;
}

.admin-order-total-line-grand dt,
.admin-order-total-line-grand dd {
  font-size: 1rem;
  font-weight: 700;
}

.admin-order-detail-stat-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1200px) {
  .admin-order-detail-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .admin-order-detail-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .admin-order-detail-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
