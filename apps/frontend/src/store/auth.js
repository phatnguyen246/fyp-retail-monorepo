import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import { http } from '../services/http'

function normalizeScope(scope = 'auto') {
  return ['admin', 'customer', 'auto'].includes(scope) ? scope : 'auto'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const initialized = ref(false)
  const currentScope = ref('auto')
  const initializedScopes = ref({
    auto: false,
    admin: false,
    customer: false,
  })
  const isAuthenticated = computed(() => Boolean(user.value))
  const initializePromises = new Map()

  function unwrapPayload(response, fallbackValue = null) {
    return response?.data?.data ?? fallbackValue
  }

  function markScopeInitialized(scope, value = true) {
    initializedScopes.value = {
      ...initializedScopes.value,
      [scope]: value,
    }
    initialized.value = Object.values(initializedScopes.value).some(Boolean)
  }

  function resetScopeInitialization() {
    initializedScopes.value = {
      auto: false,
      admin: false,
      customer: false,
    }
    initialized.value = false
  }

  async function login({ email, password }) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/auth/login', { email, password })
      user.value = unwrapPayload(response)
      currentScope.value = user.value?.role === 'admin' ? 'admin' : 'customer'
      resetScopeInitialization()
      markScopeInitialized(currentScope.value)
      return true
    } catch (e) {
      error.value = e.response?.data?.message || 'An unknown error occurred.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register({ email, password, confirmPassword }) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/auth/register', { email, password, confirmPassword })
      user.value = unwrapPayload(response)
      currentScope.value = 'customer'
      resetScopeInitialization()
      markScopeInitialized('customer')
      return true
    } catch (e) {
      error.value = e.response?.data?.message || 'An unknown error occurred.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout({ scope = currentScope.value } = {}) {
    const resolvedScope = normalizeScope(scope)
    loading.value = true
    error.value = null

    try {
      await http.post('/auth/logout', null, {
        headers: {
          'X-Auth-Scope': resolvedScope,
        },
      })
    } catch (e) {
      console.error('Logout failed', e)
    } finally {
      user.value = null
      currentScope.value = resolvedScope
      resetScopeInitialization()
      markScopeInitialized(resolvedScope)
      loading.value = false
    }
  }

  async function fetchUser({ scope = currentScope.value, force = false } = {}) {
    const resolvedScope = normalizeScope(scope)

    if (!force && currentScope.value === resolvedScope && initializedScopes.value[resolvedScope]) {
      return user.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await http.get('/auth/me', {
        headers: {
          'X-Auth-Scope': resolvedScope,
        },
      })
      user.value = unwrapPayload(response)
      currentScope.value = resolvedScope
      markScopeInitialized(resolvedScope)
      return user.value
    } catch (_e) {
      user.value = null
      currentScope.value = resolvedScope
      markScopeInitialized(resolvedScope)
      return null
    } finally {
      loading.value = false
    }
  }

  async function initialize(scope = 'auto') {
    const resolvedScope = normalizeScope(scope)

    if (currentScope.value === resolvedScope && initializedScopes.value[resolvedScope]) {
      return user.value
    }

    if (!initializePromises.has(resolvedScope)) {
      initializePromises.set(
        resolvedScope,
        fetchUser({ scope: resolvedScope, force: true }).finally(() => {
          initializePromises.delete(resolvedScope)
        }),
      )
    }

    return initializePromises.get(resolvedScope)
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    initialized: readonly(initialized),
    currentScope: readonly(currentScope),
    login,
    register,
    logout,
    fetchUser,
    initialize,
    isAuthenticated,
  }
})
