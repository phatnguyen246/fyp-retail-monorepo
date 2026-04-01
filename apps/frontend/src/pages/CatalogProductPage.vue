<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFiltersPanel from '../components/catalog/CatalogFiltersPanel.vue'
import CatalogToolbar from '../components/catalog/CatalogToolbar.vue'
import ProductGrid from '../components/catalog/ProductGrid.vue'
import CatalogPagination from '../components/catalog/CatalogPagination.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { useCatalogStore } from '../store/catalog'
import { formatNumber } from '../services/formatters'

const catalogStore = useCatalogStore()
const searchDraft = ref(catalogStore.filters.search)
const catalogContentRef = ref(null)
let searchTimerId = null

const pageTitle = computed(() => {
  return catalogStore.filters.search
    ? `Kết quả cho "${catalogStore.filters.search}"`
    : 'Danh mục smartphone'
})

const pageSubtitle = computed(() => {
  return catalogStore.filters.search
    ? 'Đây là tập sản phẩm phù hợp nhất với truy vấn và hệ filter storefront hiện tại.'
    : 'Khám phá tuyển chọn smartphone hiệu năng cao từ catalog storefront của hệ thống.'
})

const resultLabel = computed(() => {
  if (catalogStore.meta.total === 0) {
    return 'Không có kết quả'
  }

  const start = (catalogStore.meta.page - 1) * catalogStore.meta.limit + 1
  const end = Math.min(catalogStore.meta.page * catalogStore.meta.limit, catalogStore.meta.total)

  return `Hiển thị ${start}-${end} trên ${formatNumber(catalogStore.meta.total)}`
})

function scrollCatalogToTop() {
  const element = catalogContentRef.value

  if (!element) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  const top = window.scrollY + element.getBoundingClientRect().top - 24

  window.scrollTo({
    top: Math.max(top, 0),
    behavior: 'smooth',
  })
}

function handlePageChange(page) {
  catalogStore.setPage(page)

  nextTick(() => {
    scrollCatalogToTop()
  })
}

watch(searchDraft, (value) => {
  window.clearTimeout(searchTimerId)

  searchTimerId = window.setTimeout(() => {
    catalogStore.setSearch(value)
  }, 300)
})

watch(
  () => catalogStore.filters.search,
  (value) => {
    if (value !== searchDraft.value) {
      searchDraft.value = value
    }
  },
)

watch(
  () => catalogStore.requestSignature,
  () => {
    catalogStore.fetchProducts()
  },
  { immediate: true },
)

catalogStore.fetchOptions()

onBeforeUnmount(() => {
  window.clearTimeout(searchTimerId)
})
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <CatalogTopNav
        :search-value="searchDraft"
        @update:search="searchDraft = $event"
      />

      <div class="grid min-h-[calc(100vh-5rem)] xl:grid-cols-[var(--catalog-sidebar-width)_minmax(0,1fr)]">
        <CatalogFiltersPanel
          :filters="catalogStore.filters"
          :has-pending-changes="catalogStore.hasPendingSidebarFilterChanges"
          :options="catalogStore.options"
          @apply-filters="catalogStore.applySidebarFilters"
          @clear-filters="catalogStore.clearFilters"
          @set-tag="catalogStore.setTag"
          @set-brand="catalogStore.setBrand"
          @toggle-ram="catalogStore.toggleRam"
          @toggle-rom="catalogStore.toggleRom"
          @toggle-color="catalogStore.toggleColor"
          @update:max-price="catalogStore.setMaxPrice"
          @update:min-price="catalogStore.setMinPrice"
        />

        <main
          ref="catalogContentRef"
          class="bg-white px-6 py-8 lg:px-10 xl:px-12 2xl:px-20 2xl:py-12"
        >
          <CatalogToolbar
            :active-filters="catalogStore.activeFilterChips"
            :result-label="resultLabel"
            :sort-mode="catalogStore.filters.sortMode"
            :sort-options="catalogStore.options.sortModes"
            :subtitle="pageSubtitle"
            :title="pageTitle"
            @change-sort="catalogStore.setSortMode"
            @clear-filters="catalogStore.clearFilters"
            @remove-filter="catalogStore.removeFilter"
          />

          <ProductGrid
            :error-message="catalogStore.errorMessage"
            :has-filters="catalogStore.hasActiveFilters"
            :loading="catalogStore.loading"
            :products="catalogStore.products"
            :search-term="catalogStore.filters.search"
            @retry="catalogStore.fetchProducts"
          />

          <CatalogPagination
            v-if="catalogStore.meta.totalPages > 1 && !catalogStore.loading && !catalogStore.errorMessage"
            :page="catalogStore.meta.page"
            :total-pages="catalogStore.meta.totalPages"
            @change-page="handlePageChange"
          />
        </main>
      </div>

      <CatalogFooter />
    </div>
  </div>
</template>
