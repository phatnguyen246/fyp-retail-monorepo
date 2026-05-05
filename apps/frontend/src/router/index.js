import { createRouter, createWebHistory } from 'vue-router'
import CatalogProductPage from '../pages/CatalogProductPage.vue'
import CatalogProductDetailPage from '../pages/CatalogProductDetailPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import AccountPage from '../pages/AccountPage.vue'
import CartPage from '../pages/CartPage.vue'
import { useAuthStore } from '../store/auth'

import CheckoutPage from '../pages/CheckoutPage.vue'
import OrderHistoryPage from '../pages/OrderHistoryPage.vue'
import ComparePage from '../pages/ComparePage.vue'
import OrderDetailPage from '../pages/OrderDetailPage.vue'
import OrderLookupPage from '../pages/OrderLookupPage.vue'
import PaymentSuccessPage from '../pages/PaymentSuccessPage.vue'
import VnpayCheckoutPage from '../pages/VnpayCheckoutPage.vue'
import VnpayReturnPage from '../pages/VnpayReturnPage.vue'

import AdminLayout from '../components/admin/AdminLayout.vue'
import AdminOverviewPage from '../pages/admin/AdminOverviewPage.vue'
import AdminProductListPage from '../pages/admin/AdminProductListPage.vue'
import AdminProductCreatePage from '../pages/admin/AdminProductCreatePage.vue'
import AdminProductDetailPage from '../pages/admin/AdminProductDetailPage.vue'
import AdminInventoryPage from '../pages/admin/AdminInventoryPage.vue'
import AdminOrderListPage from '../pages/admin/AdminOrderListPage.vue'
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
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
      name: 'catalog-product-detail',
      component: CatalogProductDetailPage,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: LoginPage,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
    },
    {
      path: '/account',
      name: 'account',
      component: AccountPage,
      meta: { requiresAuth: true },
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
      path: '/orders/lookup',
      name: 'order-lookup',
      component: OrderLookupPage,
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
      path: '/payment/vnpay/:orderId',
      name: 'vnpay-checkout',
      component: VnpayCheckoutPage,
      props: true,
    },
    {
      path: '/payment/vnpay/return',
      name: 'vnpay-return',
      component: VnpayReturnPage,
    },
    {
      path: '/payment/success',
      name: 'payment-success',
      component: PaymentSuccessPage,
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-overview',
          component: AdminOverviewPage,
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
          path: 'inventory',
          name: 'admin-inventory',
          component: AdminInventoryPage,
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
      : (to.name === 'login' || to.name === 'admin-login') &&
          typeof to.query.redirect === 'string' &&
          to.query.redirect.startsWith('/admin')
        ? 'admin'
        : to.name === 'admin-login'
          ? 'admin'
        : 'auto'

  if (
    to.meta.requiresAuth ||
    to.meta.requiresAdmin ||
    to.name === 'login' ||
    to.name === 'admin-login' ||
    to.name === 'register'
  ) {
    await authStore.initialize(authScope)
  }

  const isAuthenticated = authStore.isAuthenticated
  const isAdmin = authStore.user?.role === 'admin'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({
      name: to.meta.requiresAdmin ? 'admin-login' : 'login',
      query: { redirect: to.fullPath },
    })
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next({ name: 'admin-login', query: { redirect: to.fullPath } })
  } else if (isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    next(isAdmin ? { name: 'admin-overview' } : { name: 'catalog-products' })
  } else if (isAdmin && to.name === 'admin-login') {
    next({ name: 'admin-overview' })
  } else {
    next()
  }
})

export default router
