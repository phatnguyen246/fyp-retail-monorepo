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
  normalizeShippingAddress,
} from '../services/shipping-address'
import { checkoutShippingSchema } from '../validation/forms'

const VNPAY_CONTEXT_STORAGE_KEY = 'checkout:vnpay-context'

const cartStore = useCartStore()
const orderingStore = useOrderingStore()
const router = useRouter()

const shippingInfo = reactive({
  recipientName: '',
  email: '',
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
    description: 'Pay on delivery after the order is confirmed.',
  },
  {
    value: 'vnpay',
    title: 'VNPAY',
    description: 'You will be redirected to VNPAY to complete payment.',
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
  const validationResult = checkoutShippingSchema.safeParse({
    recipientName: shippingInfo.recipientName,
    email: shippingInfo.email,
    phoneNumber: shippingInfo.phoneNumber,
    street: shippingInfo.shippingAddress.street,
    provinceCode: shippingInfo.shippingAddress.provinceCode,
    provinceName: shippingInfo.shippingAddress.provinceName,
    districtCode: shippingInfo.shippingAddress.districtCode,
    districtName: shippingInfo.shippingAddress.districtName,
    wardCode: shippingInfo.shippingAddress.wardCode,
    wardName: shippingInfo.shippingAddress.wardName,
    paymentMethod: paymentMethod.value,
    cartVariantIds: readyItems.value.map((item) => item.variantId),
  })

  return (
    validationResult.success &&
    cartStore.loading === false &&
    orderingStore.loading === false
  )
})

const shippingAddressLine = computed(() => composeShippingAddressLine(shippingInfo.shippingAddress))

const submitButtonLabel = computed(() => {
  if (orderingStore.loading) {
    return paymentMethod.value === 'vnpay' ? 'Creating payment request...' : 'Placing order...'
  }

  return paymentMethod.value === 'vnpay' ? 'Continue to VNPAY' : 'Place COD order'
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

function mapCheckoutValidationIssues(issues) {
  const nextFieldErrors = {}

  for (const issue of issues) {
    const [head] = issue.path

    if (head === 'recipientName') {
      nextFieldErrors.recipientName = issue.message
      continue
    }

    if (head === 'email') {
      nextFieldErrors.email = issue.message
      continue
    }

    if (head === 'phoneNumber') {
      nextFieldErrors.phoneNumber = issue.message
      continue
    }

    if (head === 'street') {
      nextFieldErrors.street = issue.message
      continue
    }

    if (head === 'provinceCode' || head === 'districtCode' || head === 'wardCode') {
      nextFieldErrors.shippingAddress = issue.message
    }
  }

  return nextFieldErrors
}

function validateBeforeSubmit() {
  const validationResult = checkoutShippingSchema.safeParse({
    recipientName: shippingInfo.recipientName,
    email: shippingInfo.email,
    phoneNumber: shippingInfo.phoneNumber,
    street: shippingInfo.shippingAddress.street,
    provinceCode: shippingInfo.shippingAddress.provinceCode,
    provinceName: shippingInfo.shippingAddress.provinceName,
    districtCode: shippingInfo.shippingAddress.districtCode,
    districtName: shippingInfo.shippingAddress.districtName,
    wardCode: shippingInfo.shippingAddress.wardCode,
    wardName: shippingInfo.shippingAddress.wardName,
    paymentMethod: paymentMethod.value,
    cartVariantIds: readyItems.value.map((item) => item.variantId),
  })

  if (!validationResult.success) {
    fieldErrors.value = mapCheckoutValidationIssues(validationResult.error.issues)
    const cartIssue = validationResult.error.issues.find((issue) => issue.path[0] === 'cartVariantIds')
    if (cartIssue) {
      submitMessageTone.value = 'warning'
      submitMessage.value = cartIssue.message
    }
    return null
  }

  fieldErrors.value = {}
  return validationResult.data
}

function mapOrderingError(error) {
  const missingVariantIds = Array.isArray(error?.meta?.missingVariantIds)
    ? error.meta.missingVariantIds
    : []

  if (missingVariantIds.length > 0) {
    return `Some items in your cart are no longer valid ( lines). Please refresh the cart and try again.`
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

  return error?.message || 'Unable to create order. Please try again.'
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

  const validatedInput = validateBeforeSubmit()

  if (!validatedInput) {
    return
  }

  const orderDetails = {
    recipientName: validatedInput.recipientName,
    email: validatedInput.email,
    phoneNumber: validatedInput.phoneNumber,
    street: validatedInput.street,
    provinceCode: validatedInput.provinceCode,
    provinceName: validatedInput.provinceName,
    districtCode: validatedInput.districtCode,
    districtName: validatedInput.districtName,
    wardCode: validatedInput.wardCode,
    wardName: validatedInput.wardName,
    shippingAddressLine: shippingAddressLine.value,
    paymentMethod: validatedInput.paymentMethod,
    cartVariantIds: validatedInput.cartVariantIds,
  }

  const { success, order, error } = await orderingStore.createOrder(orderDetails)

  if (!success) {
    submitMessageTone.value = 'error'
    submitMessage.value = mapOrderingError(error)
    return
  }

  if (order.paymentMethod === 'vnpay') {
    persistVnpayContext(order)
    // Fetch VNPAY URL and open in new tab
    const vnpayResult = await orderingStore.createVnPayUrl(order.id)
    if (vnpayResult.success && vnpayResult.paymentUrl) {
      window.open(vnpayResult.paymentUrl, '_blank')
    }

    // Redirect current tab to order detail
    await router.push({ name: 'order-detail', params: { orderId: order.id } })
    return
  }

  submitMessageTone.value = 'success'
  submitMessage.value = 'Your COD order has been created. Redirecting to order detail page.'
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
              Back to cart
            </RouterLink>
          </div>

          <section
            v-if="hasCartError"
            class="rounded-[2rem] border border-[rgba(186,26,26,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-danger)]">
              Unable to load checkout
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-[var(--catalog-text)]">
              Cart data is not ready yet.
            </h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Checkout needs cart data before creating an order. Please refresh cart and try again.
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="catalog-primary-button inline-flex items-center justify-center"
                :disabled="cartStore.loading"
                @click="refreshCheckoutContext"
              >
                {{ cartStore.loading ? 'Reloading cart...' : 'Retry loading cart' }}
              </button>
              <RouterLink class="catalog-reset-button inline-flex items-center justify-center" :to="{ name: 'cart' }">
                Go back to cart
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
              No checkout data available
            </p>
            <h2 class="catalog-display-title mt-3 text-3xl">Cart is empty.</h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Please go back to cart or catalog and select products before continuing checkout.
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <RouterLink class="catalog-primary-button inline-flex items-center justify-center" :to="{ name: 'cart' }">
                Open cart
              </RouterLink>
              <RouterLink class="catalog-reset-button inline-flex items-center justify-center" :to="{ name: 'catalog-products' }">
                Continue shopping
              </RouterLink>
            </div>
          </section>

          <div v-else class="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <section class="space-y-6">
              <div class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] sm:p-7">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                    Recipient
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Shipping information</h2>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--catalog-text-muted)]">
                    Enter your phone number and full address details so delivery can be processed quickly and accurately.
                  </p>
                </div>

                <form class="mt-8 grid gap-5 md:grid-cols-2" autocomplete="off" @submit.prevent="handlePlaceOrder">
                  <label class="flex flex-col gap-3 md:col-span-2">
                    <span class="text-sm font-medium text-[var(--catalog-text)]">Recipient name</span>
                    <input
                      v-model="shippingInfo.recipientName"
                      id="checkout-recipient-name"
                      name="recipient_name"
                      type="text"
                      placeholder="Nguyen Van A"
                      class="checkout-input"
                      :class="{ 'checkout-input--error': fieldErrors.recipientName }"
                    />
                    <span v-if="fieldErrors.recipientName" class="text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.recipientName }}
                    </span>
                  </label>

                  <label class="flex flex-col gap-3 md:col-span-1">
                    <span class="text-sm font-medium text-[var(--catalog-text)]">Confirmation email</span>
                    <input
                      v-model="shippingInfo.email"
                      id="checkout-recipient-email"
                      name="recipient_email"
                      type="email"
                      placeholder="nva@example.com"
                      class="checkout-input"
                      :class="{ 'checkout-input--error': fieldErrors.email }"
                    />
                    <span v-if="fieldErrors.email" class="text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.email }}
                    </span>
                  </label>

                  <label class="flex flex-col gap-3 md:col-span-1">
                    <span class="text-sm font-medium text-[var(--catalog-text)]">Phone number</span>
                    <input
                      v-model="shippingInfo.phoneNumber"
                      id="checkout-recipient-phone"
                      name="recipient_phone"
                      type="tel"
                      inputmode="numeric"
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
                    <span class="text-sm font-medium text-[var(--catalog-text)]">Street address</span>
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
                      placeholder="123 Nguyen Van Linh, building, apartment..."
                      class="checkout-input checkout-input--textarea resize-y"
                      :class="{ 'checkout-input--error': fieldErrors.street }"
                    />
                    <span v-if="fieldErrors.street" class="text-sm text-[var(--catalog-danger)]">
                      {{ fieldErrors.street }}
                    </span>
                  </label>

                  <div class="md:col-span-2">
                    <div class="flex flex-col gap-2">
                      <span class="text-sm font-medium text-[var(--catalog-text)]">Province/City, District, Ward</span>
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
                      Delivery address: <span class="font-semibold text-[var(--catalog-text)]">{{ shippingAddressLine }}</span>
                    </p>
                  </div>

                  <div class="md:col-span-2">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                        Payment
                      </p>
                      <h3 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Choose payment method</h3>
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
                    <h2 class="mt-2 text-2xl font-semibold text-[var(--catalog-text)]">Some lines are excluded from checkout</h2>
                    <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--catalog-text-muted)]">
                      Some cart items are not ready for purchase. You can return to cart to adjust quantity or remove these items.
                    </p>
                  </div>
                  <RouterLink
                    :to="{ name: 'cart' }"
                    class="catalog-reset-button inline-flex items-center justify-center"
                  >
                    Open cart de xu ly
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
                        {{ item.isAvailable === false ? 'Invalid' : 'Not selected' }}
                      </div>
                    </div>
                    <p class="mt-3 text-sm leading-6 text-[var(--catalog-text-muted)]">
                      {{ item.availabilityMessage || 'This line is currently excluded from checkout.' }}
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
                  <h2 class="catalog-display-title text-3xl">Order summary</h2>
                  <p class="mt-2 text-sm leading-6 text-[var(--catalog-text-muted)]">
                    Review the products you are about to order before continuing payment.
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
                          <span>Unit price {{ formatCurrency(item.unitPrice) }}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>

                <div
                  v-else
                  class="mt-6 rounded-[1.5rem] border border-dashed border-[var(--catalog-border-soft)] bg-[var(--catalog-surface-muted)] px-4 py-5 text-sm leading-6 text-[var(--catalog-text-muted)]"
                >
                  No products are ready for checkout. Please return to cart and activate available products.
                </div>

                <dl class="mt-6 space-y-3 border-t border-[var(--catalog-border-soft)] pt-5 text-sm">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Recipient</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ shippingInfo.recipientName || 'Not provided' }}</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Shipping address</dt>
                    <dd class="max-w-[16rem] text-right font-semibold text-[var(--catalog-text)]">
                      {{ shippingAddressLine || 'No address selected' }}
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
                    <dt class="text-[var(--catalog-text-muted)]">Payment method</dt>
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
