<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import { fetchCatalogProducts } from '../../services/catalog.service'
import { formatCurrency } from '../../services/formatters'
import { useAuthStore } from '../../store/auth'
import { useCartStore } from '../../store/cart'
import { useCompareStore } from '../../store/compare'
const authStore = useAuthStore()
const cartStore = useCartStore()
const compareStore = useCompareStore()
const route = useRoute()
const router = useRouter()
const isUserMenuOpen = ref(false)
const isAuthBootstrapPending = ref(true)
const isLogoutConfirmOpen = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const isSearchMenuOpen = ref(false)
const isSearching = ref(false)
const searchErrorMessage = ref('')
let searchTimerId = null
let latestSearchRequestId = 0

const searchMenuVisible = computed(() => {
  return isSearchMenuOpen.value && searchQuery.value.trim().length > 0
})

const activeNavGroup = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : ''

  if (['catalog-products', 'catalog-product-detail'].includes(routeName)) {
    return 'catalog'
  }

  if (['order-lookup', 'order-history', 'order-detail'].includes(routeName)) {
    return 'orders'
  }

  if (routeName === 'compare') {
    return 'compare'
  }

  return null
})

function getNavLinkClass(groupName) {
  if (activeNavGroup.value === groupName) {
    return 'border-b-2 border-[var(--catalog-primary)] pb-1 text-sm tracking-[0.18em] text-[var(--catalog-primary)] transition-colors'
  }

  return 'border-b-2 border-transparent pb-1 text-sm tracking-[0.18em] text-[var(--catalog-text-soft)] transition-colors hover:text-[var(--catalog-primary)]'
}

function resetSearchSuggestions() {
  searchResults.value = []
  searchErrorMessage.value = ''
  isSearching.value = false
}

function getSuggestionVariant(product) {
  return (
    product?.defaultSelectedVariant ||
    product?.listingVariantSnapshot ||
    product?.variantsSummary?.[0] ||
    null
  )
}

function getSuggestionMeta(product) {
  const variant = getSuggestionVariant(product)
  const variantLabel = [
    variant?.ram,
    variant?.rom,
    variant?.color,
  ]
    .filter(Boolean)
    .join(' / ')

  return [
    product?.brand?.name,
    variantLabel,
  ]
    .filter(Boolean)
    .join(' • ') || 'Xem chi tiết sản phẩm'
}

function getSuggestionPrice(product) {
  const variant = getSuggestionVariant(product)
  return formatCurrency(variant?.salePrice ?? product?.minSalePrice, variant?.currency ?? 'VND')
}

async function loadSearchSuggestions(keyword) {
  const requestId = ++latestSearchRequestId
  isSearching.value = true
  searchErrorMessage.value = ''

  try {
    const result = await fetchCatalogProducts({
      search: keyword,
      sortMode: 'newest',
      page: 1,
      limit: 10,
      ram: [],
      rom: [],
      color: [],
    })

    if (requestId !== latestSearchRequestId) {
      return
    }

    searchResults.value = result.items
  } catch (_error) {
    if (requestId !== latestSearchRequestId) {
      return
    }

    searchResults.value = []
    searchErrorMessage.value = 'Không thể tải gợi ý sản phẩm.'
  } finally {
    if (requestId === latestSearchRequestId) {
      isSearching.value = false
    }
  }
}

function handleSearchInput(event) {
  searchQuery.value = event.target.value
  isSearchMenuOpen.value = true
}

function handleSearchFocus() {
  if (searchQuery.value.trim()) {
    isSearchMenuOpen.value = true
  }
}

function closeSearchMenu() {
  isSearchMenuOpen.value = false
}

async function selectSearchResult(product) {
  const productId = String(product?.id ?? product?.productId ?? '').trim()

  if (!productId) {
    return
  }

  searchQuery.value = product?.title ?? searchQuery.value
  closeSearchMenu()

  await router.push({
    name: 'catalog-product-detail',
    params: {
      productId,
      slug: product?.slug ?? '',
    },
  })
}

async function handleSearchSubmit() {
  if (isSearching.value || searchResults.value.length === 0) {
    return
  }

  await selectSearchResult(searchResults.value[0])
}

function openLogoutConfirm() {
  isUserMenuOpen.value = false
  isLogoutConfirmOpen.value = true
}

function closeLogoutConfirm() {
  isLogoutConfirmOpen.value = false
}

async function handleLogout() {
  await authStore.logout()
  closeLogoutConfirm()
  await router.push({ name: 'login' })
}

watch(searchQuery, (value) => {
  const keyword = value.trim()

  window.clearTimeout(searchTimerId)

  if (!keyword) {
    latestSearchRequestId += 1
    resetSearchSuggestions()
    closeSearchMenu()
    return
  }

  isSearching.value = true
  searchErrorMessage.value = ''
  searchResults.value = []
  isSearchMenuOpen.value = true

  searchTimerId = window.setTimeout(() => {
    loadSearchSuggestions(keyword)
  }, 250)
})

watch(
  () => route.fullPath,
  () => {
    window.clearTimeout(searchTimerId)
    latestSearchRequestId += 1
    searchQuery.value = ''
    resetSearchSuggestions()
    closeSearchMenu()
    isUserMenuOpen.value = false
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(searchTimerId)
})

onMounted(async () => {
  try {
    await authStore.initialize('auto')
  } finally {
    isAuthBootstrapPending.value = false
  }
})

cartStore.fetchCart()
</script>

<template>
  <nav
    class="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-[var(--catalog-border-soft)] bg-white px-8 shadow-[0_10px_30px_rgba(26,28,28,0.05)] lg:px-8 2xl:px-12"
  >
    <div class="flex min-w-0 items-center gap-4 lg:gap-6">
      <RouterLink class="catalog-logo shrink-0 text-xl lg:text-2xl" :to="{ name: 'catalog-products' }">
        The Editorial Catalog
      </RouterLink>

      <div class="hidden h-8 w-px bg-[var(--catalog-border-soft)] md:block" aria-hidden="true" />

      <div class="hidden items-center gap-6 lg:gap-8 md:flex">
        <RouterLink
          :class="getNavLinkClass('catalog')"
          :to="{ name: 'catalog-products' }"
        >
          Sản phẩm
        </RouterLink>
        <RouterLink
          :to="{ name: 'order-lookup' }"
          :class="getNavLinkClass('orders')"
        >
          Tìm đơn hàng
        </RouterLink>
        <RouterLink
          :to="{ name: 'compare' }"
          :class="`${getNavLinkClass('compare')} relative`"
        >
          So sánh sản phẩm
          <span
            v-if="compareStore.count > 0"
            class="absolute -right-4 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--catalog-primary)] px-1 text-[10px] font-medium text-white"
          >
            {{ compareStore.count }}
          </span>
        </RouterLink>
      </div>
    </div>

    <div class="flex items-center gap-3 lg:gap-4 xl:gap-6">
      <div
        v-click-outside="closeSearchMenu"
        class="relative hidden xl:block"
      >
        <span
          class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--catalog-text-soft)]"
        >
          search
        </span>
        <form @submit.prevent="handleSearchSubmit">
          <input
            class="h-11 w-72 border border-transparent bg-[var(--catalog-surface-muted)] pl-10 pr-4 text-sm text-[var(--catalog-text)] outline-none transition focus:border-[var(--catalog-primary)]"
            placeholder="Tìm sản phẩm..."
            type="text"
            :value="searchQuery"
            @focus="handleSearchFocus"
            @input="handleSearchInput"
          />
        </form>

        <div
          v-if="searchMenuVisible"
          class="search-menu"
        >
          <div v-if="isSearching" class="search-menu-status">
            Đang tìm sản phẩm...
          </div>

          <div v-else-if="searchErrorMessage" class="search-menu-status search-menu-status--error">
            {{ searchErrorMessage }}
          </div>

          <div v-else-if="searchResults.length === 0" class="search-menu-status">
            Không tìm thấy sản phẩm phù hợp.
          </div>

          <div v-else class="search-menu-list">
            <button
              v-for="product in searchResults"
              :key="product.id ?? product.productId ?? product.slug"
              class="search-menu-item"
              type="button"
              @click="selectSearchResult(product)"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-[var(--catalog-text)]">
                  {{ product.title || 'Sản phẩm' }}
                </p>
                <p class="mt-1 truncate text-xs text-[var(--catalog-text-muted)]">
                  {{ getSuggestionMeta(product) }}
                </p>
              </div>
              <span class="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--catalog-primary)]">
                {{ getSuggestionPrice(product) }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <RouterLink :to="{ name: 'cart' }" class="catalog-icon-button relative" title="Giỏ hàng">
        <span class="material-symbols-outlined text-[var(--catalog-primary)]">shopping_bag</span>
        <span
          v-if="cartStore.summary.totalQuantity > 0"
          class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--catalog-primary)] text-xs font-medium text-white"
        >
          {{ cartStore.summary.totalQuantity }}
        </span>
      </RouterLink>

      <div v-click-outside="() => (isUserMenuOpen = false)" class="relative">
        <button
          v-if="isAuthBootstrapPending || !authStore.isAuthenticated"
          class="catalog-icon-button"
          type="button"
          :disabled="isAuthBootstrapPending"
          @click="router.push({ name: 'login' })"
        >
          <span class="material-symbols-outlined text-[var(--catalog-primary)]">person</span>
        </button>
        <button
          v-else
          class="catalog-icon-button"
          type="button"
          @click="isUserMenuOpen = !isUserMenuOpen"
        >
          <span class="material-symbols-outlined text-[var(--catalog-primary)]">person</span>
        </button>
        <div
          v-if="isUserMenuOpen && authStore.isAuthenticated"
          class="user-menu"
        >
          <div class="border-b border-[var(--catalog-border-soft)] px-4 py-3">
            <p class="text-sm">Đăng nhập với</p>
            <p class="truncate text-sm font-medium text-[var(--catalog-text)]">
              {{ authStore.user.email }}
            </p>
          </div>
          <div class="p-1">
            <RouterLink :to="{ name: 'account' }" class="user-menu-item">
              <span class="material-symbols-outlined">account_circle</span>
              Thông tin tài khoản
            </RouterLink>
            <RouterLink :to="{ name: 'order-history' }" class="user-menu-item">
              <span class="material-symbols-outlined">history</span>
              Lịch sử đơn hàng
            </RouterLink>
            <button class="user-menu-item" @click="openLogoutConfirm">
              <span class="material-symbols-outlined">logout</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <ConfirmDialog
    :open="isLogoutConfirmOpen"
    title="Xác nhận đăng xuất"
    message="Bạn có chắc muốn đăng xuất khỏi phiên hiện tại không?"
    confirm-label="Đăng xuất"
    cancel-label="Ở lại"
    :loading="authStore.loading"
    @cancel="closeLogoutConfirm"
    @confirm="handleLogout"
  />
</template>

<style scoped>
.search-menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  left: 0;
  width: 100%;
  min-width: 28rem;
  overflow: hidden;
  border: 1px solid var(--catalog-border-soft);
  background: white;
  box-shadow: 0 18px 40px rgba(26, 28, 28, 0.12);
  z-index: 20;
}

.search-menu-list {
  --catalog-search-row-height: 4.5rem;
  max-height: calc(var(--catalog-search-row-height) * 5);
  overflow-y: auto;
}

.search-menu-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  width: 100%;
  min-height: 4.5rem;
  padding: 0.875rem 1rem;
  text-align: left;
  background: white;
  border: none;
  border-bottom: 1px solid var(--catalog-border-soft);
  cursor: pointer;
  transition: background-color 150ms ease;
}

.search-menu-item:hover {
  background-color: var(--catalog-surface-muted);
}

.search-menu-item:last-child {
  border-bottom: none;
}

.search-menu-status {
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--catalog-text-muted);
}

.search-menu-status--error {
  color: var(--catalog-danger);
}

.user-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 16rem;
  background-color: white;
  border-radius: 0.375rem;
  border: 1px solid var(--catalog-border-soft);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  color: var(--catalog-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}

.user-menu-item:hover {
  background-color: var(--catalog-surface-muted);
  color: var(--catalog-text);
}

.user-menu-item .material-symbols-outlined {
  font-size: 1.25rem;
}
</style>
