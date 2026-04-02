<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatCurrency, formatDate, formatNumber } from '../../services/formatters'
import {
  createEmptyVariantDraft,
  createInventoryDraft,
  createProductPatchDraft,
  createVariantDraftFromSource,
  useAdminStore,
} from '../../store/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const productId = computed(() => route.params.productId)
const loadingPage = ref(true)
const pageError = ref('')
const actionMessage = ref('')
const actionTone = ref('success')

const detail = ref(null)
const productPatch = ref(createProductPatchDraft())
const createVariantForm = ref(createEmptyVariantDraft())
const replaceTags = ref(false)
const cloneDraft = ref({
  productGroupCode: '',
  title: '',
})

const savingProduct = ref(false)
const cloningProduct = ref(false)
const deletingProduct = ref(false)
const creatingVariant = ref(false)
const savingVariant = ref(false)
const deletingVariant = ref(false)
const loadingVariantAssets = ref(false)
const uploadingImage = ref(false)
const savingInventory = ref(false)

const selectedVariantId = ref('')
const selectedVariantDraft = ref(createEmptyVariantDraft())
const variantImages = ref([])
const inventoryRecord = ref(null)
const inventoryDraft = ref(createInventoryDraft())

const referenceOptions = computed(() => adminStore.referenceOptions)

const selectedVariant = computed(() =>
  detail.value?.variants.find((variant) => variant.id === selectedVariantId.value) ?? null,
)

const productAuditRows = computed(() => {
  const product = detail.value?.product

  if (!product) {
    return []
  }

  return [
    { label: 'Product ID', value: product.id || 'N/A' },
    { label: 'Group code', value: product.productGroupCode || 'N/A' },
    { label: 'Slug', value: product.slug || 'N/A' },
    { label: 'Brand ID', value: product.brandId || 'N/A' },
    { label: 'Category ID', value: product.categoryId || 'N/A' },
    {
      label: 'Tag IDs',
      value: product.tagIds.length > 0 ? product.tagIds.join(', ') : 'Backend detail chưa trả tagCodes',
    },
    { label: 'Tạo lúc', value: formatDate(product.createdAt) || 'N/A' },
    { label: 'Cập nhật', value: formatDate(product.updatedAt) || 'N/A' },
  ]
})

function setActionMessage(message, tone = 'success') {
  actionMessage.value = message
  actionTone.value = tone
}

function arraySignature(items = []) {
  return [...items].sort().join('|')
}

function resetProductPatch() {
  productPatch.value = createProductPatchDraft(detail.value?.product ?? {})
  replaceTags.value = false
}

function buildProductPatchPayload() {
  const current = detail.value?.product

  if (!current) {
    return null
  }

  const patch = {}
  const draft = productPatch.value

  if (draft.title.trim() !== current.title) {
    patch.title = draft.title.trim()
  }

  if (draft.status !== current.status) {
    patch.status = draft.status
  }

  if (draft.shortDescription.trim() !== (current.shortDescription || '')) {
    patch.shortDescription = draft.shortDescription.trim() || null
  }

  if (draft.longDescription.trim() !== (current.longDescription || '')) {
    patch.longDescription = draft.longDescription.trim() || null
  }

  if (arraySignature(draft.badges) !== arraySignature(current.badges)) {
    patch.badges = draft.badges
  }

  if (JSON.stringify(draft.specs) !== JSON.stringify(current.specs)) {
    patch.specs = draft.specs
  }

  if (draft.contactWhenOutOfStock !== current.contactWhenOutOfStock) {
    patch.contactWhenOutOfStock = draft.contactWhenOutOfStock
  }

  if (draft.brandCode.trim()) {
    patch.brandCode = draft.brandCode.trim()
  }

  if (draft.categoryCode.trim()) {
    patch.categoryCode = draft.categoryCode.trim()
  }

  if (replaceTags.value) {
    patch.tagCodes = draft.tagCodes
  }

  return patch
}

function buildVariantPayload(draft, { allowColorFullName = true, allowNullVideo = false } = {}) {
  const payload = {
    sku: draft.sku.trim(),
    variantAttributes: {
      ram: draft.variantAttributes.ram.trim(),
      rom: draft.variantAttributes.rom.trim(),
      color: draft.variantAttributes.color.trim(),
    },
    ramSort: Number(draft.ramSort),
    romSort: Number(draft.romSort),
    colorPriority: Number(draft.colorPriority),
    variantSortOrder: Number(draft.variantSortOrder),
    isPrimaryColor: Boolean(draft.isPrimaryColor),
    originalPrice: Number(draft.originalPrice),
    salePrice: Number(draft.salePrice),
    currency: draft.currency.trim() || 'VND',
    status: draft.status,
  }

  if (allowColorFullName && draft.variantAttributes.colorFullName.trim()) {
    payload.variantAttributes.colorFullName = draft.variantAttributes.colorFullName.trim()
  } else if (allowColorFullName) {
    payload.variantAttributes.colorFullName = null
  }

  const videoUrl = draft.video.url.trim()
  const videoThumbnailUrl = draft.video.thumbnailUrl.trim()

  if (videoUrl) {
    payload.video = videoThumbnailUrl ? { url: videoUrl, thumbnailUrl: videoThumbnailUrl } : videoUrl
  } else if (allowNullVideo) {
    payload.video = null
  }

  return payload
}

function hydrateSelectedVariant(variantId) {
  selectedVariantId.value = variantId || ''
}

async function loadProductDetail({ keepSelectedVariant = true } = {}) {
  loadingPage.value = true
  pageError.value = ''

  const previousVariantId = keepSelectedVariant ? selectedVariantId.value : ''
  const result = await adminStore.fetchProductDetail(productId.value)

  if (result.success) {
    detail.value = result.data
    resetProductPatch()
    cloneDraft.value = {
      productGroupCode: detail.value.product.productGroupCode
        ? `${detail.value.product.productGroupCode}_COPY`
        : '',
      title: detail.value.product.title ? `${detail.value.product.title} Copy` : '',
    }

    const preferredVariantId =
      previousVariantId && detail.value.variants.some((variant) => variant.id === previousVariantId)
        ? previousVariantId
        : detail.value.product.defaultSelectedVariantId || detail.value.variants[0]?.id || ''

    hydrateSelectedVariant(preferredVariantId)
  } else {
    detail.value = null
    pageError.value = result.error
  }

  loadingPage.value = false
}

async function loadVariantAssets(variantId) {
  if (!variantId) {
    variantImages.value = []
    inventoryRecord.value = null
    inventoryDraft.value = createInventoryDraft()
    return
  }

  loadingVariantAssets.value = true

  const [imagesResult, inventoryResult] = await Promise.all([
    adminStore.fetchVariantImages(variantId),
    adminStore.fetchInventoryRecord(variantId),
  ])

  if (imagesResult.success) {
    variantImages.value = imagesResult.data
  } else {
    variantImages.value = []
    setActionMessage(imagesResult.error, 'danger')
  }

  if (inventoryResult.success) {
    inventoryRecord.value = inventoryResult.data
    inventoryDraft.value = createInventoryDraft(inventoryResult.data)
  } else {
    inventoryRecord.value = null
    inventoryDraft.value = createInventoryDraft({ variantId })
    setActionMessage(inventoryResult.error, 'danger')
  }

  loadingVariantAssets.value = false
}

async function saveProductPatch() {
  const patch = buildProductPatchPayload()

  if (!patch || Object.keys(patch).length === 0) {
    setActionMessage('Chưa có thay đổi nào ở product để gửi lên backend.', 'warning')
    return
  }

  savingProduct.value = true

  const result = await adminStore.updateProduct(productId.value, patch)

  if (result.success) {
    setActionMessage('Đã cập nhật product theo patch hợp lệ của backend.', 'success')
    await loadProductDetail()
  } else {
    setActionMessage(result.error, 'danger')
  }

  savingProduct.value = false
}

async function cloneCurrentProduct() {
  if (!cloneDraft.value.productGroupCode.trim()) {
    setActionMessage('Clone yêu cầu `productGroupCode` mới.', 'danger')
    return
  }

  cloningProduct.value = true

  const result = await adminStore.cloneProduct(productId.value, {
    productGroupCode: cloneDraft.value.productGroupCode.trim(),
    title: cloneDraft.value.title.trim() || undefined,
  })

  if (result.success) {
    await router.push({
      name: 'admin-product-detail',
      params: { productId: result.data.id },
    })
    return
  }

  setActionMessage(result.error, 'danger')
  cloningProduct.value = false
}

async function deleteCurrentProduct() {
  if (!window.confirm('Soft delete product này và toàn bộ variants liên quan?')) {
    return
  }

  deletingProduct.value = true

  const result = await adminStore.deleteProduct(productId.value)

  if (result.success) {
    setActionMessage('Đã soft delete product. Hồ sơ bên dưới phản ánh trạng thái mới.', 'warning')
    await loadProductDetail({ keepSelectedVariant: false })
  } else {
    setActionMessage(result.error, 'danger')
  }

  deletingProduct.value = false
}

async function createVariantEntry() {
  creatingVariant.value = true

  const result = await adminStore.createVariant(
    productId.value,
    buildVariantPayload(createVariantForm.value, {
      allowColorFullName: false,
      allowNullVideo: false,
    }),
  )

  if (result.success) {
    createVariantForm.value = createEmptyVariantDraft()
    setActionMessage('Đã tạo biến thể mới và rebuild derived fields cho product.', 'success')
    await loadProductDetail({ keepSelectedVariant: false })
    hydrateSelectedVariant(result.data.id)
  } else {
    setActionMessage(result.error, 'danger')
  }

  creatingVariant.value = false
}

async function saveSelectedVariant() {
  if (!selectedVariant.value) {
    return
  }

  savingVariant.value = true

  const result = await adminStore.updateVariant(
    selectedVariant.value.id,
    buildVariantPayload(selectedVariantDraft.value, {
      allowColorFullName: true,
      allowNullVideo: true,
    }),
  )

  if (result.success) {
    setActionMessage('Đã cập nhật biến thể đang chọn.', 'success')
    await loadProductDetail()
    hydrateSelectedVariant(result.data.id)
  } else {
    setActionMessage(result.error, 'danger')
  }

  savingVariant.value = false
}

async function deleteSelectedVariant() {
  if (!selectedVariant.value) {
    return
  }

  if (!window.confirm('Soft delete biến thể đang chọn?')) {
    return
  }

  deletingVariant.value = true

  const result = await adminStore.deleteVariant(selectedVariant.value.id)

  if (result.success) {
    setActionMessage('Đã soft delete biến thể.', 'warning')
    await loadProductDetail({ keepSelectedVariant: false })
  } else {
    setActionMessage(result.error, 'danger')
  }

  deletingVariant.value = false
}

async function uploadImage(event) {
  const file = event.target.files?.[0]

  if (!file || !selectedVariant.value) {
    return
  }

  uploadingImage.value = true

  const result = await adminStore.uploadVariantImage(selectedVariant.value.id, file)

  if (result.success) {
    setActionMessage('Đã tải ảnh lên thư viện biến thể.', 'success')
    await loadVariantAssets(selectedVariant.value.id)
  } else {
    setActionMessage(result.error, 'danger')
  }

  event.target.value = ''
  uploadingImage.value = false
}

async function removeImage(mediaId) {
  if (!selectedVariant.value) {
    return
  }

  const result = await adminStore.deleteVariantImage(selectedVariant.value.id, mediaId)

  if (result.success) {
    setActionMessage('Đã xóa ảnh khỏi gallery biến thể.', 'warning')
    await loadVariantAssets(selectedVariant.value.id)
  } else {
    setActionMessage(result.error, 'danger')
  }
}

async function saveInventoryRecord() {
  if (!selectedVariant.value) {
    return
  }

  savingInventory.value = true

  const payload = {
    variantId: selectedVariant.value.id,
    stockQuantity: Number(inventoryDraft.value.stockQuantity),
    lowStockThreshold: Number(inventoryDraft.value.lowStockThreshold),
  }

  const result = inventoryRecord.value?.recordExists
    ? await adminStore.updateInventoryRecord(selectedVariant.value.id, {
        stockQuantity: payload.stockQuantity,
        lowStockThreshold: payload.lowStockThreshold,
      })
    : await adminStore.createInventoryRecord(payload)

  if (result.success) {
    inventoryRecord.value = result.data
    inventoryDraft.value = createInventoryDraft(result.data)
    setActionMessage('Đã đồng bộ hồ sơ tồn kho cho biến thể này.', 'success')
    await loadProductDetail()
  } else {
    setActionMessage(result.error, 'danger')
  }

  savingInventory.value = false
}

function toggleBadge(badgeCode) {
  if (productPatch.value.badges.includes(badgeCode)) {
    productPatch.value.badges = productPatch.value.badges.filter((item) => item !== badgeCode)
    return
  }

  productPatch.value.badges = [...productPatch.value.badges, badgeCode]
}

function toggleTag(tagCode) {
  if (productPatch.value.tagCodes.includes(tagCode)) {
    productPatch.value.tagCodes = productPatch.value.tagCodes.filter((item) => item !== tagCode)
    return
  }

  productPatch.value.tagCodes = [...productPatch.value.tagCodes, tagCode]
}

watch(
  selectedVariant,
  async (variant) => {
    if (!variant) {
      selectedVariantDraft.value = createEmptyVariantDraft()
      variantImages.value = []
      inventoryRecord.value = null
      inventoryDraft.value = createInventoryDraft()
      return
    }

    selectedVariantDraft.value = createVariantDraftFromSource(variant)
    inventoryDraft.value = createInventoryDraft({
      variantId: variant.id,
    })
    await loadVariantAssets(variant.id)
  },
  { immediate: true },
)

onMounted(async () => {
  await adminStore.ensureReferenceOptions()
  await loadProductDetail({ keepSelectedVariant: false })
})
</script>

<template>
  <section class="admin-page">
    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Hồ sơ catalog</p>
        <h1 class="admin-page-title">{{ detail?.product.title || 'Chi tiết sản phẩm' }}</h1>
        <p class="admin-page-subtitle">
          Một bàn điều phối duy nhất cho product, variants, media gallery và inventory record.
        </p>
      </div>

      <div class="admin-toolbar">
        <button type="button" class="admin-button admin-button-secondary" @click="router.back()">
          Quay lại
        </button>
        <button type="button" class="admin-button admin-button-secondary" @click="loadProductDetail">
          Tải lại hồ sơ
        </button>
      </div>
    </header>

    <div
      v-if="actionMessage"
      class="admin-alert"
      :class="{
        'admin-alert-success': actionTone === 'success',
        'admin-alert-warning': actionTone === 'warning',
        'admin-alert-danger': actionTone === 'danger',
      }"
    >
      {{ actionMessage }}
    </div>

    <div v-if="pageError" class="admin-alert admin-alert-danger">
      {{ pageError }}
    </div>

    <div v-if="loadingPage" class="admin-empty-state">Đang dựng hồ sơ sản phẩm...</div>

    <template v-else-if="detail">
      <div class="admin-content-grid">
        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Sổ gốc</p>
              <h2 class="admin-card-title">Thông tin backend đang lưu</h2>
            </div>

            <span class="admin-status-pill" :data-tone="detail.product.status">
              {{ detail.product.status }}
            </span>
          </div>

          <div class="admin-audit-list">
            <div v-for="row in productAuditRows" :key="row.label" class="admin-audit-row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </div>

          <div class="admin-note-block">
            <p>
              `admin detail` hiện trả `brandId`, `categoryId`, `tagIds` thay vì code tham chiếu.
            </p>
            <p>
              Vì vậy form chỉnh sửa bên phải chỉ gửi `brandCode/categoryCode/tagCodes` khi bạn chủ động ghi đè.
            </p>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Patch editor</p>
              <h2 class="admin-card-title">Cập nhật product</h2>
            </div>
          </div>

          <form class="admin-form-grid" @submit.prevent="saveProductPatch">
            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Tên sản phẩm</span>
                <input v-model="productPatch.title" class="admin-input" type="text" />
              </label>

              <label class="admin-field">
                <span class="admin-label">Lifecycle</span>
                <select v-model="productPatch.status" class="admin-select">
                  <option
                    v-for="option in referenceOptions.productStatuses"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Đổi brandCode nếu cần</span>
                <select v-model="productPatch.brandCode" class="admin-select">
                  <option value="">Giữ nguyên brand hiện tại</option>
                  <option
                    v-for="option in referenceOptions.brands"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="admin-field">
                <span class="admin-label">Đổi categoryCode nếu cần</span>
                <select v-model="productPatch.categoryCode" class="admin-select">
                  <option value="">Giữ nguyên category hiện tại</option>
                  <option
                    v-for="option in referenceOptions.categories"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="admin-field">
              <span class="admin-label">Mô tả ngắn</span>
              <textarea v-model="productPatch.shortDescription" class="admin-textarea" rows="3" />
            </label>

            <label class="admin-field">
              <span class="admin-label">Mô tả dài</span>
              <textarea v-model="productPatch.longDescription" class="admin-textarea" rows="5" />
            </label>

            <div class="admin-chip-grid">
              <label
                v-for="option in referenceOptions.badges"
                :key="option.value"
                class="admin-check-chip"
                :class="{ 'admin-check-chip-active': productPatch.badges.includes(option.value) }"
              >
                <input
                  type="checkbox"
                  class="admin-check-chip-input"
                  :checked="productPatch.badges.includes(option.value)"
                  @change="toggleBadge(option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>

            <label class="admin-toggle-row">
              <input v-model="replaceTags" type="checkbox" />
              <span>Ghi đè toàn bộ `tagCodes` của product bằng lựa chọn bên dưới</span>
            </label>

            <div class="admin-chip-grid" :class="{ 'admin-chip-grid-disabled': !replaceTags }">
              <label
                v-for="option in referenceOptions.tags"
                :key="option.value"
                class="admin-check-chip"
                :class="{ 'admin-check-chip-active': productPatch.tagCodes.includes(option.value) }"
              >
                <input
                  type="checkbox"
                  class="admin-check-chip-input"
                  :checked="productPatch.tagCodes.includes(option.value)"
                  :disabled="!replaceTags"
                  @change="toggleTag(option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>

            <label class="admin-toggle-row">
              <input v-model="productPatch.contactWhenOutOfStock" type="checkbox" />
              <span>Giữ trạng thái liên hệ khi hết hàng</span>
            </label>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">Screen size</span>
                <input v-model="productPatch.specs.screen.size" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Screen tech</span>
                <input v-model="productPatch.specs.screen.technology" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Resolution</span>
                <input v-model="productPatch.specs.screen.resolution" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">Refresh rate</span>
                <input v-model="productPatch.specs.screen.refreshRate" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Chipset</span>
                <input v-model="productPatch.specs.chipset" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Battery</span>
                <input v-model="productPatch.specs.battery" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Camera sau</span>
                <input v-model="productPatch.specs.rearCamera" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Camera trước</span>
                <input v-model="productPatch.specs.frontCamera" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">Operating system</span>
                <input v-model="productPatch.specs.operatingSystem" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">SIM</span>
                <input v-model="productPatch.specs.sim" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Network</span>
                <input v-model="productPatch.specs.network" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">Charging</span>
                <input v-model="productPatch.specs.charging" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Dimensions</span>
                <input v-model="productPatch.specs.dimensions" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Weight</span>
                <input v-model="productPatch.specs.weight" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Material</span>
                <input v-model="productPatch.specs.material" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Water resistance</span>
                <input v-model="productPatch.specs.waterResistance" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-button-row">
              <button type="button" class="admin-button admin-button-secondary" @click="resetProductPatch">
                Khôi phục patch
              </button>
              <button type="submit" class="admin-button admin-button-primary" :disabled="savingProduct">
                {{ savingProduct ? 'Đang lưu...' : 'Lưu patch product' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div class="admin-content-grid">
        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Hành động quản trị</p>
              <h2 class="admin-card-title">Clone và soft delete</h2>
            </div>
          </div>

          <form class="admin-form-grid" @submit.prevent="cloneCurrentProduct">
            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Clone group code</span>
                <input v-model="cloneDraft.productGroupCode" class="admin-input" type="text" />
              </label>

              <label class="admin-field">
                <span class="admin-label">Clone title</span>
                <input v-model="cloneDraft.title" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-button-row">
              <button type="submit" class="admin-button admin-button-secondary" :disabled="cloningProduct">
                {{ cloningProduct ? 'Đang clone...' : 'Clone thành draft mới' }}
              </button>
              <button
                type="button"
                class="admin-button admin-button-danger"
                :disabled="deletingProduct"
                @click="deleteCurrentProduct"
              >
                {{ deletingProduct ? 'Đang xóa mềm...' : 'Soft delete product' }}
              </button>
            </div>
          </form>
        </section>

        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Derived fields</p>
              <h2 class="admin-card-title">Tín hiệu storefront</h2>
            </div>
          </div>

          <div class="admin-audit-list">
            <div class="admin-audit-row">
              <dt>Has active variants</dt>
              <dd>{{ detail.product.hasActiveVariants ? 'true' : 'false' }}</dd>
            </div>
            <div class="admin-audit-row">
              <dt>Has in-stock variants</dt>
              <dd>{{ detail.product.hasInStockVariants ? 'true' : 'false' }}</dd>
            </div>
            <div class="admin-audit-row">
              <dt>Default selected variant</dt>
              <dd>{{ detail.product.defaultSelectedVariantId || 'N/A' }}</dd>
            </div>
            <div class="admin-audit-row">
              <dt>Min sale price</dt>
              <dd>{{ formatCurrency(detail.product.minSalePrice) }}</dd>
            </div>
          </div>

          <div v-if="detail.product.listingVariantSnapshot" class="admin-note-block">
            <p>
              Snapshot:
              <strong>
                {{ detail.product.listingVariantSnapshot.ram }} /
                {{ detail.product.listingVariantSnapshot.rom }} /
                {{ detail.product.listingVariantSnapshot.color }}
              </strong>
            </p>
          </div>
        </section>
      </div>

      <div class="admin-content-grid admin-content-grid-wide-right">
        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Registry</p>
              <h2 class="admin-card-title">Variants của product</h2>
            </div>
          </div>

          <div v-if="detail.variants.length === 0" class="admin-empty-state">
            Product này chưa có variant nào.
          </div>

          <div v-else class="admin-variant-list">
            <button
              v-for="variant in detail.variants"
              :key="variant.id"
              type="button"
              class="admin-variant-list-item"
              :class="{ 'admin-variant-list-item-active': selectedVariantId === variant.id }"
              @click="hydrateSelectedVariant(variant.id)"
            >
              <div>
                <p class="admin-table-title">{{ variant.sku }}</p>
                <p class="admin-table-subtitle">
                  {{ variant.variantAttributes.ram }} / {{ variant.variantAttributes.rom }} /
                  {{ variant.variantAttributes.color }}
                </p>
              </div>
              <div class="admin-ledger-trailing">
                <span class="admin-status-pill" :data-tone="variant.status">{{ variant.status }}</span>
                <span class="admin-status-pill" :data-tone="variant.isInStock ? 'success' : 'muted'">
                  {{ variant.isInStock ? 'in stock' : 'out' }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Khởi tạo variant</p>
              <h2 class="admin-card-title">Thêm biến thể mới</h2>
            </div>
          </div>

          <form class="admin-form-grid" @submit.prevent="createVariantEntry">
            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">SKU</span>
                <input v-model="createVariantForm.sku" class="admin-input" type="text" />
              </label>

              <label class="admin-field">
                <span class="admin-label">Lifecycle</span>
                <select v-model="createVariantForm.status" class="admin-select">
                  <option
                    v-for="option in referenceOptions.variantStatuses"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">RAM</span>
                <input v-model="createVariantForm.variantAttributes.ram" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">ROM</span>
                <input v-model="createVariantForm.variantAttributes.rom" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Color</span>
                <input v-model="createVariantForm.variantAttributes.color" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-four-column-grid">
              <label class="admin-field">
                <span class="admin-label">RAM sort</span>
                <input v-model.number="createVariantForm.ramSort" class="admin-input" type="number" min="0" />
              </label>
              <label class="admin-field">
                <span class="admin-label">ROM sort</span>
                <input v-model.number="createVariantForm.romSort" class="admin-input" type="number" min="0" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Color priority</span>
                <input
                  v-model.number="createVariantForm.colorPriority"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
              <label class="admin-field">
                <span class="admin-label">Variant order</span>
                <input
                  v-model.number="createVariantForm.variantSortOrder"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
            </div>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">Original price</span>
                <input
                  v-model.number="createVariantForm.originalPrice"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
              <label class="admin-field">
                <span class="admin-label">Sale price</span>
                <input v-model.number="createVariantForm.salePrice" class="admin-input" type="number" min="0" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Currency</span>
                <input v-model="createVariantForm.currency" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Video URL</span>
                <input v-model="createVariantForm.video.url" class="admin-input" type="url" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Video thumbnail URL</span>
                <input v-model="createVariantForm.video.thumbnailUrl" class="admin-input" type="url" />
              </label>
            </div>

            <label class="admin-toggle-row">
              <input v-model="createVariantForm.isPrimaryColor" type="checkbox" />
              <span>Đặt biến thể này là màu chủ đạo</span>
            </label>

            <p class="admin-muted-text">
              `admin create variant` hiện không nhận `colorFullName`; trường đó chỉ có thể bổ sung sau khi variant đã được tạo.
            </p>

            <div class="admin-button-row">
              <button type="submit" class="admin-button admin-button-primary" :disabled="creatingVariant">
                {{ creatingVariant ? 'Đang tạo variant...' : 'Tạo variant' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section class="admin-card">
        <div class="admin-card-header">
          <div>
            <p class="admin-section-kicker">Variant workshop</p>
            <h2 class="admin-card-title">
              {{ selectedVariant ? `Đang chỉnh: ${selectedVariant.sku}` : 'Chọn một variant để chỉnh sửa' }}
            </h2>
          </div>
        </div>

        <div v-if="!selectedVariant" class="admin-empty-state">
          Chọn một variant từ danh sách bên trái để mở editor, gallery và tồn kho.
        </div>

        <div v-else class="admin-content-grid admin-content-grid-wide-right">
          <form class="admin-form-grid" @submit.prevent="saveSelectedVariant">
            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">SKU</span>
                <input v-model="selectedVariantDraft.sku" class="admin-input" type="text" />
              </label>

              <label class="admin-field">
                <span class="admin-label">Lifecycle</span>
                <select v-model="selectedVariantDraft.status" class="admin-select">
                  <option
                    v-for="option in referenceOptions.variantStatuses"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <div class="admin-four-column-grid">
              <label class="admin-field">
                <span class="admin-label">RAM</span>
                <input v-model="selectedVariantDraft.variantAttributes.ram" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">ROM</span>
                <input v-model="selectedVariantDraft.variantAttributes.rom" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Color</span>
                <input v-model="selectedVariantDraft.variantAttributes.color" class="admin-input" type="text" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Color full name</span>
                <input
                  v-model="selectedVariantDraft.variantAttributes.colorFullName"
                  class="admin-input"
                  type="text"
                />
              </label>
            </div>

            <div class="admin-four-column-grid">
              <label class="admin-field">
                <span class="admin-label">RAM sort</span>
                <input v-model.number="selectedVariantDraft.ramSort" class="admin-input" type="number" min="0" />
              </label>
              <label class="admin-field">
                <span class="admin-label">ROM sort</span>
                <input v-model.number="selectedVariantDraft.romSort" class="admin-input" type="number" min="0" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Color priority</span>
                <input
                  v-model.number="selectedVariantDraft.colorPriority"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
              <label class="admin-field">
                <span class="admin-label">Variant order</span>
                <input
                  v-model.number="selectedVariantDraft.variantSortOrder"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
            </div>

            <div class="admin-three-column-grid">
              <label class="admin-field">
                <span class="admin-label">Original price</span>
                <input
                  v-model.number="selectedVariantDraft.originalPrice"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
              <label class="admin-field">
                <span class="admin-label">Sale price</span>
                <input
                  v-model.number="selectedVariantDraft.salePrice"
                  class="admin-input"
                  type="number"
                  min="0"
                />
              </label>
              <label class="admin-field">
                <span class="admin-label">Currency</span>
                <input v-model="selectedVariantDraft.currency" class="admin-input" type="text" />
              </label>
            </div>

            <div class="admin-two-column-grid">
              <label class="admin-field">
                <span class="admin-label">Video URL</span>
                <input v-model="selectedVariantDraft.video.url" class="admin-input" type="url" />
              </label>
              <label class="admin-field">
                <span class="admin-label">Video thumbnail URL</span>
                <input v-model="selectedVariantDraft.video.thumbnailUrl" class="admin-input" type="url" />
              </label>
            </div>

            <label class="admin-toggle-row">
              <input v-model="selectedVariantDraft.isPrimaryColor" type="checkbox" />
              <span>Biến thể màu chủ đạo</span>
            </label>

            <div class="admin-note-block">
              <p>Variant ID: <strong>{{ selectedVariant.id }}</strong></p>
              <p>
                Stock flag: <strong>{{ selectedVariant.isInStock ? 'true' : 'false' }}</strong> •
                Soft delete: <strong>{{ selectedVariant.isDeleted ? 'true' : 'false' }}</strong>
              </p>
            </div>

            <div class="admin-button-row">
              <button type="submit" class="admin-button admin-button-primary" :disabled="savingVariant">
                {{ savingVariant ? 'Đang lưu variant...' : 'Lưu variant' }}
              </button>
              <button
                type="button"
                class="admin-button admin-button-danger"
                :disabled="deletingVariant"
                @click="deleteSelectedVariant"
              >
                {{ deletingVariant ? 'Đang xóa mềm...' : 'Soft delete variant' }}
              </button>
            </div>
          </form>

          <div class="admin-variant-workbench">
            <section class="admin-subcard">
              <div class="admin-card-header">
                <div>
                  <p class="admin-section-kicker">Media gallery</p>
                  <h3 class="admin-card-title">Ảnh của variant</h3>
                </div>
              </div>

              <label class="admin-field">
                <span class="admin-label">Upload image</span>
                <input
                  class="admin-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  @change="uploadImage"
                />
              </label>

              <p class="admin-muted-text">
                Hỗ trợ `jpeg/png/webp`, tối đa 5 MB, backend tự tăng `sortOrder`.
              </p>

              <div v-if="loadingVariantAssets || uploadingImage" class="admin-empty-state">
                Đang đồng bộ gallery...
              </div>

              <div v-else-if="variantImages.length === 0" class="admin-empty-state">
                Variant này chưa có ảnh nào.
              </div>

              <div v-else class="admin-media-grid">
                <article v-for="media in variantImages" :key="media.id" class="admin-media-card">
                  <img :src="media.url" :alt="media.fileName" class="admin-media-preview" />
                  <div class="admin-media-meta">
                    <p class="admin-table-title">{{ media.fileName }}</p>
                    <p class="admin-table-subtitle">
                      sort {{ formatNumber(media.sortOrder) }} • {{ formatNumber(media.size) }} bytes
                    </p>
                  </div>
                  <button type="button" class="admin-inline-link" @click="removeImage(media.id)">
                    Xóa ảnh
                  </button>
                </article>
              </div>
            </section>

            <section class="admin-subcard">
              <div class="admin-card-header">
                <div>
                  <p class="admin-section-kicker">Inventory</p>
                  <h3 class="admin-card-title">Tồn kho của variant</h3>
                </div>
              </div>

              <div v-if="inventoryRecord" class="admin-note-block">
                <p>
                  `recordExists`: <strong>{{ inventoryRecord.recordExists ? 'true' : 'false' }}</strong>
                </p>
                <p>
                  `isInStock`: <strong>{{ inventoryRecord.isInStock ? 'true' : 'false' }}</strong> •
                  `isLowStock`: <strong>{{ inventoryRecord.isLowStock ? 'true' : 'false' }}</strong>
                </p>
              </div>

              <form class="admin-form-grid" @submit.prevent="saveInventoryRecord">
                <div class="admin-two-column-grid">
                  <label class="admin-field">
                    <span class="admin-label">Stock quantity</span>
                    <input
                      v-model.number="inventoryDraft.stockQuantity"
                      class="admin-input"
                      type="number"
                      min="0"
                    />
                  </label>

                  <label class="admin-field">
                    <span class="admin-label">Low stock threshold</span>
                    <input
                      v-model.number="inventoryDraft.lowStockThreshold"
                      class="admin-input"
                      type="number"
                      min="0"
                    />
                  </label>
                </div>

                <div class="admin-button-row">
                  <button type="submit" class="admin-button admin-button-secondary" :disabled="savingInventory">
                    {{ savingInventory ? 'Đang lưu tồn kho...' : 'Lưu inventory record' }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>
