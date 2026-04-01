<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['change-page'])

const pages = computed(() => {
  if (props.totalPages <= 5) {
    return Array.from({ length: props.totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(props.page - 2, 1)
  const end = Math.min(start + 4, props.totalPages)
  const normalizedStart = Math.max(end - 4, 1)

  return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index)
})
</script>

<template>
  <footer class="mt-20 flex items-center justify-center 2xl:mt-24">
    <div class="catalog-pagination-shell">
    <button
      class="catalog-pagination-arrow"
      :disabled="page <= 1"
      type="button"
      @click="emit('change-page', page - 1)"
    >
      <span class="material-symbols-outlined">chevron_left</span>
      <span>Trước</span>
    </button>

    <div class="catalog-pagination-pages">
      <button
        v-for="pageNumber in pages"
        :key="pageNumber"
        class="catalog-pagination-item"
        :class="
          pageNumber === page
            ? 'catalog-pagination-item-active'
            : 'catalog-pagination-item-idle'
        "
        type="button"
        @click="emit('change-page', pageNumber)"
      >
        {{ pageNumber }}
      </button>
    </div>

    <button
      class="catalog-pagination-arrow"
      :disabled="page >= totalPages"
      type="button"
      @click="emit('change-page', page + 1)"
    >
      <span>Sau</span>
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
    </div>
  </footer>
</template>
