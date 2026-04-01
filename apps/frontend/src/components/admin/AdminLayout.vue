<script setup>
import { RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from '../../store/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  await router.push({ name: 'login' })
}

const navigation = [
  { name: 'Dashboard', href: '#', icon: 'home', current: false },
  { name: 'Sản phẩm', href: '/admin/products', icon: 'shopping_bag', current: true },
  { name: 'Đơn hàng', href: '/admin/orders', icon: 'receipt_long', current: false },
  // More items later
]
</script>

<template>
  <div>
    <div class="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
      <div class="flex min-h-0 flex-1 flex-col bg-gray-800">
        <div class="flex h-16 flex-shrink-0 items-center bg-gray-900 px-4">
          <h1 class="text-2xl font-bold text-white">Admin Panel</h1>
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto">
          <nav class="flex-1 space-y-1 px-2 py-4">
            <RouterLink v-for="item in navigation" :key="item.name" :to="item.href" :class="[item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white', 'group flex items-center rounded-md px-2 py-2 text-sm font-medium']">
              <span class="material-symbols-outlined mr-3 flex-shrink-0 h-6 w-6">{{ item.icon }}</span>
              {{ item.name }}
            </RouterLink>
          </nav>
        </div>
      </div>
    </div>
    <div class="md:pl-64">
      <div class="mx-auto flex max-w-4xl flex-col md:px-8 xl:px-0">
        <div class="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white">
            <div class="flex flex-1 justify-end px-4">
               <button @click="handleLogout" class="text-gray-500 hover:text-gray-700">
                    <span class="sr-only">Logout</span>
                    <span class="material-symbols-outlined">logout</span>
                </button>
            </div>
        </div>

        <main class="flex-1">
          <div class="py-6">
            <div class="px-4 sm:px-6 md:px-0">
              <RouterView />
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
