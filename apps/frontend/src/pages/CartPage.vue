<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { useCartStore } from '../store/cart'
import { formatCurrency, formatNumber } from '../services/formatters'

const cartStore = useCartStore()
const quantityCaps = ref({})
const pendingQuantityItemIds = ref({})
const reactivatingItemIds = ref({})
const removingItemIds = ref({})
const isRefreshingCart = ref(false)
const isClearingCart = ref(false)

const readyItems = computed(() =>
  cartStore.items.filter((item) => item.selected === true && item.isAvailable === true),
)

const unavailableItems = computed(() =>
  cartStore.items.filter((item) => item.isAvailable === false),
)

const excludedItems = computed(() =>
  cartStore.items.filter((item) => item.selected === false),
)

const requiresAttentionItems = computed(() =>
  cartStore.items.filter((item) => item.selected === false || item.isAvailable === false),
)

onMounted(() => {
  cartStore.fetchCart()
})

function getItemQuantity(item) {
  return Math.min(99, Math.max(1, Number(item?.quantity) || 1))
}

function getItemQuantityCap(item) {
  const availableQuantity = Number(item?.availableQuantity)
  if (Number.isFinite(availableQuantity) && availableQuantity > 0) {
    return Math.min(99, availableQuantity)
  }

  const cap = Number(quantityCaps.value[item?.variantId])
  return Number.isFinite(cap) && cap > 0 ? Math.min(99, cap) : 99
}

function getSafeRecoveryQuantity(item) {
  return Math.min(getItemQuantity(item), getItemQuantityCap(item))
}

function isItemQuantityPending(item) {
  return pendingQuantityItemIds.value[item?.variantId] === true
}

function isItemReactivating(item) {
  return reactivatingItemIds.value[item?.variantId] === true
}

function isItemRemoving(item) {
  return removingItemIds.value[item?.variantId] === true
}

function setPendingItemState(stateRef, variantId, nextState) {
  stateRef.value = {
    ...stateRef.value,
    [variantId]: nextState,
  }
}

function getAvailabilityBadge(item) {
  const availabilityStatus = item?.availabilityStatus

  switch (availabilityStatus) {
    case 'available':
      return {
        label: 'Catalog + tồn kho hợp lệ',
        className: 'cart-status-chip cart-status-chip--ready',
      }
    case 'insufficient_stock':
      return {
        label: 'Vượt quá tồn kho thực tế',
        className: 'cart-status-chip cart-status-chip--warning',
      }
    case 'out_of_stock':
      return {
        label: 'Tạm hết hàng',
        className: 'cart-status-chip cart-status-chip--danger',
      }
    case 'variant_missing':
    case 'variant_deleted':
      return {
        label: 'Biến thể không còn khả dụng',
        className: 'cart-status-chip cart-status-chip--danger',
      }
    case 'product_missing':
    case 'product_deleted':
      return {
        label: 'Sản phẩm không còn khả dụng',
        className: 'cart-status-chip cart-status-chip--danger',
      }
    case 'variant_inactive':
      return {
        label: 'Biến thể đã ngừng bán',
        className: 'cart-status-chip cart-status-chip--danger',
      }
    case 'product_inactive':
      return {
        label: 'Sản phẩm đã ngừng bán',
        className: 'cart-status-chip cart-status-chip--danger',
      }
    default:
      return {
        label: 'Đang kiểm tra',
        className: 'cart-status-chip cart-status-chip--muted',
      }
  }
}

function getCheckoutBadge(item) {
  if (item?.selected === true && item?.isAvailable === true) {
    return {
      label: 'Được tính vào checkout',
      className: 'cart-status-chip cart-status-chip--ready',
    }
  }

  return {
    label: 'Đang bị loại khỏi checkout',
    className:
      item?.isAvailable === false
        ? 'cart-status-chip cart-status-chip--danger-soft'
        : 'cart-status-chip cart-status-chip--warning-soft',
  }
}

function getItemStateText(item) {
  if (item?.isAvailable === false) {
    if (item?.availabilityStatus === 'insufficient_stock') {
      const availableQuantity = Number(item?.availableQuantity)
      if (Number.isFinite(availableQuantity) && availableQuantity > 0) {
        return `Chỉ còn ${formatNumber(availableQuantity)} sản phẩm. Line vẫn được giữ trong cart nhưng đang bị loại khỏi checkout.`
      }
    }

    if (item?.availabilityStatus === 'out_of_stock') {
      return 'Sản phẩm đang hết hàng. Line vẫn được giữ trong cart để bạn quyết định cập nhật hoặc xóa.'
    }

    return 'Line này không còn hợp lệ theo catalog hiện tại nên backend đã tự loại khỏi phần checkout.'
  }

  if (item?.selected === false) {
    return 'Line hiện đã hợp lệ trở lại, nhưng chưa được backend đưa lại vào checkout. Hãy cập nhật line để kích hoạt lại.'
  }

  return ''
}

function getItemCardClass(item) {
  if (item?.isAvailable === false) {
    return 'border-[rgba(186,26,26,0.18)]'
  }

  if (item?.selected === false) {
    return 'border-[rgba(139,117,0,0.22)]'
  }

  return 'border-[var(--catalog-border-soft)]'
}

function canRecoverWithAvailableQuantity(item) {
  return item?.availabilityStatus === 'insufficient_stock' && getItemQuantityCap(item) >= 1
}

async function refreshCart() {
  if (isRefreshingCart.value) {
    return
  }

  isRefreshingCart.value = true
  try {
    await cartStore.fetchCart()
  } finally {
    isRefreshingCart.value = false
  }
}

async function handleQuantityUpdate(item, quantity) {
  const variantId = item?.variantId
  const nextQuantity = Math.min(getItemQuantityCap(item), Math.max(1, Number(quantity) || 1))

  setPendingItemState(pendingQuantityItemIds, variantId, true)

  try {
    const result = await cartStore.updateItem({ variantId, quantity: nextQuantity })
    const availableQuantity = Number(result?.error?.meta?.availableQuantity)

    if (!result?.success && Number.isFinite(availableQuantity)) {
      quantityCaps.value = {
        ...quantityCaps.value,
        [variantId]: availableQuantity,
      }
    }

    return result
  } finally {
    setPendingItemState(pendingQuantityItemIds, variantId, false)
  }
}

async function increaseQuantity(item) {
  const currentQuantity = getItemQuantity(item)
  const quantityCap = getItemQuantityCap(item)

  if (currentQuantity >= quantityCap || isItemQuantityPending(item)) {
    return
  }

  await handleQuantityUpdate(item, currentQuantity + 1)
}

async function decreaseQuantity(item) {
  const currentQuantity = getItemQuantity(item)

  if (currentQuantity <= 1 || isItemQuantityPending(item)) {
    return
  }

  await handleQuantityUpdate(item, currentQuantity - 1)
}

async function reactivateItem(item, quantity = getSafeRecoveryQuantity(item)) {
  if (isItemReactivating(item) || isItemQuantityPending(item)) {
    return
  }

  setPendingItemState(reactivatingItemIds, item.variantId, true)

  try {
    await handleQuantityUpdate(item, quantity)
  } finally {
    setPendingItemState(reactivatingItemIds, item.variantId, false)
  }
}

async function removeItem(item) {
  if (isItemRemoving(item)) {
    return
  }

  setPendingItemState(removingItemIds, item.variantId, true)

  try {
    await cartStore.removeItem(item.variantId)
  } finally {
    setPendingItemState(removingItemIds, item.variantId, false)
  }
}

async function clearCart() {
  if (!cartStore.items.length || isClearingCart.value) {
    return
  }

  if (!window.confirm('Xóa toàn bộ giỏ hàng hiện tại?')) {
    return
  }

  isClearingCart.value = true

  try {
    await cartStore.clearCart()
  } finally {
    isClearingCart.value = false
  }
}
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <CatalogTopNav />

      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[1440px]">
          <header class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                Storefront Cart
              </p>
              <h1 class="catalog-display-title mt-2 text-4xl leading-tight lg:text-5xl">
                Giỏ hàng
              </h1>
            </div>

          </header>

          <section
            v-if="cartStore.error && !cartStore.items.length"
            class="rounded-[2rem] border border-[rgba(186,26,26,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-danger)]">
              Không thể tải cart
            </p>
            <h2 class="mt-3 text-3xl font-semibold text-[var(--catalog-text)]">
              Không lấy được dữ liệu cart hiện tại.
            </h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Hãy thử đồng bộ lại. Nếu lỗi còn lặp lại, kiểm tra kết nối API storefront tới backend cart.
            </p>
            <div class="mt-8">
              <button
                type="button"
                class="catalog-primary-button inline-flex"
                :disabled="isRefreshingCart"
                @click="refreshCart"
              >
                {{ isRefreshingCart ? 'Đang thử lại...' : 'Thử tải lại cart' }}
              </button>
            </div>
          </section>

          <section
            v-else-if="cartStore.loading && !cartStore.items.length"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
          >
            <div class="space-y-4">
              <div class="cart-skeleton h-6 w-40 rounded-full"></div>
              <div class="cart-skeleton h-28 w-full rounded-[1.5rem]"></div>
              <div class="cart-skeleton h-28 w-full rounded-[1.5rem]"></div>
            </div>
          </section>

          <section
            v-else-if="!cartStore.items.length"
            class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-8 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-10"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
              Chưa có sản phẩm
            </p>
            <h2 class="catalog-display-title mt-3 text-3xl">Giỏ hàng của bạn đang trống.</h2>
            <p class="mt-4 max-w-2xl text-[var(--catalog-text-muted)]">
              Hãy quay lại catalog để chọn cấu hình phù hợp. Cart guest chỉ được tạo sau lần add đầu tiên thành công.
            </p>
            <div class="mt-8">
              <RouterLink class="catalog-primary-button inline-flex" :to="{ name: 'catalog-products' }">
                Tiếp tục mua sắm
              </RouterLink>
            </div>
          </section>

          <section
            v-else
            class="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_24rem]"
          >
            <div class="space-y-5">
              <div class="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  class="catalog-reset-button inline-flex items-center justify-center"
                  :disabled="isRefreshingCart"
                  @click="refreshCart"
                >
                  {{ isRefreshingCart ? 'Đang đồng bộ...' : 'Đồng bộ lại cart' }}
                </button>

                <button
                  type="button"
                  class="cart-danger-button"
                  :disabled="!cartStore.items.length || isClearingCart"
                  @click="clearCart"
                >
                  {{ isClearingCart ? 'Đang xóa...' : 'Xóa toàn bộ giỏ' }}
                </button>
              </div>

              <section
                v-if="cartStore.error"
                class="rounded-[1.6rem] border border-[rgba(139,117,0,0.2)] bg-[rgba(255,249,235,0.72)] p-5"
              >
                <p class="font-semibold text-[var(--catalog-text)]">
                  Có lỗi khi đồng bộ cart.
                </p>
                <p class="mt-2 text-sm text-[var(--catalog-text-muted)]">
                  Dữ liệu đang hiển thị có thể chưa phải trạng thái mới nhất. Hãy đồng bộ lại để lấy cart view vừa được reconcile từ backend.
                </p>
              </section>

              <article
                v-for="item in cartStore.items"
                :key="item.variantId"
                class="rounded-[2rem] border bg-white p-5 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-6"
                :class="getItemCardClass(item)"
              >
                <div class="flex flex-col gap-5 md:flex-row md:items-start">
                  <div v-if="item.thumbnailUrl" class="cart-media-wrap">
                    <img
                      :src="item.thumbnailUrl"
                      :alt="item.productName || 'Cart item'"
                      class="cart-media object-contain"
                    />
                  </div>

                  <div v-else class="cart-media-wrap">
                    <div class="cart-media-placeholder">
                      <span class="material-symbols-outlined text-4xl">inventory_2</span>
                    </div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-4">
                      <div class="min-w-0">
                        <div class="flex flex-wrap gap-2">
                          <span :class="getAvailabilityBadge(item).className">
                            {{ getAvailabilityBadge(item).label }}
                          </span>
                          <span :class="getCheckoutBadge(item).className">
                            {{ getCheckoutBadge(item).label }}
                          </span>
                        </div>

                        <h3 class="mt-4 text-2xl font-semibold leading-tight text-[var(--catalog-text)]">
                          <RouterLink
                            v-if="item.productId"
                            :to="`/products/${item.productId}`"
                            class="transition-colors hover:text-[var(--catalog-primary)]"
                          >
                            {{ item.productName || 'Sản phẩm không còn dữ liệu' }}
                          </RouterLink>
                          <span v-else>{{ item.productName || 'Sản phẩm không còn dữ liệu' }}</span>
                        </h3>

                        <p class="mt-2 text-sm text-[var(--catalog-text-muted)]">
                          {{ item.variantLabel || 'Biến thể không còn khả dụng' }}
                        </p>
                        <p
                          v-if="getItemStateText(item)"
                          class="mt-3 max-w-3xl text-sm leading-6 text-[var(--catalog-text-muted)]"
                        >
                          {{ getItemStateText(item) }}
                        </p>
                      </div>

                      <button
                        type="button"
                        class="cart-remove-button"
                        title="Xóa sản phẩm"
                        :disabled="isItemRemoving(item)"
                        @click="removeItem(item)"
                      >
                        <span class="material-symbols-outlined">
                          {{ isItemRemoving(item) ? 'hourglass_top' : 'close' }}
                        </span>
                      </button>
                    </div>

                    <div class="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                      <div>
                        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                          Số lượng
                        </p>
                        <div class="cart-quantity-control">
                          <button
                            class="cart-quantity-button"
                            :class="{ 'cart-quantity-button--pending': isItemQuantityPending(item) }"
                            type="button"
                            :disabled="getItemQuantity(item) <= 1"
                            :aria-busy="isItemQuantityPending(item) ? 'true' : 'false'"
                            @click="decreaseQuantity(item)"
                          >
                            <span class="material-symbols-outlined">remove</span>
                          </button>

                          <input
                            :id="`quantity-${item.variantId}`"
                            type="number"
                            min="1"
                            :max="getItemQuantityCap(item)"
                            class="cart-quantity-input"
                            :class="{ 'cart-quantity-input--pending': isItemQuantityPending(item) }"
                            :value="getItemQuantity(item)"
                            @change="handleQuantityUpdate(item, $event.target.value)"
                          />

                          <button
                            class="cart-quantity-button"
                            :class="{ 'cart-quantity-button--pending': isItemQuantityPending(item) }"
                            type="button"
                            :disabled="getItemQuantity(item) >= getItemQuantityCap(item)"
                            :aria-busy="isItemQuantityPending(item) ? 'true' : 'false'"
                            @click="increaseQuantity(item)"
                          >
                            <span class="material-symbols-outlined">add</span>
                          </button>
                        </div>

                        <p
                          v-if="item.availabilityStatus === 'insufficient_stock' && getItemQuantityCap(item) > 0"
                          class="mt-2 text-sm text-[var(--catalog-text-muted)]"
                        >
                          Có thể phục hồi line bằng cách giảm về {{ formatNumber(getItemQuantityCap(item)) }}.
                        </p>
                        <p
                          v-else-if="item.isAvailable === true && item.selected === false"
                          class="mt-2 text-sm text-[var(--catalog-text-muted)]"
                        >
                          Cập nhật line hiện tại để backend đưa lại item vào checkout.
                        </p>
                      </div>

                      <div class="cart-pricing-panel">
                        <div class="cart-pricing-card">
                          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                            Đơn giá
                          </p>
                          <p class="cart-pricing-value cart-pricing-value--unit">
                            {{ formatCurrency(item.unitPrice, item.currency || cartStore.summary.currency) }}
                          </p>
                        </div>

                        <div class="cart-pricing-divider" aria-hidden="true"></div>

                        <div class="cart-pricing-card cart-pricing-card--total">
                          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--catalog-text-soft)]">
                            Thành tiền line
                          </p>
                          <p class="cart-pricing-value cart-pricing-value--total">
                            {{ formatCurrency(item.lineTotal, item.currency || cartStore.summary.currency) }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="item.selected === false || canRecoverWithAvailableQuantity(item)"
                      class="mt-5 flex flex-wrap gap-3"
                    >
                      <button
                        v-if="item.selected === false && item.isAvailable === true"
                        type="button"
                        class="catalog-primary-button inline-flex"
                        :disabled="isItemReactivating(item) || isItemQuantityPending(item)"
                        @click="reactivateItem(item)"
                      >
                        {{ isItemReactivating(item) ? 'Đang kích hoạt...' : 'Đưa lại vào checkout' }}
                      </button>

                      <button
                        v-if="canRecoverWithAvailableQuantity(item)"
                        type="button"
                        class="catalog-reset-button inline-flex"
                        :disabled="isItemReactivating(item) || isItemQuantityPending(item)"
                        @click="reactivateItem(item, getItemQuantityCap(item))"
                      >
                        Giảm về {{ formatNumber(getItemQuantityCap(item)) }} để phục hồi
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <aside class="space-y-5">
              <section class="rounded-[2rem] border border-[var(--catalog-border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)] lg:p-8">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Tóm tắt đơn hàng
                </p>
                <h2 class="catalog-display-title mt-2 text-3xl">Order Summary</h2>

                <dl class="mt-6 space-y-4">
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Line đang sẵn sàng</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ readyItems.length }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Tổng số lượng trong cart</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ cartStore.summary.totalQuantity }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <dt class="text-[var(--catalog-text-muted)]">Được chọn checkout</dt>
                    <dd class="font-semibold text-[var(--catalog-text)]">{{ cartStore.summary.selectedQuantity }}</dd>
                  </div>
                  <div class="flex items-center justify-between gap-4 border-t border-[var(--catalog-border-soft)] pt-4">
                    <dt class="text-[var(--catalog-text-muted)]">Tổng tiền checkout</dt>
                    <dd class="text-2xl font-semibold text-[var(--catalog-primary)]">
                      {{ formatCurrency(cartStore.summary.totalAmount, cartStore.summary.currency) }}
                    </dd>
                  </div>
                </dl>

                <RouterLink
                  :to="{ name: 'checkout' }"
                  class="catalog-primary-button mt-8 flex w-full items-center justify-center"
                  :class="{ 'pointer-events-none opacity-50': cartStore.summary.selectedQuantity === 0 }"
                >
                  Tiến hành thanh toán
                </RouterLink>

                <p
                  v-if="cartStore.summary.selectedQuantity === 0"
                  class="mt-3 text-sm text-[var(--catalog-text-muted)]"
                >
                  Hiện chưa có line nào đủ điều kiện để sang checkout.
                </p>

                <RouterLink
                  :to="{ name: 'catalog-products' }"
                  class="catalog-reset-button mt-3 flex w-full items-center justify-center"
                >
                  Tiếp tục mua sắm
                </RouterLink>
              </section>

              <section
                v-if="excludedItems.length"
                class="rounded-[2rem] border border-[rgba(139,117,0,0.2)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-primary-deep)]">
                  Đang bị loại khỏi checkout
                </p>
                <p class="mt-3 text-[var(--catalog-text-muted)]">
                  Có {{ excludedItems.length }} line hiện chưa được tính vào checkout. Một số line có thể phục hồi bằng cách cập nhật quantity hợp lệ.
                </p>
              </section>

              <section
                v-if="unavailableItems.length"
                class="rounded-[2rem] border border-[rgba(186,26,26,0.18)] bg-white p-6 shadow-[0_20px_60px_rgba(26,28,28,0.05)]"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-danger)]">
                  Cần xử lý
                </p>
                <p class="mt-3 text-[var(--catalog-text-muted)]">
                  Có {{ unavailableItems.length }} line không còn hợp lệ theo catalog hoặc inventory. Hãy giảm số lượng, phục hồi line nếu còn stock, hoặc xóa khỏi cart.
                </p>
              </section>
            </aside>
          </section>
        </div>
      </main>

      <CatalogFooter />
    </div>
  </div>
</template>

<style scoped>
.cart-media-wrap {
  display: flex;
  width: min(100%, 11rem);
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.78) 42%, transparent 76%),
    linear-gradient(180deg, #f8f4ec 0%, #f1ece3 100%);
}

.cart-media {
  width: 86%;
  height: 86%;
}

.cart-media-placeholder {
  display: flex;
  width: 86%;
  height: 86%;
  align-items: center;
  justify-content: center;
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.58);
  color: var(--catalog-text-soft);
}

.cart-remove-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 999px;
  background: white;
  color: var(--catalog-text-soft);
  transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease, opacity 150ms ease;
}

.cart-remove-button:hover:not(:disabled) {
  border-color: rgba(186, 26, 26, 0.2);
  background: rgba(186, 26, 26, 0.06);
  color: var(--catalog-danger);
}

.cart-remove-button:disabled {
  opacity: 0.45;
  cursor: wait;
}

.cart-quantity-control {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 999px;
  background: white;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.cart-quantity-button {
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

.cart-quantity-button:hover:not(:disabled) {
  background: var(--catalog-surface-muted);
}

.cart-quantity-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cart-quantity-button--pending {
  opacity: 0.78;
}

.cart-quantity-button--pending:not(:disabled) {
  cursor: progress;
}

.cart-quantity-input {
  width: 3.75rem;
  border: none;
  background: transparent;
  padding: 0.8rem 0.25rem;
  text-align: center;
  font-weight: 600;
  color: var(--catalog-text);
  outline: none;
}

.cart-quantity-input:focus {
  background: rgba(139, 117, 0, 0.03);
}

.cart-quantity-input--pending {
  color: var(--catalog-text-soft);
}

.cart-quantity-input::-webkit-outer-spin-button,
.cart-quantity-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.cart-quantity-input[type="number"] {
  -moz-appearance: textfield;
}

.cart-pricing-panel {
  display: grid;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.5rem;
  padding: 1rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 244, 236, 0.88) 100%);
}

.cart-pricing-card {
  min-width: 0;
}

.cart-pricing-card--total {
  text-align: left;
}

.cart-pricing-value {
  min-width: 0;
  margin-top: 0.75rem;
  font-size: clamp(1.15rem, 0.95rem + 0.45vw, 1.6rem);
  font-weight: 600;
  line-height: 1.05;
  white-space: nowrap;
}

.cart-pricing-value--unit {
  color: var(--catalog-primary);
}

.cart-pricing-value--total {
  color: var(--catalog-text);
}

.cart-pricing-divider {
  height: 1px;
  background: var(--catalog-border-soft);
}

@media (min-width: 1280px) {
  .cart-pricing-panel {
    width: max-content;
    max-width: 100%;
    justify-self: end;
    grid-template-columns: max-content 1px max-content;
    align-items: stretch;
    gap: 1.25rem;
    padding: 1.1rem 1.2rem;
  }

  .cart-pricing-card {
    display: flex;
    min-height: 100%;
    flex-direction: column;
    justify-content: center;
  }

  .cart-pricing-card--total {
    text-align: right;
  }

  .cart-pricing-divider {
    width: 1px;
    height: auto;
  }
}

.cart-status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cart-status-chip--ready {
  background: rgba(27, 94, 32, 0.08);
  color: #1b5e20;
}

.cart-status-chip--warning {
  background: rgba(139, 117, 0, 0.12);
  color: #7c5b00;
}

.cart-status-chip--warning-soft {
  background: rgba(139, 117, 0, 0.08);
  color: #7c5b00;
}

.cart-status-chip--danger {
  background: rgba(186, 26, 26, 0.1);
  color: var(--catalog-danger);
}

.cart-status-chip--danger-soft {
  background: rgba(186, 26, 26, 0.08);
  color: var(--catalog-danger);
}

.cart-status-chip--muted {
  background: rgba(42, 44, 43, 0.06);
  color: var(--catalog-text-soft);
}

.cart-danger-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  border: 1px solid rgba(186, 26, 26, 0.18);
  border-radius: 999px;
  padding: 0.75rem 1.35rem;
  background: rgba(186, 26, 26, 0.04);
  color: var(--catalog-danger);
  font-weight: 600;
  transition: background-color 150ms ease, border-color 150ms ease, opacity 150ms ease;
}

.cart-danger-button:hover:not(:disabled) {
  background: rgba(186, 26, 26, 0.08);
  border-color: rgba(186, 26, 26, 0.28);
}

.cart-danger-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cart-skeleton {
  background:
    linear-gradient(90deg, rgba(244, 243, 242, 0.92) 25%, rgba(255, 255, 255, 0.96) 50%, rgba(244, 243, 242, 0.92) 75%);
  background-size: 200% 100%;
  animation: cart-shimmer 1.4s linear infinite;
}

@keyframes cart-shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}
</style>
