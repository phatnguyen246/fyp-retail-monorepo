import { createRouter, createWebHistory } from 'vue-router'
import CatalogProductPage from '../pages/CatalogProductPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import CartPage from '../pages/CartPage.vue'
import { useAuthStore } from '../store/auth'

import CheckoutPage from '../pages/CheckoutPage.vue'
import OrderHistoryPage from '../pages/OrderHistoryPage.vue'
import ComparePage from '../pages/ComparePage.vue'
import OrderDetailPage from '../pages/OrderDetailPage.vue'
import VnpayReturnPage from '../pages/VnpayReturnPage.vue'

import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminProductListPage from '../pages/admin/AdminProductListPage.vue'
import AdminProductCreatePage from '../pages/admin/AdminProductCreatePage.vue'
import AdminProductDetailPage from '../pages/admin/AdminProductDetailPage.vue'
import AdminOrderListPage from '../pages/admin/AdminOrderListPage.vue'
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: {
        name: 'catalog-products',
      },
    },
    {
      path: '/catalog/products',
      name: 'catalog-products',
      component: CatalogProductPage,
    },
    {
      path: '/products/:productId/:slug?',
      redirect: {
        name: 'catalog-products',
      },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
    },
    {
      path: '/cart',
      name: 'cart',
      component: CartPage,
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: CheckoutPage,
    },
    {
      path: '/orders',
      name: 'order-history',
      component: OrderHistoryPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/orders/:orderId',
      name: 'order-detail',
      component: OrderDetailPage,
      props: true,
    },
    {
      path: '/compare',
      name: 'compare',
      component: ComparePage,
    },
    {
      path: '/payment/vnpay/return',
      name: 'vnpay-return',
      component: VnpayReturnPage,
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: { name: 'admin-products' },
        },
        {
          path: 'products',
          name: 'admin-products',
          component: AdminProductListPage,
        },
        {
          path: 'products/create',
          name: 'admin-product-create',
          component: AdminProductCreatePage,
        },
        {
          path: 'products/:productId',
          name: 'admin-product-detail',
          component: AdminProductDetailPage,
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: AdminOrderListPage,
        },
        {
          path: 'orders/:orderId',
          name: 'admin-order-detail',
          component: AdminOrderDetailPage,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: {
        name: 'catalog-products',
      },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const authScope =
    to.meta.requiresAdmin || String(to.name || '').startsWith('admin-')
      ? 'admin'
      : to.name === 'login' &&
          typeof to.query.redirect === 'string' &&
          to.query.redirect.startsWith('/admin')
        ? 'admin'
        : 'auto'

  if (to.meta.requiresAuth || to.meta.requiresAdmin || to.name === 'login' || to.name === 'register') {
    await authStore.initialize(authScope)
  }

  const isAuthenticated = Boolean(authStore.isAuthenticated)
  const isAdmin = authStore.user?.role === 'admin'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    next(isAdmin ? { name: 'admin-overview' } : { name: 'catalog-products' })
  } else {
    next()
  }
})

export default router
