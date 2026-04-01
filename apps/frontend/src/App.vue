<script setup>
import { useAuthStore } from './store/auth'

const authStore = useAuthStore()
authStore.fetchUser()
</script>

<template>
  <RouterView />
</template>
