<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()

const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionTone = ref('success')
const orders = ref([])
const busyOrderId = ref('')
const busyAction = ref('')

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
  { label: 'Mới nhất', value: 'createdAt:desc' },
  { label: 'Cũ nhất', value: 'createdAt:asc' },
  { label: 'Tổng tiền giảm dần', value: 'grandTotal:desc' },
  { label: 'Tổng tiền tăng dần', value: 'grandTotal:asc' },
]

const pendingOrders = computed(() => orders.value.filter((order) => order.orderStatus === 'pending').length)
const confirmedOrders = computed(() => orders.value.filter((order) => order.orderStatus === 'confirmed').length)
const completedOrders = computed(() => orders.value.filter((order) => order.orderStatus === 'completed').length)
const vnpayPendingOrders = computed(() =>
  orders.value.filter((order) => order.paymentMethod === 'vnpay' && order.paymentStatus === 'pending')
    .length,
)

const filteredOrders = computed(() => {
  const query = filters.value.query.trim().toLowerCase()
  const [sortField, sortDirection] = filters.value.sort.split(':')
  let rows = [...orders.value]

  if (query) {
    rows = rows.filter((order) =>
      [
        order.orderCode,
        order.id,
        order.recipientName,
        order.phoneNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }

  if (filters.value.status !== 'all') {
    rows = rows.filter((order) => order.orderStatus === filters.value.status)
  }

  if (filters.value.paymentMethod !== 'all') {
    rows = rows.filter((order) => (order.paymentMethod || 'none') === filters.value.paymentMethod)
  }

  if (filters.value.paymentStatus !== 'all') {
    rows = rows.filter((order) => (order.paymentStatus || 'none') === filters.value.paymentStatus)
  }

  rows.sort((left, right) => {
    let leftValue = left[sortField]
    let rightValue = right[sortField]

    if (sortField === 'createdAt') {
      leftValue = new Date(left.createdAt || 0).getTime()
      rightValue = new Date(right.createdAt || 0).getTime()
    }

    if (typeof leftValue === 'string' || typeof rightValue === 'string') {
      return sortDirection === 'asc'
        ? String(leftValue || '').localeCompare(String(rightValue || ''))
        : String(rightValue || '').localeCompare(String(leftValue || ''))
    }

    return sortDirection === 'asc'
      ? Number(leftValue || 0) - Number(rightValue || 0)
      : Number(rightValue || 0) - Number(leftValue || 0)
  })

  return rows
})

const pagination = computed(() => {
  const total = filteredOrders.value.length
  const limit = filters.value.limit
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(filters.value.page, totalPages)

  return {
    total,
    limit,
    page,
    totalPages,
    start: total === 0 ? 0 : (page - 1) * limit + 1,
    end: Math.min(page * limit, total),
  }
})

const visibleOrders = computed(() => {
  const startIndex = (pagination.value.page - 1) * pagination.value.limit
  return filteredOrders.value.slice(startIndex, startIndex + pagination.value.limit)
})

function setActionMessage(message, tone = 'success') {
  actionMessage.value = message
  actionTone.value = tone
}

function replaceOrder(updatedOrder) {
  orders.value = orders.value.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
}

function getPrimaryAction(order) {
  if (order.orderStatus === 'pending') {
    return {
      action: 'confirm',
      label: 'Xác nhận',
      targetStatus: 'confirmed',
      tone: 'primary',
    }
  }

  if (order.orderStatus === 'confirmed') {
    return {
      action: 'complete',
      label: 'Hoàn tất',
      targetStatus: 'completed',
      tone: 'secondary',
    }
  }

  return null
}

function canCancel(order) {
  return ['pending', 'confirmed'].includes(order.orderStatus)
}

function nextStepLabel(order) {
  if (order.orderStatus === 'pending') {
    return 'Bước tiếp theo: xác nhận đơn'
  }

  if (order.orderStatus === 'confirmed') {
    return 'Bước tiếp theo: hoàn tất đơn'
  }

  if (order.orderStatus === 'completed') {
    return 'Luồng đã hoàn tất'
  }

  if (order.orderStatus === 'cancelled') {
    return 'Đơn đã rời khỏi luồng xử lý'
  }

  return 'Không có thao tác khả dụng'
}

function isBusy(orderId, action) {
  return busyOrderId.value === orderId && busyAction.value === action
}

function goToPage(page) {
  filters.value.page = page
}

function resetFilters() {
  filters.value = {
    query: '',
    status: 'all',
    paymentMethod: 'all',
    paymentStatus: 'all',
    sort: 'createdAt:desc',
    page: 1,
    limit: 20,
  }
}

async function loadOrders() {
  loading.value = true
  errorMessage.value = ''

  const result = await adminStore.fetchOrders()

  if (result.success) {
    orders.value = result.data
  } else {
    errorMessage.value = result.error
  }

  loading.value = false
}

async function applyRowStatus(order, targetStatus, actionKey) {
  busyOrderId.value = order.id
  busyAction.value = actionKey

  const result = await adminStore.updateOrderStatus(order.id, targetStatus)

  if (result.success) {
    replaceOrder(result.data)
    setActionMessage(`Đã chuyển đơn ${order.orderCode} sang trạng thái \`${targetStatus}\`.`, 'success')
  } else {
    setActionMessage(result.error, 'danger')
  }

  busyOrderId.value = ''
  busyAction.value = ''
}

async function cancelRowOrder(order) {
  if (!window.confirm(`Hủy đơn ${order.orderCode}?`)) {
    return
  }

  busyOrderId.value = order.id
  busyAction.value = 'cancel'

  const result = await adminStore.cancelOrder(order.id)

  if (result.success) {
    replaceOrder(result.data)
    setActionMessage(`Đã hủy đơn ${order.orderCode}.`, 'warning')
  } else {
    setActionMessage(result.error, 'danger')
  }

  busyOrderId.value = ''
  busyAction.value = ''
}

watch(
  () => [filters.value.query, filters.value.status, filters.value.paymentMethod, filters.value.paymentStatus, filters.value.sort, filters.value.limit],
  () => {
    filters.value.page = 1
  },
)

watch(
  () => pagination.value.totalPages,
  (totalPages) => {
    if (filters.value.page > totalPages) {
      filters.value.page = totalPages
    }
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
        <h1 class="admin-page-title">Bảng điều phối đơn hàng</h1>
        <p class="admin-page-subtitle">
          Module order theo kiểu task-oriented: lọc danh sách, đọc trạng thái hiện tại và thực hiện đúng bước hợp lệ trong state machine của backend.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="loadOrders">
          Tải lại danh sách
        </button>
      </div>
    </header>

    <div class="admin-note-block">
      <p>Workflow backend hiện có: <strong>pending → confirmed → completed</strong>.</p>
      <p>`cancelled` là nhánh kết thúc riêng. Hệ thống hiện chưa hỗ trợ các bước `shipping` hoặc `delivered` ở API admin.</p>
    </div>

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

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Tổng đơn</p>
        <p class="admin-stat-value">{{ formatNumber(orders.length) }}</p>
        <p class="admin-stat-note">Toàn bộ đơn đang truy xuất được từ endpoint admin.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Pending</p>
        <p class="admin-stat-value">{{ formatNumber(pendingOrders) }}</p>
        <p class="admin-stat-note">Cần xác nhận trước khi đi tiếp trong luồng xử lý.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Confirmed</p>
        <p class="admin-stat-value">{{ formatNumber(confirmedOrders) }}</p>
        <p class="admin-stat-note">Đã được duyệt và có thể chuyển sang hoàn tất.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">VNPAY Pending</p>
        <p class="admin-stat-value">{{ formatNumber(vnpayPendingOrders) }}</p>
        <p class="admin-stat-note">Những đơn có thể cần đối soát thanh toán trước khi xử lý tiếp.</p>
      </article>
    </div>

    <section class="admin-card admin-filter-bar">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Filter Bar</p>
          <h2 class="admin-card-title">Lọc danh sách đơn hàng</h2>
        </div>

        <div class="admin-table-meta">
          <span>{{ formatNumber(pagination.total) }} kết quả</span>
          <span>{{ pagination.start }} - {{ pagination.end }}</span>
        </div>
      </div>

      <div class="admin-four-column-grid">
        <label class="admin-field">
          <span class="admin-label">Tìm kiếm</span>
          <input
            v-model="filters.query"
            class="admin-input"
            type="search"
            placeholder="Mã đơn, khách hàng, số điện thoại"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Trạng thái đơn</span>
          <select v-model="filters.status" class="admin-select">
            <option value="all">Tất cả</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Phương thức thanh toán</span>
          <select v-model="filters.paymentMethod" class="admin-select">
            <option value="all">Tất cả</option>
            <option value="vnpay">VNPAY</option>
            <option value="cod">COD</option>
            <option value="none">Không có</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Trạng thái thanh toán</span>
          <select v-model="filters.paymentStatus" class="admin-select">
            <option value="all">Tất cả</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="none">Không có</option>
          </select>
        </label>
      </div>

      <div class="admin-four-column-grid">
        <label class="admin-field">
          <span class="admin-label">Sắp xếp</span>
          <select v-model="filters.sort" class="admin-select">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Số dòng / trang</span>
          <select v-model.number="filters.limit" class="admin-select">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }} dòng
            </option>
          </select>
        </label>

        <div class="admin-button-row">
          <button type="button" class="admin-button admin-button-secondary" @click="resetFilters">
            Đặt lại bộ lọc
          </button>
        </div>
      </div>
    </section>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Order List</p>
          <h2 class="admin-card-title">Bảng dữ liệu đơn hàng</h2>
        </div>

        <p class="admin-muted-text">
          {{ formatNumber(completedOrders) }} đơn hoàn tất trong tổng số {{ formatNumber(orders.length) }} đơn.
        </p>
      </div>

      <div v-if="errorMessage" class="admin-alert admin-alert-danger">
        {{ errorMessage }}
      </div>

      <div v-if="loading" class="admin-empty-state">Đang tải danh sách đơn hàng...</div>

      <div v-else-if="visibleOrders.length === 0" class="admin-empty-state">
        Không có đơn hàng nào khớp bộ lọc hiện tại.
      </div>

      <div v-else class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Đơn hàng</th>
              <th>Khách hàng</th>
              <th>Workflow</th>
              <th>Thanh toán</th>
              <th>Giá trị</th>
              <th>Tạo lúc</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in visibleOrders" :key="order.id">
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
                    {{ order.orderStatus }}
                  </span>
                  <p class="admin-table-subtitle">{{ nextStepLabel(order) }}</p>
                </div>
              </td>
              <td>
                <p class="admin-table-title">{{ order.paymentMethod || 'N/A' }}</p>
                <span
                  class="admin-status-pill"
                  :data-tone="order.paymentStatus === 'paid' ? 'success' : order.paymentStatus || 'muted'"
                >
                  {{ order.paymentStatus || 'N/A' }}
                </span>
              </td>
              <td>
                <p class="admin-table-title">{{ formatCurrency(order.grandTotal) }}</p>
                <p class="admin-table-subtitle">{{ formatNumber(order.itemCount) }} dòng hàng</p>
              </td>
              <td>{{ formatDate(order.createdAt) }}</td>
              <td class="admin-table-actions-cell">
                <div class="admin-button-column">
                  <button
                    v-if="getPrimaryAction(order)"
                    type="button"
                    class="admin-button"
                    :class="getPrimaryAction(order)?.tone === 'primary' ? 'admin-button-primary' : 'admin-button-secondary'"
                    :disabled="Boolean(busyOrderId)"
                    @click="applyRowStatus(order, getPrimaryAction(order).targetStatus, getPrimaryAction(order).action)"
                  >
                    {{
                      isBusy(order.id, getPrimaryAction(order).action)
                        ? 'Đang xử lý...'
                        : getPrimaryAction(order).label
                    }}
                  </button>

                  <button
                    v-if="canCancel(order)"
                    type="button"
                    class="admin-button admin-button-danger admin-button-compact"
                    :disabled="Boolean(busyOrderId)"
                    @click="cancelRowOrder(order)"
                  >
                    {{ isBusy(order.id, 'cancel') ? 'Đang hủy...' : 'Hủy đơn' }}
                  </button>

                  <RouterLink
                    :to="{ name: 'admin-order-detail', params: { orderId: order.id } }"
                    class="admin-inline-link"
                  >
                    Xem chi tiết
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.totalPages > 1" class="admin-pagination">
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="pagination.page <= 1"
          @click="goToPage(pagination.page - 1)"
        >
          Trang trước
        </button>
        <span class="admin-pagination-label">Trang {{ pagination.page }} / {{ pagination.totalPages }}</span>
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="pagination.page >= pagination.totalPages"
          @click="goToPage(pagination.page + 1)"
        >
          Trang sau
        </button>
      </div>
    </section>
  </section>
</template>
