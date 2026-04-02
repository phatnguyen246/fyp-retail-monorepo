<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { formatDate, formatNumber } from '../../services/formatters'
import { createInventoryDraft, useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()

const lookupVariantId = ref('')
const inventoryRecord = ref(null)
const inventoryDraft = ref(createInventoryDraft())
const batchVariantIds = ref('')
const batchResults = ref([])
const lowStockRecords = ref([])
const loadingLookup = ref(false)
const loadingBatch = ref(false)
const loadingLowStock = ref(false)
const inventoryMessage = ref('')
const inventoryTone = ref('success')
const batchError = ref('')
const lowStockError = ref('')

const lowStockFilters = ref({
  query: '',
  stockState: 'all',
  sort: 'stockQuantity:asc',
  page: 1,
  limit: 10,
})

const lowStockPageSizeOptions = [10, 20, 30]
const lowStockSortOptions = [
  { label: 'Tồn kho tăng dần', value: 'stockQuantity:asc' },
  { label: 'Tồn kho giảm dần', value: 'stockQuantity:desc' },
  { label: 'Cập nhật mới nhất', value: 'updatedAt:desc' },
  { label: 'Ngưỡng tăng dần', value: 'lowStockThreshold:asc' },
]

const inventoryActionLabel = computed(() =>
  inventoryRecord.value?.recordExists ? 'Cập nhật hồ sơ tồn kho' : 'Tạo hồ sơ tồn kho',
)

const outOfStockCount = computed(() => lowStockRecords.value.filter((record) => !record.isInStock).length)
const lowStockCount = computed(() => lowStockRecords.value.filter((record) => record.isLowStock).length)
const atRiskUnits = computed(() =>
  lowStockRecords.value.reduce((total, record) => total + Number(record.stockQuantity || 0), 0),
)

const filteredLowStockRecords = computed(() => {
  const query = lowStockFilters.value.query.trim().toLowerCase()
  const [sortField, sortDirection] = lowStockFilters.value.sort.split(':')
  let rows = [...lowStockRecords.value]

  if (query) {
    rows = rows.filter((record) => String(record.variantId || '').toLowerCase().includes(query))
  }

  if (lowStockFilters.value.stockState === 'out') {
    rows = rows.filter((record) => !record.isInStock)
  } else if (lowStockFilters.value.stockState === 'low') {
    rows = rows.filter((record) => record.isInStock)
  }

  rows.sort((left, right) => {
    let leftValue = left[sortField]
    let rightValue = right[sortField]

    if (sortField === 'updatedAt') {
      leftValue = new Date(left.updatedAt || 0).getTime()
      rightValue = new Date(right.updatedAt || 0).getTime()
    }

    return sortDirection === 'asc'
      ? Number(leftValue || 0) - Number(rightValue || 0)
      : Number(rightValue || 0) - Number(leftValue || 0)
  })

  return rows
})

const lowStockPagination = computed(() => {
  const total = filteredLowStockRecords.value.length
  const limit = lowStockFilters.value.limit
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(lowStockFilters.value.page, totalPages)

  return {
    total,
    limit,
    page,
    totalPages,
  }
})

const visibleLowStockRecords = computed(() => {
  const start = (lowStockPagination.value.page - 1) * lowStockPagination.value.limit
  return filteredLowStockRecords.value.slice(start, start + lowStockPagination.value.limit)
})

function setInventoryMessage(message, tone = 'success') {
  inventoryMessage.value = message
  inventoryTone.value = tone
}

function useInventoryRecord(record) {
  inventoryRecord.value = record
  inventoryDraft.value = createInventoryDraft(record)
}

function goToLowStockPage(page) {
  lowStockFilters.value.page = page
}

function resetLowStockFilters() {
  lowStockFilters.value = {
    query: '',
    stockState: 'all',
    sort: 'stockQuantity:asc',
    page: 1,
    limit: 10,
  }
}

async function loadLowStockRecords() {
  loadingLowStock.value = true
  lowStockError.value = ''

  const result = await adminStore.fetchLowStockInventory()

  if (result.success) {
    lowStockRecords.value = result.data
  } else {
    lowStockError.value = result.error
  }

  loadingLowStock.value = false
}

async function lookupInventoryRecord() {
  if (!lookupVariantId.value.trim()) {
    setInventoryMessage('Cần nhập `variantId` để tra cứu tồn kho.', 'danger')
    return
  }

  loadingLookup.value = true
  setInventoryMessage('')

  const result = await adminStore.fetchInventoryRecord(lookupVariantId.value.trim())

  if (result.success) {
    useInventoryRecord(result.data)
    setInventoryMessage(
      result.data.recordExists
        ? 'Đã nạp hồ sơ tồn kho hiện có cho biến thể này.'
        : 'Biến thể chưa có inventory record. Bạn có thể tạo mới ngay bên dưới.',
      result.data.recordExists ? 'success' : 'warning',
    )
  } else {
    setInventoryMessage(result.error, 'danger')
  }

  loadingLookup.value = false
}

async function submitInventoryRecord() {
  const variantId = inventoryDraft.value.variantId.trim()
  const stockQuantity = Number(inventoryDraft.value.stockQuantity)
  const lowStockThreshold = Number(inventoryDraft.value.lowStockThreshold)

  if (!variantId) {
    setInventoryMessage('Trường `variantId` là bắt buộc.', 'danger')
    return
  }

  if (stockQuantity < 0 || lowStockThreshold < 0) {
    setInventoryMessage('Số lượng tồn và ngưỡng cảnh báo phải lớn hơn hoặc bằng 0.', 'danger')
    return
  }

  loadingLookup.value = true

  const payload = {
    variantId,
    stockQuantity,
    lowStockThreshold,
  }

  const result = inventoryRecord.value?.recordExists
    ? await adminStore.updateInventoryRecord(variantId, {
        stockQuantity: payload.stockQuantity,
        lowStockThreshold: payload.lowStockThreshold,
      })
    : await adminStore.createInventoryRecord(payload)

  if (result.success) {
    useInventoryRecord(result.data)
    lookupVariantId.value = result.data.variantId || variantId
    setInventoryMessage(
      inventoryRecord.value?.recordExists
        ? 'Đã đồng bộ thay đổi tồn kho với catalog.'
        : 'Đã tạo inventory record mới và cập nhật trạng thái còn hàng.',
      'success',
    )
    await loadLowStockRecords()
  } else {
    setInventoryMessage(result.error, 'danger')
  }

  loadingLookup.value = false
}

async function readInventoryBatch() {
  const variantIds = batchVariantIds.value
    .split(/\s|,|\|/g)
    .map((item) => item.trim())
    .filter(Boolean)

  if (variantIds.length === 0) {
    batchError.value = 'Nhập ít nhất một `variantId` để đọc batch.'
    return
  }

  loadingBatch.value = true
  batchError.value = ''

  const result = await adminStore.batchReadInventory(variantIds)

  if (result.success) {
    batchResults.value = result.data
  } else {
    batchResults.value = []
    batchError.value = result.error
  }

  loadingBatch.value = false
}

function hydrateFromLowStock(record) {
  lookupVariantId.value = record.variantId || ''
  useInventoryRecord(record)
  setInventoryMessage('Đã nạp bản ghi low stock vào workbench chỉnh sửa.', 'warning')
}

watch(
  () => [lowStockFilters.value.query, lowStockFilters.value.stockState, lowStockFilters.value.sort, lowStockFilters.value.limit],
  () => {
    lowStockFilters.value.page = 1
  },
)

watch(
  () => lowStockPagination.value.totalPages,
  (totalPages) => {
    if (lowStockFilters.value.page > totalPages) {
      lowStockFilters.value.page = totalPages
    }
  },
)

onMounted(() => {
  loadLowStockRecords()
})
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Inventory Management</p>
        <h1 class="admin-page-title">Điều phối tồn kho theo variant</h1>
        <p class="admin-page-subtitle">
          Module inventory hiện xoay quanh exception handling: lookup record, cập nhật tồn và quản lý danh sách biến thể low stock.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="loadLowStockRecords">
          Làm mới cảnh báo
        </button>
      </div>
    </header>

    <div class="admin-note-block">
      <p>API inventory admin hiện phù hợp nhất với mô hình workbench: tra cứu theo `variantId`, chỉnh record và theo dõi low stock exception list.</p>
      <p>Do backend chưa có endpoint inventory list đầy đủ, data table của trang này tập trung vào các record cần chú ý nhất.</p>
    </div>

    <div
      v-if="inventoryMessage"
      class="admin-alert"
      :class="{
        'admin-alert-success': inventoryTone === 'success',
        'admin-alert-warning': inventoryTone === 'warning',
        'admin-alert-danger': inventoryTone === 'danger',
      }"
    >
      {{ inventoryMessage }}
    </div>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Low Stock Records</p>
        <p class="admin-stat-value">{{ formatNumber(lowStockCount) }}</p>
        <p class="admin-stat-note">Tổng số inventory record đang nằm dưới ngưỡng cảnh báo.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Out Of Stock</p>
        <p class="admin-stat-value">{{ formatNumber(outOfStockCount) }}</p>
        <p class="admin-stat-note">Các record trong danh sách low stock đã hết hàng hoàn toàn.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Units At Risk</p>
        <p class="admin-stat-value">{{ formatNumber(atRiskUnits) }}</p>
        <p class="admin-stat-note">Tổng số lượng còn lại của các variant đang cần ưu tiên theo dõi.</p>
      </article>
    </div>

    <div class="admin-content-grid admin-content-grid-wide-right">
      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Lookup & Update</p>
            <h2 class="admin-card-title">Inventory workbench</h2>
          </div>
        </div>

        <form class="admin-form-grid" @submit.prevent="lookupInventoryRecord">
          <label class="admin-field">
            <span class="admin-label">Variant ID</span>
            <input
              v-model="lookupVariantId"
              class="admin-input"
              type="text"
              placeholder="65f000000000000000000302"
            />
          </label>

          <div class="admin-button-row">
            <button type="submit" class="admin-button admin-button-secondary" :disabled="loadingLookup">
              {{ loadingLookup ? 'Đang tra cứu...' : 'Tra cứu hồ sơ' }}
            </button>
          </div>
        </form>

        <form class="admin-form-grid" @submit.prevent="submitInventoryRecord">
          <div class="admin-two-column-grid">
            <label class="admin-field">
              <span class="admin-label">Variant ID áp dụng</span>
              <input v-model="inventoryDraft.variantId" class="admin-input" type="text" />
            </label>

            <label class="admin-field">
              <span class="admin-label">Tồn kho hiện tại</span>
              <input v-model.number="inventoryDraft.stockQuantity" class="admin-input" type="number" min="0" />
            </label>
          </div>

          <label class="admin-field">
            <span class="admin-label">Ngưỡng cảnh báo low stock</span>
            <input
              v-model.number="inventoryDraft.lowStockThreshold"
              class="admin-input"
              type="number"
              min="0"
            />
          </label>

          <div v-if="inventoryRecord" class="admin-note-block">
            <p>`recordExists`: <strong>{{ inventoryRecord.recordExists ? 'true' : 'false' }}</strong></p>
            <p>`isInStock`: <strong>{{ inventoryRecord.isInStock ? 'true' : 'false' }}</strong> • `isLowStock`: <strong>{{ inventoryRecord.isLowStock ? 'true' : 'false' }}</strong></p>
            <p>Cập nhật gần nhất: <strong>{{ formatDate(inventoryRecord.updatedAt) || 'Chưa có' }}</strong></p>
          </div>

          <div class="admin-button-row">
            <button type="submit" class="admin-button admin-button-primary" :disabled="loadingLookup">
              {{ loadingLookup ? 'Đang lưu...' : inventoryActionLabel }}
            </button>
          </div>
        </form>
      </section>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Batch Read</p>
            <h2 class="admin-card-title">Kiểm tra nhiều variant cùng lúc</h2>
          </div>
        </div>

        <form class="admin-form-grid" @submit.prevent="readInventoryBatch">
          <label class="admin-field">
            <span class="admin-label">Danh sách Variant ID</span>
            <textarea
              v-model="batchVariantIds"
              class="admin-textarea"
              rows="6"
              placeholder="Dán nhiều variantId, phân tách bằng dấu cách, dấu phẩy hoặc xuống dòng."
            />
          </label>

          <div v-if="batchError" class="admin-alert admin-alert-danger">
            {{ batchError }}
          </div>

          <div class="admin-button-row">
            <button type="submit" class="admin-button admin-button-secondary" :disabled="loadingBatch">
              {{ loadingBatch ? 'Đang đọc...' : 'Đọc batch' }}
            </button>
          </div>
        </form>

        <div v-if="batchResults.length" class="admin-table-shell">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Variant ID</th>
                <th>Tồn kho</th>
                <th>Còn hàng</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in batchResults" :key="record.variantId">
                <td>{{ record.variantId }}</td>
                <td>{{ formatNumber(record.stockQuantity) }}</td>
                <td>
                  <span class="admin-status-pill" :data-tone="record.isInStock ? 'success' : 'warning'">
                    {{ record.isInStock ? 'Có' : 'Không' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="admin-card admin-filter-bar">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Exception List</p>
          <h2 class="admin-card-title">Low stock data table</h2>
        </div>

        <div class="admin-table-meta">
          <span>{{ formatNumber(lowStockPagination.total) }} kết quả</span>
          <span>Trang {{ lowStockPagination.page }}/{{ lowStockPagination.totalPages }}</span>
        </div>
      </div>

      <div class="admin-four-column-grid">
        <label class="admin-field">
          <span class="admin-label">Tìm theo variant ID</span>
          <input
            v-model="lowStockFilters.query"
            class="admin-input"
            type="search"
            placeholder="Nhập variant ID"
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Loại cảnh báo</span>
          <select v-model="lowStockFilters.stockState" class="admin-select">
            <option value="all">Tất cả</option>
            <option value="low">Sắp cạn</option>
            <option value="out">Hết hàng</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Sắp xếp</span>
          <select v-model="lowStockFilters.sort" class="admin-select">
            <option v-for="option in lowStockSortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Số dòng / trang</span>
          <select v-model.number="lowStockFilters.limit" class="admin-select">
            <option v-for="size in lowStockPageSizeOptions" :key="size" :value="size">
              {{ size }} dòng
            </option>
          </select>
        </label>
      </div>

      <div class="admin-button-row">
        <button type="button" class="admin-button admin-button-secondary" @click="resetLowStockFilters">
          Đặt lại bộ lọc
        </button>
      </div>
    </section>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Low Stock Records</p>
          <h2 class="admin-card-title">Danh sách record cần xử lý</h2>
        </div>
      </div>

      <div v-if="lowStockError" class="admin-alert admin-alert-danger">
        {{ lowStockError }}
      </div>

      <div v-if="loadingLowStock" class="admin-empty-state">Đang tải cảnh báo low stock...</div>

      <div v-else-if="visibleLowStockRecords.length === 0" class="admin-empty-state">
        Chưa có inventory record nào khớp bộ lọc hiện tại.
      </div>

      <div v-else class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Variant ID</th>
              <th>Tồn kho</th>
              <th>Ngưỡng</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in visibleLowStockRecords" :key="record.id || record.variantId">
              <td>{{ record.variantId }}</td>
              <td>{{ formatNumber(record.stockQuantity) }}</td>
              <td>{{ formatNumber(record.lowStockThreshold ?? 0) }}</td>
              <td>
                <span class="admin-status-pill" :data-tone="record.isInStock ? 'warning' : 'danger'">
                  {{ record.isInStock ? 'Sắp cạn' : 'Hết hàng' }}
                </span>
              </td>
              <td>{{ formatDate(record.updatedAt) }}</td>
              <td class="admin-table-actions-cell">
                <button type="button" class="admin-inline-link" @click="hydrateFromLowStock(record)">
                  Mở workbench
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="lowStockPagination.totalPages > 1" class="admin-pagination">
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="lowStockPagination.page <= 1"
          @click="goToLowStockPage(lowStockPagination.page - 1)"
        >
          Trang trước
        </button>
        <span class="admin-pagination-label">
          Trang {{ lowStockPagination.page }} / {{ lowStockPagination.totalPages }}
        </span>
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="lowStockPagination.page >= lowStockPagination.totalPages"
          @click="goToLowStockPage(lowStockPagination.page + 1)"
        >
          Trang sau
        </button>
      </div>
    </section>
  </section>
</template>
