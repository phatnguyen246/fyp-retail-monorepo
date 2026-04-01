<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import { useCartStore } from '../../store/cart'
import { ref } from 'vue'

defineProps({
  searchValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:search'])
const authStore = useAuthStore()
const cartStore = useCartStore()
const router = useRouter()
const isUserMenuOpen = ref(false)

function onSearchInput(event) {
  emit('update:search', event.target.value)
}

async function handleLogout() {
  await authStore.logout()
  isUserMenuOpen.value = false
  await router.push({ name: 'login' })
}

cartStore.fetchCart()
</script>

<template>
  <nav
    class="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-[var(--catalog-border-soft)] bg-white px-8 shadow-[0_10px_30px_rgba(26,28,28,0.05)] lg:px-8 2xl:px-12"
  >
    <RouterLink class="catalog-logo text-xl lg:text-2xl" :to="{ name: 'catalog-products' }">
      The Editorial Catalog
    </RouterLink>

    <div class="hidden items-center gap-8 md:flex">
      <RouterLink
        class="border-b-2 border-[var(--catalog-primary)] pb-1 text-sm tracking-[0.18em] text-[var(--catalog-primary)] transition-colors"
        :to="{ name: 'catalog-products' }"
      >
        Sản phẩm
      </RouterLink>
      <button
        class="border-b-2 border-transparent pb-1 text-sm tracking-[0.18em] text-[var(--catalog-text-soft)] transition-colors hover:text-[var(--catalog-primary)]"
        title="Trang tìm đơn hàng sẽ được bổ sung sau"
        type="button"
      >
        Tìm đơn hàng
      </button>
    </div>

    <div class="flex items-center gap-3 lg:gap-4 xl:gap-6">
      <div class="relative hidden xl:block">
        <span
          class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--catalog-text-soft)]"
        >
          search
        </span>
        <input
          class="h-11 w-72 border border-transparent bg-[var(--catalog-surface-muted)] pl-10 pr-4 text-sm text-[var(--catalog-text)] outline-none transition focus:border-[var(--catalog-primary)]"
          placeholder="Search artifacts..."
          type="text"
          :value="searchValue"
          @input="onSearchInput"
        />
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

      <div class="relative">
        <button
          v-if="!authStore.isAuthenticated"
          class="catalog-icon-button"
          type="button"
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
          v-click-outside="() => (isUserMenuOpen = false)"
          class="user-menu"
        >
          <div class="border-b border-[var(--catalog-border-soft)] px-4 py-3">
            <p class="text-sm">Đăng nhập với</p>
            <p class="truncate text-sm font-medium text-[var(--catalog-text)]">
              {{ authStore.user.email }}
            </p>
          </div>
          <div class="p-1">
            <RouterLink :to="{ name: 'order-history' }" class="user-menu-item">
              <span class="material-symbols-outlined">history</span>
              Lịch sử đơn hàng
            </RouterLink>
            <button class="user-menu-item" @click="handleLogout">
              <span class="material-symbols-outlined">logout</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
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
