<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import YouTubeIframePlayer from '../components/catalog/YouTubeIframePlayer.vue'
import { useCartStore } from '../store/cart'
import { useCompareStore } from '../store/compare'
import {
  fetchCatalogProductDetail,
  getCatalogErrorMessage,
} from '../services/catalog.service'
import { formatCurrency } from '../services/formatters'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const compareStore = useCompareStore()

const product = ref(null)
const meta = ref({})
const loading = ref(false)
const errorMessage = ref('')
const selectedVariantId = ref('')
const activeMediaIndex = ref(0)
const isAddingToCart = ref(false)
const quantity = ref(1)
const descriptionPanelRef = ref(null)
const descriptionHeadingRef = ref(null)
const descriptionBodyRef = ref(null)
const descriptionActionsRef = ref(null)
const specsPanelRef = ref(null)
const descriptionCollapsedContentMaxHeight = ref(0)
const descriptionCanExpand = ref(false)
const isDescriptionExpanded = ref(false)
let descriptionLayoutObserver = null

const productId = computed(() => String(route.params.productId ?? ''))
const productSlug = computed(() => {
  const slug = route.params.slug
  return typeof slug === 'string' ? slug : ''
})

const variants = computed(() => product.value?.variants ?? [])

function getMemoryKey(variant) {
  const attrs = variant?.variantAttributes ?? {}
  return [attrs.ram, attrs.rom].filter(Boolean).join(' - ')
}

function getColorDisplayName(variant) {
  const attrs = variant?.variantAttributes ?? {}
  return attrs.colorFullName || attrs.color || ''
}

function hasMatchingVariant({ memoryKey, color }) {
  return variants.value.some((variant) => {
    const attrs = variant?.variantAttributes ?? {}
    const matchesMemory = memoryKey ? getMemoryKey(variant) === memoryKey : true
    const matchesColor = color ? attrs.color === color : true

    return matchesMemory && matchesColor
  })
}

function resolvePreferredVariant(candidates, preferredPredicate) {
  return (
    candidates.find((variant) => preferredPredicate(variant) && variant.isInStock) ||
    candidates.find((variant) => preferredPredicate(variant)) ||
    candidates.find((variant) => variant.isInStock) ||
    candidates[0] ||
    null
  )
}

const selectedVariant = computed(() => {
  if (!variants.value.length) {
    return null
  }

  return (
    variants.value.find((variant) => variant.id === selectedVariantId.value) ??
    variants.value.find((variant) => variant.id === product.value?.defaultSelectedVariantId) ??
    variants.value[0]
  )
})

const selectedVariantIsInStock = computed(() => selectedVariant.value?.isInStock === true)
const selectedVariantQuantityCap = computed(() => {
  const availableQuantity = Number(selectedVariant.value?.availableQuantity)

  if (Number.isFinite(availableQuantity) && availableQuantity > 0) {
    return Math.min(99, Math.round(availableQuantity))
  }

  return selectedVariantIsInStock.value ? 99 : 1
})

const memoryOptions = computed(() => {
  const uniqueOptions = []
  const seen = new Set()
  const activeColor = selectedVariant.value?.variantAttributes?.color ?? null

  variants.value.forEach((variant) => {
    const label = getMemoryKey(variant)
    const attrs = variant?.variantAttributes ?? {}

    if (!label || seen.has(label)) {
      return
    }

    seen.add(label)
    uniqueOptions.push({
      key: label,
      label,
      inStock: variants.value.some(
        (candidate) => getMemoryKey(candidate) === label && candidate.isInStock,
      ),
      selectable: hasMatchingVariant({ memoryKey: label }),
      pairingState:
        !activeColor ||
        hasMatchingVariant({
          memoryKey: label,
          color: activeColor,
        })
          ? 'stable'
          : 'changes-color',
      active: getMemoryKey(selectedVariant.value) === label,
    })
  })

  return uniqueOptions
})

const colorOptions = computed(() => {
  const uniqueOptions = []
  const seen = new Set()
  const activeMemoryKey = getMemoryKey(selectedVariant.value)

  variants.value.forEach((variant) => {
    const color = variant?.variantAttributes?.color

    if (!color || seen.has(color)) {
      return
    }

    seen.add(color)
    uniqueOptions.push({
      key: color,
      label: getColorDisplayName(variant) || color,
      fullName: getColorDisplayName(variant) || color,
      inStock: variants.value.some(
        (candidate) => candidate?.variantAttributes?.color === color && candidate.isInStock,
      ),
      selectable: hasMatchingVariant({ color }),
      pairingState:
        !activeMemoryKey ||
        hasMatchingVariant({
          memoryKey: activeMemoryKey,
          color,
        })
          ? 'stable'
          : 'changes-memory',
      active: selectedVariant.value?.variantAttributes?.color === color,
    })
  })

  return uniqueOptions
})

const mediaItems = computed(() => {
  const items = []
  const productYoutubeVideo = product.value?.youtubeVideo

  if (productYoutubeVideo?.videoId) {
    items.push({
      id: `youtube-${productYoutubeVideo.videoId}`,
      type: 'video',
      videoId: productYoutubeVideo.videoId,
      url: productYoutubeVideo.url,
      title: productYoutubeVideo.title,
      thumbnailUrl: productYoutubeVideo.thumbnailUrl,
      fileName: productYoutubeVideo.title,
    })
  }

  const selectedMedia = selectedVariant.value?.media

  if (Array.isArray(selectedMedia) && selectedMedia.length > 0) {
    return [...items, ...selectedMedia]
  }

  const defaultMedia = product.value?.defaultVariant?.media
  return Array.isArray(defaultMedia) ? [...items, ...defaultMedia] : items
})

const activeMedia = computed(() => mediaItems.value[activeMediaIndex.value] ?? null)

const productBadges = computed(() => {
  const badges = []

  if (product.value?.status === 'discontinued') {
    badges.push({
      key: 'status-discontinued',
      label: 'Discontinued',
      classes: 'catalog-product-badge-warm',
    })
  }

  for (const badge of product.value?.badges ?? []) {
    badges.push({
      key: `badge-${badge}`,
      label: formatBadgeLabel(badge),
      classes: 'catalog-product-badge-primary',
    })
  }

  if (product.value?.hasInStockVariants) {
    badges.push({
      key: 'stock-ready',
      label: 'In stock',
      classes: 'catalog-product-badge-soft',
    })
  } else if (product.value?.contactWhenOutOfStock) {
    badges.push({
      key: 'stock-contact',
      label: 'Contact support',
      classes: 'catalog-product-badge-neutral',
    })
  }

  return badges
})

const specEntries = computed(() => {
  const specs = product.value?.specs ?? {}
  const screen = specs.screen ?? {}
  const entries = [
    ['Display', [screen.size, screen.technology, screen.resolution, screen.refreshRate].filter(Boolean).join(' • ')],
    ['Chipset', specs.chipset],
    ['Rear camera', specs.rearCamera],
    ['Front camera', specs.frontCamera],
    ['Battery', specs.battery],
    ['Operating system', specs.operatingSystem],
    ['SIM', specs.sim],
    ['Network', specs.network],
    ['Charging', specs.charging],
    ['Dimensions', specs.dimensions],
    ['Weight', specs.weight],
    ['Material', specs.material],
    ['Water resistance', specs.waterResistance],
  ]

  return entries.map(([label, value]) => ({
    label,
    value: value || 'Not updated',
    isEmpty: !value,
  }))
})

const selectedVariantLabel = computed(() => {
  const attrs = selectedVariant.value?.variantAttributes ?? {}
  return [attrs.ram, attrs.rom, attrs.colorFullName || attrs.color].filter(Boolean).join(' / ')
})

const selectedPrice = computed(() => {
  const variant = selectedVariant.value

  if (!variant) {
    return null
  }

  return {
    salePrice: formatCurrency(variant.salePrice, variant.currency),
    originalPrice: formatCurrency(variant.originalPrice, variant.currency),
    hasDiscount:
      Number.isFinite(Number(variant.originalPrice)) &&
      Number.isFinite(Number(variant.salePrice)) &&
      Number(variant.originalPrice) > Number(variant.salePrice),
  }
})

const longDescriptionHtml = computed(() =>
  normalizeRichTextHtml(product.value?.longDescription || ''),
)

const fallbackDescription = computed(
  () => product.value?.shortDescription || 'No detailed description available for this product.',
)
const descriptionBodyStyle = computed(() => {
  if (isDescriptionExpanded.value || descriptionCollapsedContentMaxHeight.value <= 0) {
    return null
  }

  return {
    maxHeight: `${descriptionCollapsedContentMaxHeight.value}px`,
  }
})

const isCompared = computed(() => {
  if (!product.value?.id) {
    return false
  }

  return compareStore.isCompared(product.value.id)
})

function formatBadgeLabel(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function extractPlainTextFromHtml(value = '') {
  const source = typeof value === 'string' ? value.trim() : ''

  if (!source) {
    return ''
  }

  if (typeof window === 'undefined' || typeof window.DOMParser !== 'function') {
    return source.replace(/\s+/g, ' ').trim()
  }

  const parsed = new window.DOMParser().parseFromString(source, 'text/html')
  return (parsed.body.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeRichTextHtml(value = '') {
  const source = typeof value === 'string' ? value.trim() : ''

  if (!source) {
    return ''
  }

  if (typeof window === 'undefined' || typeof window.DOMParser !== 'function') {
    return source
  }

  const parsed = new window.DOMParser().parseFromString(source, 'text/html')

  parsed.body.querySelectorAll('script, style, noscript').forEach((node) => {
    node.remove()
  })

  parsed.body.querySelectorAll('*').forEach((element) => {
    for (const { name, value: attributeValue } of [...element.attributes]) {
      const normalizedName = name.toLowerCase()
      const normalizedValue = String(attributeValue || '').trim().toLowerCase()

      if (normalizedName.startsWith('on')) {
        element.removeAttribute(name)
        continue
      }

      if (
        (normalizedName === 'href' || normalizedName === 'src') &&
        normalizedValue.startsWith('javascript:')
      ) {
        element.removeAttribute(name)
      }
    }
  })

  const plainText = extractPlainTextFromHtml(parsed.body.innerHTML)
  const hasStructuredContent = Boolean(
    parsed.body.querySelector('img, video, iframe, table, ul, ol, blockquote, pre, hr'),
  )

  if (!plainText && !hasStructuredContent) {
    return ''
  }

  return parsed.body.innerHTML.trim()
}

function recalculateDescriptionLayout() {
  if (typeof window === 'undefined') {
    return
  }

  const specsPanelElement = specsPanelRef.value
  const descriptionPanelElement = descriptionPanelRef.value
  const descriptionBodyElement = descriptionBodyRef.value

  if (!specsPanelElement || !descriptionPanelElement || !descriptionBodyElement) {
    descriptionCollapsedContentMaxHeight.value = 0
    descriptionCanExpand.value = false
    return
  }

  const specsHeight = Math.round(specsPanelElement.getBoundingClientRect().height)

  if (!Number.isFinite(specsHeight) || specsHeight <= 0) {
    descriptionCollapsedContentMaxHeight.value = 0
    descriptionCanExpand.value = false
    return
  }

  const computedStyles = window.getComputedStyle(descriptionPanelElement)
  const paddingTop = Number.parseFloat(computedStyles.paddingTop) || 0
  const paddingBottom = Number.parseFloat(computedStyles.paddingBottom) || 0
  const headingHeight = descriptionHeadingRef.value
    ? Math.ceil(descriptionHeadingRef.value.getBoundingClientRect().height)
    : 0
  const actionsHeight = descriptionActionsRef.value
    ? Math.ceil(descriptionActionsRef.value.getBoundingClientRect().height)
    : 0
  const staticOffset = Math.ceil(paddingTop + paddingBottom + headingHeight + actionsHeight + 20)
  const maxBodyHeight = Math.max(140, specsHeight - staticOffset)

  descriptionCollapsedContentMaxHeight.value = maxBodyHeight
  descriptionCanExpand.value = descriptionBodyElement.scrollHeight > maxBodyHeight + 8
}

function scheduleDescriptionLayoutRecalculation() {
  nextTick(() => {
    recalculateDescriptionLayout()
  })
}

function ensureDescriptionLayoutObserver() {
  if (typeof window === 'undefined') {
    return
  }

  if (descriptionLayoutObserver) {
    descriptionLayoutObserver.disconnect()
    descriptionLayoutObserver = null
  }

  const targets = [specsPanelRef.value, descriptionBodyRef.value].filter(Boolean)

  if (targets.length === 0 || typeof window.ResizeObserver !== 'function') {
    return
  }

  descriptionLayoutObserver = new window.ResizeObserver(() => {
    recalculateDescriptionLayout()
  })

  targets.forEach((element) => {
    descriptionLayoutObserver.observe(element)
  })
}

function toggleDescriptionExpanded() {
  isDescriptionExpanded.value = !isDescriptionExpanded.value
}

async function loadProductDetail() {
  if (!productId.value) {
    product.value = null
    errorMessage.value = 'Product ID not found.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetchCatalogProductDetail(productId.value, productSlug.value)
    product.value = response.item
    meta.value = response.meta ?? {}
    selectedVariantId.value = response.item?.defaultSelectedVariantId ?? response.item?.variants?.[0]?.id ?? ''
    activeMediaIndex.value = 0
    quantity.value = 1

    const canonicalSlug = response.meta?.canonicalSlug

    if (canonicalSlug && canonicalSlug !== productSlug.value) {
      router.replace({
        name: 'catalog-product-detail',
        params: {
          productId: productId.value,
          slug: canonicalSlug,
        },
      })
    }
  } catch (error) {
    product.value = null
    meta.value = {}
    errorMessage.value = getCatalogErrorMessage(error)
  } finally {
    loading.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function selectVariant(variantId) {
  selectedVariantId.value = variantId
  activeMediaIndex.value = 0
}

function nextMedia() {
  if (activeMediaIndex.value < mediaItems.value.length - 1) {
    activeMediaIndex.value++
  }
}

function prevMedia() {
  if (activeMediaIndex.value > 0) {
    activeMediaIndex.value--
  }
}

function handleMemorySelect(memoryKey) {
  const selectedColor = selectedVariant.value?.variantAttributes?.color
  const candidates = variants.value.filter((variant) => getMemoryKey(variant) === memoryKey)

  if (candidates.length === 0) {
    return
  }

  const nextVariant = resolvePreferredVariant(
    candidates,
    (variant) => {
      const attrs = variant?.variantAttributes ?? {}
      return !selectedColor || attrs.color === selectedColor
    },
  )

  selectVariant(nextVariant.id)
}

function handleColorSelect(color) {
  const activeMemoryKey = getMemoryKey(selectedVariant.value)
  const candidates = variants.value.filter((variant) => {
    const attrs = variant?.variantAttributes ?? {}
    return attrs.color === color
  })

  if (candidates.length === 0) {
    return
  }

  const nextVariant = resolvePreferredVariant(
    candidates,
    (variant) => !activeMemoryKey || getMemoryKey(variant) === activeMemoryKey,
  )

  selectVariant(nextVariant.id)
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

function updateQuantity(nextValue) {
  const parsedValue = Number(nextValue)

  if (!Number.isFinite(parsedValue)) {
    quantity.value = 1
    return
  }

  quantity.value = Math.min(selectedVariantQuantityCap.value, Math.max(1, Math.round(parsedValue)))
}

function increaseQuantity() {
  updateQuantity(quantity.value + 1)
}

function decreaseQuantity() {
  updateQuantity(quantity.value - 1)
}

function handleCompareToggle() {
  if (!product.value?.id) {
    return
  }

  if (compareStore.isCompared(product.value.id)) {
    compareStore.removeProduct(product.value.id)
    return
  }

  compareStore.addProduct(product.value)
}

async function handleAddToCart() {
  if (!selectedVariant.value?.id || isAddingToCart.value) {
    return
  }

  isAddingToCart.value = true

  try {
    await cartStore.addItem({
      variantId: selectedVariant.value.id,
      quantity: quantity.value,
    })
  } finally {
    window.setTimeout(() => {
      isAddingToCart.value = false
    }, 800)
  }
}

watch(
  () => [route.params.productId, route.params.slug],
  () => {
    loadProductDetail()
  },
  { immediate: true },
)

watch(mediaItems, () => {
  activeMediaIndex.value = 0
})

watch(selectedVariantQuantityCap, (value) => {
  quantity.value = Math.min(Math.max(1, quantity.value), value)
})

watch(
  () => [product.value?.id, longDescriptionHtml.value, fallbackDescription.value, specEntries.value.length],
  () => {
    isDescriptionExpanded.value = false
    scheduleDescriptionLayoutRecalculation()
    ensureDescriptionLayoutObserver()
  },
  { immediate: true },
)

watch(isDescriptionExpanded, () => {
  scheduleDescriptionLayoutRecalculation()
})

onMounted(() => {
  scheduleDescriptionLayoutRecalculation()
  ensureDescriptionLayoutObserver()
  window.addEventListener('resize', recalculateDescriptionLayout)
})

onBeforeUnmount(() => {
  if (descriptionLayoutObserver) {
    descriptionLayoutObserver.disconnect()
    descriptionLayoutObserver = null
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', recalculateDescriptionLayout)
  }
})
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <CatalogTopNav />

      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[1440px]">
        <div
          class="mb-8 flex flex-wrap items-center gap-2 text-[0.6875rem] uppercase tracking-[0.3em] text-[var(--catalog-text-soft)]"
        >
          <RouterLink class="transition-colors hover:text-[var(--catalog-primary)]" :to="{ name: 'catalog-products' }">
            Catalog
          </RouterLink>
          <span class="material-symbols-outlined text-[12px]">chevron_right</span>
          <span>Smartphones</span>
          <span class="material-symbols-outlined text-[12px]">chevron_right</span>
          <span class="font-medium text-[var(--catalog-text)]">{{ product?.title || 'Product details' }}</span>
        </div>

        <section
          v-if="loading"
          class="grid gap-8 rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:p-8"
        >
          <div class="detail-skeleton min-h-[34rem] rounded-[1.5rem]"></div>
          <div class="space-y-4">
            <div class="detail-skeleton h-6 w-40 rounded-full"></div>
            <div class="detail-skeleton h-14 w-full rounded-[1rem]"></div>
            <div class="detail-skeleton h-24 w-full rounded-[1rem]"></div>
            <div class="detail-skeleton h-28 w-full rounded-[1rem]"></div>
            <div class="detail-skeleton h-40 w-full rounded-[1rem]"></div>
          </div>
        </section>

        <section
          v-else-if="errorMessage"
          class="rounded-[2rem] border border-[rgba(186,26,26,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
        >
          <p class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--catalog-danger)]">
            Unable to load product details
          </p>
          <h1 class="catalog-display-title mb-3 text-4xl">Storefront Product Detail</h1>
          <p class="max-w-2xl text-[var(--catalog-text-muted)]">{{ errorMessage }}</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <button class="catalog-primary-button" type="button" @click="loadProductDetail">
              Retry
            </button>
            <RouterLink class="catalog-reset-button" :to="{ name: 'catalog-products' }">
              Back to catalog
            </RouterLink>
          </div>
        </section>

        <section
          v-else-if="product"
          class="space-y-8 xl:space-y-10"
        >
          <div class="grid items-start gap-8 lg:grid-cols-[minmax(24rem,1.16fr)_minmax(22rem,0.84fr)] xl:gap-10">
            <div class="space-y-4">
              <div class="detail-stage rounded-[2rem] border border-[var(--catalog-border-soft)] p-4 md:p-6">
                <div class="detail-stage-inner relative mx-auto w-full">
                  <div class="detail-media-shell flex h-[24rem] items-center justify-center rounded-[1.6rem] md:h-[28rem] lg:h-[32rem] xl:h-[36rem]">
                    <button
                      v-if="mediaItems.length > 1"
                      class="media-nav-button media-nav-prev"
                      :disabled="activeMediaIndex === 0"
                      type="button"
                      @click="prevMedia"
                    >
                      <span class="material-symbols-outlined">chevron_left</span>
                    </button>

                    <YouTubeIframePlayer
                      v-if="activeMedia?.type === 'video' && activeMedia?.videoId"
                      :video-id="activeMedia.videoId"
                      :title="activeMedia.title || product.title"
                      class="detail-product-video"
                    />
                    <img
                      v-else-if="activeMedia?.url"
                      :alt="activeMedia.fileName || product.title"
                      class="detail-product-image max-h-full max-w-full object-contain"
                      :src="activeMedia.url"
                    />
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-center text-sm uppercase tracking-[0.2em] text-[var(--catalog-text-soft)]"
                    >
                      No images available
                    </div>

                    <button
                      v-if="mediaItems.length > 1"
                      class="media-nav-button media-nav-next"
                      :disabled="activeMediaIndex === mediaItems.length - 1"
                      type="button"
                      @click="nextMedia"
                    >
                      <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="mediaItems.length > 1" class="detail-thumbnail-scroller flex gap-3 overflow-x-auto pb-2">
                <button
                  v-for="(media, index) in mediaItems"
                  :key="media.id || `${media.url}-${index}`"
                  class="detail-thumbnail-item flex-shrink-0 rounded-[1rem] border bg-white p-1.5 transition"
                  :class="
                    index === activeMediaIndex
                      ? 'border-[var(--catalog-primary)] shadow-[0_8px_16px_rgba(139,117,0,0.12)]'
                      : 'border-[var(--catalog-border-soft)] hover:border-[var(--catalog-outline)]'
                  "
                  type="button"
                  @click="activeMediaIndex = index"
                >
                  <img
                    v-if="media.type !== 'video'"
                    :alt="media.fileName || product.title"
                    class="h-14 w-14 rounded-[0.6rem] object-contain md:h-16 md:w-16"
                    :src="media.url"
                  />
                  <div
                    v-else
                    class="detail-thumbnail-video h-14 w-14 rounded-[0.6rem] md:h-16 md:w-16"
                  >
                    <img
                      v-if="media.thumbnailUrl"
                      :alt="media.title || product.title"
                      class="h-full w-full rounded-[0.6rem] object-cover"
                      :src="media.thumbnailUrl"
                    />
                    <span v-else class="material-symbols-outlined">play_circle</span>
                  </div>
                </button>
              </div>
            </div>

            <div class="space-y-6">
              <div class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8">
                <div class="mb-4 flex flex-wrap gap-2">
                  <span
                    v-for="badge in productBadges"
                    :key="badge.key"
                    class="catalog-product-badge"
                    :class="badge.classes"
                  >
                    {{ badge.label }}
                  </span>
                </div>

                <p class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  {{ product.brand?.name || 'Storefront Catalog' }}
                  <span v-if="product.category?.name"> • {{ product.category.name }}</span>
                </p>

                <h1 class="catalog-display-title text-4xl leading-tight lg:text-5xl">
                  {{ product.title }}
                </h1>

                <div class="mt-6">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <h2 class="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                      Choose variant
                    </h2>
                    <span class="text-sm text-[var(--catalog-text-muted)]">
                      {{ variants.length }} options
                    </span>
                  </div>

                  <div class="grid gap-4">
                    <div v-if="memoryOptions.length > 0">
                      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                        RAM / ROM configuration
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="option in memoryOptions"
                          :key="option.key"
                          class="catalog-variant-option detail-variant-option"
                          :aria-pressed="option.active"
                          :class="getVariantOptionClasses(option)"
                          :disabled="!option.selectable && !option.active"
                          :title="
                            !option.selectable && !option.active
                              ? `${option.label} • Not available for selected color`
                              : option.pairingState === 'changes-color'
                                ? `${option.label} • Selecting this configuration switches to another available color`
                              : option.inStock
                                ? option.label
                                : `${option.label} • Out of stock`
                          "
                          type="button"
                          @click="handleMemorySelect(option.key)"
                        >
                          {{ option.label }}
                        </button>
                      </div>
                    </div>

                    <div v-if="colorOptions.length > 0">
                      <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                        Color
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="option in colorOptions"
                          :key="option.key"
                          class="catalog-variant-option detail-variant-option"
                          :aria-pressed="option.active"
                          :class="getVariantOptionClasses(option)"
                          :disabled="!option.selectable && !option.active"
                          :title="
                            !option.selectable && !option.active
                              ? `${option.fullName} • Not available for selected configuration`
                              : option.pairingState === 'changes-memory'
                                ? `${option.fullName} • Selecting this color switches to another available configuration`
                              : option.inStock
                                ? option.fullName
                                : `${option.fullName} • Out of stock`
                          "
                          type="button"
                          @click="handleColorSelect(option.key)"
                        >
                          {{ option.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-6 rounded-[1.5rem] bg-[var(--catalog-surface-muted)] p-5">
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Selected variant
                  </p>
                  <p class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">
                    {{ selectedVariantLabel || 'Choose variant' }}
                  </p>
                  <div class="mt-3 flex flex-wrap items-end gap-3">
                    <span class="text-3xl font-semibold text-[var(--catalog-primary)]">
                      {{ selectedPrice?.salePrice || 'Lien he' }}
                    </span>
                    <span
                      v-if="selectedPrice?.hasDiscount"
                      class="text-sm text-[var(--catalog-text-soft)] line-through"
                    >
                      {{ selectedPrice.originalPrice }}
                    </span>
                    <span
                      class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                      :class="
                        selectedVariant?.isInStock
                          ? 'bg-[rgba(42,125,78,0.1)] text-[#1f6a43]'
                          : 'bg-[rgba(186,26,26,0.1)] text-[var(--catalog-danger)]'
                      "
                    >
                      {{ selectedVariant?.isInStock ? 'In stock' : 'Out of stock' }}
                    </span>
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap items-end gap-3">
                  <div class="detail-quantity-block">
                    <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                      Quantity
                    </p>
                    <div class="detail-quantity-control">
                      <button
                        class="detail-quantity-button"
                        type="button"
                        :disabled="quantity <= 1"
                        @click="decreaseQuantity"
                      >
                        <span class="material-symbols-outlined">remove</span>
                      </button>

                      <input
                        class="detail-quantity-input"
                        type="number"
                        min="1"
                        :max="selectedVariantQuantityCap"
                        inputmode="numeric"
                        :value="quantity"
                        @input="updateQuantity($event.target.value)"
                      />

                      <button
                        class="detail-quantity-button"
                        type="button"
                        :disabled="!selectedVariant?.isInStock || quantity >= selectedVariantQuantityCap"
                        @click="increaseQuantity"
                      >
                        <span class="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </div>

                  <button
                    class="catalog-primary-button"
                    type="button"
                    :disabled="!selectedVariant?.isInStock || isAddingToCart"
                    @click="handleAddToCart"
                  >
                    {{ isAddingToCart ? 'Adding...' : 'Add to cart' }}
                  </button>
                  <button
                    class="catalog-reset-button"
                    type="button"
                    :disabled="!product.id"
                    @click="handleCompareToggle"
                  >
                    {{ isCompared ? 'Remove from compare' : 'Add to compare' }}
                  </button>
                </div>

                <div
                  v-if="product.tags?.length"
                  class="mt-6 border-t border-[var(--catalog-border-soft)] pt-6"
                >
                  <p class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Tags
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="tag in product.tags"
                      :key="tag.id || tag.code || tag.name"
                      class="catalog-product-badge catalog-product-badge-neutral"
                    >
                      {{ tag.name }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-8 lg:grid-cols-[minmax(24rem,1.16fr)_minmax(22rem,0.84fr)] xl:gap-10">
            <article
              ref="descriptionPanelRef"
              class="detail-description-panel rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8"
            >
              <p
                ref="descriptionHeadingRef"
                class="detail-description-heading mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]"
              >
                Detailed description
              </p>
              <div
                ref="descriptionBodyRef"
                class="detail-description-body text-[var(--catalog-text-muted)]"
                :class="{ 'detail-description-body--collapsed': !isDescriptionExpanded && descriptionCanExpand }"
                :style="descriptionBodyStyle"
              >
                <div
                  v-if="longDescriptionHtml"
                  class="detail-rich-text detail-description-body-content text-[var(--catalog-text-muted)]"
                  v-html="longDescriptionHtml"
                ></div>
                <p v-else class="detail-copy detail-description-body-content text-[var(--catalog-text-muted)]">
                  {{ fallbackDescription }}
                </p>

                <div
                  v-if="!isDescriptionExpanded && descriptionCanExpand"
                  class="detail-description-expand-overlay"
                >
                  <button class="catalog-reset-button" type="button" @click="toggleDescriptionExpanded">
                    View details
                  </button>
                </div>
              </div>
              <div
                v-if="isDescriptionExpanded && descriptionCanExpand"
                ref="descriptionActionsRef"
                class="detail-description-actions mt-5 text-center"
              >
                <button class="catalog-reset-button" type="button" @click="toggleDescriptionExpanded">
                  Collapse
                </button>
              </div>
            </article>

            <section
              ref="specsPanelRef"
              class="self-start rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8"
            >
              <div class="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Specifications
                  </p>
                  <h2 class="catalog-display-title mt-2 text-3xl">Product Specifications</h2>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <article
                  v-for="entry in specEntries"
                  :key="entry.label"
                  class="rounded-[1.5rem] border border-[var(--catalog-border-soft)] bg-[var(--catalog-surface-muted)] p-4"
                >
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--catalog-text-soft)]">
                    {{ entry.label }}
                  </p>
                  <p
                    class="mt-2 text-base leading-7"
                    :class="entry.isEmpty ? 'italic text-[var(--catalog-text-soft)]' : 'text-[var(--catalog-text)]'"
                  >
                    {{ entry.value }}
                  </p>
                </article>
              </div>
            </section>
          </div>
        </section>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>

<style scoped>
.detail-stage {
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(26, 28, 28, 0.05);
}

.detail-stage-inner {
  display: flex;
  justify-content: center;
}

.detail-media-shell {
  width: 100%;
}

.detail-thumbnail-scroller {
  scrollbar-width: thin;
  scrollbar-color: var(--catalog-border-soft) transparent;
}

.detail-thumbnail-scroller::-webkit-scrollbar {
  height: 4px;
}

.detail-thumbnail-scroller::-webkit-scrollbar-track {
  background: transparent;
}

.detail-thumbnail-scroller::-webkit-scrollbar-thumb {
  background-color: var(--catalog-border-soft);
  border-radius: 999px;
}

.media-nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--catalog-border-soft);
  color: var(--catalog-text);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: all 200ms ease;
  cursor: pointer;
}

.media-nav-button:hover:not(:disabled) {
  background: white;
  color: var(--catalog-primary);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-50%) scale(1.05);
}

.media-nav-button:active:not(:disabled) {
  transform: translateY(-50%) scale(0.95);
}

.media-nav-button:disabled {
  opacity: 0;
  visibility: hidden;
  cursor: not-allowed;
}

.media-nav-prev {
  left: 0.5rem;
}

.media-nav-next {
  right: 0.5rem;
}

@media (min-width: 768px) {
  .media-nav-button {
    width: 3.25rem;
    height: 3.25rem;
  }

  .media-nav-prev {
    left: 1.25rem;
  }

  .media-nav-next {
    right: 1.25rem;
  }
}

.detail-product-image {
  position: relative;
  z-index: 1;
  display: block;
}

.detail-product-video {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 1rem;
}

.detail-thumbnail-video {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--catalog-border-soft);
  background: var(--catalog-surface-muted);
  color: var(--catalog-primary);
}

.detail-variant-option {
  border-radius: 0.4rem;
  padding: 0.7rem 0.95rem;
  font-size: 0.78rem;
}

.detail-quantity-block {
  min-width: 10.5rem;
}

.detail-quantity-control {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 999px;
  background: white;
}

.detail-quantity-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  background: transparent;
  color: var(--catalog-text);
  transition: background-color 150ms ease, color 150ms ease, opacity 150ms ease;
}

.detail-quantity-button:hover:not(:disabled) {
  background: var(--catalog-surface-muted);
}

.detail-quantity-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.detail-quantity-input {
  width: 3.5rem;
  border: none;
  background: transparent;
  text-align: center;
  font-weight: 600;
  color: var(--catalog-text);
  outline: none;
}

.detail-quantity-input::-webkit-outer-spin-button,
.detail-quantity-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.detail-quantity-input[type="number"] {
  -moz-appearance: textfield;
}

.catalog-variant-option {
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

.detail-copy {
  white-space: pre-line;
  line-height: 1.9;
}

.detail-description-body {
  position: relative;
  overflow: visible;
  transition: max-height 220ms ease;
}

.detail-description-body--collapsed {
  position: relative;
  overflow: hidden;
}

.detail-description-body--collapsed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4.5rem;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.88) 60%,
    rgba(255, 255, 255, 1) 100%
  );
  pointer-events: none;
}

.detail-description-expand-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.9rem;
  z-index: 2;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.detail-description-expand-overlay .catalog-reset-button {
  pointer-events: auto;
  backdrop-filter: blur(2px);
  background: rgba(255, 255, 255, 0.94);
}

.detail-rich-text {
  line-height: 1.8;
}

.detail-rich-text :deep(> :first-child) {
  margin-top: 0;
}

.detail-rich-text :deep(> :last-child) {
  margin-bottom: 0;
}

.detail-rich-text :deep(h1),
.detail-rich-text :deep(h2),
.detail-rich-text :deep(h3),
.detail-rich-text :deep(h4),
.detail-rich-text :deep(h5),
.detail-rich-text :deep(h6) {
  margin: 1.25rem 0 0.65rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--catalog-text);
}

.detail-rich-text :deep(h1) {
  font-size: 1.6rem;
}

.detail-rich-text :deep(h2) {
  font-size: 1.4rem;
}

.detail-rich-text :deep(h3) {
  font-size: 1.2rem;
}

.detail-rich-text :deep(h4),
.detail-rich-text :deep(h5),
.detail-rich-text :deep(h6) {
  font-size: 1.05rem;
}

.detail-rich-text :deep(p),
.detail-rich-text :deep(ul),
.detail-rich-text :deep(ol),
.detail-rich-text :deep(blockquote),
.detail-rich-text :deep(table),
.detail-rich-text :deep(pre),
.detail-rich-text :deep(hr) {
  margin: 0 0 0.95rem;
}

.detail-rich-text :deep(ul),
.detail-rich-text :deep(ol) {
  padding-left: 1.3rem;
}

.detail-rich-text :deep(li + li) {
  margin-top: 0.35rem;
}

.detail-rich-text :deep(a) {
  color: #1d4ed8;
  text-decoration: underline;
}

.detail-rich-text :deep(blockquote) {
  margin-left: 0;
  border-left: 4px solid rgba(139, 117, 0, 0.35);
  border-radius: 0.5rem;
  padding: 0.7rem 0.95rem;
  background: #fff8e7;
  color: #5b4300;
}

.detail-rich-text :deep(pre) {
  overflow-x: auto;
  border-radius: 0.8rem;
  padding: 0.8rem 1rem;
  background: #111827;
  color: #f3f4f6;
}

.detail-rich-text :deep(code) {
  border-radius: 0.35rem;
  padding: 0.15rem 0.3rem;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.detail-rich-text :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.detail-rich-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.detail-rich-text :deep(th),
.detail-rich-text :deep(td) {
  border: 1px solid var(--catalog-border-soft);
  padding: 0.55rem 0.7rem;
  text-align: left;
}

.detail-rich-text :deep(img),
.detail-rich-text :deep(video),
.detail-rich-text :deep(iframe) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.8rem;
}

.detail-rich-text :deep(.align-left),
.detail-rich-text :deep(.tox-text-left) {
  text-align: left;
}

.detail-rich-text :deep(.align-center),
.detail-rich-text :deep(.tox-text-center) {
  text-align: center;
}

.detail-rich-text :deep(.align-right),
.detail-rich-text :deep(.tox-text-right) {
  text-align: right;
}

.detail-rich-text :deep(.align-justify),
.detail-rich-text :deep(.tox-text-justify) {
  text-align: justify;
}

.detail-skeleton {
  background:
    linear-gradient(90deg, rgba(244, 243, 242, 0.92) 25%, rgba(255, 255, 255, 0.96) 50%, rgba(244, 243, 242, 0.92) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

@media (max-width: 1023px) {
  /* Media query updates for smaller screens if needed */
}
</style>
