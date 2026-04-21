<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdminPopup } from '../../composables/useAdminPopup'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()
const { notify } = useAdminPopup()

const loading = ref(true)
const orders = ref([])
const meta = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
})

const filters = ref({
  query: '',
  status: 'all',
  paymentMethod: 'all',
  paymentStatus: 'all',
  sort: 'createdAt:desc',
  page: 1,
  limit: 20,
})

const pageSizeOptions = [10, 20, 30, 50]
const sortOptions = [
  { label: 'Newest first', value: 'createdAt:desc' },
  { label: 'Oldest first', value: 'createdAt:asc' },
  { label: 'Total value: high to low', value: 'grandTotal:desc' },
  { label: 'Total value: low to high', value: 'grandTotal:asc' },
]

const pendingOrders = computed(() => (orders.value || []).filter((order) => order?.orderStatus === 'pending').length)
const confirmedOrders = computed(() => (orders.value || []).filter((order) => order?.orderStatus === 'confirmed').length)
const completedOrders = computed(() => (orders.value || []).filter((order) => order?.orderStatus === 'completed').length)
const vnpayPendingOrders = computed(() =>
  (orders.value || []).filter((order) => order?.paymentMethod === 'vnpay' && order?.paymentStatus === 'pending')
    .length,
)

function nextStepLabel(order) {
  if (order.orderStatus === 'pending') {
    return 'Next step: confirm order'
  }

  if (order.orderStatus === 'confirmed') {
    return 'Next step: complete order'
  }

  if (order.orderStatus === 'completed') {
    return 'Workflow completed'
  }

  if (order.orderStatus === 'cancelled') {
    return 'Order exited the workflow'
  }

  return 'No available action'
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

async function goToPage(page) {
  filters.value.page = page
  await loadOrders()
}

async function resetFilters() {
  filters.value = {
    query: '',
    status: 'all',
    paymentMethod: 'all',
    paymentStatus: 'all',
    sort: 'createdAt:desc',
    page: 1,
    limit: 20,
  }
  await loadOrders()
}

async function loadOrders() {
  loading.value = true

  const result = await adminStore.fetchOrders(filters.value)

  if (result.success) {
    const payload = result.data
    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : []

    orders.value = items
    meta.value = {
      page: Number(payload?.meta?.page || filters.value.page || 1),
      limit: Number(payload?.meta?.limit || filters.value.limit || 20),
      total: Number(payload?.meta?.total || items.length),
      totalPages: Number(payload?.meta?.totalPages || 1),
    }
  } else {
    notify(result.error, 'danger')
    orders.value = []
    meta.value = {
      page: 1,
      limit: Number(filters.value.limit || 20),
      total: 0,
      totalPages: 1,
    }
  }

  loading.value = false
}


let searchTimeout = null
watch(
  () => filters.value.query,
  () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      filters.value.page = 1
      loadOrders()
    }, 400)
  }
)

watch(
  () => [filters.value.status, filters.value.paymentMethod, filters.value.paymentStatus, filters.value.sort, filters.value.limit],
  async (_, previousValues) => {
    if (!previousValues) return
    filters.value.page = 1
    await loadOrders()
  },
)

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Order Management</p>
        <h1 class="admin-page-title">Order Operations Board</h1>
        <p class="admin-page-subtitle">
          Track order progress, filter quickly for operations, and perform workflow actions in the correct sequence.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="loadOrders">
          Reload list
        </button>
      </div>
    </header>

    <div class="admin-note-block">
      <p>Current workflow: <strong>Pending → Confirmed → Completed</strong>.</p>
      <p>Status <strong>Cancelled</strong> is a terminal branch and does not continue through the remaining steps.</p>
    </div>

    <div class="admin-stat-grid admin-order-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Total Orders</p>
        <p class="admin-stat-value">{{ formatNumber(meta.total) }}</p>
        <p class="admin-stat-note">All orders matching current filter.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Pending</p>
        <p class="admin-stat-value">{{ formatNumber(pendingOrders) }}</p>
        <p class="admin-stat-note">Needs confirmation.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Confirmed</p>
        <p class="admin-stat-value">{{ formatNumber(confirmedOrders) }}</p>
        <p class="admin-stat-note">Ready to move to completion.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Completed</p>
        <p class="admin-stat-value">{{ formatNumber(completedOrders) }}</p>
        <p class="admin-stat-note">Finished in current filter results.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">VNPAY Pending</p>
        <p class="admin-stat-value">{{ formatNumber(vnpayPendingOrders) }}</p>
        <p class="admin-stat-note">Requires payment reconciliation.</p>
      </article>
    </div>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Order List</p>
          <h2 class="admin-card-title">Order Data Table</h2>
        </div>

        <div class="admin-table-meta">
          <span>{{ formatNumber(meta.total) }} results</span>
          <span>Page {{ meta.page }}/{{ meta.totalPages }}</span>
        </div>
      </div>

      <div class="admin-order-filter-grid">
        <label class="admin-field">
          <span class="admin-label-row">
            <span class="admin-label">Search</span>
            <span
              class="admin-field-hint"
              title="You can enter order code, recipient name, or phone number."
              tabindex="0"
              data-tooltip="You can enter order code, recipient name, or phone number."
              aria-label="Search: You can enter order code, recipient name, or phone number."
            >
              ?
            </span>
          </span>
          <input
            v-model="filters.query"
            class="admin-input"
            type="search"
            placeholder="Order code, recipient, phone number"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Order Status</span>
          <select v-model="filters.status" class="admin-select">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Payment Method</span>
          <select v-model="filters.paymentMethod" class="admin-select">
            <option value="all">All</option>
            <option value="vnpay">VNPAY</option>
            <option value="cod">COD</option>
            <option value="none">None</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Payment Status</span>
          <select v-model="filters.paymentStatus" class="admin-select">
            <option value="all">All</option>
            <option value="pending">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="none">None</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Sort</span>
          <select v-model="filters.sort" class="admin-select">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Rows per page</span>
          <select v-model.number="filters.limit" class="admin-select">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }} rows
            </option>
          </select>
        </label>
      </div>

      <div class="admin-button-row">
        <button type="button" class="admin-button admin-button-secondary" @click="resetFilters">
          Reset filters
        </button>
      </div>

      <div v-if="loading" class="admin-empty-state">Loading order list...</div>

      <div v-else-if="orders.length === 0" class="admin-empty-state">
        No orders match the current filters.
      </div>

      <div v-else class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Workflow</th>
              <th>Payment</th>
              <th>Value</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>
                <p class="admin-table-title">{{ order.orderCode }}</p>
                <p class="admin-table-subtitle">{{ order.id }}</p>
              </td>
              <td>
                <p class="admin-table-title">{{ order.recipientName }}</p>
                <p class="admin-table-subtitle">{{ order.phoneNumber }}</p>
              </td>
              <td>
                <div class="admin-status-stack">
                  <span class="admin-status-pill" :data-tone="order.orderStatus">
                    {{ getOrderStatusLabel(order.orderStatus) }}
                  </span>
                  <p class="admin-table-subtitle">{{ nextStepLabel(order) }}</p>
                </div>
              </td>
              <td>
                <p class="admin-table-title">{{ getPaymentMethodLabel(order.paymentMethod) }}</p>
                <span
                  class="admin-status-pill"
                  :data-tone="order.paymentStatus === 'paid' ? 'success' : order.paymentStatus || 'muted'"
                >
                  {{ getPaymentStatusLabel(order.paymentStatus) }}
                </span>
              </td>
              <td>
                <p class="admin-table-title">{{ formatCurrency(order.grandTotal) }}</p>
                <p class="admin-table-subtitle">{{ formatNumber(order.itemCount) }} items</p>
              </td>
              <td>{{ formatDate(order.createdAt) }}</td>
              <td class="admin-table-actions-cell">
                <div class="admin-button-column">
                  <RouterLink
                    :to="{ name: 'admin-order-detail', params: { orderId: order.id } }"
                    class="admin-inline-link"
                  >
                    View details
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta.totalPages > 1" class="admin-pagination">
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="meta.page <= 1"
          @click="goToPage(meta.page - 1)"
        >
          Previous
        </button>
        <span class="admin-pagination-label">Page {{ meta.page }} / {{ meta.totalPages }}</span>
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="meta.page >= meta.totalPages"
          @click="goToPage(meta.page + 1)"
        >
          Next
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.admin-order-filter-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-order-stat-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1200px) {
  .admin-order-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .admin-order-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .admin-order-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
