<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CatalogTopNav from '../components/catalog/CatalogTopNav.vue'
import CatalogFooter from '../components/catalog/CatalogFooter.vue'
import { formatCurrency, formatDate, formatNumber } from '../services/formatters'
import { useAuthStore } from '../store/auth'
import { useOrderingStore } from '../store/ordering'

const authStore = useAuthStore()
const orderingStore = useOrderingStore()
const orders = ref([])
const loadingOrders = ref(true)

const user = computed(() => authStore.user)
const userInitials = computed(() =>
  (user.value?.email || 'user')
    .split('@')[0]
    .split(/[.\-_]/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('') || 'US',
)
const recentOrder = computed(() => orders.value[0] ?? null)
const totalSpent = computed(() =>
  orders.value.reduce((total, order) => total + (Number(order?.grandTotal) || 0), 0),
)
const pendingOrders = computed(() =>
  orders.value.filter((order) => order?.orderStatus === 'pending').length,
)

function getRoleLabel(role) {
  if (role === 'admin') {
    return 'Quản trị viên'
  }

  return 'Khách hàng'
}

onMounted(async () => {
  try {
    const { success, data } = await orderingStore.fetchOrders()
    if (success) {
      orders.value = Array.isArray(data) ? data : []
    }
  } finally {
    loadingOrders.value = false
  }
})
</script>

<template>
  <div class="bg-[var(--catalog-background)] text-[var(--catalog-text)]">
    <div class="catalog-shell">
      <CatalogTopNav />

      <main class="px-6 py-8 lg:px-10 xl:px-14 2xl:px-24 2xl:py-12">
        <div class="mx-auto max-w-[1440px] space-y-6">
          <section class="account-hero">
            <div class="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div class="max-w-3xl">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Customer account
                </p>
                <h1 class="catalog-display-title mt-3 text-4xl leading-tight lg:text-5xl">
                  Tài khoản của tôi
                </h1>
                <p class="mt-4 max-w-2xl text-sm leading-7 text-[var(--catalog-text-muted)] sm:text-base">
                  Quản lý thông tin phiên đăng nhập hiện tại, theo dõi tổng quan đơn hàng và truy cập nhanh tới các thao
                  tác customer quan trọng.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <article class="account-stat-card">
                  <p class="account-stat-label">Tổng đơn</p>
                  <p class="account-stat-value">{{ loadingOrders ? '...' : formatNumber(orders.length) }}</p>
                  <p class="account-stat-note">Lấy từ `GET /orders`</p>
                </article>
                <article class="account-stat-card account-stat-card--accent">
                  <p class="account-stat-label">Đang xử lý</p>
                  <p class="account-stat-value">{{ loadingOrders ? '...' : formatNumber(pendingOrders) }}</p>
                  <p class="account-stat-note">Đơn cần theo dõi thêm</p>
                </article>
                <article class="account-stat-card account-stat-card--warm">
                  <p class="account-stat-label">Tổng chi tiêu</p>
                  <p class="account-stat-value account-stat-value--compact">
                    {{ loadingOrders ? '...' : formatCurrency(totalSpent) }}
                  </p>
                  <p class="account-stat-note">Theo giá trị đơn đã tạo</p>
                </article>
              </div>
            </div>
          </section>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <section class="account-panel">
              <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div class="flex items-center gap-4">
                  <div class="account-avatar">{{ userInitials }}</div>
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--catalog-text-soft)]">
                      Hồ sơ
                    </p>
                    <h2 class="mt-2 text-3xl font-semibold text-[var(--catalog-text)]">
                      {{ user?.email }}
                    </h2>
                    <p class="mt-2 text-sm text-[var(--catalog-text-muted)]">
                      Phiên hiện tại đã được hydrate từ cookie auth của backend.
                    </p>
                  </div>
                </div>

                <RouterLink class="catalog-primary-button inline-flex items-center justify-center" :to="{ name: 'order-history' }">
                  Xem lịch sử đơn
                </RouterLink>
              </div>

              <dl class="mt-8 grid gap-4 md:grid-cols-2">
                <div class="account-meta-card">
                  <dt class="account-meta-label">Email</dt>
                  <dd class="account-meta-value">{{ user?.email || 'Chưa có dữ liệu' }}</dd>
                </div>
                <div class="account-meta-card">
                  <dt class="account-meta-label">Vai trò</dt>
                  <dd class="account-meta-value">{{ getRoleLabel(user?.role) }}</dd>
                </div>
                <div class="account-meta-card">
                  <dt class="account-meta-label">Account ID</dt>
                  <dd class="account-meta-value account-meta-value--mono">{{ user?.accountId || 'Không xác định' }}</dd>
                </div>
                <div class="account-meta-card">
                  <dt class="account-meta-label">Trạng thái phiên</dt>
                  <dd class="account-meta-value">{{ authStore.isAuthenticated ? 'Đang đăng nhập' : 'Chưa xác thực' }}</dd>
                </div>
              </dl>

              <div class="account-note-box mt-8">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Trạng thái tính năng
                </p>
                <h3 class="mt-3 text-2xl font-semibold text-[var(--catalog-text)]">
                  Đổi mật khẩu và chỉnh sửa hồ sơ chưa sẵn sàng.
                </h3>
                <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--catalog-text-muted)]">
                  Backend hiện mới có `register`, `login`, `logout`, `me`. Nếu muốn page này đầy đủ hơn, bước tiếp theo
                  là bổ sung API cập nhật profile hoặc đổi mật khẩu.
                </p>
              </div>
            </section>

            <aside class="space-y-6">
              <section class="account-panel">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Lối tắt
                </p>
                <div class="mt-5 grid gap-3">
                  <RouterLink class="account-shortcut-card" :to="{ name: 'order-history' }">
                    <strong>Lịch sử đơn hàng</strong>
                    <span>Theo dõi tất cả đơn đã tạo trong tài khoản này.</span>
                  </RouterLink>
                  <RouterLink class="account-shortcut-card" :to="{ name: 'cart' }">
                    <strong>Giỏ hàng</strong>
                    <span>Quay lại các sản phẩm đang chuẩn bị checkout.</span>
                  </RouterLink>
                  <RouterLink class="account-shortcut-card" :to="{ name: 'catalog-products' }">
                    <strong>Tiếp tục mua sắm</strong>
                    <span>Mở lại catalog để xem các sản phẩm mới nhất.</span>
                  </RouterLink>
                </div>
              </section>

              <section class="account-panel">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--catalog-text-soft)]">
                  Đơn gần nhất
                </p>

                <div v-if="loadingOrders" class="mt-5 space-y-3">
                  <div class="cart-skeleton h-5 w-28 rounded-full"></div>
                  <div class="cart-skeleton h-28 w-full rounded-[1.5rem]"></div>
                </div>

                <div v-else-if="recentOrder" class="account-recent-order mt-5">
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--catalog-text-soft)]">
                    {{ recentOrder.orderCode }}
                  </p>
                  <h3 class="mt-3 text-2xl font-semibold text-[var(--catalog-text)]">
                    {{ formatCurrency(recentOrder.grandTotal) }}
                  </h3>
                  <p class="mt-3 text-sm leading-7 text-[var(--catalog-text-muted)]">
                    Đặt lúc {{ formatDate(recentOrder.createdAt) }} cho {{ recentOrder.recipientName }}.
                  </p>
                  <RouterLink
                    class="catalog-reset-button mt-6 inline-flex items-center justify-center"
                    :to="{ name: 'order-detail', params: { orderId: recentOrder.id } }"
                  >
                    Mở chi tiết đơn
                  </RouterLink>
                </div>

                <div v-else class="account-empty-state mt-5">
                  <p class="text-sm leading-7 text-[var(--catalog-text-muted)]">
                    Tài khoản này chưa có đơn hàng nào. Sau khi checkout thành công, dữ liệu sẽ xuất hiện tại đây.
                  </p>
                </div>
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
.account-hero {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 2rem;
  padding: 2rem;
  background:
    radial-gradient(circle at top right, rgba(139, 117, 0, 0.1), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 245, 236, 0.92));
  box-shadow: 0 20px 60px rgba(26, 28, 28, 0.05);
}

.account-stat-card {
  min-width: 11rem;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.5rem;
  padding: 1.25rem;
  background: white;
}

.account-stat-card--accent {
  background: rgba(139, 117, 0, 0.06);
}

.account-stat-card--warm {
  background: rgba(200, 113, 57, 0.08);
}

.account-stat-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.account-stat-value {
  margin-top: 0.75rem;
  font-size: 2rem;
  font-weight: 700;
  color: var(--catalog-text);
}

.account-stat-value--compact {
  font-size: 1.5rem;
}

.account-stat-note {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  color: var(--catalog-text-muted);
}

.account-panel {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 2rem;
  padding: 1.75rem;
  background: white;
  box-shadow: 0 20px 60px rgba(26, 28, 28, 0.05);
}

.account-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, var(--catalog-primary), #c87139);
  color: white;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.account-meta-card {
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.25rem;
  padding: 1rem 1.1rem;
  background: var(--catalog-surface);
}

.account-meta-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--catalog-text-soft);
}

.account-meta-value {
  margin-top: 0.6rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--catalog-text);
  word-break: break-word;
}

.account-meta-value--mono {
  font-family: 'SFMono-Regular', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9rem;
}

.account-note-box {
  border-radius: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(247, 244, 232, 0.95), rgba(255, 255, 255, 0.98));
}

.account-shortcut-card {
  display: block;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 1.25rem;
  padding: 1rem 1.1rem;
  background: var(--catalog-surface);
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.account-shortcut-card:hover {
  border-color: rgba(139, 117, 0, 0.35);
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(26, 28, 28, 0.06);
}

.account-shortcut-card strong {
  display: block;
  font-size: 1rem;
  color: var(--catalog-text);
}

.account-shortcut-card span {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--catalog-text-muted);
}

.account-recent-order,
.account-empty-state {
  border-radius: 1.5rem;
  padding: 1.25rem;
  background: var(--catalog-surface);
}
</style>
