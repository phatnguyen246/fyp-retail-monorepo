<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()

const loading = ref(true)
const errorMessage = ref('')
const overview = ref({
  productMeta: {
    total: 0,
    draft: 0,
    outOfStock: 0,
  },
  orderMeta: {
    total: 0,
    pending: 0,
    completed: 0,
    vnpayPending: 0,
  },
  lowStockMeta: {
    total: 0,
    outOfStock: 0,
  },
  recentOrders: [],
  lowStockRecords: [],
})

const lowStockPreview = computed(() => overview.value.lowStockRecords.slice(0, 6))

function getLowStockTitle(record) {
  return record.productName || `Variant ${record.variantId}`
}

function getLowStockSubtitle(record) {
  return [record.productGroupCode, record.variantLabel, record.sku ? `SKU ${record.sku}` : null]
    .filter(Boolean)
    .join(' • ')
}

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''

  const result = await adminStore.fetchAdminOverview()

  if (result.success) {
    overview.value = result.data
  } else {
    errorMessage.value = result.error
  }

  loading.value = false
}

onMounted(() => {
  loadOverview()
})
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Operations Overview</p>
        <h1 class="admin-page-title">Tổng quan quản trị</h1>
        <p class="admin-page-subtitle">
          Landing page của khu vực admin nên đóng vai trò control tower: KPI chính, đơn cần chú ý và tín hiệu inventory bất thường.
        </p>
      </div>

      <div class="admin-toolbar">
        <RouterLink :to="{ name: 'admin-product-create' }" class="admin-button admin-button-primary">
          Soạn sản phẩm mới
        </RouterLink>
        <button type="button" class="admin-button admin-button-secondary" @click="loadOverview">
          Làm mới số liệu
        </button>
      </div>
    </header>

    <div v-if="errorMessage" class="admin-alert admin-alert-danger">
      {{ errorMessage }}
    </div>

    <div class="admin-note-block">
      <p>Khu vực này hiện đọc trực tiếp payload aggregate từ backend để gom <strong>Catalog</strong>, <strong>Orders</strong> và <strong>Inventory</strong>.</p>
      <p>Low-stock preview đã có thêm ngữ cảnh sản phẩm, SKU và biến thể để thao tác nhanh hơn.</p>
    </div>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Catalog</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.total) }}</p>
        <p class="admin-stat-note">Số sản phẩm hiện có trong bảng catalog quản trị.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Draft Products</p>
        <p class="admin-stat-value">{{ formatNumber(overview.productMeta.draft) }}</p>
        <p class="admin-stat-note">Sản phẩm đang ở trạng thái `draft`, chưa sẵn sàng mở bán.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Orders Pending</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.pending) }}</p>
        <p class="admin-stat-note">Đơn còn ở trạng thái `pending` cần xác nhận.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">VNPAY Pending</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.vnpayPending) }}</p>
        <p class="admin-stat-note">Đơn VNPAY chưa `paid`, có thể cần kiểm tra reconcile.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Completed</p>
        <p class="admin-stat-value">{{ formatNumber(overview.orderMeta.completed) }}</p>
        <p class="admin-stat-note">Đơn đã ở trạng thái `completed`.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Low Stock</p>
        <p class="admin-stat-value">{{ formatNumber(overview.lowStockMeta.total) }}</p>
        <p class="admin-stat-note">Biến thể đang chạm hoặc thấp hơn ngưỡng cảnh báo.</p>
      </article>
    </div>

    <div class="admin-content-grid">
      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Nhật ký gần đây</p>
            <h2 class="admin-card-title">Đơn hàng mới nhất</h2>
          </div>

          <RouterLink :to="{ name: 'admin-orders' }" class="admin-inline-link">
            Xem toàn bộ
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state">Đang tải tổng quan đơn hàng...</div>

        <div v-else-if="overview.recentOrders.length === 0" class="admin-empty-state">
          Chưa có đơn hàng để hiển thị.
        </div>

        <div v-else class="admin-ledger-list">
          <article
            v-for="order in overview.recentOrders"
            :key="order.id"
            class="admin-ledger-entry"
          >
            <div>
              <p class="admin-ledger-title">{{ order.orderCode }}</p>
              <p class="admin-ledger-subtitle">
                {{ order.recipientName }} • {{ formatDate(order.createdAt) }}
              </p>
            </div>

            <div class="admin-ledger-trailing">
              <span class="admin-status-pill" :data-tone="order.orderStatus">
                {{ order.orderStatus }}
              </span>
              <p class="admin-ledger-amount">{{ formatCurrency(order.grandTotal) }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Theo dõi tồn kho</p>
            <h2 class="admin-card-title">Cảnh báo low stock</h2>
          </div>

          <RouterLink :to="{ name: 'admin-inventory' }" class="admin-inline-link">
            Mở bàn tồn kho
          </RouterLink>
        </div>

        <div v-if="loading" class="admin-empty-state">Đang đối chiếu tồn kho thấp...</div>

        <div v-else-if="lowStockPreview.length === 0" class="admin-empty-state">
          Chưa có biến thể nào chạm ngưỡng low stock.
        </div>

        <div v-else class="admin-ledger-list">
          <article
            v-for="record in lowStockPreview"
            :key="record.id || record.variantId"
            class="admin-ledger-entry"
          >
            <div>
              <p class="admin-ledger-title">{{ getLowStockTitle(record) }}</p>
              <p class="admin-ledger-subtitle">
                {{ getLowStockSubtitle(record) || `Variant ${record.variantId}` }}
              </p>
              <p class="admin-ledger-subtitle">
                Ngưỡng {{ formatNumber(record.lowStockThreshold ?? 0) }} • Cập nhật
                {{ formatDate(record.updatedAt) }}
              </p>
            </div>

            <div class="admin-ledger-trailing">
              <span class="admin-status-pill" :data-tone="record.isInStock ? 'warning' : 'danger'">
                {{ formatNumber(record.stockQuantity) }} chiếc
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
