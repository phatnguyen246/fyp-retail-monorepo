<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  resultLabel: {
    type: String,
    required: true,
  },
  sortMode: {
    type: String,
    required: true,
  },
  sortOptions: {
    type: Array,
    default: () => [],
  },
  activeFilters: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['change-sort', 'remove-filter', 'clear-filters'])
const isSortMenuOpen = ref(false)

const activeSortOption = computed(() => {
  return props.sortOptions.find((option) => option.value === props.sortMode) ?? props.sortOptions[0] ?? null
})

function toggleSortMenu() {
  isSortMenuOpen.value = !isSortMenuOpen.value
}

function closeSortMenu() {
  isSortMenuOpen.value = false
}

function selectSortOption(option) {
  if (!option || option.value === props.sortMode) {
    closeSortMenu()
    return
  }

  emit('change-sort', option.value)
  closeSortMenu()
}
</script>

<template>
  <header class="mb-10 2xl:mb-12">
    <nav
      class="mb-7 flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--catalog-text-soft)]"
    >
      <RouterLink
        class="transition-colors hover:text-[var(--catalog-primary)]"
        :to="{ name: 'catalog-products' }"
      >
        Catalog
      </RouterLink>
      <span class="material-symbols-outlined text-[12px]">chevron_right</span>
      <span class="font-medium text-[var(--catalog-text)]">Smartphones</span>
    </nav>

    <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between xl:gap-10">
      <div class="max-w-3xl">
        <h1
          class="catalog-display-title mb-2 text-[2.75rem] leading-none tracking-[-0.04em] text-[var(--catalog-text)] md:text-[3.25rem] 2xl:text-[3.75rem]"
        >
          {{ title }}
        </h1>
        <p class="max-w-2xl text-base text-[var(--catalog-text-muted)] lg:text-lg">
          {{ subtitle }}
        </p>
      </div>

      <div class="flex min-w-full flex-col gap-4 xl:min-w-[260px] xl:max-w-[280px]">
        <div
          class="border-b border-[var(--catalog-border-soft)] pb-2 text-right text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--catalog-text-soft)]"
        >
          {{ resultLabel }}
        </div>

        <div
          v-click-outside="closeSortMenu"
          class="catalog-sort-dropdown"
          @keydown.esc="closeSortMenu"
        >
          <button
            class="catalog-sort-control"
            :class="{ 'catalog-sort-control-open': isSortMenuOpen }"
            type="button"
            @click="toggleSortMenu"
          >
          <span class="catalog-sort-label">Sắp xếp</span>
          <span class="catalog-sort-trigger-text">
            {{ activeSortOption?.label ?? 'Chọn kiểu sắp xếp' }}
          </span>
          <span class="material-symbols-outlined catalog-sort-icon">expand_more</span>
          </button>

          <transition
            enter-active-class="transition duration-180 ease-out"
            enter-from-class="translate-y-1 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-140 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-1 opacity-0"
          >
            <div
              v-if="isSortMenuOpen"
              class="catalog-sort-panel"
            >
              <button
                v-for="option in sortOptions"
                :key="option.value"
                class="catalog-sort-option"
                :class="{ 'catalog-sort-option-active': option.value === sortMode }"
                type="button"
                @click="selectSortOption(option)"
              >
                <span>{{ option.label }}</span>
                <span
                  v-if="option.value === sortMode"
                  class="material-symbols-outlined catalog-sort-option-check"
                >
                  check
                </span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <div
      v-if="activeFilters.length > 0"
      class="mt-8 flex flex-wrap items-center gap-2 border-y border-[var(--catalog-border-soft)] py-4"
    >
      <span
        class="mr-2 text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--catalog-text-soft)]"
      >
        Đang lọc:
      </span>

      <span
        v-for="chip in activeFilters"
        :key="chip.key"
        class="inline-flex cursor-default select-none items-center gap-1.5 rounded-full bg-[var(--catalog-surface-soft)] px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[var(--catalog-text-muted)]"
      >
        <span>{{ chip.label }}</span>
        <button
          class="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--catalog-text-soft)] transition hover:bg-[var(--catalog-border-soft)] hover:text-[var(--catalog-text)]"
          type="button"
          @click="emit('remove-filter', chip)"
        >
          <span class="material-symbols-outlined text-[0.8rem]">close</span>
        </button>
      </span>

      <button
        class="ml-auto text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-[var(--catalog-primary)] transition hover:underline"
        type="button"
        @click="emit('clear-filters')"
      >
        Clear All
      </button>
    </div>
  </header>
</template>
