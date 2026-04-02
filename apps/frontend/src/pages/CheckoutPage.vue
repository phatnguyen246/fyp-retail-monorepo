<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import AddressSelector from '../components/checkout/AddressSelector.vue'
import { useCartStore } from '../store/cart'
import { useOrderingStore } from '../store/ordering'
import { formatCurrency, formatNumber } from '../services/formatters'
import {
  composeShippingAddressLine,
  createEmptyShippingAddress,
  isShippingAddressComplete,
  normalizeShippingAddress,
} from '../services/shipping-address'

const VNPAY_CONTEXT_STORAGE_KEY = 'checkout:vnpay-context'

const cartStore = useCartStore()
const orderingStore = useOrderingStore()
const router = useRouter()

const shippingInfo = reactive({
  recipientName: '',
  phoneNumber: '',
  shippingAddress: createEmptyShippingAddress(),
})

const paymentMethod = ref('cod')
const submitMessage = ref('')
const submitMessageTone = ref('error')
const fieldErrors = ref({})

const paymentOptions = [
  {
    value: 'cod',
    title: 'COD',
    description: 'Thanh toan khi nhan hang sau khi don duoc xac nhan.',
  },
  {
    value: 'vnpay',
    title: 'VNPAY',
    description: 'Ban se duoc chuyen sang VNPAY de hoan tat thanh toan.',
  },
]

const readyItems = computed(() =>
  cartStore.items.filter((item) => item.selected === true && item.isAvailable === true),
)

const attentionItems = computed(() =>
  cartStore.items.filter((item) => item.selected !== true || item.isAvailable !== true),
)

const selectedQuantity = computed(() =>
  readyItems.value.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
)

const selectedSubtotal = computed(() =>
  readyItems.value.reduce((total, item) => total + (Number(item.lineTotal) || 0), 0),
)

const hasCheckoutItems = computed(() => cartStore.items.length > 0)
const hasCartError = computed(() => Boolean(cartStore.error))
const isCartLoading = computed(() => cartStore.loading === true && cartStore.items.length === 0)

const canSubmit = computed(() => {
  return (
    readyItems.value.length > 0 &&
    shippingInfo.recipientName.trim().length > 0 &&
    shippingInfo.phoneNumber.trim().length > 0 &&
    isShippingAddressComplete(shippingInfo.shippingAddress) &&
    cartStore.loading === false &&
    orderingStore.loading === false
  )
})

const shippingAddressLine = computed(() => composeShippingAddressLine(shippingInfo.shippingAddress))

const submitButtonLabel = computed(() => {
  if (orderingStore.loading) {
    return paymentMethod.value === 'vnpay' ? 'Dang tao lenh thanh toan...' : 'Dang dat hang...'
  }

  return paymentMethod.value === 'vnpay' ? 'Tiep tuc den VNPAY' : 'Dat hang COD'
})

onMounted(() => {
  cartStore.fetchCart()
})

async function refreshCheckoutContext() {
  await cartStore.fetchCart()
}

function resetFeedback() {
  submitMessage.value = ''
  submitMessageTone.value = 'error'
  fieldErrors.value = {}
}

function handlePhoneNumberInput(event) {
  const nextValue = String(event?.target?.value ?? '').replace(/\D+/g, '')
  shippingInfo.phoneNumber = nextValue
}

function handleShippingAddressUpdate(nextAddress) {
  shippingInfo.shippingAddress = normalizeShippingAddress(nextAddress)
}

function validateBeforeSubmit() {
  const nextFieldErrors = {}

  if (!shippingInfo.recipientName.trim()) {
    nextFieldErrors.recipientName = 'Nhap ten nguoi nhan.'
  }

  if (!shippingInfo.phoneNumber.trim()) {
    nextFieldErrors.phoneNumber = 'Nhap so dien thoai nguoi nhan.'
  }

  if (!shippingInfo.shippingAddress.street.trim()) {
    nextFieldErrors.street = 'Nhap so nha va ten duong.'
  }

  if (!shippingInfo.shippingAddress.provinceCode) {
    nextFieldErrors.shippingAddress = 'Chon tinh/thanh pho giao hang.'
  } else if (!shippingInfo.shippingAddress.districtCode) {
    nextFieldErrors.shippingAddress = 'Chon quan/huyen giao hang.'
  } else if (!shippingInfo.shippingAddress.wardCode) {
    nextFieldErrors.shippingAddress = 'Chon phuong/xa giao hang.'
  }

  if (readyItems.value.length === 0) {
    submitMessageTone.value = 'warning'
    submitMessage.value =
      'Khong co san pham hop le de checkout. Hay quay lai gio hang de xu ly cac line dang bi loai.'
  }

  fieldErrors.value = nextFieldErrors

  return Object.keys(nextFieldErrors).length === 0 && readyItems.value.length > 0
}

function mapOrderingError(error) {
  const missingVariantIds = Array.isArray(error?.meta?.missingVariantIds)
    ? error.meta.missingVariantIds
    : []

  if (missingVariantIds.length > 0) {
    return `Mot so san pham khong con hop le trong gio hang (${missingVariantIds.length} line). Hay tai lai gio hang va thu lai.`
  }

  if (Array.isArray(error?.meta?.issues) && error.meta.issues.length > 0) {
    const issueMap = {}

    for (const issue of error.meta.issues) {
      const fieldName = Array.isArray(issue?.path) ? issue.path[0] : null

      if (fieldName === 'recipientName') {
        issueMap.recipientName = issue.message
      }

      if (fieldName === 'phoneNumber') {
        issueMap.phoneNumber = issue.message
      }

      if (fieldName === 'shippingAddressLine') {
        issueMap.street = issue.message
      }

      if (fieldName === 'street') {
        issueMap.street = issue.message
      }

      if (
        fieldName === 'provinceCode' ||
        fieldName === 'provinceName' ||
        fieldName === 'districtCode' ||
        fieldName === 'districtName' ||
        fieldName === 'wardCode' ||
        fieldName === 'wardName'
      ) {
        issueMap.shippingAddress = issue.message
      }
    }

    if (Object.keys(issueMap).length > 0) {
      fieldErrors.value = {
        ...fieldErrors.value,
        ...issueMap,
      }
    }
  }

  return error?.message || 'Khong the tao don hang. Vui long thu lai.'
}

function persistVnpayContext(order) {
  if (!order?.id) {
    return
  }

  localStorage.setItem(
    VNPAY_CONTEXT_STORAGE_KEY,
    JSON.stringify({
      orderId: order.id,
      orderCode: order.orderCode ?? null,
      createdAt: new Date().toISOString(),
    }),
  )
}

async function handlePlaceOrder() {
  resetFeedback()

  if (!validateBeforeSubmit()) {
    return
  }

  const orderDetails = {
    recipientName: shippingInfo.recipientName.trim(),
    phoneNumber: shippingInfo.phoneNumber.trim(),
    street: shippingInfo.shippingAddress.street.trim(),
    provinceCode: shippingInfo.shippingAddress.provinceCode,
    provinceName: shippingInfo.shippingAddress.provinceName,
    districtCode: shippingInfo.shippingAddress.districtCode,
    districtName: shippingInfo.shippingAddress.districtName,
    wardCode: shippingInfo.shippingAddress.wardCode,
    wardName: shippingInfo.shippingAddress.wardName,
    shippingAddressLine: shippingAddressLine.value,
    paymentMethod: paymentMethod.value,
    cartVariantIds: readyItems.value.map((item) => item.variantId),
  }

  const { success, order, error } = await orderingStore.createOrder(orderDetails)

  if (!success) {
    submitMessageTone.value = 'error'
    submitMessage.value = mapOrderingError(error)
    return
  }

  if (order.paymentMethod === 'vnpay') {
    persistVnpayContext(order)
    await router.push({ name: 'vnpay-checkout', params: { orderId: order.id } })
    return
  }

  submitMessageTone.value = 'success'
  submitMessage.value = 'Don hang COD da duoc tao. Dang chuyen sang trang chi tiet don hang.'
  await router.push({ name: 'order-detail', params: { orderId: order.id } })
}
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[1440px]">
          <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">Trang</p>
              <h1 class="catalog-display-title mt-2 text-4xl leading-tight lg:text-5xl">Checkout</h1>
            </div>
            <RouterLink class="catalog-reset-button inline-flex items-center justify-center" :to="{ name: 'cart' }">
              Quay lai gio hang
            </RouterLink>
          </div>

          <section
            v-if="hasCartError"
            class="rounded-[2rem] border border-[rgba(186,26,26,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-danger)]">
              Khong the tai checkout
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-[var(--catalog-text)]">
              Du lieu gio hang hien chua san sang.
            </h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Checkout can doc du lieu cart truoc khi tao don hang. Hay thu dong bo lai cart va thu tiep.
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="catalog-primary-button inline-flex items-center justify-center"
                :disabled="cartStore.loading"
                @click="refreshCheckoutContext"
              >
                {{ cartStore.loading ? 'Dang tai lai cart...' : 'Thu tai lai cart' }}
              </button>
              <RouterLink class="catalog-reset-button inline-flex items-center justify-center" :to="{ name: 'cart' }">
                Quay ve gio hang
              </RouterLink>
            </div>
          </section>

          <section
            v-else-if="isCartLoading"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <div class="space-y-4">
              <div class="checkout-skeleton h-6 w-40 rounded-full"></div>
              <div class="checkout-skeleton h-14 w-full rounded-[1.25rem]"></div>
              <div class="checkout-skeleton h-28 w-full rounded-[1.25rem]"></div>
              <div class="checkout-skeleton h-24 w-full rounded-[1.5rem]"></div>
            </div>
          </section>

          <section
            v-else-if="!hasCheckoutItems"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-10"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
              Chua co du lieu checkout
            </p>
            <h2 class="catalog-display-title mt-3 text-3xl">Gio hang dang trong.</h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Hay quay lai cart hoac catalog de chon san pham truoc khi tiep tuc thanh toan.
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <RouterLink class="catalog-primary-button inline-flex items-center justify-center" :to="{ name: 'cart' }">
                Mo gio hang
              </RouterLink>
              <RouterLink class="catalog-reset-button inline-flex items-center justify-center" :to="{ name: 'catalog-products' }">
                Tiep tuc mua sam
              </RouterLink>
            </div>
          </section>

          <div v-else class="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <section class="space-y-6">
              <div class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Nguoi nhan
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Thong tin giao hang</h2>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--catalog-text-muted)]">
                    Dien so dien thoai va dia chi chi tiet de viec giao hang duoc dien ra nhanh va chinh xac.
                  </p>
                </div>

                <form class="mt-8 grid gap-5 md:grid-cols-2" autocomplete="off" @submit.prevent="handlePlaceOrder">
                  <label class="flex flex-col gap-3 md:col-span-1">
                    <span class="text-sm font-medium text-[var(--catalog-text)]">Ten nguoi nhan</span>
                    <input
                      v-model="shippingInfo.recipientName"
                      id="checkout-recipient-name"
                      name="recipient_name"
                      type="text"
                      autocomplete="section-shipping shipping name"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      data-bwignore="true"
                      placeholder="Nguyen Van A"
                      class="checkout-input"
                      :class="{ 'checkout-input--error': fieldErrors.recipientName }"
                    />
                    <span v-if="fieldErrors.recipientName" class="text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.recipientName }}
                    </span>
                  </label>

                  <label class="flex flex-col gap-3 md:col-span-1">
                    <span class="text-sm font-medium text-[var(--catalog-text)]">So dien thoai</span>
                    <input
                      v-model="shippingInfo.phoneNumber"
                      id="checkout-recipient-phone"
                      name="recipient_phone"
                      type="tel"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      autocomplete="section-shipping shipping tel-national"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      data-bwignore="true"
                      placeholder="0900 000 000"
                      class="checkout-input"
                      :class="{ 'checkout-input--error': fieldErrors.phoneNumber }"
                      @input="handlePhoneNumberInput"
                    />
                    <span v-if="fieldErrors.phoneNumber" class="text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.phoneNumber }}
                    </span>
                  </label>

                  <label class="flex flex-col gap-3 md:col-span-2">
                    <span class="text-sm font-medium text-[var(--catalog-text)]">So nha, ten duong</span>
                    <textarea
                      v-model="shippingInfo.shippingAddress.street"
                      id="checkout-shipping-street"
                      name="shipping_street"
                      rows="3"
                      autocomplete="section-shipping shipping street-address"
                      data-form-type="other"
                      data-lpignore="true"
                      data-1p-ignore
                      data-bwignore="true"
                      placeholder="123 Nguyen Van Linh, toa nha, can ho..."
                      class="checkout-input checkout-input--textarea resize-y"
                      :class="{ 'checkout-input--error': fieldErrors.street }"
                    />
                    <span v-if="fieldErrors.street" class="text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.street }}
                    </span>
                  </label>

                  <div class="md:col-span-2">
                    <div class="flex flex-col gap-2">
                      <span class="text-sm font-medium text-[var(--catalog-text)]">Tinh/Thanh pho, Quan/Huyen, Phuong/Xa</span>
                      <AddressSelector
                        :model-value="shippingInfo.shippingAddress"
                        :disabled="orderingStore.loading"
                        @update:model-value="handleShippingAddressUpdate"
                      />
                    </div>
                    <span v-if="fieldErrors.shippingAddress" class="mt-3 block text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.shippingAddress }}
                    </span>
                    <p
                      v-if="shippingAddressLine"
                      class="mt-3 rounded-[1rem] bg-[rgba(244,237,216,0.48)] px-4 py-3 text-sm leading-6 text-[var(--catalog-text-muted)]"
                    >
                      Dia chi se giao toi: <span class="font-semibold text-[var(--catalog-text)]">{{ shippingAddressLine }}</span>
                    </p>
                  </div>

                  <div class="md:col-span-2">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                        Thanh toan
                      </p>
                      <h3 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Chon phuong thuc thanh toan</h3>
                    </div>

                    <div class="mt-5 grid gap-4 lg:grid-cols-2">
                      <label
                        v-for="option in paymentOptions"
                        :key="option.value"
                        class="payment-card payment-card--compact"
                        :class="{ 'payment-card--active': paymentMethod === option.value }"
                      >
                        <input v-model="paymentMethod" type="radio" class="sr-only" :value="option.value" />
                        <div class="flex items-center justify-between gap-4">
                          <p class="text-lg font-semibold text-[var(--catalog-text)]">{{ option.title }}</p>
                          <span
                            class="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold"
                            :class="
                              paymentMethod === option.value
                                ? 'border-[var(--catalog-primary)] bg-[var(--catalog-primary)] text-white'
                                : 'border-[var(--catalog-border-soft)] bg-white text-[var(--catalog-text-soft)]'
                            "
                          >
                          </span>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-[var(--catalog-text-muted)]">
                          {{ option.description }}
                        </p>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              <div
                v-if="attentionItems.length"
                class="rounded-[2rem] border border-[rgba(139,117,0,0.18)] bg-[linear-gradient(135deg,rgba(255,249,235,0.9),rgba(244,237,216,0.88))] p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-primary-deep)]">
                      Truoc khi dat hang
                    </p>
                    <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Co line dang bi loai khoi checkout</h2>
                    <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--catalog-text-muted)]">
                      Mot so san pham trong gio hang hien chua san sang de dat mua. Ban co the quay lai gio hang de cap
                      nhat so luong hoac loai bo nhung san pham nay.
                    </p>
                  </div>
                  <RouterLink
                    :to="{ name: 'cart' }"
                    class="catalog-reset-button inline-flex items-center justify-center"
                  >
                    Mo gio hang de xu ly
                  </RouterLink>
                </div>

                <ul class="mt-6 grid gap-3">
                  <li
                    v-for="item in attentionItems"
                    :key="item.variantId"
                    class="rounded-[1.5rem] border border-[rgba(139,117,0,0.12)] bg-white/80 px-4 py-4"
                  >
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p class="text-base font-semibold text-[var(--catalog-text)]">{{ item.productName }}</p>
                        <p class="mt-1 text-sm text-[var(--catalog-text-muted)]">{{ item.variantLabel }}</p>
                      </div>
                      <div class="rounded-full bg-[rgba(139,117,0,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-primary-deep)]">
                        {{ item.isAvailable === false ? 'Khong hop le' : 'Chua duoc chon' }}
                      </div>
                    </div>
                    <p class="mt-3 text-sm leading-6 text-[var(--catalog-text-muted)]">
                      {{ item.availabilityMessage || 'Line nay khong duoc dua vao checkout hien tai.' }}
                    </p>
                  </li>
                </ul>
              </div>

            </section>

            <aside class="space-y-6">
              <section class="sticky top-6 rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Order summary
                </p>
                <div class="mt-4">
                  <h2 class="catalog-display-title text-3xl">Tom tat don hang</h2>
                  <p class="mt-2 text-sm leading-6 text-[var(--catalog-text-muted)]">
                    Xem lai cac san pham ban sap dat mua truoc khi tiep tuc thanh toan.
                  </p>
                </div>

                <ul v-if="readyItems.length" class="mt-6 space-y-3">
                  <li
                    v-for="item in readyItems"
                    :key="item.variantId"
                    class="rounded-[1.5rem] border border-[var(--catalog-border-soft)] bg-[rgba(255,255,255,0.84)] px-4 py-4"
                  >
                    <div class="flex gap-4">
                      <img
                        :src="item.thumbnailUrl"
                        :alt="item.productName"
                        class="h-16 w-16 rounded-2xl border border-[var(--catalog-border-soft)] object-cover"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-4">
                          <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-[var(--catalog-text)]">{{ item.productName }}</p>
                            <p class="mt-1 text-sm text-[var(--catalog-text-muted)]">{{ item.variantLabel }}</p>
                          </div>
                          <p class="text-sm font-semibold text-[var(--catalog-text)]">{{ formatCurrency(item.lineTotal) }}</p>
                        </div>
                        <div class="mt-3 flex items-center justify-between text-sm text-[var(--catalog-text-muted)]">
                          <span>So luong {{ formatNumber(item.quantity) }}</span>
                          <span>Don gia {{ formatCurrency(item.unitPrice) }}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>

                <div
                  v-else
                  class="mt-6 rounded-[1.5rem] border border-dashed border-[var(--catalog-border-soft)] bg-[var(--catalog-surface-muted)] px-4 py-5 text-sm leading-6 text-[var(--catalog-text-muted)]"
                >
                  Chua co san pham nao san sang de checkout. Hay quay lai gio hang va kich hoat cac san pham kha dung.
                </div>

                <dl class="mt-6 space-y-3 border-t border-[var(--catalog-border-soft)] pt-5 text-sm">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Nguoi nhan</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ shippingInfo.recipientName || 'Chua nhap' }}</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Dia chi giao hang</dt>
                    <dd class="max-w-[16rem] text-right font-semibold text-[var(--catalog-text)]">
                      {{ shippingAddressLine || 'Chua chon dia chi' }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">So line checkout</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ formatNumber(readyItems.length) }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Tong so luong</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ formatNumber(selectedQuantity) }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Phuong thuc</dt>
                    <dd class="font-semibold uppercase text-[var(--catalog-text)]">{{ paymentMethod }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4 border-t border-[var(--catalog-border-soft)] pt-4">
                    <dt class="text-[var(--catalog-text-muted)]">Tong tien checkout</dt>
                    <dd class="text-2xl font-semibold text-[var(--catalog-primary)]">{{ formatCurrency(selectedSubtotal) }}</dd>
                  </div>
                </dl>

                <div
                  v-if="submitMessage"
                  class="mt-5 rounded-[1.5rem] px-4 py-4 text-sm leading-6"
                  :class="
                    submitMessageTone === 'success'
                      ? 'bg-[rgba(34,94,56,0.08)] text-[#225e38]'
                      : submitMessageTone === 'warning'
                        ? 'bg-[rgba(139,117,0,0.12)] text-[var(--catalog-primary-deep)]'
                        : 'bg-[rgba(186,26,26,0.08)] text-[var(--catalog-danger)]'
                  "
                >
                  {{ submitMessage }}
                </div>

                <button
                  type="button"
                  class="catalog-primary-button mt-8 flex w-full items-center justify-center disabled:pointer-events-none disabled:opacity-50"
                  :disabled="!canSubmit"
                  @click="handlePlaceOrder"
                >
                  {{ submitButtonLabel }}
                </button>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>

<style scoped>
.checkout-input {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid var(--catalog-border-soft);
  background: rgba(255, 255, 255, 0.92);
  padding: 0.8rem 0.95rem;
  font-size: 0.95rem;
  line-height: 1.5rem;
  color: var(--catalog-text);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.checkout-input:focus {
  outline: none;
  border-color: rgba(139, 117, 0, 0.35);
  box-shadow: 0 0 0 4px rgba(139, 117, 0, 0.08);
  background: #fff;
}

.checkout-input--error {
  border-color: rgba(186, 26, 26, 0.24);
  box-shadow: 0 0 0 3px rgba(186, 26, 26, 0.08);
}

.checkout-input--textarea {
  min-height: 6.75rem;
}

.payment-card {
  display: block;
  cursor: pointer;
  border-radius: 1.5rem;
  border: 1px solid var(--catalog-border-soft);
  background: rgba(255, 255, 255, 0.92);
  padding: 1.25rem;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.payment-card--compact {
  padding: 1rem 1.25rem;
}

.payment-card:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 117, 0, 0.24);
  box-shadow: 0 16px 36px rgba(26, 28, 28, 0.06);
}

.payment-card--active {
  border-color: rgba(139, 117, 0, 0.28);
  box-shadow: 0 20px 44px rgba(26, 28, 28, 0.06);
  background:
    linear-gradient(135deg, rgba(255, 249, 235, 0.9), rgba(244, 237, 216, 0.78)),
    rgba(255, 255, 255, 0.96);
}

.checkout-skeleton {
  background:
    linear-gradient(
      90deg,
      rgba(230, 224, 210, 0.48) 0%,
      rgba(247, 243, 235, 0.92) 50%,
      rgba(230, 224, 210, 0.48) 100%
    );
  background-size: 200% 100%;
  animation: checkout-skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes checkout-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
