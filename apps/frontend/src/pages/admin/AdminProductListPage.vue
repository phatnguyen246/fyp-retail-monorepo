<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()

const filters = ref({
  query: '',
  status: 'all',
  deleted: 'false',
  sort: 'updatedAt:desc',
  page: 1,
  limit: 12,
})

const loading = ref(true)
const products = ref([])
const meta = ref({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
})
const pageError = ref('')
const importFile = ref(null)
const importFileInputRef = ref(null)
const importSummary = ref(null)
const importError = ref('')
const importing = ref(false)
const importModalOpen = ref(false)

const referenceOptions = computed(() => adminStore.referenceOptions)
const activeProducts = computed(() => products.value.filter((product) => product.status === 'active').length)
const draftProducts = computed(() => products.value.filter((product) => product.status === 'draft').length)
const inStockProducts = computed(() => products.value.filter((product) => product.hasInStockVariants).length)
const filteredProducts = computed(() => {
  const query = filters.value.query.trim().toLowerCase()

  if (!query) {
    return products.value
  }

  return products.value.filter((product) =>
    [
      product.title,
      product.productGroupCode,
      product.listingVariantSnapshot?.sku,
      product.listingVariantSnapshot?.ram,
      product.listingVariantSnapshot?.rom,
      product.listingVariantSnapshot?.colorFullName,
      product.listingVariantSnapshot?.color,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  )
})

const pageSizeOptions = [12, 24, 48]

function getProductStatusLabel(status) {
  const options = referenceOptions.value?.productStatuses || []
  return options.find((option) => option.value === status)?.label || status || 'Not available'
}

async function loadProducts() {
  loading.value = true
  pageError.value = ''

  const result = await adminStore.fetchAdminProducts(filters.value)

  if (result.success) {
    products.value = result.data.items
    meta.value = result.data.meta
  } else {
    pageError.value = result.error
  }

  loading.value = false
}

async function resetFilters() {
  filters.value = {
    query: '',
    status: 'all',
    deleted: 'false',
    sort: 'updatedAt:desc',
    page: 1,
    limit: 12,
  }
  await loadProducts()
}

async function goToPage(page) {
  filters.value.page = page
  await loadProducts()
}

function handleImportSelection(event) {
  importFile.value = event.target.files?.[0] ?? null
}

function openFilePicker() {
  importFileInputRef.value?.click()
}

function openImportModal() {
  importError.value = ''
  importModalOpen.value = true
}

function closeImportModal() {
  importModalOpen.value = false
}

async function submitImport() {
  if (!importFile.value) {
    importError.value = 'Please choose a CSV file before importing.'
    return
  }

  importing.value = true
  importError.value = ''

  const result = await adminStore.importProducts(importFile.value)

  if (result.success) {
    importSummary.value = {
      ...result.data,
      meta: result.meta,
    }
    importFile.value = null
    await loadProducts()
  } else {
    importSummary.value = null
    importError.value = result.error
  }

  importing.value = false
}

onMounted(async () => {
  await adminStore.ensureReferenceOptions()
  await loadProducts()
})

watch(
  () => [filters.value.status, filters.value.deleted, filters.value.sort, filters.value.limit],
  async (_, previousValues) => {
    if (!previousValues) {
      return
    }

    filters.value.page = 1
    await loadProducts()
  },
)
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Product Management</p>
        <h1 class="admin-page-title">Product List</h1>
        <p class="admin-page-subtitle">
          Monitor the product catalog, filter quickly for operations, and open detail pages for business updates.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="loadProducts">
          Reload
        </button>
        <button type="button" class="admin-button admin-button-secondary" @click="openImportModal">
          Import CSV
        </button>
        <RouterLink :to="{ name: 'admin-product-create' }" class="admin-button admin-button-primary">
          Create product
        </RouterLink>
      </div>
    </header>

    <div class="admin-stat-grid admin-product-list-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Total records</p>
        <p class="admin-stat-value">{{ formatNumber(meta.total) }}</p>
        <p class="admin-stat-note">Total products under current filter conditions.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Active</p>
        <p class="admin-stat-value">{{ formatNumber(activeProducts) }}</p>
        <p class="admin-stat-note">Products currently available for sale.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Draft</p>
        <p class="admin-stat-value">{{ formatNumber(draftProducts) }}</p>
        <p class="admin-stat-note">Products still in content preparation stage.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">In stock</p>
        <p class="admin-stat-value">{{ formatNumber(inStockProducts) }}</p>
        <p class="admin-stat-note">Products with at least one variant currently in stock.</p>
      </article>
    </div>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Product Catalog</p>
          <h2 class="admin-card-title">Product Data Table</h2>
        </div>

        <div class="admin-table-meta">
          <span>{{ formatNumber(meta.total) }} records</span>
          <span>Page {{ meta.page }}/{{ meta.totalPages }}</span>
        </div>
      </div>

      <div class="admin-form-grid">
        <div class="admin-product-list-filter-grid">
          <label class="admin-field">
            <span class="admin-label-row">
              <span class="admin-label">Search</span>
              <span
                class="admin-field-hint"
                title="You can enter product name, group code, SKU, or variant specs such as RAM/ROM/color."
                tabindex="0"
                data-tooltip="You can enter product name, group code, SKU, or variant specs such as RAM/ROM/color."
                aria-label="Search: You can enter product name, group code, SKU, or variant specs such as RAM/ROM/color."
              >
                ?
              </span>
            </span>
            <input
              v-model="filters.query"
              class="admin-input"
              type="search"
              placeholder="Example: iPhone, 256GB Black, SKU..."
            />
          </label>

          <label class="admin-field">
            <span class="admin-label">Status</span>
            <select v-model="filters.status" class="admin-select">
              <option
                v-for="option in referenceOptions.listStatusFilters"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="admin-field">
            <span class="admin-label">Visibility</span>
            <select v-model="filters.deleted" class="admin-select">
              <option
                v-for="option in referenceOptions.deletedFilters"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="admin-field">
            <span class="admin-label">Sort</span>
            <select v-model="filters.sort" class="admin-select">
              <option
                v-for="option in referenceOptions.productSortOptions"
                :key="option.value"
                :value="option.value"
              >
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
            Reset
          </button>
        </div>
      </div>

      <div v-if="pageError" class="admin-alert admin-alert-danger">
        {{ pageError }}
      </div>

      <div v-if="loading" class="admin-empty-state">Loading product catalog...</div>

      <div v-else-if="filteredProducts.length === 0" class="admin-empty-state">
        No products match the current filters.
      </div>

      <div v-else class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Group Code</th>
              <th>Brand</th>
              <th>Status</th>
              <th>Listed Price</th>
              <th>Variant</th>
              <th>Inventory</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td>
                <div class="admin-product-title-cell">
                  <div>
                    <p class="admin-table-title">{{ product.title }}</p>
                    <p class="admin-table-subtitle">
                      {{ product.listingVariantSnapshot?.ram || 'N/A' }} /
                      {{ product.listingVariantSnapshot?.rom || 'N/A' }} /
                      {{ product.listingVariantSnapshot?.color || 'N/A' }}
                    </p>
                  </div>
                </div>
              </td>
              <td>
                <p class="admin-table-title">{{ product.productGroupCode }}</p>
                <p class="admin-table-subtitle">{{ product.id }}</p>
              </td>
              <td>{{ product.brand?.name || product.brand?.code || 'Unknown' }}</td>
              <td>
                <div class="admin-status-stack">
                  <span class="admin-status-pill" :data-tone="product.status">
                    {{ getProductStatusLabel(product.status) }}
                  </span>
                  <span v-if="product.isDeleted" class="admin-status-pill" data-tone="danger">
                    Hidden
                  </span>
                </div>
              </td>
              <td>{{ formatCurrency(product.minSalePrice, product.listingVariantSnapshot?.currency || 'VND') }}</td>
              <td>
                <span class="admin-status-pill" :data-tone="product.hasActiveVariants ? 'success' : 'muted'">
                  {{ product.hasActiveVariants ? 'Ready for sale' : 'Not ready' }}
                </span>
              </td>
              <td>
                <span class="admin-status-pill" :data-tone="product.hasInStockVariants ? 'success' : 'warning'">
                  {{ product.hasInStockVariants ? 'In stock' : 'Check inventory' }}
                </span>
              </td>
              <td>{{ formatDate(product.updatedAt) }}</td>
              <td class="admin-table-actions-cell">
                <RouterLink
                  :to="{ name: 'admin-product-detail', params: { productId: product.id } }"
                  class="admin-inline-link"
                >
                  View details
                </RouterLink>
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

    <div
      v-if="importModalOpen"
      class="admin-modal-backdrop"
      @click.self="closeImportModal"
    >
      <div class="admin-modal-panel" role="dialog" aria-modal="true">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Bulk Import</p>
            <h2 class="admin-card-title">Import Catalog from CSV</h2>
          </div>
          <button type="button" class="admin-button admin-button-secondary" @click="closeImportModal">
            Close
          </button>
        </div>

        <form class="admin-form-grid" @submit.prevent="submitImport">
          <label class="admin-field">
            <span class="admin-label">File CSV</span>
            <div class="admin-button-row">
              <button type="button" class="admin-button admin-button-secondary" @click="openFilePicker">
                Select CSV file
              </button>
              <span class="admin-muted-text">
                {{ importFile?.name || 'No file selected' }}
              </span>
            </div>
            <input
              ref="importFileInputRef"
              class="hidden"
              type="file"
              accept=".csv,text/csv"
              @change="handleImportSelection"
            />
          </label>

          <p class="admin-muted-text">
            The CSV must include complete product and variant data. The system matches by product group code and SKU for accurate updates.
          </p>

          <div v-if="importError" class="admin-alert admin-alert-danger">
            {{ importError }}
          </div>

          <div v-if="importSummary?.meta" class="admin-note-block">
            <p>Processed rows: <strong>{{ formatNumber(importSummary.meta.rowCount) }}</strong></p>
            <p>Products: <strong>{{ formatNumber(importSummary.meta.productCount) }}</strong></p>
            <p>Variants: <strong>{{ formatNumber(importSummary.meta.variantCount) }}</strong></p>
          </div>

          <div class="admin-button-row">
            <button type="submit" class="admin-button admin-button-primary" :disabled="importing">
              {{ importing ? 'Importing data...' : 'Start import' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-product-list-filter-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.admin-product-list-stat-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 1279px) {
  .admin-product-list-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 899px) {
  .admin-product-list-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .admin-product-list-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
