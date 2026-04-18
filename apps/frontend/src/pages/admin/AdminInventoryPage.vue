<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { formatDate, formatNumber } from '../../services/formatters'
import { createInventoryDraft, useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()

const lookupVariantId = ref('')
const inventoryRecord = ref(null)
const inventoryDraft = ref(createInventoryDraft())
const inventoryWorkbenchModalOpen = ref(false)
const lowStockRecords = ref([])
const loadingLookup = ref(false)
const loadingLowStock = ref(false)
const inventoryMessage = ref('')
const inventoryTone = ref('success')
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
  { label: 'Stock: low to high', value: 'stockQuantity:asc' },
  { label: 'Stock: high to low', value: 'stockQuantity:desc' },
  { label: 'Most recently updated', value: 'updatedAt:desc' },
  { label: 'Threshold: low to high', value: 'lowStockThreshold:asc' },
]

const inventoryActionLabel = computed(() =>
  inventoryRecord.value?.recordExists ? 'Update inventory' : 'Create inventory record',
)

const outOfStockCount = computed(() => lowStockRecords.value.filter((record) => !record.isInStock).length)
const lowStockCount = computed(() => lowStockRecords.value.filter((record) => record.isLowStock).length)

const filteredLowStockRecords = computed(() => {
  const query = lowStockFilters.value.query.trim().toLowerCase()
  const [sortField, sortDirection] = lowStockFilters.value.sort.split(':')
  let rows = [...lowStockRecords.value]

  if (query) {
    rows = rows.filter((record) =>
      [
        record.productName,
        record.variantLabel,
        record.sku,
        record.productGroupCode,
        record.variantId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
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

function getRecordTitle(record) {
  return record?.productName || (record?.sku ? `SKU ${record.sku}` : 'Variant is not linked to a product')
}

function getRecordSubtitle(record) {
  const parts = [record?.variantLabel, record?.sku ? `SKU ${record.sku}` : null].filter(Boolean)

  if (parts.length > 0) {
    return parts.join(' • ')
  }

  return record?.variantId ? `Variant ID: ${record.variantId}` : 'Variant information is not available'
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
    setInventoryMessage('Please enter a variant ID to look up inventory.', 'danger')
    return
  }

  loadingLookup.value = true
  setInventoryMessage('')

  const result = await adminStore.fetchInventoryRecord(lookupVariantId.value.trim())

  if (result.success) {
    useInventoryRecord(result.data)
    setInventoryMessage(result.data.recordExists ? 'Existing inventory record loaded.' : 'This variant has no inventory record yet. You can create one here.', result.data.recordExists ? 'success' : 'warning')
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
    setInventoryMessage('Please enter a variant ID before saving inventory.', 'danger')
    return
  }

  if (stockQuantity < 0 || lowStockThreshold < 0) {
    setInventoryMessage('Stock quantity and low-stock threshold must be greater than or equal to 0.', 'danger')
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
        ? 'Inventory updated successfully.'
        : 'New inventory record created and stock status updated.',
      'success',
    )
    await loadLowStockRecords()
  } else {
    setInventoryMessage(result.error, 'danger')
  }

  loadingLookup.value = false
}

function hydrateFromLowStock(record) {
  lookupVariantId.value = record.variantId || ''
  useInventoryRecord(record)
  inventoryWorkbenchModalOpen.value = true
  setInventoryMessage('Low-stock record loaded into the edit workspace.', 'warning')
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
        <h1 class="admin-page-title">Variant Inventory Operations</h1>
        <p class="admin-page-subtitle">
          Monitor stock-risk variants, update inventory levels, and quickly handle records that need replenishment.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="loadLowStockRecords">
          Refresh alerts
        </button>
      </div>
    </header>

    <div class="admin-note-block">
      <p>This page focuses on trackable variants: quick lookup, stock updates, and low-stock processing.</p>
      <p>Data is prioritized with product and variant names for easier operations handling.</p>
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

    <div class="admin-stat-grid admin-inventory-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Low-stock records</p>
        <p class="admin-stat-value">{{ formatNumber(lowStockCount) }}</p>
        <p class="admin-stat-note">Total inventory records currently below threshold.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Out of stock</p>
        <p class="admin-stat-value">{{ formatNumber(outOfStockCount) }}</p>
        <p class="admin-stat-note">Records in the alert list with zero stock remaining.</p>
      </article>

    </div>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Low Stock Alerts</p>
          <h2 class="admin-card-title">Records Requiring Action</h2>
        </div>

        <div class="admin-table-meta">
          <span>{{ formatNumber(lowStockPagination.total) }} results</span>
          <span>Page {{ lowStockPagination.page }}/{{ lowStockPagination.totalPages }}</span>
        </div>
      </div>

      <div class="admin-inventory-filter-grid">
        <label class="admin-field">
          <span class="admin-label-row">
            <span class="admin-label">Search</span>
            <span
              class="admin-field-hint"
              title="You can enter product name, variant label, SKU, group code, or variant ID."
              tabindex="0"
              data-tooltip="You can enter product name, variant label, SKU, group code, or variant ID."
              aria-label="Search: You can enter product name, variant label, SKU, group code, or variant ID."
            >
              ?
            </span>
          </span>
          <input
            v-model="lowStockFilters.query"
            class="admin-input"
            type="search"
            placeholder="Example: iPhone, 256GB Black, SKU..."
          />
        </label>

        <label class="admin-field">
          <span class="admin-label">Alert Type</span>
          <select v-model="lowStockFilters.stockState" class="admin-select">
            <option value="all">All</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Sort</span>
          <select v-model="lowStockFilters.sort" class="admin-select">
            <option v-for="option in lowStockSortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span class="admin-label">Rows per page</span>
          <select v-model.number="lowStockFilters.limit" class="admin-select">
            <option v-for="size in lowStockPageSizeOptions" :key="size" :value="size">
              {{ size }} rows
            </option>
          </select>
        </label>
      </div>

      <div class="admin-button-row">
        <button type="button" class="admin-button admin-button-secondary" @click="resetLowStockFilters">
          Reset filters
        </button>
      </div>

      <div v-if="lowStockError" class="admin-alert admin-alert-danger">
        {{ lowStockError }}
      </div>

      <div v-if="loadingLowStock" class="admin-empty-state">Loading low-stock records...</div>

      <div v-else-if="visibleLowStockRecords.length === 0" class="admin-empty-state">
        No inventory records match the current filters.
      </div>

      <div v-else class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>Stock</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in visibleLowStockRecords" :key="record.id || record.variantId">
              <td>
                <p class="admin-table-title">{{ getRecordTitle(record) }}</p>
                <p class="admin-table-subtitle">{{ record.productGroupCode || 'No group code' }}</p>
              </td>
              <td>
                <p class="admin-table-title">{{ record.variantLabel || 'No variant description' }}</p>
                <p class="admin-table-subtitle">
                  {{ record.sku ? `SKU ${record.sku}` : `Variant ID: ${record.variantId || 'Not available'}` }}
                </p>
              </td>
              <td>{{ formatNumber(record.stockQuantity) }}</td>
              <td>{{ formatNumber(record.lowStockThreshold ?? 0) }}</td>
              <td>
                <span class="admin-status-pill" :data-tone="record.isInStock ? 'warning' : 'danger'">
                  {{ record.isInStock ? 'Low stock' : 'Out of stock' }}
                </span>
              </td>
              <td>{{ formatDate(record.updatedAt) }}</td>
              <td class="admin-table-actions-cell">
                <button type="button" class="admin-inline-link" @click="hydrateFromLowStock(record)">
                  Open editor
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
          Previous
        </button>
        <span class="admin-pagination-label">
          Page {{ lowStockPagination.page }} / {{ lowStockPagination.totalPages }}
        </span>
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="lowStockPagination.page >= lowStockPagination.totalPages"
          @click="goToLowStockPage(lowStockPagination.page + 1)"
        >
          Next
        </button>
      </div>
    </section>

    <div
      v-if="inventoryWorkbenchModalOpen"
      class="admin-modal-backdrop"
      @click.self="inventoryWorkbenchModalOpen = false"
    >
      <div class="admin-modal-panel admin-modal-panel-wide" role="dialog" aria-modal="true">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Record Detail</p>
            <h2 class="admin-card-title">Update Inventory</h2>
          </div>
          <button
            type="button"
            class="admin-button admin-button-secondary"
            @click="inventoryWorkbenchModalOpen = false"
          >
            Close
          </button>
        </div>

        <div class="admin-note-block">
          <p>
            Variant ID: <strong>{{ inventoryDraft.variantId || lookupVariantId || 'Not available' }}</strong>
          </p>
          <p v-if="inventoryRecord?.updatedAt">
            Last updated: <strong>{{ formatDate(inventoryRecord.updatedAt) }}</strong>
          </p>
        </div>

        <form class="admin-form-grid" @submit.prevent="submitInventoryRecord">
          <div class="admin-two-column-grid">
            <label class="admin-field">
              <span class="admin-label">Current Stock</span>
              <input v-model.number="inventoryDraft.stockQuantity" class="admin-input" type="number" min="0" />
            </label>

            <label class="admin-field">
              <span class="admin-label">Low-stock threshold</span>
              <input
                v-model.number="inventoryDraft.lowStockThreshold"
                class="admin-input"
                type="number"
                min="0"
              />
            </label>
          </div>

          <div v-if="inventoryRecord" class="admin-note-block">
            <p>Inventory record: <strong>{{ inventoryRecord.recordExists ? 'Exists' : 'Not created' }}</strong></p>
            <p>Product: <strong>{{ getRecordTitle(inventoryRecord) }}</strong></p>
            <p>Variant: <strong>{{ getRecordSubtitle(inventoryRecord) }}</strong></p>
            <p>
              Stock status: <strong>{{ inventoryRecord.isInStock ? 'In stock' : 'Out of stock' }}</strong> •
              Alert level: <strong>{{ inventoryRecord.isLowStock ? 'Low stock' : 'Stable' }}</strong>
            </p>
            <p>Last updated: <strong>{{ formatDate(inventoryRecord.updatedAt) || 'Not available' }}</strong></p>
          </div>

          <div class="admin-button-row">
            <button type="submit" class="admin-button admin-button-primary" :disabled="loadingLookup">
              {{ loadingLookup ? 'Saving...' : inventoryActionLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-inventory-filter-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-inventory-stat-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1279px) {
  .admin-inventory-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .admin-inventory-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .admin-inventory-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
