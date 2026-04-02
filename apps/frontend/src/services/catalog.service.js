import axios from 'axios'
import http from './http'

const defaultSortModes = [
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
]
const primaryColorDefinitions = [
  { value: 'Black', keywords: ['black', 'graphite', 'obsidian', 'midnight', 'shadow'] },
  { value: 'White', keywords: ['white', 'silver', 'porcelain', 'pearl', 'lightgray'] },
  { value: 'Blue', keywords: ['blue', 'navy', 'icyblue', 'silverblue'] },
  { value: 'Green', keywords: ['green', 'mint', 'olive'] },
  { value: 'Purple', keywords: ['purple', 'lavender', 'violet', 'plume'] },
  { value: 'Gold', keywords: ['gold'] },
  { value: 'Gray', keywords: ['gray', 'grey', 'titanium'] },
  { value: 'Red', keywords: ['red'] },
  { value: 'Pink', keywords: ['pink'] },
]

export function createDefaultCatalogUiOptions() {
  return {
    quickCollections: [
      { label: 'FLAGSHIP', value: 'flagship' },
      { label: 'CAMERA', value: 'camera-phone' },
      { label: 'GAMING', value: 'gaming' },
      { label: 'BUDGET', value: 'budget' },
    ],
    tags: [
      { label: 'Flagship', value: 'flagship' },
      { label: 'Camera Phone', value: 'camera-phone' },
      { label: 'Gaming', value: 'gaming' },
      { label: 'Battery Phone', value: 'battery-phone' },
      { label: 'Budget', value: 'budget' },
    ],
    brands: [
      { label: 'Apple', value: 'APPLE' },
      { label: 'Samsung', value: 'SAMSUNG' },
      { label: 'Xiaomi', value: 'XIAOMI' },
      { label: 'OPPO', value: 'OPPO' },
      { label: 'Vivo', value: 'VIVO' },
    ],
    ram: [
      { label: '8 GB', value: '8GB' },
      { label: '12 GB', value: '12GB' },
      { label: '16 GB', value: '16GB' },
    ],
    rom: [
      { label: '128 GB', value: '128GB' },
      { label: '256 GB', value: '256GB' },
      { label: '512 GB', value: '512GB' },
      { label: '1 TB', value: '1TB' },
    ],
    colors: [
      { label: 'Black', value: 'Black' },
      { label: 'White', value: 'White' },
      { label: 'Blue', value: 'Blue' },
      { label: 'Green', value: 'Green' },
      { label: 'Purple', value: 'Purple' },
    ],
    sortModes: [...defaultSortModes],
    priceBounds: {
      min: 0,
      max: 60000000,
      step: 500000,
    },
    pageSize: 12,
  }
}

function joinQueryList(values) {
  return Array.isArray(values) && values.length > 0 ? values.join(',') : undefined
}

function normalizePositiveNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : undefined
}

function normalizeMeta(meta = {}, fallbackLength = 0, fallbackPage = 1, fallbackLimit = 12) {
  const total = Number(meta.total)
  const limit = Number(meta.limit)
  const page = Number(meta.page)
  const totalPages = Number(meta.totalPages)

  return {
    page: Number.isFinite(page) && page > 0 ? page : fallbackPage,
    limit: Number.isFinite(limit) && limit > 0 ? limit : fallbackLimit,
    total: Number.isFinite(total) && total >= 0 ? total : fallbackLength,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  }
}

function normalizeOptionList(values, fallback = []) {
  const items = Array.isArray(values) ? values : []
  const normalizedItems = items
    .map((item) => {
      const value = typeof item?.value === 'string' ? item.value.trim() : ''
      const label = typeof item?.label === 'string' ? item.label.trim() : ''

      if (!value || !label) {
        return null
      }

      return {
        label,
        value,
      }
    })
    .filter(Boolean)

  return normalizedItems.length > 0 ? normalizedItems : fallback
}

function resolvePrimaryColor(value) {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''

  if (!normalizedValue) {
    return null
  }

  const matchedColor = primaryColorDefinitions.find(({ keywords }) =>
    keywords.some((keyword) => normalizedValue.includes(keyword)),
  )

  return matchedColor?.value ?? value.trim()
}

function collapseColorOptions(values, fallback = []) {
  const items = Array.isArray(values) ? values : []
  const groupedOptions = new Map()

  items.forEach((item) => {
    const rawValue = typeof item?.value === 'string' ? item.value.trim() : ''

    if (!rawValue) {
      return
    }

    const colorFamily = resolvePrimaryColor(rawValue)

    if (!groupedOptions.has(colorFamily)) {
      groupedOptions.set(colorFamily, {
        label: colorFamily,
        value: colorFamily,
        matches: [],
      })
    }

    const option = groupedOptions.get(colorFamily)

    if (!option.matches.includes(rawValue)) {
      option.matches.push(rawValue)
    }
  })

  const normalizedItems = [...groupedOptions.values()].sort((left, right) =>
    left.label.localeCompare(right.label, 'vi'),
  )

  return normalizedItems.length > 0 ? normalizedItems : fallback
}

function normalizePriceBounds(priceBounds, fallback) {
  const min = Number(priceBounds?.min)
  const max = Number(priceBounds?.max)
  const step = Number(priceBounds?.step)

  return {
    min: Number.isFinite(min) && min >= 0 ? Math.round(min) : fallback.min,
    max: Number.isFinite(max) && max > 0 ? Math.round(max) : fallback.max,
    step: Number.isFinite(step) && step > 0 ? Math.round(step) : fallback.step,
  }
}

function normalizeCatalogUiOptions(payload = {}) {
  const fallback = createDefaultCatalogUiOptions()

  return {
    ...fallback,
    brands: normalizeOptionList(payload.brands, fallback.brands),
    tags: normalizeOptionList(payload.tags, fallback.tags),
    ram: normalizeOptionList(payload.ram, fallback.ram),
    rom: normalizeOptionList(payload.rom, fallback.rom),
    colors: collapseColorOptions(payload.colors, fallback.colors),
    sortModes: normalizeOptionList(payload.sortModes, fallback.sortModes),
    priceBounds: normalizePriceBounds(payload.priceBounds, fallback.priceBounds),
  }
}

function buildCatalogQuery(filters) {
  return {
    categoryCode: 'SMARTPHONE',
    productType: 'smartphone',
    page: filters.page,
    limit: filters.limit,
    sortMode: filters.sortMode,
    q: filters.search || undefined,
    brand: filters.brand || undefined,
    tags: filters.tag || undefined,
    ram: joinQueryList(filters.ram),
    rom: joinQueryList(filters.rom),
    color: joinQueryList(filters.color),
    minPrice: normalizePositiveNumber(filters.minPrice),
    maxPrice: normalizePositiveNumber(filters.maxPrice),
  }
}

export async function fetchCatalogOptions() {
  const response = await http.get('/catalog/discovery-options', {
    params: {
      categoryCode: 'SMARTPHONE',
      productType: 'smartphone',
    },
  })
  const payload = response?.data ?? {}

  return normalizeCatalogUiOptions(payload.data)
}

export async function fetchCatalogProducts(filters) {
  const endpoint = filters.search ? '/catalog/search' : '/catalog/products'
  const params = buildCatalogQuery(filters)
  const response = await http.get(endpoint, { params })
  const payload = response?.data ?? {}

  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    meta: normalizeMeta(payload.meta, payload.data?.length ?? 0, filters.page, filters.limit),
  }
}

export async function fetchCatalogProductDetail(productId, slug) {
  const response = await http.get(`/catalog/products/${productId}/${slug ?? ''}`)
  const payload = response?.data ?? {}

  return {
    item: payload.data ?? null,
    meta: payload.meta ?? {},
  }
}

export function getCatalogErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.code ||
      error.message ||
      'Không thể tải danh mục sản phẩm.'
    )
  }

  return error instanceof Error ? error.message : 'Không thể tải danh mục sản phẩm.'
}
