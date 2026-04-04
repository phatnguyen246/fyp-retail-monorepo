<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import { useAuthStore } from '../../store/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const commandQuery = ref('')
const isLogoutConfirmOpen = ref(false)
const isAccountMenuOpen = ref(false)
const accountMenuRef = ref(null)

const navigation = [
  {
    label: 'Tổng quan',
    routeName: 'admin-overview',
    description: 'Theo dõi số liệu chính và việc cần xử lý',
    keywords: ['dashboard', 'overview', 'kpi', 'summary'],
  },
  {
    label: 'Sản phẩm',
    routeName: 'admin-products',
    description: 'Quản lý danh mục, hồ sơ và tạo mới sản phẩm',
    keywords: ['catalog', 'product', 'sku', 'variant'],
  },
  {
    label: 'Tồn kho',
    routeName: 'admin-inventory',
    description: 'Kiểm tra tồn và cập nhật số lượng biến thể',
    keywords: ['inventory', 'stock', 'variant', 'warehouse'],
  },
  {
    label: 'Đơn hàng',
    routeName: 'admin-orders',
    description: 'Theo dõi đơn hàng và trạng thái thanh toán',
    keywords: ['order', 'payment', 'pending', 'confirmed'],
  },
]

const pageCaption = computed(() => {
  const activeItem = navigation.find((item) => item.routeName === route.name)

  if (activeItem) {
    return activeItem.label
  }

  if (typeof route.name === 'string' && route.name.startsWith('admin-product-')) {
    return 'Sản phẩm'
  }

  if (typeof route.name === 'string' && route.name.startsWith('admin-order-')) {
    return 'Đơn hàng'
  }

  return 'Bàn điều hành'
})

const pageMeta = computed(() => {
  if (route.name === 'admin-overview') {
    return {
      kicker: 'Quản trị',
      title: 'Tổng quan vận hành',
      subtitle: 'Theo dõi số liệu chính và các đầu việc cần ưu tiên hôm nay.',
    }
  }

  if (route.name === 'admin-products' || route.name === 'admin-product-create') {
    return {
      kicker: 'Quản trị',
      title: 'Quản lý sản phẩm',
      subtitle: 'Tra cứu, cập nhật và tạo mới sản phẩm trong danh mục.',
    }
  }

  if (route.name === 'admin-product-detail') {
    return {
      kicker: 'Quản trị',
      title: 'Hồ sơ sản phẩm',
      subtitle: 'Xem thông tin sản phẩm, biến thể, hình ảnh và tồn kho.',
    }
  }

  if (route.name === 'admin-inventory') {
    return {
      kicker: 'Quản trị',
      title: 'Quản lý tồn kho',
      subtitle: 'Kiểm tra mức tồn và cập nhật nhanh theo biến thể.',
    }
  }

  if (route.name === 'admin-orders') {
    return {
      kicker: 'Quản trị',
      title: 'Quản lý đơn hàng',
      subtitle: 'Theo dõi trạng thái và xử lý các đơn hàng cần thao tác.',
    }
  }

  if (route.name === 'admin-order-detail') {
    return {
      kicker: 'Quản trị',
      title: 'Hồ sơ đơn hàng',
      subtitle: 'Xem chi tiết đơn hàng và cập nhật trạng thái xử lý.',
    }
  }

  return {
    kicker: 'Quản trị',
    title: pageCaption.value,
    subtitle: 'Khu vực quản trị dành cho theo dõi và cập nhật dữ liệu cửa hàng.',
  }
})

const quickActions = [
  { label: 'Tạo sản phẩm', routeName: 'admin-product-create', keywords: ['create', 'new', 'product'] },
  { label: 'Sản phẩm', routeName: 'admin-products', keywords: ['catalog', 'products'] },
  { label: 'Đơn hàng', routeName: 'admin-orders', keywords: ['orders', 'pending'] },
  { label: 'Tồn kho', routeName: 'admin-inventory', keywords: ['inventory', 'stock'] },
]

const commandResults = computed(() => {
  const query = commandQuery.value.trim().toLowerCase()
  const entries = [
    ...navigation.map((item) => ({ ...item, type: 'module' })),
    ...quickActions.map((item) => ({ ...item, type: 'action', description: item.label })),
  ]

  if (!query) {
    return entries.slice(0, 5)
  }

  return entries.filter((item) => {
    const haystack = [
      item.label,
      item.description,
      ...(item.keywords || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
})

const userEmail = computed(() => authStore.user?.email || 'admin@retail.local')
const userInitials = computed(() =>
  userEmail.value
    .split('@')[0]
    .split(/[.\-_]/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('') || 'AD',
)

function isActive(item) {
  if (route.name === item.routeName) {
    return true
  }

  if (item.routeName === 'admin-products') {
    return route.name === 'admin-product-create' || route.name === 'admin-product-detail'
  }

  if (item.routeName === 'admin-orders') {
    return route.name === 'admin-order-detail'
  }

  return false
}

async function handleCommandSubmit() {
  const target = commandResults.value[0]

  if (!target) {
    return
  }

  commandQuery.value = ''
  await router.push({ name: target.routeName })
}

async function openCommandResult(result) {
  commandQuery.value = ''
  await router.push({ name: result.routeName })
}

function openLogoutConfirm() {
  isAccountMenuOpen.value = false
  isLogoutConfirmOpen.value = true
}

function closeLogoutConfirm() {
  isLogoutConfirmOpen.value = false
}

async function handleLogout() {
  await authStore.logout({ scope: 'admin' })
  closeLogoutConfirm()
  await router.push({ name: 'admin-login' })
}

function toggleAccountMenu() {
  isAccountMenuOpen.value = !isAccountMenuOpen.value
}

function closeAccountMenu() {
  isAccountMenuOpen.value = false
}

function handleDocumentClick(event) {
  if (!accountMenuRef.value?.contains(event.target)) {
    closeAccountMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-sidebar-chrome">
        <div class="admin-sidebar-brand">
          <p class="admin-sidebar-overline">Quản trị</p>
          <h1 class="admin-sidebar-title">Retail Admin</h1>
        </div>

        <nav class="admin-sidebar-nav" aria-label="Điều hướng quản trị">
          <RouterLink
            v-for="item in navigation"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="admin-nav-link"
            :class="{ 'admin-nav-link-active': isActive(item) }"
          >
            <strong>{{ item.label }}</strong>
          </RouterLink>
        </nav>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="admin-topbar-kicker">{{ pageMeta.kicker }}</p>
          <h2 class="admin-topbar-title">{{ pageMeta.title }}</h2>
          <p class="admin-topbar-subtitle">{{ pageMeta.subtitle }}</p>
        </div>

        <form class="admin-search-form" @submit.prevent="handleCommandSubmit">
          <input
            v-model="commandQuery"
            type="search"
            class="admin-search-input"
            placeholder="Tìm nhanh trang quản trị"
          />

          <div v-if="commandQuery && commandResults.length" class="admin-search-results">
            <button
              v-for="result in commandResults"
              :key="`${result.type}-${result.routeName}`"
              type="button"
              class="admin-search-result"
              @click="openCommandResult(result)"
            >
              <strong>{{ result.label }}</strong>
              <span>{{ result.description }}</span>
            </button>
          </div>
        </form>

        <div class="admin-topbar-actions">
          <div ref="accountMenuRef" class="admin-account-menu">
            <button
              type="button"
              class="admin-user-card admin-user-card-button"
              :aria-expanded="isAccountMenuOpen ? 'true' : 'false'"
              @click.stop="toggleAccountMenu"
            >
              <span class="admin-user-avatar">{{ userInitials }}</span>
              <span class="admin-user-meta">
                <strong>Tài khoản quản trị</strong>
                <span>{{ userEmail }}</span>
              </span>
            </button>

            <div v-if="isAccountMenuOpen" class="admin-account-dropdown">
              <button type="button" class="admin-account-dropdown-item" @click="openLogoutConfirm">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-page-body">
        <RouterView />
      </main>
    </div>
  </div>

  <ConfirmDialog
    :open="isLogoutConfirmOpen"
    title="Xác nhận đăng xuất"
    message="Phiên quản trị hiện tại sẽ kết thúc. Bạn có muốn tiếp tục không?"
    confirm-label="Đăng xuất"
    cancel-label="Ở lại"
    :loading="authStore.loading"
    @cancel="closeLogoutConfirm"
    @confirm="handleLogout"
  />
</template>
