<script setup>
import ProductCard from './ProductCard.vue'

defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  hasFilters: {
    type: Boolean,
    default: false,
  },
  searchTerm: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['retry'])

const skeletonItems = Array.from({ length: 6 }, (_, index) => index)
</script>

<template>
  <section>
    <div
      v-if="loading"
      class="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,21rem))] xl:justify-between 2xl:grid-cols-[repeat(4,minmax(0,20.5rem))] 2xl:gap-x-8 2xl:gap-y-14"
    >
      <article
        v-for="item in skeletonItems"
        :key="item"
        class="flex animate-pulse flex-col"
      >
        <div class="mb-6 aspect-[3/4] bg-[var(--catalog-surface-muted)]" />
        <div class="mb-3 h-4 w-24 bg-[var(--catalog-surface-muted)]" />
        <div class="mb-4 h-8 w-48 bg-[var(--catalog-surface-muted)]" />
        <div class="mb-6 h-10 w-full bg-[var(--catalog-surface-muted)]" />
        <div class="mt-auto h-8 w-32 bg-[var(--catalog-surface-muted)]" />
      </article>
    </div>

    <div
      v-else-if="errorMessage"
      class="mt-20 flex flex-col items-center justify-center border border-[rgba(186,26,26,0.18)] bg-[rgba(186,26,26,0.04)] px-6 py-14 text-center"
    >
      <span class="material-symbols-outlined mb-4 text-5xl text-[var(--catalog-danger)]">
        error
      </span>
      <h4 class="catalog-card-title mb-2 text-2xl text-[var(--catalog-text)]">
        Không thể tải catalog sản phẩm.
      </h4>
      <p class="max-w-xl text-[var(--catalog-text-muted)]">
        {{ errorMessage }}
      </p>
      <button class="catalog-primary-button mt-6" type="button" @click="emit('retry')">
        Thử tải lại
      </button>
    </div>

    <div
      v-else-if="products.length === 0"
      class="mt-20 flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span class="material-symbols-outlined mb-6 text-6xl text-[var(--catalog-border-soft)]">
        search_off
      </span>
      <h4 class="catalog-card-title mb-2 text-2xl text-[var(--catalog-text)]">
        Không tìm thấy smartphone phù hợp.
      </h4>
      <p class="max-w-xl text-[var(--catalog-text-muted)]">
        {{
          hasFilters || searchTerm
            ? 'Hãy điều chỉnh lại search hoặc filter để mở rộng tập kết quả.'
            : 'Hiện chưa có sản phẩm nào sẵn sàng hiển thị từ catalog storefront.'
        }}
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,21rem))] xl:justify-between 2xl:grid-cols-[repeat(4,minmax(0,20.5rem))] 2xl:gap-x-8 2xl:gap-y-14"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id || product.productId"
        :product="product"
      />
    </div>
  </section>
</template>
