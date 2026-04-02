<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()

const filters = ref({
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
const importSummary = ref(null)
const importError = ref('')
const importing = ref(false)

const referenceOptions = computed(() => adminStore.referenceOptions)
const activeProducts = computed(() => products.value.filter((product) => product.status === 'active').length)
const draftProducts = computed(() => products.value.filter((product) => product.status === 'draft').length)
const inStockProducts = computed(() => products.value.filter((product) => product.hasInStockVariants).length)

const pageSizeOptions = [12, 24, 48]

function createProductMonogram(product) {
  const title = product.title.trim()
  return title ? title.slice(0, 1).toUpperCase() : 'P'
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

async function handleFilterSubmit() {
  filters.value.page = 1
  await loadProducts()
}

async function resetFilters() {
  filters.value = {
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

async function submitImport() {
  if (!importFile.value) {
    importError.value = 'Chọn một file CSV trước khi import.'
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
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Product Management</p>
        <h1 class="admin-page-title">Danh sách sản phẩm</h1>
        <p class="admin-page-subtitle">
          Trang list chuẩn enterprise admin: filter bar, data table, pagination và đường dẫn rõ ràng sang detail/form để xử lý CRUD.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="loadProducts">
          Tải lại
        </button>
        <RouterLink :to="{ name: 'admin-product-create' }" class="admin-button admin-button-primary">
          Tạo sản phẩm mới
        </RouterLink>
      </div>
    </header>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Tổng bản ghi</p>
        <p class="admin-stat-value">{{ formatNumber(meta.total) }}</p>
        <p class="admin-stat-note">Tổng số product khớp bộ lọc backend hiện tại.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Đang bán</p>
        <p class="admin-stat-value">{{ formatNumber(activeProducts) }}</p>
        <p class="admin-stat-note">Số product `active` trong trang dữ liệu vừa nạp.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Bản nháp</p>
        <p class="admin-stat-value">{{ formatNumber(draftProducts) }}</p>
        <p class="admin-stat-note">Các hồ sơ còn ở giai đoạn chuẩn bị nội dung/catalog.</p>
      </article>

      <article class="admin-stat-card">
        <p class="admin-stat-eyebrow">Có tồn kho</p>
        <p class="admin-stat-value">{{ formatNumber(inStockProducts) }}</p>
        <p class="admin-stat-note">Product đang có ít nhất một variant còn hàng.</p>
      </article>
    </div>

    <section class="admin-card admin-filter-bar">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Filter Bar</p>
          <h2 class="admin-card-title">Lọc và điều hướng danh sách</h2>
        </div>

        <p class="admin-muted-text">Bộ lọc hiện gọi trực tiếp API admin catalog và giữ nguyên logic paging backend.</p>
      </div>

      <form class="admin-form-grid" @submit.prevent="handleFilterSubmit">
        <div class="admin-four-column-grid">
          <label class="admin-field">
            <span class="admin-label">Trạng thái</span>
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
            <span class="admin-label">Hiển thị</span>
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
            <span class="admin-label">Sắp xếp</span>
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
            <span class="admin-label">Số dòng / trang</span>
            <select v-model.number="filters.limit" class="admin-select">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }} dòng
              </option>
            </select>
          </label>
        </div>

        <div class="admin-button-row">
          <button type="submit" class="admin-button admin-button-primary">
            Áp dụng bộ lọc
          </button>
          <button type="button" class="admin-button admin-button-secondary" @click="resetFilters">
            Đặt lại
          </button>
        </div>
      </form>
    </section>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Product List</p>
          <h2 class="admin-card-title">Bảng dữ liệu sản phẩm</h2>
        </div>

        <div class="admin-table-meta">
          <span>{{ formatNumber(meta.total) }} bản ghi</span>
          <span>Trang {{ meta.page }}/{{ meta.totalPages }}</span>
        </div>
      </div>

      <div v-if="pageError" class="admin-alert admin-alert-danger">
        {{ pageError }}
      </div>

      <div v-if="loading" class="admin-empty-state">Đang tải danh mục sản phẩm...</div>

      <div v-else-if="products.length === 0" class="admin-empty-state">
        Không có sản phẩm nào khớp bộ lọc hiện tại.
      </div>

      <div v-else class="admin-table-shell">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Mã nhóm</th>
              <th>Thương hiệu</th>
              <th>Trạng thái</th>
              <th>Giá niêm yết</th>
              <th>Biến thể</th>
              <th>Tồn kho</th>
              <th>Cập nhật</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td>
                <div class="admin-product-title-cell">
                  <div class="admin-monogram">{{ createProductMonogram(product) }}</div>
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
              <td>{{ product.brand?.name || product.brand?.code || 'Chưa rõ' }}</td>
              <td>
                <div class="admin-status-stack">
                  <span class="admin-status-pill" :data-tone="product.status">
                    {{ product.status }}
                  </span>
                  <span v-if="product.isDeleted" class="admin-status-pill" data-tone="danger">
                    soft deleted
                  </span>
                </div>
              </td>
              <td>{{ formatCurrency(product.minSalePrice, product.listingVariantSnapshot?.currency || 'VND') }}</td>
              <td>
                <span class="admin-status-pill" :data-tone="product.hasActiveVariants ? 'success' : 'muted'">
                  {{ product.hasActiveVariants ? 'Đã sẵn sàng bán' : 'Chưa sẵn sàng' }}
                </span>
              </td>
              <td>
                <span class="admin-status-pill" :data-tone="product.hasInStockVariants ? 'success' : 'warning'">
                  {{ product.hasInStockVariants ? 'Còn hàng' : 'Cần kiểm tra tồn' }}
                </span>
              </td>
              <td>{{ formatDate(product.updatedAt) }}</td>
              <td class="admin-table-actions-cell">
                <RouterLink
                  :to="{ name: 'admin-product-detail', params: { productId: product.id } }"
                  class="admin-inline-link"
                >
                  Xem chi tiết
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
          Trang trước
        </button>
        <span class="admin-pagination-label">Trang {{ meta.page }} / {{ meta.totalPages }}</span>
        <button
          type="button"
          class="admin-button admin-button-secondary"
          :disabled="meta.page >= meta.totalPages"
          @click="goToPage(meta.page + 1)"
        >
          Trang sau
        </button>
      </div>
    </section>

    <section class="admin-card">
      <div class="admin-card-header">
        <div>
          <p class="admin-section-kicker">Bulk Import</p>
          <h2 class="admin-card-title">Import CSV catalog</h2>
        </div>
      </div>

      <form class="admin-form-grid" @submit.prevent="submitImport">
        <label class="admin-field">
          <span class="admin-label">File CSV</span>
          <input class="admin-input" type="file" accept=".csv,text/csv" @change="handleImportSelection" />
        </label>

        <p class="admin-muted-text">
          Backend yêu cầu đầy đủ cột product và variant. Import hoạt động theo cơ chế upsert qua `productGroupCode` và `sku`.
        </p>

        <div v-if="importError" class="admin-alert admin-alert-danger">
          {{ importError }}
        </div>

        <div v-if="importSummary?.meta" class="admin-note-block">
          <p>Row count: <strong>{{ formatNumber(importSummary.meta.rowCount) }}</strong></p>
          <p>Product count: <strong>{{ formatNumber(importSummary.meta.productCount) }}</strong></p>
          <p>Variant count: <strong>{{ formatNumber(importSummary.meta.variantCount) }}</strong></p>
        </div>

        <div class="admin-button-row">
          <button type="submit" class="admin-button admin-button-primary" :disabled="importing">
            {{ importing ? 'Đang import...' : 'Chạy import CSV' }}
          </button>
        </div>
      </form>
    </section>
  </section>
</template>
