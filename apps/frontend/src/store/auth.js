import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { http } from '../services/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function login({ email, password }) {
    loading.value = true
    error.value = null
    try {
      const response = await http.post('/auth/login', { email, password })
      user.value = response.data
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
      // The backend validates confirmPassword, but we can do a quick check on the client, too.
      const response = await http.post('/auth/register', { email, password, confirmPassword })
      user.value = response.data
      return true
    } catch (e) {
      error.value = e.response?.data?.message || 'An unknown error occurred.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    user.value = null
    try {
      await http.post('/auth/logout')
    } catch (e) {
      // It's fine if this fails, the user is logged out on the client-side anyway
      console.error('Logout failed', e)
    }
  }

  async function fetchUser() {
    if (user.value) {
      return
    }
    loading.value = true
    error.value = null
    try {
      const response = await http.get('/auth/me')
      user.value = response.data
    } catch (e) {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),
    login,
    register,
    logout,
    fetchUser,
    isAuthenticated: user,
  }
})
