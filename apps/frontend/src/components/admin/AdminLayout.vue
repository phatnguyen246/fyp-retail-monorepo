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
    label: 'Overview',
    routeName: 'admin-overview',
    description: 'Track core metrics and priority actions',
    keywords: ['dashboard', 'overview', 'kpi', 'summary'],
  },
  {
    label: 'Products',
    routeName: 'admin-products',
    description: 'Manage catalog, records, and create products',
    keywords: ['catalog', 'product', 'sku', 'variant'],
  },
  {
    label: 'Inventory',
    routeName: 'admin-inventory',
    description: 'Check stock and update variant quantities',
    keywords: ['inventory', 'stock', 'variant', 'warehouse'],
  },
  {
    label: 'Orders',
    routeName: 'admin-orders',
    description: 'Track orders and payment status',
    keywords: ['order', 'payment', 'pending', 'confirmed'],
  },
]

const pageCaption = computed(() => {
  const activeItem = navigation.find((item) => item.routeName === route.name)

  if (activeItem) {
    return activeItem.label
  }

  if (typeof route.name === 'string' && route.name.startsWith('admin-product-')) {
    return 'Products'
  }

  if (typeof route.name === 'string' && route.name.startsWith('admin-order-')) {
    return 'Orders'
  }

  return 'Dashboard'
})

const pageMeta = computed(() => {
  if (route.name === 'admin-overview') {
    return {
      kicker: 'Admin',
      title: 'Operations Overview',
      subtitle: 'Track key metrics and today’s priority tasks.',
    }
  }

  if (route.name === 'admin-products' || route.name === 'admin-product-create') {
    return {
      kicker: 'Admin',
      title: 'Product Management',
      subtitle: 'Find, update, and create products in the catalog.',
    }
  }

  if (route.name === 'admin-product-detail') {
    return {
      kicker: 'Admin',
      title: 'Product Record',
      subtitle: 'View product information, variants, media, and inventory.',
    }
  }

  if (route.name === 'admin-inventory') {
    return {
      kicker: 'Admin',
      title: 'Inventory Management',
      subtitle: 'Check stock levels and update variants quickly.',
    }
  }

  if (route.name === 'admin-orders') {
    return {
      kicker: 'Admin',
      title: 'Order Management',
      subtitle: 'Track status and process orders that need action.',
    }
  }

  if (route.name === 'admin-order-detail') {
    return {
      kicker: 'Admin',
      title: 'Order Record',
      subtitle: 'View order details and update processing status.',
    }
  }

  return {
    kicker: 'Admin',
    title: pageCaption.value,
    subtitle: 'Admin area for monitoring and updating store data.',
  }
})

const quickActions = [
  { label: 'Create Product', routeName: 'admin-product-create', keywords: ['create', 'new', 'product'] },
  { label: 'Products', routeName: 'admin-products', keywords: ['catalog', 'products'] },
  { label: 'Orders', routeName: 'admin-orders', keywords: ['orders', 'pending'] },
  { label: 'Inventory', routeName: 'admin-inventory', keywords: ['inventory', 'stock'] },
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
          <p class="admin-sidebar-overline">Admin</p>
          <h1 class="admin-sidebar-title">Retail Admin</h1>
        </div>

        <nav class="admin-sidebar-nav" aria-label="Admin navigation">
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
            placeholder="Quick search admin pages"
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
                <strong>Admin account</strong>
                <span>{{ userEmail }}</span>
              </span>
            </button>

            <div v-if="isAccountMenuOpen" class="admin-account-dropdown">
              <button type="button" class="admin-account-dropdown-item" @click="openLogoutConfirm">
                Sign out
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
    title="Confirm sign out"
    message="Your current admin session will end. Do you want to continue?"
    confirm-label="Sign out"
    cancel-label="Stay"
    :loading="authStore.loading"
    @cancel="closeLogoutConfirm"
    @confirm="handleLogout"
  />
</template>
