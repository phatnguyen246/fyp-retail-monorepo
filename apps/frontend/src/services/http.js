import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '/api'

const http = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

let isAdminSessionHandling = false
let isInterceptorRegistered = false

export function configureHttpSessionHandling({ authStore, router } = {}) {
  if (isInterceptorRegistered || !authStore || !router) {
    return
  }

  http.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status
      const code = error?.response?.data?.code
      const routeName = String(router.currentRoute.value?.name || '')
      const isOnAdminRoute =
        routeName.startsWith('admin-') || router.currentRoute.value?.meta?.requiresAdmin === true
      const isAdminLoginRoute = routeName === 'admin-login'

      if (
        !isAdminSessionHandling &&
        status === 401 &&
        code === 'AUTH_UNAUTHORIZED' &&
        isOnAdminRoute &&
        !isAdminLoginRoute
      ) {
        isAdminSessionHandling = true

        try {
          const redirectTarget = router.currentRoute.value?.fullPath || '/admin'
          await authStore.logout({ scope: 'admin' })
          await router.replace({
            name: 'admin-login',
            query: { redirect: redirectTarget },
          })
        } finally {
          isAdminSessionHandling = false
        }
      }

      return Promise.reject(error)
    },
  )

  isInterceptorRegistered = true
}

export { http }
export default http
