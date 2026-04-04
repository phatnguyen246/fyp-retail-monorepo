<script setup>
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Editor from '@tinymce/tinymce-vue'
import 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/models/dom'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/autoresize'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/code'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/help'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/table'
import 'tinymce/plugins/visualblocks'
import 'tinymce/plugins/wordcount'
import 'tinymce/skins/content/default/content.css'
import 'tinymce/skins/ui/oxide/skin.css'
import 'tinymce/themes/silver'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import { useUnsavedChanges } from '../../composables/useUnsavedChanges'
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
const cloneDraft = ref({
  productGroupCode: '',
  title: '',
})

const savingProduct = ref(false)
const savingLongDescription = ref(false)
const cloningProduct = ref(false)
const deletingProduct = ref(false)
const creatingVariant = ref(false)
const savingVariant = ref(false)
const deletingVariant = ref(false)
const loadingVariantAssets = ref(false)
const uploadingImage = ref(false)
const savingInventory = ref(false)
const createVariantModalOpen = ref(false)
const variantWorkshopModalOpen = ref(false)
const variantMediaModalOpen = ref(false)
const productActionsModalOpen = ref(false)
const longDescriptionModalOpen = ref(false)
const productPatchOverviewModalOpen = ref(false)
const leaveConfirmOpen = ref(false)
const pendingRouteLocation = ref(null)

const selectedVariantId = ref('')
const selectedVariantDraft = ref(createEmptyVariantDraft())
const variantImages = ref([])
const inventoryRecord = ref(null)
const inventoryDraft = ref(createInventoryDraft())

const referenceOptions = computed(() => adminStore.referenceOptions)
const longDescriptionPreviewHtml = computed(() => normalizeRichTextHtml(productPatch.value.longDescription))
const longDescriptionMetrics = computed(() => {
  const plainText = extractPlainTextFromHtml(productPatch.value.longDescription)
  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0

  return {
    characters: plainText.length,
    words,
  }
})

const longDescriptionEditorConfig = {
  menubar: false,
  branding: false,
  promotion: false,
  statusbar: true,
  elementpath: false,
  skin: false,
  content_css: false,
  min_height: 420,
  max_height: 720,
  autoresize_bottom_margin: 18,
  toolbar_sticky: true,
  toolbar_mode: 'sliding',
  placeholder:
    'Viết mô tả dài theo cấu trúc rõ ràng: điểm nổi bật, trải nghiệm sử dụng, thông số đáng chú ý, đối tượng phù hợp.',
  plugins: [
    'advlist',
    'autolink',
    'autoresize',
    'charmap',
    'code',
    'fullscreen',
    'help',
    'link',
    'lists',
    'preview',
    'searchreplace',
    'table',
    'visualblocks',
    'wordcount',
  ],
  toolbar:
    'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | blockquote table link | removeformat | visualblocks code preview fullscreen',
  quickbars_selection_toolbar: 'bold italic underline | quicklink blockquote bullist numlist',
  block_formats: 'Đoạn văn=p; Tiêu đề lớn=h2; Tiêu đề vừa=h3; Tiêu đề nhỏ=h4',
  formats: {
    alignleft: [
      { selector: 'p,h1,h2,h3,h4,h5,h6,div,figure,table', styles: { textAlign: 'left' } },
      { selector: 'img', styles: { display: 'block', marginLeft: '0', marginRight: 'auto' } },
    ],
    aligncenter: [
      { selector: 'p,h1,h2,h3,h4,h5,h6,div,figure,table', styles: { textAlign: 'center' } },
      { selector: 'img', styles: { display: 'block', marginLeft: 'auto', marginRight: 'auto' } },
    ],
    alignright: [
      { selector: 'p,h1,h2,h3,h4,h5,h6,div,figure,table', styles: { textAlign: 'right' } },
      { selector: 'img', styles: { display: 'block', marginLeft: 'auto', marginRight: '0' } },
    ],
    alignjustify: [
      { selector: 'p,h1,h2,h3,h4,h5,h6,div', styles: { textAlign: 'justify' } },
    ],
  },
  link_default_target: '_blank',
  link_assume_external_targets: 'https',
  contextmenu: 'link table',
  content_style: `
    body {
      font-family: "Inter", sans-serif;
      color: #162333;
      font-size: 15px;
      line-height: 1.7;
      margin: 1rem auto;
      max-width: 48rem;
      padding: 0 1.1rem 1.5rem;
      background: #ffffff;
    }

    h2, h3, h4 {
      font-family: "Noto Serif", serif;
      line-height: 1.3;
      color: #102235;
      margin: 1.5em 0 0.65em;
    }

    p, ul, ol, blockquote, table {
      margin: 0 0 1em;
    }

    ul, ol {
      padding-left: 1.35rem;
    }

    blockquote {
      margin-left: 0;
      padding: 0.85rem 1rem;
      border-left: 4px solid #c89a2b;
      background: #fff8e7;
      color: #5b4300;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    table td, table th {
      border: 1px solid #d9e3ee;
      padding: 0.55rem 0.7rem;
    }

    img {
      display: block;
      max-width: 100%;
      height: auto;
      border-radius: 0.9rem;
    }

    .align-left,
    .tox-text-left {
      text-align: left;
    }

    .align-center,
    .tox-text-center {
      text-align: center;
    }

    .align-right,
    .tox-text-right {
      text-align: right;
    }

    .align-justify,
    .tox-text-justify {
      text-align: justify;
    }

    .align-left img,
    img.tox-image-align-left {
      margin-left: 0;
      margin-right: auto;
    }

    .align-center img,
    img.tox-image-align-center {
      margin-left: auto;
      margin-right: auto;
    }

    .align-right img,
    img.tox-image-align-right {
      margin-left: auto;
      margin-right: 0;
    }

    a {
      color: #1d4ed8;
    }
  `,
}

const fieldHints = {
  productTitle: 'Tên hiển thị chính của product trong admin và storefront.',
  productStatus: 'Trạng thái vòng đời quyết định khả năng hiển thị và vận hành của product.',
  shortDescription: 'Mô tả ngắn dùng cho listing hoặc phần giới thiệu súc tích.',
  longDescription: 'Mô tả dài hơn để diễn giải rõ nội dung sản phẩm.',
  brandCode: 'Chọn brandCode mới nếu cần đổi thương hiệu đang liên kết với product.',
  categoryCode: 'Chọn categoryCode mới nếu cần đổi danh mục đang liên kết với product.',
  badges: 'Các badge marketing hiển thị kèm product trên storefront.',
  tagCodes: 'Danh sách tagCodes hiện tại của product. Bỏ chọn hoặc thêm mới để cập nhật trực tiếp.',
  contactWhenOutOfStock: 'Cho phép storefront chuyển sang trạng thái liên hệ khi biến thể hết hàng.',
  screenSize: 'Kích thước màn hình ở cấp product.',
  screenTechnology: 'Công nghệ tấm nền hoặc loại màn hình.',
  screenResolution: 'Độ phân giải hiển thị tiêu chuẩn của thiết bị.',
  screenRefreshRate: 'Tần số quét màn hình nếu có.',
  chipset: 'Chipset hoặc SoC chính của sản phẩm.',
  battery: 'Dung lượng pin hoặc thông tin pin trọng yếu.',
  rearCamera: 'Thông tin cụm camera sau.',
  frontCamera: 'Thông tin camera trước.',
  operatingSystem: 'Hệ điều hành hoặc nền tảng phần mềm xuất xưởng.',
  sim: 'Chuẩn SIM mà thiết bị hỗ trợ.',
  network: 'Chuẩn mạng và kết nối di động chính.',
  charging: 'Chuẩn sạc hoặc công nghệ sạc hỗ trợ.',
  dimensions: 'Kích thước tổng thể của thiết bị.',
  weight: 'Khối lượng thiết bị.',
  material: 'Vật liệu hoàn thiện thân máy hoặc khung vỏ.',
  waterResistance: 'Chuẩn kháng nước hoặc mô tả khả năng chống chịu môi trường.',
  cloneGroupCode: 'Mã nhóm mới cho bản clone. Backend dùng giá trị này để tạo product mới.',
  cloneTitle: 'Tên tùy chọn cho bản clone. Để trống nếu muốn backend tự dùng tên mặc định.',
  variantSku: 'SKU duy nhất của variant dùng cho quản trị, đồng bộ và tồn kho.',
  variantStatus: 'Trạng thái vòng đời của variant.',
  variantRam: 'Giá trị RAM trong variantAttributes.',
  variantRom: 'Giá trị ROM trong variantAttributes.',
  variantColor: 'Mã màu ngắn cho variant. Với form tạo mới, tên màu đầy đủ chỉ bổ sung sau khi tạo variant.',
  variantColorFullName: 'Tên màu đầy đủ để hiển thị đẹp hơn nếu cần.',
  ramSort: 'Thứ tự sắp xếp RAM khi render lựa chọn variant.',
  romSort: 'Thứ tự sắp xếp ROM khi render lựa chọn variant.',
  colorPriority: 'Ưu tiên của màu trong danh sách biến thể.',
  variantSortOrder: 'Thứ tự tổng quát của variant trong product.',
  originalPrice: 'Giá niêm yết gốc trước khi giảm giá.',
  salePrice: 'Giá bán thực tế dùng cho storefront.',
  currency: 'Mã tiền tệ của giá, ví dụ VND.',
  videoUrl: 'URL video gắn với variant nếu có.',
  videoThumbnailUrl: 'Ảnh đại diện của video variant.',
  isPrimaryColor: 'Đánh dấu variant này là màu chủ đạo hoặc mặc định nổi bật.',
  uploadImage: 'Tải ảnh JPEG, PNG hoặc WebP, tối đa 5 MB. Backend tự gán sortOrder tăng dần.',
  stockQuantity: 'Số lượng tồn kho hiện tại của variant.',
  lowStockThreshold: 'Ngưỡng cảnh báo tồn kho thấp cho variant này.',
  currentRecordSummary:
    'Mục này dùng để đối chiếu nhanh thông tin sản phẩm hiện đang được hệ thống ghi nhận. Khi cần điều chỉnh thương hiệu, ngành hàng hoặc nhãn phân loại, hãy thao tác ở phần cập nhật bên phải.',
}

const FieldLabel = defineComponent({
  name: 'FieldLabel',
  props: {
    label: {
      type: String,
      required: true,
    },
    hint: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () =>
      h('span', { class: 'admin-label-row' }, [
        h('span', { class: 'admin-label' }, props.label),
        props.hint
          ? h(
              'span',
              {
                class: 'admin-field-hint',
                title: props.hint,
                tabindex: '0',
                'data-tooltip': props.hint,
                'aria-label': `${props.label}: ${props.hint}`,
              },
              '!',
            )
          : null,
      ])
  },
})

const SectionHint = defineComponent({
  name: 'SectionHint',
  props: {
    hint: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () =>
      props.hint
        ? h(
            'span',
            {
              class: 'admin-field-hint',
              title: props.hint,
              tabindex: '0',
              'data-tooltip': props.hint,
              'aria-label': props.hint,
            },
            '!',
          )
        : null
  },
})

const selectedVariant = computed(() =>
  detail.value?.variants.find((variant) => variant.id === selectedVariantId.value) ?? null,
)

const productAuditRows = computed(() => {
  const product = detail.value?.product

  if (!product) {
    return []
  }

  return [
    { label: 'Mã sản phẩm', value: product.id || 'N/A' },
    { label: 'Mã nhóm', value: product.productGroupCode || 'N/A' },
    { label: 'Đường dẫn', value: product.slug || 'N/A' },
  ]
})

const productSummaryCards = computed(() => {
  const product = detail.value?.product

  if (!product) {
    return []
  }

  return [
    {
      label: 'Lifecycle',
      value: product.status || 'N/A',
      note: 'Trạng thái hiện tại của product trong catalog.',
      tone: product.status || 'muted',
    },
    {
      label: 'Biến thể',
      value: formatNumber(detail.value?.variants.length || 0),
      note: 'Tổng số variant đang gắn với product này.',
    },
    {
      label: 'Giá thấp nhất',
      value: formatCurrency(product.minSalePrice),
      note: 'Mức giá storefront nhỏ nhất đang được suy ra.',
    },
    {
      label: 'Cập nhật cuối',
      value: formatDate(product.updatedAt) || 'N/A',
      note: 'Mốc backend ghi nhận thay đổi gần nhất.',
    },
  ]
})

const hasProductPatchChanges = computed(() => {
  const patch = buildProductPatchPayload({ includeLongDescription: false })
  return Boolean(patch && Object.keys(patch).length > 0)
})

const hasLongDescriptionChanges = computed(() => {
  const currentLongDescription = normalizeRichTextHtml(detail.value?.product.longDescription || '')
  return normalizeRichTextHtml(productPatch.value.longDescription) !== currentLongDescription
})

const hasSelectedVariantChanges = computed(() => {
  if (!selectedVariant.value) {
    return false
  }

  return (
    JSON.stringify(selectedVariantDraft.value) !==
    JSON.stringify(createVariantDraftFromSource(selectedVariant.value))
  )
})

const hasInventoryChanges = computed(() => {
  if (!selectedVariant.value) {
    return false
  }

  const currentInventoryDraft = inventoryRecord.value?.recordExists
    ? createInventoryDraft(inventoryRecord.value)
    : createInventoryDraft({ variantId: selectedVariant.value.id })

  return JSON.stringify(inventoryDraft.value) !== JSON.stringify(currentInventoryDraft)
})

const hasCreateVariantChanges = computed(
  () => JSON.stringify(createVariantForm.value) !== JSON.stringify(createEmptyVariantDraft()),
)

const hasCloneDraftChanges = computed(() => {
  if (!detail.value?.product) {
    return false
  }

  const defaultCloneDraft = {
    productGroupCode: detail.value.product.productGroupCode
      ? `${detail.value.product.productGroupCode}_COPY`
      : '',
    title: detail.value.product.title ? `${detail.value.product.title} Copy` : '',
  }

  return JSON.stringify(cloneDraft.value) !== JSON.stringify(defaultCloneDraft)
})

const hasUnsavedChanges = computed(
  () =>
    hasProductPatchChanges.value ||
    hasLongDescriptionChanges.value ||
    hasSelectedVariantChanges.value ||
    hasInventoryChanges.value ||
    hasCreateVariantChanges.value ||
    hasCloneDraftChanges.value,
)
const isDirty = computed(() => hasUnsavedChanges.value)

const productPatchOverviewItems = computed(() => {
  const patch = buildProductPatchPayload({ includeLongDescription: false }) || {}
  const current = detail.value?.product

  if (!current) {
    return []
  }

  const items = []

  if (Object.hasOwn(patch, 'title')) {
    items.push({ label: 'Tên sản phẩm', from: current.title || 'N/A', to: patch.title || 'N/A' })
  }

  if (Object.hasOwn(patch, 'status')) {
    items.push({ label: 'Lifecycle', from: current.status || 'N/A', to: patch.status || 'N/A' })
  }

  if (Object.hasOwn(patch, 'brandCode')) {
    items.push({
      label: 'Brand code',
      from: current.brand?.code || 'N/A',
      to: patch.brandCode || 'N/A',
    })
  }

  if (Object.hasOwn(patch, 'categoryCode')) {
    items.push({
      label: 'Category code',
      from: current.category?.code || 'N/A',
      to: patch.categoryCode || 'N/A',
    })
  }

  if (Object.hasOwn(patch, 'contactWhenOutOfStock')) {
    items.push({
      label: 'Liên hệ khi hết hàng',
      from: current.contactWhenOutOfStock ? 'Bật' : 'Tắt',
      to: patch.contactWhenOutOfStock ? 'Bật' : 'Tắt',
    })
  }

  if (Object.hasOwn(patch, 'badges')) {
    items.push({
      label: 'Badge hiển thị',
      from: current.badges?.join(', ') || 'Không có',
      to: patch.badges?.join(', ') || 'Không có',
    })
  }

  if (Object.hasOwn(patch, 'tagCodes')) {
    const currentTagCodes = (current.tags || []).map((tag) => tag.code).filter(Boolean)
    items.push({
      label: 'Tag codes',
      from: currentTagCodes.join(', ') || 'Không có',
      to: patch.tagCodes?.join(', ') || 'Không có',
    })
  }

  if (Object.hasOwn(patch, 'specs')) {
    const specComparisons = [
      ['Screen size', current.specs?.screen?.size, patch.specs?.screen?.size],
      ['Screen tech', current.specs?.screen?.technology, patch.specs?.screen?.technology],
      ['Resolution', current.specs?.screen?.resolution, patch.specs?.screen?.resolution],
      ['Refresh rate', current.specs?.screen?.refreshRate, patch.specs?.screen?.refreshRate],
      ['Chipset', current.specs?.chipset, patch.specs?.chipset],
      ['Battery', current.specs?.battery, patch.specs?.battery],
      ['Operating system', current.specs?.operatingSystem, patch.specs?.operatingSystem],
      ['Charging', current.specs?.charging, patch.specs?.charging],
      ['Camera sau', current.specs?.rearCamera, patch.specs?.rearCamera],
      ['Camera trước', current.specs?.frontCamera, patch.specs?.frontCamera],
      ['SIM', current.specs?.sim, patch.specs?.sim],
      ['Network', current.specs?.network, patch.specs?.network],
      ['Dimensions', current.specs?.dimensions, patch.specs?.dimensions],
      ['Weight', current.specs?.weight, patch.specs?.weight],
      ['Material', current.specs?.material, patch.specs?.material],
      ['Water resistance', current.specs?.waterResistance, patch.specs?.waterResistance],
    ]

    for (const [label, fromValue, toValue] of specComparisons) {
      if (toValue !== undefined && (fromValue || '') !== (toValue || '')) {
        items.push({
          label,
          from: fromValue || 'Trống',
          to: toValue || 'Trống',
        })
      }
    }
  }

  return items
})

function setActionMessage(message, tone = 'success') {
  actionMessage.value = message
  actionTone.value = tone
}

function closeLeaveConfirm() {
  leaveConfirmOpen.value = false
  pendingRouteLocation.value = null
}

function handleDirtyRouteAttempt(to) {
  pendingRouteLocation.value = to
  leaveConfirmOpen.value = true
}

async function confirmLeavePage() {
  const targetRoute = pendingRouteLocation.value

  closeLeaveConfirm()

  await bypassUnsavedChangesGuard(async () => {
    if (targetRoute) {
      await router.push(targetRoute)
      return
    }

    await navigateBackToPreviousPage()
  })
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
  const plainText = extractPlainTextFromHtml(source)
  const hasStructuredContent = Boolean(
    parsed.body.querySelector('img, video, iframe, table, ul, ol, blockquote, pre, hr'),
  )

  if (!plainText && !hasStructuredContent) {
    return ''
  }

  return parsed.body.innerHTML.trim()
}

function arraySignature(items = []) {
  return [...items].sort().join('|')
}

function resetProductPatch() {
  productPatch.value = createProductPatchDraft(detail.value?.product ?? {})
}

function buildProductPatchPayload({ includeLongDescription = true } = {}) {
  const current = detail.value?.product

  if (!current) {
    return null
  }

  const patch = {}
  const draft = productPatch.value
  const currentBrandCode = current.brand?.code || ''
  const currentCategoryCode = current.category?.code || ''
  const currentTagCodes = (current.tags || []).map((tag) => tag.code).filter(Boolean)

  if (draft.title.trim() !== current.title) {
    patch.title = draft.title.trim()
  }

  if (draft.status !== current.status) {
    patch.status = draft.status
  }

  if (draft.shortDescription.trim() !== (current.shortDescription || '')) {
    patch.shortDescription = draft.shortDescription.trim() || null
  }

  const normalizedLongDescription = normalizeRichTextHtml(draft.longDescription)
  const currentLongDescription = normalizeRichTextHtml(current.longDescription || '')

  if (includeLongDescription && normalizedLongDescription !== currentLongDescription) {
    patch.longDescription = normalizedLongDescription || null
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

  if (draft.brandCode.trim() && draft.brandCode.trim() !== currentBrandCode) {
    patch.brandCode = draft.brandCode.trim()
  }

  if (draft.categoryCode.trim() && draft.categoryCode.trim() !== currentCategoryCode) {
    patch.categoryCode = draft.categoryCode.trim()
  }

  if (arraySignature(draft.tagCodes) !== arraySignature(currentTagCodes)) {
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

function openVariantWorkshop(variantId) {
  hydrateSelectedVariant(variantId)
  variantWorkshopModalOpen.value = true
}

function openVariantMediaGallery(variantId) {
  hydrateSelectedVariant(variantId)
  variantMediaModalOpen.value = true
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
  const patch = buildProductPatchPayload({ includeLongDescription: false })

  if (!patch || Object.keys(patch).length === 0) {
    setActionMessage('Chưa có thay đổi nào ở product để gửi lên backend.', 'warning')
    return
  }

  savingProduct.value = true

  const result = await adminStore.updateProduct(productId.value, patch)

  if (result.success) {
    setActionMessage('Đã cập nhật product theo patch hợp lệ của backend.', 'success')
    productPatchOverviewModalOpen.value = false
    await loadProductDetail()
  } else {
    setActionMessage(result.error, 'danger')
  }

  savingProduct.value = false
}

function openProductPatchOverview() {
  if (!hasProductPatchChanges.value) {
    return
  }

  productPatchOverviewModalOpen.value = true
}

async function saveLongDescription() {
  const current = detail.value?.product

  if (!current) {
    return
  }

  const nextLongDescription = normalizeRichTextHtml(productPatch.value.longDescription)
  const currentLongDescription = normalizeRichTextHtml(current.longDescription || '')

  if (nextLongDescription === currentLongDescription) {
    setActionMessage('Mô tả dài chưa có thay đổi để lưu.', 'warning')
    return
  }

  savingLongDescription.value = true

  const result = await adminStore.updateProduct(productId.value, {
    longDescription: nextLongDescription || null,
  })

  if (result.success) {
    setActionMessage('Đã cập nhật mô tả dài của product.', 'success')
    longDescriptionModalOpen.value = false
    await loadProductDetail()
  } else {
    setActionMessage(result.error, 'danger')
  }

  savingLongDescription.value = false
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
    createVariantModalOpen.value = false
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

async function navigateBackToPreviousPage() {
  if (window.history.state?.back) {
    await router.back()
    return
  }

  await router.push({ name: 'admin-products' })
}

function goBackToPreviousPage() {
  if (isDirty.value) {
    pendingRouteLocation.value = null
    leaveConfirmOpen.value = true
    return
  }

  navigateBackToPreviousPage()
}

const { bypassUnsavedChangesGuard } = useUnsavedChanges({
  isDirty,
  onRouteAttempt: handleDirtyRouteAttempt,
  routeMessage:
    'Trang hiện tại đang có thay đổi chưa được lưu. Nếu rời đi, các thay đổi này sẽ bị mất.',
})

onMounted(async () => {
  await adminStore.ensureReferenceOptions()
  await loadProductDetail({ keepSelectedVariant: false })
})
</script>

<template>
  <section class="admin-page admin-product-detail-page">
    <div class="admin-page-backtrack">
      <button
        type="button"
        class="admin-button admin-button-secondary admin-button-compact"
        @click="goBackToPreviousPage"
      >
        ← Trở lại trang trước
      </button>
    </div>

    <header class="admin-page-header">
      <div>
        <p class="admin-page-kicker">Hồ sơ catalog</p>
        <h1 class="admin-page-title">{{ detail?.product.title || 'Chi tiết sản phẩm' }}</h1>
        <p class="admin-page-subtitle">
          Một bàn điều phối duy nhất cho product, variants, media gallery và inventory record.
        </p>
      </div>

      <div class="admin-toolbar">
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
      <div class="admin-stat-grid admin-stat-grid-compact admin-product-summary-grid">
        <article
          v-for="card in productSummaryCards"
          :key="card.label"
          class="admin-stat-card admin-product-summary-card"
        >
          <p class="admin-stat-eyebrow">{{ card.label }}</p>
          <div class="admin-product-summary-value">
            <span v-if="card.tone" class="admin-status-pill" :data-tone="card.tone">
              {{ card.value }}
            </span>
            <p v-else class="admin-stat-value admin-stat-value-small">{{ card.value }}</p>
          </div>
          <p class="admin-stat-note">{{ card.note }}</p>
        </article>
      </div>

      <div class="admin-content-grid admin-product-detail-primary-grid">
        <section class="admin-card admin-product-detail-sidebar-card">
          <div class="admin-card-header">
            <div class="admin-heading-title">
              <p class="admin-section-kicker">Hồ sơ hiện tại</p>
              <div class="admin-heading-title-row">
                <h2 class="admin-card-title">Thông tin sản phẩm đang áp dụng</h2>
                <SectionHint :hint="fieldHints.currentRecordSummary" />
              </div>
            </div>

            <div class="admin-heading-actions">
              <span class="admin-status-pill" :data-tone="detail.product.status">
                {{ detail.product.status }}
              </span>
            </div>
          </div>

          <div class="admin-audit-list admin-product-audit-grid admin-product-audit-grid-inline">
            <div v-for="row in productAuditRows" :key="row.label" class="admin-audit-row">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </div>

        </section>

        <section class="admin-card admin-product-detail-editor-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Patch editor</p>
              <h2 class="admin-card-title">Cập nhật product</h2>
            </div>

            <div class="admin-button-row">
              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="productActionsModalOpen = true"
              >
                Clone product
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
          </div>

          <form class="admin-form-grid admin-product-detail-form" @submit.prevent="saveProductPatch">
            <div class="admin-product-edit-hero-grid">
              <section class="admin-detail-section admin-detail-section-specs admin-product-description-panel">
                <div class="admin-detail-section-header">
                  <h3 class="admin-detail-section-title">Mô tả dài</h3>
                </div>

                <div class="admin-description-preview">
                  <div class="admin-description-preview-header">
                    <p class="admin-description-preview-label">Preview</p>
                    <button
                      type="button"
                      class="admin-button admin-button-secondary admin-button-compact"
                      @click="longDescriptionModalOpen = true"
                    >
                      Mở chỉnh sửa
                    </button>
                  </div>
                  <div class="admin-description-preview-body">
                    <div
                      v-if="longDescriptionPreviewHtml"
                      class="admin-rich-text-preview"
                      v-html="longDescriptionPreviewHtml"
                    />
                    <span v-else>Chưa có mô tả dài cho sản phẩm này.</span>
                  </div>
                </div>
              </section>

              <div class="admin-product-edit-side-stack">
                <section class="admin-detail-section admin-detail-section-specs">
                  <div class="admin-detail-section-header">
                    <h3 class="admin-detail-section-title">Thông tin cơ bản</h3>
                  </div>

                  <div class="admin-two-column-grid">
                    <label class="admin-field">
                      <FieldLabel label="Tên sản phẩm" :hint="fieldHints.productTitle" />
                      <input v-model="productPatch.title" class="admin-input" type="text" />
                    </label>

                    <label class="admin-field">
                      <FieldLabel label="Lifecycle" :hint="fieldHints.productStatus" />
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
                    <div class="admin-note-block">
                      <p class="admin-description-preview-label">Tạo lúc</p>
                      <p>{{ formatDate(detail?.product.createdAt) || 'N/A' }}</p>
                    </div>

                    <div class="admin-note-block">
                      <p class="admin-description-preview-label">Cập nhật</p>
                      <p>{{ formatDate(detail?.product.updatedAt) || 'N/A' }}</p>
                    </div>
                  </div>

                  <div class="admin-two-column-grid">
                    <div class="admin-note-block">
                      <p class="admin-description-preview-label">Thương hiệu</p>
                      <p>
                        {{
                          detail?.product.brand
                            ? `${detail.product.brand.name} (${detail.product.brand.code})`
                            : 'N/A'
                        }}
                      </p>
                    </div>

                    <div class="admin-note-block">
                      <p class="admin-description-preview-label">Ngành hàng</p>
                      <p>
                        {{
                          detail?.product.category
                            ? `${detail.product.category.name} (${detail.product.category.code})`
                            : 'N/A'
                        }}
                      </p>
                    </div>
                  </div>

                  <div class="admin-note-block">
                    <p class="admin-description-preview-label">Nhãn phân loại</p>
                    <p>
                      {{
                        detail?.product.tags?.length
                          ? detail.product.tags.map((tag) => `${tag.name} (${tag.code})`).join(', ')
                          : 'N/A'
                      }}
                    </p>
                  </div>
                </section>

                <section class="admin-detail-section admin-detail-section-specs">
                  <div class="admin-detail-section-header">
                    <h3 class="admin-detail-section-title">Phân loại và hiển thị</h3>
                  </div>

                  <div class="admin-two-column-grid">
                    <label class="admin-field">
                      <FieldLabel label="Brand code" :hint="fieldHints.brandCode" />
                      <select v-model="productPatch.brandCode" class="admin-select">
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
                      <FieldLabel label="Category code" :hint="fieldHints.categoryCode" />
                      <select v-model="productPatch.categoryCode" class="admin-select">
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

                  <div class="admin-field admin-field-stack">
                    <FieldLabel label="Badge hiển thị" :hint="fieldHints.badges" />
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
                  </div>

                  <div class="admin-field admin-field-stack">
                    <FieldLabel label="Tag codes" :hint="fieldHints.tagCodes" />
                    <div class="admin-chip-grid">
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
                          @change="toggleTag(option.value)"
                        />
                        <span>{{ option.label }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="admin-field admin-field-stack">
                    <FieldLabel
                      label="Liên hệ khi hết hàng"
                      :hint="fieldHints.contactWhenOutOfStock"
                    />
                    <label class="admin-toggle-row">
                      <input v-model="productPatch.contactWhenOutOfStock" type="checkbox" />
                      <span>Giữ trạng thái liên hệ khi hết hàng</span>
                    </label>
                  </div>
                </section>
              </div>
            </div>

            <section class="admin-detail-section admin-detail-section-specs-compact">
              <div class="admin-detail-section-header">
                <h3 class="admin-detail-section-title">Thông số kỹ thuật</h3>
              </div>

              <div class="admin-specs-layout">
                <section class="admin-specs-group">
                  <header class="admin-specs-group-header">
                    <div>
                      <p class="admin-specs-group-title">Màn hình</p>
                      <p class="admin-specs-group-note">Các thông số hiển thị chính của thiết bị.</p>
                    </div>
                  </header>

                  <div class="admin-specs-grid">
                    <label class="admin-field">
                      <FieldLabel label="Screen size" :hint="fieldHints.screenSize" />
                      <input v-model="productPatch.specs.screen.size" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Screen tech" :hint="fieldHints.screenTechnology" />
                      <input v-model="productPatch.specs.screen.technology" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Resolution" :hint="fieldHints.screenResolution" />
                      <input v-model="productPatch.specs.screen.resolution" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Refresh rate" :hint="fieldHints.screenRefreshRate" />
                      <input v-model="productPatch.specs.screen.refreshRate" class="admin-input" type="text" />
                    </label>
                  </div>
                </section>

                <section class="admin-specs-group">
                  <header class="admin-specs-group-header">
                    <div>
                      <p class="admin-specs-group-title">Hiệu năng</p>
                      <p class="admin-specs-group-note">Nền tảng phần cứng và năng lượng.</p>
                    </div>
                  </header>

                  <div class="admin-specs-grid">
                    <label class="admin-field">
                      <FieldLabel label="Chipset" :hint="fieldHints.chipset" />
                      <input v-model="productPatch.specs.chipset" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Battery" :hint="fieldHints.battery" />
                      <input v-model="productPatch.specs.battery" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Operating system" :hint="fieldHints.operatingSystem" />
                      <input v-model="productPatch.specs.operatingSystem" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Charging" :hint="fieldHints.charging" />
                      <input v-model="productPatch.specs.charging" class="admin-input" type="text" />
                    </label>
                  </div>
                </section>

                <section class="admin-specs-group">
                  <header class="admin-specs-group-header">
                    <div>
                      <p class="admin-specs-group-title">Camera và kết nối</p>
                      <p class="admin-specs-group-note">Gom các thông tin tác động trực tiếp tới trải nghiệm dùng máy.</p>
                    </div>
                  </header>

                  <div class="admin-specs-grid">
                    <label class="admin-field">
                      <FieldLabel label="Camera sau" :hint="fieldHints.rearCamera" />
                      <input v-model="productPatch.specs.rearCamera" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Camera trước" :hint="fieldHints.frontCamera" />
                      <input v-model="productPatch.specs.frontCamera" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="SIM" :hint="fieldHints.sim" />
                      <input v-model="productPatch.specs.sim" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Network" :hint="fieldHints.network" />
                      <input v-model="productPatch.specs.network" class="admin-input" type="text" />
                    </label>
                  </div>
                </section>

                <section class="admin-specs-group">
                  <header class="admin-specs-group-header">
                    <div>
                      <p class="admin-specs-group-title">Thiết kế và độ bền</p>
                      <p class="admin-specs-group-note">Kích thước, vật liệu và khả năng chống chịu.</p>
                    </div>
                  </header>

                  <div class="admin-specs-grid">
                    <label class="admin-field">
                      <FieldLabel label="Dimensions" :hint="fieldHints.dimensions" />
                      <input v-model="productPatch.specs.dimensions" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Weight" :hint="fieldHints.weight" />
                      <input v-model="productPatch.specs.weight" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Material" :hint="fieldHints.material" />
                      <input v-model="productPatch.specs.material" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Water resistance" :hint="fieldHints.waterResistance" />
                      <input v-model="productPatch.specs.waterResistance" class="admin-input" type="text" />
                    </label>
                  </div>
                </section>
              </div>
            </section>

            <div class="admin-button-row">
              <button
                type="button"
                class="admin-button admin-button-secondary"
                :disabled="!hasProductPatchChanges"
                @click="resetProductPatch"
              >
                Khôi phục patch
              </button>
              <button
                type="button"
                class="admin-button admin-button-primary"
                :disabled="savingProduct || !hasProductPatchChanges"
                @click="openProductPatchOverview"
              >
                {{ savingProduct ? 'Đang lưu...' : 'Lưu patch product' }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div class="admin-content-grid admin-content-grid-wide-right admin-product-detail-variant-grid">
        <section class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Registry</p>
              <h2 class="admin-card-title">Variants của product</h2>
            </div>

            <div class="admin-button-row">
              <button
                type="button"
                class="admin-button admin-button-primary"
                @click="createVariantModalOpen = true"
              >
                Mở form tạo variant
              </button>
            </div>
          </div>

          <div v-if="detail.variants.length === 0" class="admin-empty-state">
            Product này chưa có variant nào.
          </div>

          <div v-else class="admin-variant-list">
            <div
              v-for="variant in detail.variants"
              :key="variant.id"
              class="admin-variant-list-item"
              :class="{ 'admin-variant-list-item-active': selectedVariantId === variant.id }"
            >
              <div class="admin-variant-list-main">
                <div class="admin-variant-list-summary">
                  <p class="admin-table-title">{{ variant.sku }}</p>
                  <p class="admin-table-subtitle">
                    {{ variant.variantAttributes.ram }} / {{ variant.variantAttributes.rom }} /
                    {{ variant.variantAttributes.color }}
                  </p>
                </div>

                <div class="admin-variant-list-meta">
                  <span class="admin-variant-meta-chip">
                    RAM {{ variant.variantAttributes.ram || 'N/A' }}
                  </span>
                  <span class="admin-variant-meta-chip">
                    ROM {{ variant.variantAttributes.rom || 'N/A' }}
                  </span>
                  <span class="admin-variant-meta-chip">
                    {{ variant.variantAttributes.colorFullName || variant.variantAttributes.color || 'N/A' }}
                  </span>
                </div>
              </div>

              <div class="admin-variant-list-side">
                <div class="admin-variant-list-status">
                  <span class="admin-status-pill" :data-tone="variant.status">{{ variant.status }}</span>
                  <span class="admin-status-pill" :data-tone="variant.isInStock ? 'success' : 'muted'">
                    {{ variant.isInStock ? 'in stock' : 'out' }}
                  </span>
                </div>

                <div class="admin-variant-list-actions">
                  <button
                    type="button"
                    class="admin-button admin-button-secondary admin-button-compact"
                    @click="openVariantMediaGallery(variant.id)"
                  >
                    Thư viện ảnh
                  </button>
                  <button
                    type="button"
                    class="admin-button admin-button-secondary admin-button-compact"
                    @click="openVariantWorkshop(variant.id)"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <Teleport to="body">
        <div
          v-if="productPatchOverviewModalOpen"
          class="admin-modal-backdrop"
          @click.self="productPatchOverviewModalOpen = false"
        >
          <div class="admin-modal-panel admin-modal-panel-wide" role="dialog" aria-modal="true">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Patch overview</p>
                <h2 class="admin-card-title">Xác nhận thay đổi product</h2>
              </div>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="productPatchOverviewModalOpen = false"
              >
                Đóng
              </button>
            </div>

            <div class="admin-form-grid">
              <div v-if="productPatchOverviewItems.length === 0" class="admin-empty-state">
                Chưa có thay đổi nào để lưu.
              </div>

              <div v-else class="admin-audit-list admin-product-patch-overview-list">
                <div
                  v-for="item in productPatchOverviewItems"
                  :key="item.label"
                  class="admin-audit-row admin-product-patch-overview-row"
                >
                  <dt>{{ item.label }}</dt>
                  <dd>
                    <span class="admin-product-patch-overview-from">{{ item.from }}</span>
                    <span class="admin-product-patch-overview-arrow">→</span>
                    <strong>{{ item.to }}</strong>
                  </dd>
                </div>
              </div>

              <div class="admin-button-row">
                <button
                  type="button"
                  class="admin-button admin-button-secondary"
                  @click="productPatchOverviewModalOpen = false"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  class="admin-button admin-button-primary"
                  :disabled="savingProduct || !hasProductPatchChanges"
                  @click="saveProductPatch"
                >
                  {{ savingProduct ? 'Đang lưu...' : 'Xác nhận lưu patch' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="longDescriptionModalOpen"
          class="admin-modal-backdrop"
          @click.self="longDescriptionModalOpen = false"
        >
          <div class="admin-modal-panel admin-modal-panel-wide" role="dialog" aria-modal="true">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Long description</p>
                <h2 class="admin-card-title">Chỉnh sửa mô tả dài</h2>
              </div>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="longDescriptionModalOpen = false"
              >
                Đóng
              </button>
            </div>

            <div class="admin-form-grid">
              <section class="admin-note-block admin-long-description-note">
                <p>
                  Editor này tối ưu cho nội dung catalog dài: tiêu đề phân cấp, bullet list, bảng so
                  sánh, liên kết tham khảo và chế độ xem HTML khi cần kiểm soát markup.
                </p>
                <p>
                  Word count: <strong>{{ formatNumber(longDescriptionMetrics.words) }}</strong>
                  · Character count: <strong>{{ formatNumber(longDescriptionMetrics.characters) }}</strong>
                </p>
              </section>

              <div class="admin-field admin-long-description-editor-field">
                <FieldLabel label="Nội dung mô tả" :hint="fieldHints.longDescription" />
                <div class="admin-long-description-editor-shell">
                  <Editor
                    v-model="productPatch.longDescription"
                    license-key="gpl"
                    :init="longDescriptionEditorConfig"
                    output-format="html"
                  />
                </div>
              </div>

              <div class="admin-button-row">
                <button
                  type="button"
                  class="admin-button admin-button-secondary"
                  @click="longDescriptionModalOpen = false"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  class="admin-button admin-button-primary"
                  :disabled="savingLongDescription || !hasLongDescriptionChanges"
                  @click="saveLongDescription"
                >
                  {{ savingLongDescription ? 'Đang lưu...' : 'Lưu mô tả dài' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="productActionsModalOpen"
          class="admin-modal-backdrop"
          @click.self="productActionsModalOpen = false"
        >
          <div class="admin-modal-panel" role="dialog" aria-modal="true">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Hành động quản trị</p>
                <h2 class="admin-card-title">Clone sản phẩm</h2>
              </div>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="productActionsModalOpen = false"
              >
                Đóng
              </button>
            </div>

            <form class="admin-form-grid" @submit.prevent="cloneCurrentProduct">
              <div class="admin-two-column-grid">
                <label class="admin-field">
                  <FieldLabel label="Clone group code" :hint="fieldHints.cloneGroupCode" />
                  <input v-model="cloneDraft.productGroupCode" class="admin-input" type="text" />
                </label>

                <label class="admin-field">
                  <FieldLabel label="Clone title" :hint="fieldHints.cloneTitle" />
                  <input v-model="cloneDraft.title" class="admin-input" type="text" />
                </label>
              </div>

              <div class="admin-button-row">
                <button type="submit" class="admin-button admin-button-secondary" :disabled="cloningProduct">
                  {{ cloningProduct ? 'Đang clone...' : 'Clone thành draft mới' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div
          v-if="variantWorkshopModalOpen && selectedVariant"
          class="admin-modal-backdrop"
          @click.self="variantWorkshopModalOpen = false"
        >
          <div class="admin-modal-panel admin-modal-panel-wide" role="dialog" aria-modal="true">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Variant workshop</p>
                <h2 class="admin-card-title">Đang chỉnh: {{ selectedVariant.sku }}</h2>
              </div>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="variantWorkshopModalOpen = false"
              >
                Đóng
              </button>
            </div>

            <div class="admin-content-grid admin-content-grid-wide-right admin-product-detail-workbench">
              <form class="admin-form-grid admin-product-detail-form" @submit.prevent="saveSelectedVariant">
                <section class="admin-detail-section">
                  <div class="admin-detail-section-header">
                    <h3 class="admin-detail-section-title">Nhận diện và thuộc tính</h3>
                  </div>

                  <div class="admin-two-column-grid">
                    <label class="admin-field">
                      <FieldLabel label="SKU" :hint="fieldHints.variantSku" />
                      <input v-model="selectedVariantDraft.sku" class="admin-input" type="text" />
                    </label>

                    <label class="admin-field">
                      <FieldLabel label="Lifecycle" :hint="fieldHints.variantStatus" />
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
                      <FieldLabel label="RAM" :hint="fieldHints.variantRam" />
                      <input v-model="selectedVariantDraft.variantAttributes.ram" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="ROM" :hint="fieldHints.variantRom" />
                      <input v-model="selectedVariantDraft.variantAttributes.rom" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Color" :hint="fieldHints.variantColor" />
                      <input v-model="selectedVariantDraft.variantAttributes.color" class="admin-input" type="text" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Color full name" :hint="fieldHints.variantColorFullName" />
                      <input
                        v-model="selectedVariantDraft.variantAttributes.colorFullName"
                        class="admin-input"
                        type="text"
                      />
                    </label>
                  </div>

                  <div class="admin-four-column-grid">
                    <label class="admin-field">
                      <FieldLabel label="RAM sort" :hint="fieldHints.ramSort" />
                      <input v-model.number="selectedVariantDraft.ramSort" class="admin-input" type="number" min="0" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="ROM sort" :hint="fieldHints.romSort" />
                      <input v-model.number="selectedVariantDraft.romSort" class="admin-input" type="number" min="0" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Color priority" :hint="fieldHints.colorPriority" />
                      <input
                        v-model.number="selectedVariantDraft.colorPriority"
                        class="admin-input"
                        type="number"
                        min="0"
                      />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Variant order" :hint="fieldHints.variantSortOrder" />
                      <input
                        v-model.number="selectedVariantDraft.variantSortOrder"
                        class="admin-input"
                        type="number"
                        min="0"
                      />
                    </label>
                  </div>
                </section>

                <section class="admin-detail-section">
                  <div class="admin-detail-section-header">
                    <h3 class="admin-detail-section-title">Giá bán và metadata</h3>
                  </div>

                  <div class="admin-three-column-grid">
                    <label class="admin-field">
                      <FieldLabel label="Original price" :hint="fieldHints.originalPrice" />
                      <input
                        v-model.number="selectedVariantDraft.originalPrice"
                        class="admin-input"
                        type="number"
                        min="0"
                      />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Sale price" :hint="fieldHints.salePrice" />
                      <input
                        v-model.number="selectedVariantDraft.salePrice"
                        class="admin-input"
                        type="number"
                        min="0"
                      />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Currency" :hint="fieldHints.currency" />
                      <input v-model="selectedVariantDraft.currency" class="admin-input" type="text" />
                    </label>
                  </div>

                  <div class="admin-two-column-grid">
                    <label class="admin-field">
                      <FieldLabel label="Video URL" :hint="fieldHints.videoUrl" />
                      <input v-model="selectedVariantDraft.video.url" class="admin-input" type="url" />
                    </label>
                    <label class="admin-field">
                      <FieldLabel label="Video thumbnail URL" :hint="fieldHints.videoThumbnailUrl" />
                      <input v-model="selectedVariantDraft.video.thumbnailUrl" class="admin-input" type="url" />
                    </label>
                  </div>

                  <div class="admin-field admin-field-stack">
                    <FieldLabel label="Màu chủ đạo" :hint="fieldHints.isPrimaryColor" />
                    <label class="admin-toggle-row">
                      <input v-model="selectedVariantDraft.isPrimaryColor" type="checkbox" />
                      <span>Biến thể màu chủ đạo</span>
                    </label>
                  </div>

                  <div class="admin-note-block">
                    <p>Variant ID: <strong>{{ selectedVariant.id }}</strong></p>
                    <p>
                      Stock flag: <strong>{{ selectedVariant.isInStock ? 'true' : 'false' }}</strong> •
                      Soft delete: <strong>{{ selectedVariant.isDeleted ? 'true' : 'false' }}</strong>
                    </p>
                  </div>
                </section>

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

              <div class="admin-variant-workbench admin-product-detail-workbench-sidebar">
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
                        <FieldLabel label="Stock quantity" :hint="fieldHints.stockQuantity" />
                        <input
                          v-model.number="inventoryDraft.stockQuantity"
                          class="admin-input"
                          type="number"
                          min="0"
                        />
                      </label>

                      <label class="admin-field">
                        <FieldLabel label="Low stock threshold" :hint="fieldHints.lowStockThreshold" />
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
          </div>
        </div>

        <div
          v-if="variantMediaModalOpen && selectedVariant"
          class="admin-modal-backdrop"
          @click.self="variantMediaModalOpen = false"
        >
          <div class="admin-modal-panel admin-modal-panel-wide" role="dialog" aria-modal="true">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Media gallery</p>
                <h2 class="admin-card-title">Ảnh của variant: {{ selectedVariant.sku }}</h2>
              </div>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="variantMediaModalOpen = false"
              >
                Đóng
              </button>
            </div>

            <div class="admin-form-grid">
              <label class="admin-field">
                <FieldLabel label="Upload image" :hint="fieldHints.uploadImage" />
                <input
                  class="admin-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  @change="uploadImage"
                />
              </label>

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
            </div>
          </div>
        </div>

        <div
          v-if="createVariantModalOpen"
          class="admin-modal-backdrop"
          @click.self="createVariantModalOpen = false"
        >
          <div class="admin-modal-panel admin-modal-panel-wide" role="dialog" aria-modal="true">
            <div class="admin-card-header">
              <div>
                <p class="admin-section-kicker">Khởi tạo variant</p>
                <h2 class="admin-card-title">Tạo biến thể mới</h2>
              </div>

              <button
                type="button"
                class="admin-button admin-button-secondary"
                @click="createVariantModalOpen = false"
              >
                Đóng
              </button>
            </div>

            <form class="admin-form-grid admin-product-detail-form" @submit.prevent="createVariantEntry">
              <section class="admin-detail-section">
                <div class="admin-detail-section-header">
                  <h3 class="admin-detail-section-title">Nhận diện biến thể</h3>
                </div>

                <div class="admin-two-column-grid">
                  <label class="admin-field">
                    <FieldLabel label="SKU" :hint="fieldHints.variantSku" />
                    <input v-model="createVariantForm.sku" class="admin-input" type="text" />
                  </label>

                  <label class="admin-field">
                    <FieldLabel label="Lifecycle" :hint="fieldHints.variantStatus" />
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
                    <FieldLabel label="RAM" :hint="fieldHints.variantRam" />
                    <input v-model="createVariantForm.variantAttributes.ram" class="admin-input" type="text" />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="ROM" :hint="fieldHints.variantRom" />
                    <input v-model="createVariantForm.variantAttributes.rom" class="admin-input" type="text" />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="Color" :hint="fieldHints.variantColor" />
                    <input v-model="createVariantForm.variantAttributes.color" class="admin-input" type="text" />
                  </label>
                </div>

                <div class="admin-four-column-grid">
                  <label class="admin-field">
                    <FieldLabel label="RAM sort" :hint="fieldHints.ramSort" />
                    <input v-model.number="createVariantForm.ramSort" class="admin-input" type="number" min="0" />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="ROM sort" :hint="fieldHints.romSort" />
                    <input v-model.number="createVariantForm.romSort" class="admin-input" type="number" min="0" />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="Color priority" :hint="fieldHints.colorPriority" />
                    <input
                      v-model.number="createVariantForm.colorPriority"
                      class="admin-input"
                      type="number"
                      min="0"
                    />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="Variant order" :hint="fieldHints.variantSortOrder" />
                    <input
                      v-model.number="createVariantForm.variantSortOrder"
                      class="admin-input"
                      type="number"
                      min="0"
                    />
                  </label>
                </div>
              </section>

              <section class="admin-detail-section">
                <div class="admin-detail-section-header">
                  <h3 class="admin-detail-section-title">Giá và media</h3>
                </div>

                <div class="admin-three-column-grid">
                  <label class="admin-field">
                    <FieldLabel label="Original price" :hint="fieldHints.originalPrice" />
                    <input
                      v-model.number="createVariantForm.originalPrice"
                      class="admin-input"
                      type="number"
                      min="0"
                    />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="Sale price" :hint="fieldHints.salePrice" />
                    <input v-model.number="createVariantForm.salePrice" class="admin-input" type="number" min="0" />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="Currency" :hint="fieldHints.currency" />
                    <input v-model="createVariantForm.currency" class="admin-input" type="text" />
                  </label>
                </div>

                <div class="admin-two-column-grid">
                  <label class="admin-field">
                    <FieldLabel label="Video URL" :hint="fieldHints.videoUrl" />
                    <input v-model="createVariantForm.video.url" class="admin-input" type="url" />
                  </label>
                  <label class="admin-field">
                    <FieldLabel label="Video thumbnail URL" :hint="fieldHints.videoThumbnailUrl" />
                    <input v-model="createVariantForm.video.thumbnailUrl" class="admin-input" type="url" />
                  </label>
                </div>

                <div class="admin-field admin-field-stack">
                  <FieldLabel label="Màu chủ đạo" :hint="fieldHints.isPrimaryColor" />
                  <label class="admin-toggle-row">
                    <input v-model="createVariantForm.isPrimaryColor" type="checkbox" />
                    <span>Đặt biến thể này là màu chủ đạo</span>
                  </label>
                </div>
              </section>

              <div class="admin-button-row">
                <button
                  type="button"
                  class="admin-button admin-button-secondary"
                  @click="createVariantModalOpen = false"
                >
                  Hủy
                </button>
                <button type="submit" class="admin-button admin-button-primary" :disabled="creatingVariant">
                  {{ creatingVariant ? 'Đang tạo variant...' : 'Tạo variant' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>
    </template>

    <ConfirmDialog
      :open="leaveConfirmOpen"
      title="Rời trang khi còn thay đổi chưa lưu"
      message="Trang hiện tại đang có thay đổi chưa được lưu. Nếu quay lại hoặc chuyển trang, các thay đổi này sẽ bị mất."
      confirm-label="Rời trang"
      cancel-label="Ở lại"
      @cancel="closeLeaveConfirm"
      @confirm="confirmLeavePage"
    />
  </section>
</template>
