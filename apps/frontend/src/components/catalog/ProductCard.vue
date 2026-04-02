<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useCartStore } from '../../store/cart'
import { useCompareStore } from '../../store/compare'
import catalogPlaceholder from '../../assets/catalog-placeholder.svg'
import { formatCurrency } from '../../services/formatters'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const cartStore = useCartStore()
const compareStore = useCompareStore()
const imageErrored = ref(false)
const isAddingToCart = ref(false)
const selectedVariantId = ref(null)

const badgeTextMap = {
  new: 'New Release',
  hot: 'Hot Pick',
  best_seller: 'Best Seller',
  installment: 'Installment',
}

const badgeToneMap = {
  new: 'catalog-product-badge-primary',
  hot: 'catalog-product-badge-warm',
  best_seller: 'catalog-product-badge-dark',
  installment: 'catalog-product-badge-soft',
}

function normalizeVariant(variant) {
  if (!variant) {
    return null
  }

  const variantId = variant.variantId ?? variant.id ?? null

  return {
    ...variant,
    id: variantId,
    variantId,
    inStock: variant.inStock === true,
  }
}

function getMemoryKey(variant) {
  return [variant?.ram, variant?.rom].filter(Boolean).join(' - ')
}

function hasMatchingVariant({ memoryKey, color }) {
  return variantOptions.value.some((variant) => {
    const matchesMemory = memoryKey ? getMemoryKey(variant) === memoryKey : true
    const matchesColor = color ? variant.color === color : true

    return matchesMemory && matchesColor
  })
}

function resolvePreferredVariant(candidates, preferredPredicate) {
  return (
    candidates.find((variant) => preferredPredicate(variant) && variant.inStock) ||
    candidates.find((variant) => preferredPredicate(variant)) ||
    candidates.find((variant) => variant.inStock) ||
    candidates[0] ||
    null
  )
}

function resolveInitialVariantId(variants) {
  return (
    props.product.defaultSelectedVariant?.variantId ||
    variants.find((variant) => variant.inStock)?.variantId ||
    variants[0]?.variantId ||
    props.product.listingVariantSnapshot?.variantId ||
    null
  )
}

const variantOptions = computed(() => {
  const sourceVariants = Array.isArray(props.product.variantsSummary) && props.product.variantsSummary.length > 0
    ? props.product.variantsSummary
    : [
        props.product.defaultSelectedVariant ||
          props.product.listingVariantSnapshot,
      ].filter(Boolean)

  return sourceVariants
    .map(normalizeVariant)
    .filter(Boolean)
})

watch(
  () => [
    props.product?.id ?? props.product?.productId,
    props.product?.defaultSelectedVariant?.variantId ?? null,
    (props.product?.variantsSummary || [])
      .map((variant) => variant.variantId ?? variant.id ?? '')
      .join('|'),
  ],
  () => {
    imageErrored.value = false
    selectedVariantId.value = resolveInitialVariantId(variantOptions.value)
  },
  { immediate: true },
)

const heroVariant = computed(() => {
  return (
    variantOptions.value.find((variant) => variant.variantId === selectedVariantId.value) ||
    variantOptions.value.find((variant) => variant.variantId === props.product.defaultSelectedVariant?.variantId) ||
    variantOptions.value[0] ||
    normalizeVariant(props.product.listingVariantSnapshot) ||
    {}
  )
})

const imageUrl = computed(() => {
  if (imageErrored.value) {
    return catalogPlaceholder
  }

  return (
    heroVariant.value?.thumbnail ||
    props.product.variantsSummary?.find((variant) => variant.thumbnail)?.thumbnail ||
    catalogPlaceholder
  )
})

const isPlaceholderImage = computed(() => imageUrl.value === catalogPlaceholder)
const selectedVariantIsInStock = computed(() => {
  if (typeof heroVariant.value?.inStock === 'boolean') {
    return heroVariant.value.inStock
  }

  return props.product.hasInStockVariants === true
})

const salePrice = computed(() => {
  return heroVariant.value?.salePrice ?? props.product.minSalePrice ?? null
})

const originalPrice = computed(() => {
  return heroVariant.value?.originalPrice ?? props.product.minOriginalPrice ?? null
})

const memorySummary = computed(() => {
  const ram = heroVariant.value?.ram
  const rom = heroVariant.value?.rom
  const color = heroVariant.value?.color
  const memory = [ram, rom].filter(Boolean).join('/')

  return [memory, color].filter(Boolean).join(' • ')
})

const titleBadges = computed(() => {
  const labels = (props.product.badges || [])
    .map((badge) => ({
      key: badge,
      label: badgeTextMap[badge] || badge,
      classes: badgeToneMap[badge] || 'catalog-product-badge-primary',
    }))
    .slice(0, 2)

  if (labels.length > 0) {
    return labels
  }

  if (props.product.brand?.name) {
    return [{
      key: props.product.brand.name,
      label: props.product.brand.name,
      classes: 'catalog-product-badge-neutral',
    }]
  }

  return []
})

const statusBadge = computed(() => {
  if (!selectedVariantIsInStock.value) {
    return {
      label: 'Out of Stock',
      classes: 'bg-[var(--catalog-surface-soft)] text-[var(--catalog-text-muted)]',
    }
  }

  if (Number(originalPrice.value) > Number(salePrice.value)) {
    return {
      label: 'Sale',
      classes: 'bg-[var(--catalog-secondary-container)] text-[var(--catalog-secondary-text)]',
    }
  }

  if ((props.product.badges || []).includes('new')) {
    return {
      label: 'New',
      classes: 'bg-[var(--catalog-primary)] text-white',
    }
  }

  return null
})

const memoryOptions = computed(() => {
  const uniqueOptions = []
  const seen = new Set()

  variantOptions.value.forEach((variant) => {
    const label = getMemoryKey(variant)

    if (!label || seen.has(label)) {
      return
    }

    seen.add(label)
    uniqueOptions.push({
      key: label,
      label,
      inStock: variantOptions.value.some(
        (candidate) => getMemoryKey(candidate) === label && candidate.inStock,
      ),
      selectable: hasMatchingVariant({ memoryKey: label }),
      pairingState:
        !heroVariant.value?.color ||
        hasMatchingVariant({
          memoryKey: label,
          color: heroVariant.value.color,
        })
          ? 'stable'
          : 'changes-color',
      active:
        heroVariant.value?.ram === variant.ram &&
        heroVariant.value?.rom === variant.rom,
    })
  })

  return uniqueOptions
})

const colorOptions = computed(() => {
  const uniqueOptions = []
  const seen = new Set()

  variantOptions.value.forEach((variant) => {
    const label = variant.color

    if (!label || seen.has(label)) {
      return
    }

    seen.add(label)
    uniqueOptions.push({
      key: label,
      label,
      fullName: variant.colorFullName ?? label,
      inStock: variantOptions.value.some(
        (candidate) => candidate.color === label && candidate.inStock,
      ),
      selectable: hasMatchingVariant({ color: label }),
      pairingState:
        !getMemoryKey(heroVariant.value) ||
        hasMatchingVariant({
          memoryKey: getMemoryKey(heroVariant.value),
          color: label,
        })
          ? 'stable'
          : 'changes-memory',
      active: heroVariant.value?.color === variant.color,
    })
  })

  return uniqueOptions
})

function onImageError() {
  imageErrored.value = true
}

function selectVariant(variant) {
  if (!variant?.variantId) {
    return
  }

  selectedVariantId.value = variant.variantId
}

function handleMemorySelect(memoryKey) {
  const selectedColor = heroVariant.value?.color
  const candidates = variantOptions.value.filter((variant) => getMemoryKey(variant) === memoryKey)

  if (candidates.length === 0) {
    return
  }

  const nextVariant = resolvePreferredVariant(
    candidates,
    (variant) => !selectedColor || variant.color === selectedColor,
  )

  selectVariant(nextVariant)
}

function handleColorSelect(color) {
  const activeMemoryKey = getMemoryKey(heroVariant.value)
  const candidates = variantOptions.value.filter((variant) => variant.color === color)

  if (candidates.length === 0) {
    return
  }

  const nextVariant = resolvePreferredVariant(
    candidates,
    (variant) => !activeMemoryKey || getMemoryKey(variant) === activeMemoryKey,
  )

  selectVariant(nextVariant)
}

function getVariantOptionClasses(option) {
  if (!option.selectable && !option.active) {
    return 'catalog-variant-option--blocked'
  }

  if (option.active) {
    return option.inStock
      ? 'catalog-variant-option--active'
      : 'catalog-variant-option--active-out'
  }

  if (option.pairingState === 'changes-color') {
    return option.inStock
      ? 'catalog-variant-option--switch-color'
      : 'catalog-variant-option--switch-color-out'
  }

  if (option.pairingState === 'changes-memory') {
    return option.inStock
      ? 'catalog-variant-option--switch-memory'
      : 'catalog-variant-option--switch-memory-out'
  }

  return option.inStock
    ? 'catalog-variant-option--inactive'
    : 'catalog-variant-option--inactive-out'
}

async function handleAddToCart() {
  const variantId = heroVariant.value?.variantId ?? heroVariant.value?.id

  if (!variantId || !selectedVariantIsInStock.value || isAddingToCart.value) return

  isAddingToCart.value = true
  await cartStore.addItem({
    variantId,
    quantity: 1,
  })
  setTimeout(() => {
    isAddingToCart.value = false
  }, 1000)
}

function handleCompareToggle() {
  if (compareStore.isCompared(props.product.id)) {
    compareStore.removeProduct(props.product.id)
  } else {
    compareStore.addProduct(props.product.id)
  }
}

const isCompared = computed(() => compareStore.isCompared(props.product.id))
</script>

<template>
  <article class="flex h-full self-stretch flex-col">
    <div class="catalog-card-media group mb-6">
      <div class="catalog-card-media-frame">
        <img
          :alt="product.title"
          class="catalog-card-image transition duration-700"
          :class="
            isPlaceholderImage
              ? 'object-contain'
              : selectedVariantIsInStock
                ? 'object-contain group-hover:scale-[1.03]'
                : 'object-contain opacity-70'
          "
          :src="imageUrl"
          @error="onImageError"
        />
      </div>

      <div v-if="statusBadge" class="absolute left-4 top-4">
        <span
          class="inline-flex px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.28em]"
          :class="statusBadge.classes"
        >
          {{ statusBadge.label }}
        </span>
      </div>

      <div
        class="catalog-card-action-panel opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <RouterLink
          :to="`/products/${product.id}/${product.slug}`"
          class="catalog-card-action-button flex-1 justify-center"
          title="Chi tiết sản phẩm"
        >
          <span class="material-symbols-outlined">visibility</span>
        </RouterLink>
        <button
          class="catalog-card-action-button"
          :class="{ 'bg-yellow-200': isCompared }"
          title="So sánh"
          type="button"
          :disabled="compareStore.count >= 3 && !isCompared"
          @click="handleCompareToggle"
        >
          <span class="material-symbols-outlined">{{ isCompared ? 'check' : 'compare_arrows' }}</span>
        </button>
        <button
          class="catalog-card-action-button"
          title="Thêm vào giỏ hàng"
          type="button"
          :disabled="!selectedVariantIsInStock || isAddingToCart"
          @click="handleAddToCart"
        >
          <span v-if="isAddingToCart" class="material-symbols-outlined animate-spin">progress_activity</span>
          <span v-else class="material-symbols-outlined">add_shopping_cart</span>
        </button>
      </div>
    </div>

    <div class="flex flex-1 flex-col">
      <div class="mb-4">
        <div class="mb-2 flex flex-wrap gap-2">
          <span
            v-for="badge in titleBadges"
            :key="badge.key"
            class="catalog-product-badge"
            :class="badge.classes"
          >
            {{ badge.label }}
          </span>
        </div>

        <RouterLink :to="`/products/${product.id}/${product.slug}`" class="group">
          <h3
            class="catalog-card-title mb-1 text-2xl leading-tight text-[var(--catalog-text)] transition-colors group-hover:text-[var(--catalog-primary)]"
          >
            {{ product.title }}
          </h3>
        </RouterLink>

        <p class="text-sm font-medium uppercase tracking-[0.16em] text-[var(--catalog-text-soft)]">
          {{ memorySummary || product.shortDescription || 'Smartphone' }}
        </p>
      </div>

      <div class="mb-6 flex flex-col gap-4">
        <div v-if="memoryOptions.length > 0" class="flex flex-wrap gap-1.5">
          <button
            v-for="option in memoryOptions"
            :key="option.key"
            class="catalog-variant-option"
            :aria-pressed="option.active"
            :class="getVariantOptionClasses(option)"
            :disabled="!option.selectable && !option.active"
            :title="
              !option.selectable && !option.active
                ? `${option.label} • Không có với màu đang chọn`
                : option.pairingState === 'changes-color'
                  ? `${option.label} • Chọn cấu hình này sẽ đổi sang màu khả dụng khác`
                : option.inStock
                  ? option.label
                  : `${option.label} • Tạm hết hàng`
            "
            type="button"
            @click="handleMemorySelect(option.key)"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="colorOptions.length > 0" class="flex flex-wrap gap-1.5">
          <button
            v-for="option in colorOptions"
            :key="option.key"
            class="catalog-variant-option"
            :aria-pressed="option.active"
            :class="getVariantOptionClasses(option)"
            :disabled="!option.selectable && !option.active"
            :title="
              !option.selectable && !option.active
                ? `${option.fullName} • Không có với cấu hình đang chọn`
                : option.pairingState === 'changes-memory'
                  ? `${option.fullName} • Chọn màu này sẽ đổi sang cấu hình khả dụng khác`
                : option.inStock
                  ? option.fullName
                  : `${option.fullName} • Tạm hết hàng`
            "
            type="button"
            @click="handleColorSelect(option.key)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="mt-auto flex flex-col">
        <span
          v-if="Number(originalPrice) > Number(salePrice)"
          class="text-xs text-[var(--catalog-text-soft)] line-through"
        >
          {{ formatCurrency(originalPrice, heroVariant.currency || 'VND') }}
        </span>
        <span
          class="catalog-card-title text-3xl font-bold"
          :class="
            selectedVariantIsInStock
              ? 'text-[var(--catalog-danger)]'
              : 'text-[var(--catalog-text-soft)]'
          "
        >
          {{ formatCurrency(salePrice, heroVariant.currency || 'VND') }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.catalog-variant-option {
  border-radius: 0.22rem;
  padding: 0.42rem 0.66rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
  background: white;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    opacity 150ms ease,
    background-color 150ms ease;
}

.catalog-variant-option--blocked {
  cursor: default;
  border: 1px solid var(--catalog-outline);
  color: var(--catalog-text-soft);
  opacity: 0.4;
}

.catalog-variant-option--active {
  cursor: default;
  border: 2px solid var(--catalog-primary);
  color: var(--catalog-primary);
}

.catalog-variant-option--active-out {
  cursor: default;
  border: 2px solid var(--catalog-outline);
  color: var(--catalog-text-soft);
}

.catalog-variant-option--inactive {
  cursor: pointer;
  border: 1px solid var(--catalog-border-soft);
  color: var(--catalog-text-muted);
}

.catalog-variant-option--inactive:hover {
  border-color: var(--catalog-outline);
}

.catalog-variant-option--inactive-out {
  cursor: pointer;
  border: 1px solid var(--catalog-outline);
  color: var(--catalog-text-soft);
  opacity: 0.6;
}

.catalog-variant-option--switch-color {
  cursor: pointer;
  border: 1px solid transparent;
  color: var(--catalog-text);
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(112, 120, 128, 0.1) 0,
      rgba(112, 120, 128, 0.1) 2px,
      rgba(112, 120, 128, 0.03) 2px,
      rgba(112, 120, 128, 0.03) 8px
    );
}

.catalog-variant-option--switch-color:hover {
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(112, 120, 128, 0.14) 0,
      rgba(112, 120, 128, 0.14) 2px,
      rgba(112, 120, 128, 0.06) 2px,
      rgba(112, 120, 128, 0.06) 8px
    );
}

.catalog-variant-option--switch-color-out {
  cursor: pointer;
  border: 1px solid transparent;
  color: var(--catalog-text-soft);
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(112, 120, 128, 0.08) 0,
      rgba(112, 120, 128, 0.08) 2px,
      rgba(112, 120, 128, 0.02) 2px,
      rgba(112, 120, 128, 0.02) 8px
    );
  opacity: 0.72;
}

.catalog-variant-option--switch-memory {
  cursor: pointer;
  border: 1px solid transparent;
  color: var(--catalog-text);
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(112, 120, 128, 0.1) 0,
      rgba(112, 120, 128, 0.1) 2px,
      rgba(112, 120, 128, 0.03) 2px,
      rgba(112, 120, 128, 0.03) 8px
    );
}

.catalog-variant-option--switch-memory:hover {
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(112, 120, 128, 0.14) 0,
      rgba(112, 120, 128, 0.14) 2px,
      rgba(112, 120, 128, 0.06) 2px,
      rgba(112, 120, 128, 0.06) 8px
    );
}

.catalog-variant-option--switch-memory-out {
  cursor: pointer;
  border: 1px solid transparent;
  color: var(--catalog-text-soft);
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(112, 120, 128, 0.08) 0,
      rgba(112, 120, 128, 0.08) 2px,
      rgba(112, 120, 128, 0.02) 2px,
      rgba(112, 120, 128, 0.02) 8px
    );
  opacity: 0.72;
}
</style>
