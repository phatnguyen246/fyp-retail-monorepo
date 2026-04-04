import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import { fetchCatalogOptions } from '../services/catalog.service'
import { http } from '../services/http'

const fallbackReferenceOptions = Object.freeze({
  brands: [
    { label: 'Apple', value: 'APPLE' },
    { label: 'Samsung', value: 'SAMSUNG' },
    { label: 'Google', value: 'GOOGLE' },
    { label: 'OnePlus', value: 'ONEPLUS' },
    { label: 'Xiaomi', value: 'XIAOMI' },
    { label: 'Redmi', value: 'REDMI' },
    { label: 'POCO', value: 'POCO' },
    { label: 'OPPO', value: 'OPPO' },
    { label: 'Vivo', value: 'VIVO' },
  ],
  categories: [{ label: 'Smartphone', value: 'SMARTPHONE' }],
  tags: [
    { label: 'Gaming', value: 'gaming' },
    { label: 'Camera Phone', value: 'camera-phone' },
    { label: 'Battery Phone', value: 'battery-phone' },
    { label: 'Flagship', value: 'flagship' },
    { label: 'Budget', value: 'budget' },
    { label: 'AI Phone', value: 'ai-phone' },
    { label: 'Compact', value: 'compact' },
    { label: 'Fast Charging', value: 'fast-charging' },
    { label: 'Creator Phone', value: 'creator-phone' },
    { label: 'All-Rounder', value: 'all-rounder' },
  ],
  badges: [
    { label: 'New', value: 'new' },
    { label: 'Hot', value: 'hot' },
    { label: 'Best Seller', value: 'best_seller' },
    { label: 'Installment', value: 'installment' },
  ],
  productStatuses: [
    { label: 'Bản nháp', value: 'draft' },
    { label: 'Đang bán', value: 'active' },
    { label: 'Tạm ngưng', value: 'inactive' },
    { label: 'Ngừng kinh doanh', value: 'discontinued' },
  ],
  variantStatuses: [
    { label: 'Hoạt động', value: 'active' },
    { label: 'Ẩn bán', value: 'inactive' },
  ],
  listStatusFilters: [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Bản nháp', value: 'draft' },
    { label: 'Đang bán', value: 'active' },
    { label: 'Tạm ngưng', value: 'inactive' },
    { label: 'Ngừng kinh doanh', value: 'discontinued' },
  ],
  deletedFilters: [
    { label: 'Đang hoạt động', value: 'false' },
    { label: 'Đã xóa mềm', value: 'true' },
    { label: 'Tất cả', value: 'all' },
  ],
  productSortOptions: [
    { label: 'Mới cập nhật', value: 'updatedAt:desc' },
    { label: 'Mới tạo', value: 'createdAt:desc' },
    { label: 'Tên A-Z', value: 'title:asc' },
    { label: 'Tên Z-A', value: 'title:desc' },
    { label: 'Giá tăng', value: 'minSalePrice:asc' },
    { label: 'Giá giảm', value: 'minSalePrice:desc' },
    { label: 'Trạng thái A-Z', value: 'status:asc' },
  ],
  orderStatuses: [
    { label: 'Chờ xử lý', value: 'pending' },
    { label: 'Đã xác nhận', value: 'confirmed' },
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Đã hủy', value: 'cancelled' },
  ],
  orderTransitions: [
    { label: 'Xác nhận đơn', value: 'confirmed' },
    { label: 'Đánh dấu hoàn thành', value: 'completed' },
  ],
})

function cloneOptionList(items = []) {
  return items.map((item) => ({ ...item }))
}

function createReferenceOptions() {
  return {
    brands: cloneOptionList(fallbackReferenceOptions.brands),
    categories: cloneOptionList(fallbackReferenceOptions.categories),
    tags: cloneOptionList(fallbackReferenceOptions.tags),
    badges: cloneOptionList(fallbackReferenceOptions.badges),
    productStatuses: cloneOptionList(fallbackReferenceOptions.productStatuses),
    variantStatuses: cloneOptionList(fallbackReferenceOptions.variantStatuses),
    listStatusFilters: cloneOptionList(fallbackReferenceOptions.listStatusFilters),
    deletedFilters: cloneOptionList(fallbackReferenceOptions.deletedFilters),
    productSortOptions: cloneOptionList(fallbackReferenceOptions.productSortOptions),
    orderStatuses: cloneOptionList(fallbackReferenceOptions.orderStatuses),
    orderTransitions: cloneOptionList(fallbackReferenceOptions.orderTransitions),
  }
}

function hasOwn(target, propertyName) {
  return Object.prototype.hasOwnProperty.call(target, propertyName)
}

function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

function ensureString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function ensureNullableString(value) {
  return typeof value === 'string' ? value : null
}

function ensureBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function ensureNumber(value, fallback = null) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function ensureInteger(value, fallback = 0) {
  const numberValue = Number(value)
  return Number.isInteger(numberValue) ? numberValue : fallback
}

function normalizeId(value) {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && typeof value.$oid === 'string') {
    return value.$oid
  }

  if (value && typeof value.toHexString === 'function') {
    return value.toHexString()
  }

  if (value && typeof value.toString === 'function') {
    const normalized = value.toString()
    if (normalized && normalized !== '[object Object]') {
      return normalized
    }
  }

  return null
}

function normalizeReferenceEntity(entity) {
  if (!entity || typeof entity !== 'object') {
    return null
  }

  return {
    id: normalizeId(entity.id ?? entity._id),
    code: ensureNullableString(entity.code),
    name: ensureNullableString(entity.name),
  }
}

function normalizeListingVariantSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null
  }

  return {
    variantId: normalizeId(snapshot.variantId),
    sku: ensureNullableString(snapshot.sku),
    color: ensureNullableString(snapshot.color),
    colorFullName: ensureNullableString(snapshot.colorFullName),
    ram: ensureNullableString(snapshot.ram),
    rom: ensureNullableString(snapshot.rom),
    salePrice: ensureNumber(snapshot.salePrice),
    originalPrice: ensureNumber(snapshot.originalPrice),
    currency: ensureString(snapshot.currency, 'VND'),
  }
}

function normalizeProductSpecs(specs) {
  const source = specs && typeof specs === 'object' ? specs : {}
  const screen = source.screen && typeof source.screen === 'object' ? source.screen : {}

  return {
    screen: {
      size: ensureString(screen.size),
      technology: ensureString(screen.technology),
      resolution: ensureString(screen.resolution),
      refreshRate: ensureString(screen.refreshRate),
    },
    chipset: ensureString(source.chipset),
    rearCamera: ensureString(source.rearCamera),
    frontCamera: ensureString(source.frontCamera),
    battery: ensureString(source.battery),
    operatingSystem: ensureString(source.operatingSystem),
    sim: ensureString(source.sim),
    network: ensureString(source.network),
    charging: ensureString(source.charging),
    dimensions: ensureString(source.dimensions),
    weight: ensureString(source.weight),
    material: ensureString(source.material),
    waterResistance: ensureString(source.waterResistance),
  }
}

function normalizeVariantVideo(video) {
  if (typeof video === 'string') {
    return {
      url: video,
      thumbnailUrl: '',
    }
  }

  if (!video || typeof video !== 'object') {
    return {
      url: '',
      thumbnailUrl: '',
    }
  }

  return {
    url: ensureString(video.url),
    thumbnailUrl: ensureString(video.thumbnailUrl),
  }
}

function normalizeVariant(variant) {
  const attributes =
    variant?.variantAttributes && typeof variant.variantAttributes === 'object'
      ? variant.variantAttributes
      : {}

  return {
    id: normalizeId(variant?.id ?? variant?._id),
    productId: normalizeId(variant?.productId),
    sku: ensureString(variant?.sku),
    variantAttributes: {
      ram: ensureString(attributes.ram),
      rom: ensureString(attributes.rom),
      color: ensureString(attributes.color),
      colorFullName: ensureString(attributes.colorFullName),
    },
    ramSort: ensureInteger(variant?.ramSort, 0),
    romSort: ensureInteger(variant?.romSort, 0),
    colorPriority: ensureInteger(variant?.colorPriority, 0),
    variantSortOrder: ensureInteger(variant?.variantSortOrder, 0),
    isPrimaryColor: ensureBoolean(variant?.isPrimaryColor, false),
    originalPrice: ensureNumber(variant?.originalPrice, 0),
    salePrice: ensureNumber(variant?.salePrice, 0),
    currency: ensureString(variant?.currency, 'VND'),
    video: normalizeVariantVideo(variant?.video),
    status: ensureString(variant?.status, 'active'),
    isInStock: ensureBoolean(variant?.isInStock, false),
    isDeleted: ensureBoolean(variant?.isDeleted, false),
    deletedAt: variant?.deletedAt ?? null,
    mediaIds: ensureArray(variant?.mediaIds)
      .map((mediaId) => normalizeId(mediaId))
      .filter(Boolean),
    createdAt: variant?.createdAt ?? null,
    updatedAt: variant?.updatedAt ?? null,
  }
}

function normalizeProductSummary(product) {
  return {
    id: normalizeId(product?.id ?? product?._id),
    productGroupCode: ensureString(product?.productGroupCode),
    title: ensureString(product?.title),
    productType: ensureString(product?.productType, 'smartphone'),
    status: ensureString(product?.status, 'draft'),
    isDeleted: ensureBoolean(product?.isDeleted, false),
    deletedAt: product?.deletedAt ?? null,
    createdAt: product?.createdAt ?? null,
    updatedAt: product?.updatedAt ?? null,
    shortDescription: ensureNullableString(product?.shortDescription),
    badges: ensureArray(product?.badges).filter((badge) => typeof badge === 'string'),
    contactWhenOutOfStock: ensureBoolean(product?.contactWhenOutOfStock, false),
    brand: normalizeReferenceEntity(product?.brand),
    category: normalizeReferenceEntity(product?.category),
    defaultSelectedVariantId: normalizeId(product?.defaultSelectedVariantId),
    listingVariantSnapshot: normalizeListingVariantSnapshot(product?.listingVariantSnapshot),
    minSalePrice: ensureNumber(product?.minSalePrice),
    minOriginalPrice: ensureNumber(product?.minOriginalPrice),
    hasActiveVariants: ensureBoolean(product?.hasActiveVariants, false),
    hasInStockVariants: ensureBoolean(product?.hasInStockVariants, false),
  }
}

function normalizeProductDetail(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const product = source.product && typeof source.product === 'object' ? source.product : source

  return {
    product: {
      id: normalizeId(product.id ?? product._id),
      productGroupCode: ensureString(product.productGroupCode),
      title: ensureString(product.title),
      slug: ensureString(product.slug),
      searchTitle: ensureString(product.searchTitle),
      productType: ensureString(product.productType, 'smartphone'),
      brandId: normalizeId(product.brandId),
      categoryId: normalizeId(product.categoryId),
      tagIds: ensureArray(product.tagIds).map((tagId) => normalizeId(tagId)).filter(Boolean),
      shortDescription: ensureString(product.shortDescription),
      longDescription: ensureString(product.longDescription),
      badges: ensureArray(product.badges).filter((badge) => typeof badge === 'string'),
      specs: normalizeProductSpecs(product.specs),
      status: ensureString(product.status, 'draft'),
      contactWhenOutOfStock: ensureBoolean(product.contactWhenOutOfStock, false),
      isDeleted: ensureBoolean(product.isDeleted, false),
      deletedAt: product.deletedAt ?? null,
      createdAt: product.createdAt ?? null,
      updatedAt: product.updatedAt ?? null,
      defaultSelectedVariantId: normalizeId(product.defaultSelectedVariantId),
      listingVariantSnapshot: normalizeListingVariantSnapshot(product.listingVariantSnapshot),
      minSalePrice: ensureNumber(product.minSalePrice),
      minOriginalPrice: ensureNumber(product.minOriginalPrice),
      hasActiveVariants: ensureBoolean(product.hasActiveVariants, false),
      hasInStockVariants: ensureBoolean(product.hasInStockVariants, false),
    },
    variants: ensureArray(source.variants).map((variant) => normalizeVariant(variant)),
  }
}

function normalizeMedia(media) {
  return {
    id: normalizeId(media?.id ?? media?._id),
    productId: normalizeId(media?.productId),
    variantId: normalizeId(media?.variantId),
    url: ensureString(media?.url),
    storagePath: ensureString(media?.storagePath),
    fileName: ensureString(media?.fileName),
    mimeType: ensureString(media?.mimeType),
    size: ensureNumber(media?.size, 0),
    sortOrder: ensureInteger(media?.sortOrder, 0),
  }
}

function normalizeInventoryRecord(record) {
  return {
    id: normalizeId(record?.id ?? record?._id),
    variantId: normalizeId(record?.variantId),
    stockQuantity: ensureInteger(record?.stockQuantity, 0),
    lowStockThreshold:
      record?.lowStockThreshold === null || record?.lowStockThreshold === undefined
        ? null
        : ensureInteger(record?.lowStockThreshold, 0),
    isInStock: ensureBoolean(record?.isInStock, false),
    isLowStock: ensureBoolean(record?.isLowStock, false),
    recordExists: ensureBoolean(record?.recordExists, false),
    createdAt: record?.createdAt ?? null,
    updatedAt: record?.updatedAt ?? null,
  }
}

function normalizeOverviewLowStockRecord(record) {
  return {
    ...normalizeInventoryRecord(record),
    productId: normalizeId(record?.productId),
    productName: ensureNullableString(record?.productName),
    productGroupCode: ensureNullableString(record?.productGroupCode),
    sku: ensureNullableString(record?.sku),
    variantLabel: ensureNullableString(record?.variantLabel),
  }
}

function normalizeInventoryReadItem(record) {
  return {
    variantId: normalizeId(record?.variantId),
    stockQuantity: ensureInteger(record?.stockQuantity, 0),
    isInStock: ensureBoolean(record?.isInStock, false),
  }
}

function normalizeOrderItem(item) {
  return {
    productId: normalizeId(item?.productId),
    variantId: normalizeId(item?.variantId),
    sku: ensureNullableString(item?.sku),
    productName: ensureNullableString(item?.productName),
    variantLabel: ensureNullableString(item?.variantLabel),
    thumbnailUrl: ensureNullableString(item?.thumbnailUrl),
    unitPrice: ensureNumber(item?.unitPrice, 0),
    quantity: ensureInteger(item?.quantity, 0),
    lineTotal: ensureNumber(item?.lineTotal, 0),
  }
}

function normalizeStatusLog(log) {
  return {
    fromStatus: ensureNullableString(log?.fromStatus),
    toStatus: ensureNullableString(log?.toStatus),
    changedBy: ensureNullableString(log?.changedBy),
    changedAt: log?.changedAt ?? null,
  }
}

function normalizeOrder(order) {
  return {
    id: normalizeId(order?.id ?? order?._id),
    orderCode: ensureString(order?.orderCode),
    accountId: normalizeId(order?.accountId),
    recipientName: ensureString(order?.recipientName),
    phoneNumber: ensureString(order?.phoneNumber),
    street: ensureNullableString(order?.street),
    provinceCode: ensureNullableString(order?.provinceCode),
    provinceName: ensureNullableString(order?.provinceName),
    districtCode: ensureNullableString(order?.districtCode),
    districtName: ensureNullableString(order?.districtName),
    wardCode: ensureNullableString(order?.wardCode),
    wardName: ensureNullableString(order?.wardName),
    shippingAddressLine: ensureNullableString(order?.shippingAddressLine),
    paymentMethod: ensureNullableString(order?.paymentMethod),
    paymentStatus: ensureNullableString(order?.paymentStatus),
    orderStatus: ensureString(order?.orderStatus, 'pending'),
    itemCount: ensureInteger(order?.itemCount, 0),
    subtotal: ensureNumber(order?.subtotal, 0),
    discountTotal: ensureNumber(order?.discountTotal, 0),
    shippingFee: ensureNumber(order?.shippingFee, 0),
    grandTotal: ensureNumber(order?.grandTotal, 0),
    createdAt: order?.createdAt ?? null,
    updatedAt: order?.updatedAt ?? null,
    items: ensureArray(order?.items).map((item) => normalizeOrderItem(item)),
    statusLogs: ensureArray(order?.statusLogs).map((log) => normalizeStatusLog(log)),
  }
}

function normalizePaymentResult(result) {
  const payment = result?.payment && typeof result.payment === 'object' ? result.payment : {}

  return {
    status: ensureNullableString(result?.status),
    orderId: normalizeId(result?.orderId),
    orderCode: ensureNullableString(result?.orderCode),
    payment: {
      id: normalizeId(payment?.id ?? payment?._id),
      provider: ensureNullableString(payment?.provider),
      status: ensureNullableString(payment?.status),
      amount: ensureNumber(payment?.amount),
      transactionCode: ensureNullableString(payment?.transactionCode),
      paidAt: payment?.paidAt ?? null,
      createdAt: payment?.createdAt ?? null,
      updatedAt: payment?.updatedAt ?? null,
    },
  }
}

function normalizeOverviewChartDataset(dataset) {
  return {
    key: ensureString(dataset?.key),
    label: ensureString(dataset?.label),
    data: ensureArray(dataset?.data).map((value) => ensureNumber(value, 0)),
  }
}

function normalizeOverviewChartBreakdownItem(item) {
  return {
    key: ensureString(item?.key),
    value: ensureInteger(item?.value, 0),
  }
}

function normalizeOverviewChart(chart, { recordNormalizer = null } = {}) {
  const source = chart && typeof chart === 'object' ? chart : {}

  return {
    total: ensureInteger(source.total, 0),
    labels: ensureArray(source.labels).map((label) => ensureString(label)),
    datasets: ensureArray(source.datasets).map((dataset) => normalizeOverviewChartDataset(dataset)),
    breakdown: ensureArray(source.breakdown).map((item) => normalizeOverviewChartBreakdownItem(item)),
    highlighted: {
      vnpayPending: ensureInteger(source.highlighted?.vnpayPending, 0),
    },
    records:
      typeof recordNormalizer === 'function'
        ? ensureArray(source.records).map((item) => recordNormalizer(item))
        : [],
  }
}

function normalizeOverviewLowStockChartRecord(record) {
  return {
    ...normalizeOverviewLowStockRecord(record),
    chartLabel: ensureString(record?.chartLabel),
    shortageQuantity: ensureInteger(record?.shortageQuantity, 0),
  }
}

function normalizeAdminOverview(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const productMeta =
    source.productMeta && typeof source.productMeta === 'object' ? source.productMeta : {}
  const orderMeta = source.orderMeta && typeof source.orderMeta === 'object' ? source.orderMeta : {}
  const paymentMeta =
    source.paymentMeta && typeof source.paymentMeta === 'object' ? source.paymentMeta : {}
  const lowStockMeta =
    source.lowStockMeta && typeof source.lowStockMeta === 'object' ? source.lowStockMeta : {}
  const charts = source.charts && typeof source.charts === 'object' ? source.charts : {}

  return {
    productMeta: {
      total: ensureInteger(productMeta.total, 0),
      draft: ensureInteger(productMeta.draft, 0),
      active: ensureInteger(productMeta.active, 0),
      inactive: ensureInteger(productMeta.inactive, 0),
      discontinued: ensureInteger(productMeta.discontinued, 0),
      deleted: ensureInteger(productMeta.deleted, 0),
      outOfStock: ensureInteger(productMeta.outOfStock, 0),
    },
    orderMeta: {
      total: ensureInteger(orderMeta.total, 0),
      pending: ensureInteger(orderMeta.pending, 0),
      confirmed: ensureInteger(orderMeta.confirmed, 0),
      completed: ensureInteger(orderMeta.completed, 0),
      cancelled: ensureInteger(orderMeta.cancelled, 0),
      vnpayPending: ensureInteger(orderMeta.vnpayPending, 0),
    },
    paymentMeta: {
      total: ensureInteger(paymentMeta.total, 0),
      pending: ensureInteger(paymentMeta.pending, 0),
      paid: ensureInteger(paymentMeta.paid, 0),
      failed: ensureInteger(paymentMeta.failed, 0),
      cancelled: ensureInteger(paymentMeta.cancelled, 0),
      vnpayPending: ensureInteger(paymentMeta.vnpayPending, 0),
    },
    lowStockMeta: {
      total: ensureInteger(lowStockMeta.total, 0),
      outOfStock: ensureInteger(lowStockMeta.outOfStock, 0),
    },
    recentOrders: ensureArray(source.recentOrders).map((order) => normalizeOrder(order)),
    lowStockRecords: ensureArray(source.lowStockRecords).map((item) =>
      normalizeOverviewLowStockRecord(item),
    ),
    charts: {
      productStatus: normalizeOverviewChart(charts.productStatus),
      orderStatus: normalizeOverviewChart(charts.orderStatus),
      paymentStatus: normalizeOverviewChart(charts.paymentStatus),
      inventoryRisk: normalizeOverviewChart(charts.inventoryRisk),
      lowStockTop: normalizeOverviewChart(charts.lowStockTop, {
        recordNormalizer: normalizeOverviewLowStockChartRecord,
      }),
    },
  }
}

function unwrapResponseData(response) {
  const payload = response?.data

  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    hasOwn(payload, 'data') &&
    Object.keys(payload).every((key) => key === 'data' || key === 'meta')
  ) {
    return payload.data
  }

  return payload
}

function unwrapResponseMeta(response) {
  return response?.data?.meta ?? null
}

function getAdminErrorMessage(error, fallbackMessage) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.code ||
      error.message ||
      fallbackMessage
    )
  }

  return error instanceof Error ? error.message : fallbackMessage
}

function createDefaultMeta() {
  return {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  }
}

function normalizeMeta(meta, fallbackLength = 0, fallbackPage = 1, fallbackLimit = 20) {
  const page = ensureInteger(meta?.page, fallbackPage)
  const limit = ensureInteger(meta?.limit, fallbackLimit)
  const total = ensureInteger(meta?.total, fallbackLength)
  const totalPages = ensureInteger(meta?.totalPages, total > 0 ? Math.ceil(total / limit) : 1)

  return {
    page: page > 0 ? page : fallbackPage,
    limit: limit > 0 ? limit : fallbackLimit,
    total: total >= 0 ? total : fallbackLength,
    totalPages: totalPages > 0 ? totalPages : 1,
  }
}

function mergeReferenceOptions(storefrontOptions = {}) {
  return {
    ...createReferenceOptions(),
    brands:
      ensureArray(storefrontOptions.brands).length > 0
        ? cloneOptionList(storefrontOptions.brands)
        : cloneOptionList(fallbackReferenceOptions.brands),
    tags:
      ensureArray(storefrontOptions.tags).length > 0
        ? cloneOptionList(storefrontOptions.tags)
        : cloneOptionList(fallbackReferenceOptions.tags),
  }
}

function extractSortParts(sortValue) {
  const [sortBy = 'updatedAt', sortOrder = 'desc'] = ensureString(sortValue, 'updatedAt:desc').split(':')

  return {
    sortBy,
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
  }
}

export function createEmptyProductDraft() {
  return {
    productGroupCode: '',
    title: '',
    brandCode: 'APPLE',
    categoryCode: 'SMARTPHONE',
    productType: 'smartphone',
    shortDescription: '',
    longDescription: '',
    tagCodes: [],
    badges: [],
    specs: normalizeProductSpecs({}),
    status: 'draft',
    contactWhenOutOfStock: false,
  }
}

export function createProductPatchDraft(product = {}) {
  return {
    title: ensureString(product.title),
    status: ensureString(product.status, 'draft'),
    shortDescription: ensureString(product.shortDescription),
    longDescription: ensureString(product.longDescription),
    badges: ensureArray(product.badges).filter((badge) => typeof badge === 'string'),
    specs: normalizeProductSpecs(product.specs),
    contactWhenOutOfStock: ensureBoolean(product.contactWhenOutOfStock, false),
    brandCode: '',
    categoryCode: '',
    tagCodes: [],
  }
}

export function createEmptyVariantDraft() {
  return {
    sku: '',
    variantAttributes: {
      ram: '',
      rom: '',
      color: '',
      colorFullName: '',
    },
    ramSort: 0,
    romSort: 0,
    colorPriority: 0,
    variantSortOrder: 0,
    isPrimaryColor: false,
    originalPrice: 0,
    salePrice: 0,
    currency: 'VND',
    video: {
      url: '',
      thumbnailUrl: '',
    },
    status: 'active',
  }
}

export function createVariantDraftFromSource(variant = {}) {
  return {
    sku: ensureString(variant.sku),
    variantAttributes: {
      ram: ensureString(variant.variantAttributes?.ram),
      rom: ensureString(variant.variantAttributes?.rom),
      color: ensureString(variant.variantAttributes?.color),
      colorFullName: ensureString(variant.variantAttributes?.colorFullName),
    },
    ramSort: ensureInteger(variant.ramSort, 0),
    romSort: ensureInteger(variant.romSort, 0),
    colorPriority: ensureInteger(variant.colorPriority, 0),
    variantSortOrder: ensureInteger(variant.variantSortOrder, 0),
    isPrimaryColor: ensureBoolean(variant.isPrimaryColor, false),
    originalPrice: ensureNumber(variant.originalPrice, 0),
    salePrice: ensureNumber(variant.salePrice, 0),
    currency: ensureString(variant.currency, 'VND'),
    video: normalizeVariantVideo(variant.video),
    status: ensureString(variant.status, 'active'),
  }
}

export function createInventoryDraft(record = {}) {
  return {
    variantId: ensureString(record.variantId),
    stockQuantity: ensureInteger(record.stockQuantity, 0),
    lowStockThreshold:
      record.lowStockThreshold === null || record.lowStockThreshold === undefined
        ? 3
        : ensureInteger(record.lowStockThreshold, 3),
  }
}

export const useAdminStore = defineStore('admin', () => {
  const referenceOptions = ref(createReferenceOptions())
  const referenceOptionsLoaded = ref(false)
  const lastError = ref(null)
  const pendingRequests = ref(0)

  const isBusy = computed(() => pendingRequests.value > 0)

  function beginRequest() {
    pendingRequests.value += 1
  }

  function endRequest() {
    pendingRequests.value = Math.max(0, pendingRequests.value - 1)
  }

  async function runRequest(task, fallbackMessage) {
    beginRequest()
    lastError.value = null

    try {
      return await task()
    } catch (error) {
      const message = getAdminErrorMessage(error, fallbackMessage)
      lastError.value = message
      return {
        success: false,
        error: message,
      }
    } finally {
      endRequest()
    }
  }

  async function ensureReferenceOptions({ force = false } = {}) {
    if (referenceOptionsLoaded.value && !force) {
      return {
        success: true,
        data: referenceOptions.value,
      }
    }

    return runRequest(async () => {
      let storefrontOptions = null

      try {
        storefrontOptions = await fetchCatalogOptions()
      } catch (error) {
        storefrontOptions = null
      }

      referenceOptions.value = mergeReferenceOptions(storefrontOptions)
      referenceOptionsLoaded.value = true

      return {
        success: true,
        data: referenceOptions.value,
      }
    }, 'Không thể tải dữ liệu tham chiếu cho trang quản trị.')
  }

  async function fetchAdminProducts(filters = {}) {
    return runRequest(async () => {
      const params = {}
      const normalizedPage = ensureInteger(filters.page, 1)
      const normalizedLimit = ensureInteger(filters.limit, 12)

      if (filters.status && filters.status !== 'all') {
        params.status = filters.status
      }

      if (filters.deleted) {
        params.deleted = filters.deleted
      }

      params.page = normalizedPage
      params.limit = normalizedLimit

      const sortParts = extractSortParts(filters.sort)
      params.sortBy = sortParts.sortBy
      params.sortOrder = sortParts.sortOrder

      const response = await http.get('/admin/catalog/products', { params })
      const payload = unwrapResponseData(response)
      const items = ensureArray(payload).map((product) => normalizeProductSummary(product))
      const meta = normalizeMeta(unwrapResponseMeta(response), items.length, normalizedPage, normalizedLimit)

      return {
        success: true,
        data: {
          items,
          meta,
        },
      }
    }, 'Không thể tải danh sách sản phẩm quản trị.')
  }

  async function createProduct(productData) {
    return runRequest(async () => {
      const response = await http.post('/admin/catalog/products', productData)
      return {
        success: true,
        data: normalizeProductDetail(unwrapResponseData(response)).product,
      }
    }, 'Không thể tạo sản phẩm.')
  }

  async function importProducts(file) {
    return runRequest(async () => {
      const formData = new FormData()
      formData.set('file', file)

      const response = await http.post('/admin/catalog/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return {
        success: true,
        data: unwrapResponseData(response),
        meta: unwrapResponseMeta(response),
      }
    }, 'Không thể import CSV sản phẩm.')
  }

  async function fetchProductDetail(productId) {
    return runRequest(async () => {
      const response = await http.get(`/admin/catalog/products/${productId}`)

      return {
        success: true,
        data: normalizeProductDetail(unwrapResponseData(response)),
      }
    }, 'Không thể tải hồ sơ sản phẩm.')
  }

  async function updateProduct(productId, patch) {
    return runRequest(async () => {
      const response = await http.patch(`/admin/catalog/products/${productId}`, patch)

      return {
        success: true,
        data: normalizeProductDetail(unwrapResponseData(response)).product,
      }
    }, 'Không thể cập nhật sản phẩm.')
  }

  async function cloneProduct(productId, input) {
    return runRequest(async () => {
      const response = await http.post(`/admin/catalog/products/${productId}/clone`, input)

      return {
        success: true,
        data: normalizeProductDetail(unwrapResponseData(response)).product,
      }
    }, 'Không thể clone sản phẩm.')
  }

  async function deleteProduct(productId) {
    return runRequest(async () => {
      const response = await http.delete(`/admin/catalog/products/${productId}`)

      return {
        success: true,
        data: normalizeProductDetail(unwrapResponseData(response)),
      }
    }, 'Không thể xóa mềm sản phẩm.')
  }

  async function createVariant(productId, input) {
    return runRequest(async () => {
      const response = await http.post(`/admin/catalog/products/${productId}/variants`, input)

      return {
        success: true,
        data: normalizeVariant(unwrapResponseData(response)),
      }
    }, 'Không thể tạo biến thể.')
  }

  async function updateVariant(variantId, patch) {
    return runRequest(async () => {
      const response = await http.patch(`/admin/catalog/variants/${variantId}`, patch)

      return {
        success: true,
        data: normalizeVariant(unwrapResponseData(response)),
      }
    }, 'Không thể cập nhật biến thể.')
  }

  async function deleteVariant(variantId) {
    return runRequest(async () => {
      const response = await http.delete(`/admin/catalog/variants/${variantId}`)

      return {
        success: true,
        data: normalizeVariant(unwrapResponseData(response)),
      }
    }, 'Không thể xóa mềm biến thể.')
  }

  async function fetchVariantImages(variantId) {
    return runRequest(async () => {
      const response = await http.get(`/admin/catalog/variants/${variantId}/images`)

      return {
        success: true,
        data: ensureArray(unwrapResponseData(response)).map((media) => normalizeMedia(media)),
      }
    }, 'Không thể tải thư viện ảnh biến thể.')
  }

  async function uploadVariantImage(variantId, file) {
    return runRequest(async () => {
      const formData = new FormData()
      formData.set('image', file)

      const response = await http.post(`/admin/catalog/variants/${variantId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return {
        success: true,
        data: normalizeMedia(unwrapResponseData(response)),
      }
    }, 'Không thể tải ảnh lên cho biến thể.')
  }

  async function deleteVariantImage(variantId, mediaId) {
    return runRequest(async () => {
      const response = await http.delete(`/admin/catalog/variants/${variantId}/images/${mediaId}`)

      return {
        success: true,
        data: normalizeMedia(unwrapResponseData(response)),
      }
    }, 'Không thể xóa ảnh biến thể.')
  }

  async function fetchInventoryRecord(variantId) {
    return runRequest(async () => {
      const response = await http.get(`/admin/inventory/variants/${variantId}`)

      return {
        success: true,
        data: normalizeInventoryRecord(unwrapResponseData(response)),
      }
    }, 'Không thể tải hồ sơ tồn kho.')
  }

  async function createInventoryRecord(input) {
    return runRequest(async () => {
      const response = await http.post('/admin/inventory/records', input)

      return {
        success: true,
        data: normalizeInventoryRecord(unwrapResponseData(response)),
      }
    }, 'Không thể tạo hồ sơ tồn kho.')
  }

  async function updateInventoryRecord(variantId, input) {
    return runRequest(async () => {
      const response = await http.patch(`/admin/inventory/variants/${variantId}`, input)

      return {
        success: true,
        data: normalizeInventoryRecord(unwrapResponseData(response)),
      }
    }, 'Không thể cập nhật hồ sơ tồn kho.')
  }

  async function batchReadInventory(variantIds = []) {
    return runRequest(async () => {
      const response = await http.post('/admin/inventory/variants/read', {
        variantIds,
      })

      return {
        success: true,
        data: ensureArray(unwrapResponseData(response)).map((item) => normalizeInventoryReadItem(item)),
      }
    }, 'Không thể đọc tồn kho hàng loạt.')
  }

  async function fetchLowStockInventory() {
    return runRequest(async () => {
      const response = await http.get('/admin/inventory/low-stock')

      return {
        success: true,
        data: ensureArray(unwrapResponseData(response)).map((item) => normalizeInventoryRecord(item)),
      }
    }, 'Không thể tải danh sách tồn kho thấp.')
  }

  async function fetchOrders() {
    return runRequest(async () => {
      const response = await http.get('/admin/orders')

      return {
        success: true,
        data: ensureArray(unwrapResponseData(response)).map((order) => normalizeOrder(order)),
      }
    }, 'Không thể tải danh sách đơn hàng.')
  }

  async function fetchOrderDetail(orderId) {
    return runRequest(async () => {
      const response = await http.get(`/admin/orders/${orderId}`)

      return {
        success: true,
        data: normalizeOrder(unwrapResponseData(response)),
      }
    }, 'Không thể tải chi tiết đơn hàng.')
  }

  async function updateOrderStatus(orderId, orderStatus) {
    return runRequest(async () => {
      const response = await http.patch(`/admin/orders/${orderId}/status`, {
        orderStatus,
      })

      return {
        success: true,
        data: normalizeOrder(unwrapResponseData(response)),
      }
    }, 'Không thể cập nhật trạng thái đơn hàng.')
  }

  async function cancelOrder(orderId) {
    return runRequest(async () => {
      const response = await http.post(`/admin/orders/${orderId}/cancel`)

      return {
        success: true,
        data: normalizeOrder(unwrapResponseData(response)),
      }
    }, 'Không thể hủy đơn hàng.')
  }

  async function reconcileVnpayPayment(orderId) {
    return runRequest(async () => {
      const response = await http.post(`/admin/payments/vnpay/orders/${orderId}/reconcile`)

      return {
        success: true,
        data: normalizePaymentResult(unwrapResponseData(response)),
      }
    }, 'Không thể đồng bộ thanh toán VNPAY.')
  }

  async function fetchAdminOverview() {
    return runRequest(async () => {
      const response = await http.get('/admin/overview')

      return {
        success: true,
        data: normalizeAdminOverview(unwrapResponseData(response)),
      }
    }, 'Không thể tải tổng quan quản trị.')
  }

  return {
    referenceOptions: readonly(referenceOptions),
    referenceOptionsLoaded: readonly(referenceOptionsLoaded),
    lastError: readonly(lastError),
    pendingRequests: readonly(pendingRequests),
    isBusy: readonly(isBusy),
    ensureReferenceOptions,
    fetchAdminProducts,
    createProduct,
    importProducts,
    fetchProductDetail,
    updateProduct,
    cloneProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant,
    fetchVariantImages,
    uploadVariantImage,
    deleteVariantImage,
    fetchInventoryRecord,
    createInventoryRecord,
    updateInventoryRecord,
    batchReadInventory,
    fetchLowStockInventory,
    fetchOrders,
    fetchOrderDetail,
    updateOrderStatus,
    cancelOrder,
    reconcileVnpayPayment,
    fetchAdminOverview,
  }
})
