<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer
    class="mt-auto flex flex-col items-center justify-between gap-4 border-t border-[var(--catalog-border-soft)] bg-white px-6 py-10 md:flex-row lg:px-10 2xl:px-20"
  >
    <div class="flex flex-col gap-2 text-center md:text-left">
      <div class="catalog-footer-brand">Smartphone Store</div>
      <p class="text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--catalog-text-soft)]">
        © 2026 Smartphone Store. All rights reserved.
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-6 text-center">
      <button class="catalog-footer-link" type="button">Privacy Policy</button>
      <button class="catalog-footer-link" type="button">Terms of Service</button>
      <button class="catalog-footer-link" type="button">Shipping</button>
      <button class="catalog-footer-link" type="button">Returns</button>
      <RouterLink class="catalog-footer-link" :to="{ name: 'order-lookup' }">Find order</RouterLink>
    </div>
  </footer>
</template>
