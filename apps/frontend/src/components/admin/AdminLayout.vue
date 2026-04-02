<script setup>
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const commandQuery = ref('')

const navigation = [
  {
    label: 'Tổng quan',
    routeName: 'admin-overview',
    emblem: 'OV',
    description: 'KPI vận hành, cảnh báo và đơn hàng gần đây',
    keywords: ['dashboard', 'overview', 'kpi', 'summary'],
  },
  {
    label: 'Sản phẩm',
    routeName: 'admin-products',
    emblem: 'PR',
    description: 'Danh mục, import CSV và hồ sơ sản phẩm',
    keywords: ['catalog', 'product', 'sku', 'variant'],
  },
  {
    label: 'Tồn kho',
    routeName: 'admin-inventory',
    emblem: 'IV',
    description: 'Low stock, lookup variant và cập nhật tồn',
    keywords: ['inventory', 'stock', 'variant', 'warehouse'],
  },
  {
    label: 'Đơn hàng',
    routeName: 'admin-orders',
    emblem: 'OR',
    description: 'Workflow xử lý đơn và trạng thái thanh toán',
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
      kicker: 'Enterprise Admin Dashboard',
      title: 'Tổng quan vận hành',
      subtitle: 'Theo dõi KPI vận hành, các đơn cần xử lý và những biến thể đang chạm ngưỡng tồn kho thấp.',
    }
  }

  if (route.name === 'admin-products' || route.name === 'admin-product-create') {
    return {
      kicker: 'Catalog Operations',
      title: 'Quản lý sản phẩm',
      subtitle: 'Danh mục sản phẩm tập trung vào data table, CRUD rõ ràng và biểu mẫu bám sát dữ liệu backend.',
    }
  }

  if (route.name === 'admin-product-detail') {
    return {
      kicker: 'Catalog Operations',
      title: 'Hồ sơ sản phẩm',
      subtitle: 'Một workbench duy nhất cho product, variant, media và inventory ở cấp biến thể.',
    }
  }

  if (route.name === 'admin-inventory') {
    return {
      kicker: 'Inventory Control',
      title: 'Quản lý tồn kho',
      subtitle: 'Tập trung vào lookup, low stock exception list và các thao tác cập nhật tồn kho theo variant.',
    }
  }

  if (route.name === 'admin-orders') {
    return {
      kicker: 'Order Operations',
      title: 'Quản lý đơn hàng',
      subtitle: 'Theo dõi trạng thái đơn, lọc nghiệp vụ và xử lý các bước hợp lệ trong state machine hiện có.',
    }
  }

  if (route.name === 'admin-order-detail') {
    return {
      kicker: 'Order Operations',
      title: 'Hồ sơ đơn hàng',
      subtitle: 'Chi tiết đơn, lịch sử trạng thái, thông tin khách hàng và các action điều phối theo workflow.',
    }
  }

  return {
    kicker: 'Enterprise Admin Dashboard',
    title: pageCaption.value,
    subtitle: 'Khu vực quản trị tập trung vào dữ liệu và thao tác nghiệp vụ.',
  }
})

const quickActions = [
  { label: 'Tạo sản phẩm', routeName: 'admin-product-create', keywords: ['create', 'new', 'product'] },
  { label: 'Danh sách sản phẩm', routeName: 'admin-products', keywords: ['catalog', 'products'] },
  { label: 'Đơn hàng chờ xử lý', routeName: 'admin-orders', keywords: ['orders', 'pending'] },
  { label: 'Bàn tồn kho', routeName: 'admin-inventory', keywords: ['inventory', 'stock'] },
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

async function handleLogout() {
  await authStore.logout({ scope: 'admin' })
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-sidebar-chrome">
        <div class="admin-sidebar-brand">
          <p class="admin-sidebar-overline">Retail Operations</p>
          <h1 class="admin-sidebar-title">Admin Console</h1>
          <p class="admin-sidebar-note">
            Enterprise dashboard cho quản trị retail quy mô nhỏ, tối ưu cho desktop, dữ liệu dày và thao tác nhanh.
          </p>
        </div>

        <nav class="admin-sidebar-nav" aria-label="Điều hướng quản trị">
          <p class="admin-sidebar-meta-label">Modules</p>
          <RouterLink
            v-for="item in navigation"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="admin-nav-link"
            :class="{ 'admin-nav-link-active': isActive(item) }"
          >
            <span class="admin-nav-link-emblem">{{ item.emblem }}</span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </RouterLink>
        </nav>

        <div class="admin-sidebar-meta">
          <p class="admin-sidebar-meta-label">Tài khoản</p>
          <p class="admin-sidebar-meta-value">
            {{ userEmail }}
          </p>
          <p class="admin-sidebar-meta-label">Phiên hiện tại</p>
          <p class="admin-sidebar-meta-value">{{ pageCaption }}</p>
        </div>
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
            placeholder="Tìm module hoặc thao tác nhanh"
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
          <RouterLink :to="{ name: 'admin-product-create' }" class="admin-quick-link">
            Tạo sản phẩm
          </RouterLink>
          <RouterLink :to="{ name: 'admin-orders' }" class="admin-quick-link">
            Đơn hàng
          </RouterLink>

          <div class="admin-user-card">
            <span class="admin-user-avatar">{{ userInitials }}</span>
            <div class="admin-user-meta">
              <strong>{{ userEmail }}</strong>
              <span>{{ authStore.user?.role || 'admin' }}</span>
            </div>
          </div>

          <button type="button" class="admin-button admin-button-secondary" @click="handleLogout">
            Đăng xuất
          </button>
        </div>
      </header>

      <main class="admin-page-body">
        <RouterView />
      </main>
    </div>
  </div>
</template>
