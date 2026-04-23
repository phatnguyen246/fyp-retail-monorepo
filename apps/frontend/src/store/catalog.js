import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createDefaultCatalogUiOptions,
  fetchCatalogOptions,
  fetchCatalogProducts,
  getCatalogErrorMessage,
} from '../services/catalog.service'
import { formatCurrency } from '../services/formatters'
import { http } from '../services/http'

function toggleListValue(target, value) {
  const index = target.indexOf(value)

  if (index >= 0) {
    target.splice(index, 1)
    return
  }

  target.push(value)
}

function clampPrice(value, fallback) {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount < 0) {
    return fallback
  }

  return Math.round(amount)
}

function replaceOptionItems(target, items) {
  target.splice(0, target.length, ...items)
}

function resolveSelectedColorMatches(selectedColors, colorOptions) {
  const exactColors = new Set()

  selectedColors.forEach((selectedColor) => {
    const matchedOption = colorOptions.find((item) => item.value === selectedColor)
    const matches = Array.isArray(matchedOption?.matches) && matchedOption.matches.length > 0
      ? matchedOption.matches
      : [selectedColor]

    matches.forEach((value) => exactColors.add(value))
  })

  return [...exactColors]
}

function createSidebarFilterState(options) {
  return {
    brand: '',
    tag: '',
    ram: [],
    rom: [],
    color: [],
    minPrice: options.priceBounds.min,
    maxPrice: options.priceBounds.max,
  }
}

function syncSidebarFilterState(target, source) {
  target.brand = source.brand
  target.tag = source.tag
  target.ram.splice(0, target.ram.length, ...source.ram)
  target.rom.splice(0, target.rom.length, ...source.rom)
  target.color.splice(0, target.color.length, ...source.color)
  target.minPrice = source.minPrice
  target.maxPrice = source.maxPrice
}

function createSidebarStateSignature(filterState) {
  return JSON.stringify({
    brand: filterState.brand,
    tag: filterState.tag,
    ram: filterState.ram,
    rom: filterState.rom,
    color: filterState.color,
    minPrice: filterState.minPrice,
    maxPrice: filterState.maxPrice,
  })
}

function hasSelectedSidebarFilters(filterState, options) {
  return (
    Boolean(filterState.brand) ||
    Boolean(filterState.tag) ||
    filterState.ram.length > 0 ||
    filterState.rom.length > 0 ||
    filterState.color.length > 0 ||
    filterState.minPrice > options.priceBounds.min ||
    filterState.maxPrice < options.priceBounds.max
  )
}

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref([])
  const loading = ref(false)
  const errorMessage = ref('')
  const options = reactive(createDefaultCatalogUiOptions())
  const optionsLoaded = ref(false)

  const filters = reactive({
    search: '',
    ...createSidebarFilterState(options),
    sortMode: options.sortModes[0].value,
  })
  const appliedSidebarFilters = reactive(createSidebarFilterState(options))

  const meta = reactive({
    page: 1,
    limit: options.pageSize,
    total: 0,
    totalPages: 1,
  })

  const requestPayload = computed(() => ({
    search: filters.search.trim(),
    brand: appliedSidebarFilters.brand || undefined,
    tag: appliedSidebarFilters.tag || undefined,
    ram: [...appliedSidebarFilters.ram],
    rom: [...appliedSidebarFilters.rom],
    color: resolveSelectedColorMatches(appliedSidebarFilters.color, options.colors),
    minPrice:
      appliedSidebarFilters.minPrice > options.priceBounds.min
        ? appliedSidebarFilters.minPrice
        : undefined,
    maxPrice:
      appliedSidebarFilters.maxPrice < options.priceBounds.max
        ? appliedSidebarFilters.maxPrice
        : undefined,
    sortMode: filters.sortMode,
    page: meta.page,
    limit: meta.limit,
  }))

  const requestSignature = computed(() => JSON.stringify(requestPayload.value))

  const activeFilterChips = computed(() => {
    const chips = []

    if (filters.search) {
      chips.push({
        key: `search-${filters.search}`,
        type: 'search',
        value: filters.search,
        label: `Search: ${filters.search}`,
      })
    }

    if (appliedSidebarFilters.tag) {
      const tag = options.tags.find((item) => item.value === appliedSidebarFilters.tag)

      chips.push({
        key: `tag-${appliedSidebarFilters.tag}`,
        type: 'tag',
        value: appliedSidebarFilters.tag,
        label: `Tag: ${tag?.label ?? appliedSidebarFilters.tag}`,
      })
    }

    if (appliedSidebarFilters.brand) {
      const brand = options.brands.find((item) => item.value === appliedSidebarFilters.brand)

      chips.push({
        key: `brand-${appliedSidebarFilters.brand}`,
        type: 'brand',
        value: appliedSidebarFilters.brand,
        label: `Brand: ${brand?.label ?? appliedSidebarFilters.brand}`,
      })
    }

    appliedSidebarFilters.ram.forEach((value) => {
      chips.push({
        key: `ram-${value}`,
        type: 'ram',
        value,
        label: `RAM: ${value}`,
      })
    })

    appliedSidebarFilters.rom.forEach((value) => {
      chips.push({
        key: `rom-${value}`,
        type: 'rom',
        value,
        label: `ROM: ${value}`,
      })
    })

    appliedSidebarFilters.color.forEach((value) => {
      chips.push({
        key: `color-${value}`,
        type: 'color',
        value,
        label: `Color: ${value}`,
      })
    })

    const hasMinPrice = appliedSidebarFilters.minPrice > options.priceBounds.min
    const hasMaxPrice = appliedSidebarFilters.maxPrice < options.priceBounds.max

    if (hasMinPrice || hasMaxPrice) {
      chips.push({
        key: 'price-range',
        type: 'price',
        value: [appliedSidebarFilters.minPrice, appliedSidebarFilters.maxPrice],
        label: `Price: ${formatCurrency(appliedSidebarFilters.minPrice)} - ${formatCurrency(appliedSidebarFilters.maxPrice)}`,
      })
    }

    return chips
  })

  const hasActiveFilters = computed(() => activeFilterChips.value.length > 0)
  const hasSelectedSidebarFilterOptions = computed(() => hasSelectedSidebarFilters(filters, options))
  const hasPendingSidebarFilterChanges = computed(
    () => createSidebarStateSignature(filters) !== createSidebarStateSignature(appliedSidebarFilters),
  )
  const canApplySidebarFilters = computed(
    () => hasPendingSidebarFilterChanges.value && hasSelectedSidebarFilterOptions.value,
  )

  function resetPagination() {
    meta.page = 1
  }

  function setSearch(value) {
    const nextValue = value.trim()

    if (filters.search === nextValue) {
      return
    }

    filters.search = nextValue
    resetPagination()
  }

  function setTag(value) {
    filters.tag = filters.tag === value ? '' : value
  }

  function setBrand(value) {
    filters.brand = filters.brand === value ? '' : value
  }

  function toggleRam(value) {
    toggleListValue(filters.ram, value)
  }

  function toggleRom(value) {
    toggleListValue(filters.rom, value)
  }

  function toggleColor(value) {
    toggleListValue(filters.color, value)
  }

  function setMinPrice(value) {
    filters.minPrice = clampPrice(value, options.priceBounds.min)

    if (filters.minPrice > filters.maxPrice) {
      filters.maxPrice = filters.minPrice
    }
  }

  function setMaxPrice(value) {
    filters.maxPrice = clampPrice(value, options.priceBounds.max)

    if (filters.maxPrice < filters.minPrice) {
      filters.minPrice = filters.maxPrice
    }
  }

  function setSortMode(value) {
    if (filters.sortMode === value) {
      return
    }

    filters.sortMode = value
    resetPagination()
  }

  function setPage(page) {
    const nextPage = Math.min(Math.max(Number(page) || 1, 1), Math.max(meta.totalPages, 1))

    if (meta.page === nextPage) {
      return
    }

    meta.page = nextPage
  }

  function clearFilters() {
    filters.search = ''
    syncSidebarFilterState(filters, createSidebarFilterState(options))
    syncSidebarFilterState(appliedSidebarFilters, createSidebarFilterState(options))
    filters.sortMode = options.sortModes[0].value
    meta.page = 1
  }

  function applySidebarFilters() {
    syncSidebarFilterState(appliedSidebarFilters, filters)
    resetPagination()
  }

  function removeFilter(chip) {
    switch (chip.type) {
      case 'search':
        filters.search = ''
        resetPagination()
        return
      case 'tag':
        filters.tag = ''
        appliedSidebarFilters.tag = ''
        resetPagination()
        return
      case 'brand':
        filters.brand = ''
        appliedSidebarFilters.brand = ''
        resetPagination()
        return
      case 'ram': {
        const index = filters.ram.indexOf(chip.value)
        const appliedIndex = appliedSidebarFilters.ram.indexOf(chip.value)

        if (index >= 0) {
          filters.ram.splice(index, 1)
        }

        if (appliedIndex >= 0) {
          appliedSidebarFilters.ram.splice(appliedIndex, 1)
        }

        resetPagination()
        return
      }
      case 'rom': {
        const index = filters.rom.indexOf(chip.value)
        const appliedIndex = appliedSidebarFilters.rom.indexOf(chip.value)

        if (index >= 0) {
          filters.rom.splice(index, 1)
        }

        if (appliedIndex >= 0) {
          appliedSidebarFilters.rom.splice(appliedIndex, 1)
        }

        resetPagination()
        return
      }
      case 'color': {
        const index = filters.color.indexOf(chip.value)
        const appliedIndex = appliedSidebarFilters.color.indexOf(chip.value)

        if (index >= 0) {
          filters.color.splice(index, 1)
        }

        if (appliedIndex >= 0) {
          appliedSidebarFilters.color.splice(appliedIndex, 1)
        }

        resetPagination()
        return
      }
      case 'price':
        filters.minPrice = options.priceBounds.min
        filters.maxPrice = options.priceBounds.max
        appliedSidebarFilters.minPrice = options.priceBounds.min
        appliedSidebarFilters.maxPrice = options.priceBounds.max
        resetPagination()
        return
      default:
        break
    }
  }

  async function fetchProducts() {
    loading.value = true
    errorMessage.value = ''

    try {
      const result = await fetchCatalogProducts(requestPayload.value)

      products.value = result.items
      meta.page = result.meta.page
      meta.limit = result.meta.limit
      meta.total = result.meta.total
      meta.totalPages = result.meta.totalPages
    } catch (error) {
      products.value = []
      meta.total = 0
      meta.totalPages = 1
      errorMessage.value = getCatalogErrorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function fetchOptions() {
    try {
      const nextOptions = await fetchCatalogOptions()

      replaceOptionItems(options.brands, nextOptions.brands)
      replaceOptionItems(options.tags, nextOptions.tags)
      replaceOptionItems(options.ram, nextOptions.ram)
      replaceOptionItems(options.rom, nextOptions.rom)
      replaceOptionItems(options.colors, nextOptions.colors)
      replaceOptionItems(options.sortModes, nextOptions.sortModes)
      options.priceBounds.min = nextOptions.priceBounds.min
      options.priceBounds.max = nextOptions.priceBounds.max
      options.priceBounds.step = nextOptions.priceBounds.step

      if (filters.minPrice < options.priceBounds.min) {
        filters.minPrice = options.priceBounds.min
      }

      if (filters.maxPrice > options.priceBounds.max) {
        filters.maxPrice = options.priceBounds.max
      }

      if (appliedSidebarFilters.minPrice < options.priceBounds.min) {
        appliedSidebarFilters.minPrice = options.priceBounds.min
      }

      if (appliedSidebarFilters.maxPrice > options.priceBounds.max) {
        appliedSidebarFilters.maxPrice = options.priceBounds.max
      }

      if (!options.sortModes.some((item) => item.value === filters.sortMode)) {
        filters.sortMode = options.sortModes[0]?.value ?? 'newest'
      }
    } catch (_error) {
      // Keep storefront defaults when discovery options are temporarily unavailable.
    } finally {
      optionsLoaded.value = true
    }
  }
  
  async function fetchProductsForCompare(productIds) {
    try {
      const response = await http.post('/catalog/compare', { productIds })
      // Backend returns { data: { items: [...] } }
      return response.data?.data?.items || []
    } catch (error) {
      return []
    }
  }

  return {
    products,
    loading,
    errorMessage,
    filters,
    meta,
    options,
    optionsLoaded,
    requestSignature,
    activeFilterChips,
    hasActiveFilters,
    hasSelectedSidebarFilterOptions,
    hasPendingSidebarFilterChanges,
    canApplySidebarFilters,
    setSearch,
    setTag,
    setBrand,
    toggleRam,
    toggleRom,
    toggleColor,
    setMinPrice,
    setMaxPrice,
    setSortMode,
    setPage,
    clearFilters,
    applySidebarFilters,
    removeFilter,
    fetchOptions,
    fetchProducts,
    fetchProductsForCompare,
  }
})
