<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { loginFormSchema } from '../validation/forms'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const clientError = ref('')
const isAdminEntry = computed(() => route.name === 'admin-login')
const title = computed(() => (isAdminEntry.value ? 'Admin sign in' : 'Sign in'))
const subtitle = computed(() =>
  isAdminEntry.value
    ? 'Use an admin account to access the control area.'
    : 'Welcome back. Please enter your credentials.',
)
const registerTarget = computed(() => (isAdminEntry.value ? '/login' : '/register'))
const registerLabel = computed(() => (isAdminEntry.value ? 'Customer sign in' : 'Sign up now'))

async function handleLogin() {
  clientError.value = ''
  const validationResult = loginFormSchema.safeParse({
    email: email.value,
    password: password.value,
  })

  if (!validationResult.success) {
    clientError.value = validationResult.error.issues[0]?.message || 'Login information is invalid.'
    return
  }

  const success = await authStore.login({
    email: validationResult.data.email,
    password: validationResult.data.password,
  })

  if (success) {
    const redirectTarget = typeof route.query.redirect === 'string' ? route.query.redirect : null

    if (redirectTarget) {
      await router.push(redirectTarget)
      return
    }

    if (authStore.user?.role === 'admin') {
      await router.push({ name: 'admin-overview' })
      return
    }

    await router.push({ name: 'catalog-products' })
  }
}
</script>

<template>
  <div class="auth-layout">
    <div class="auth-card">
      <h1 class="auth-title">{{ title }}</h1>
      <p class="auth-subtitle">{{ subtitle }}</p>

      <form @submit.prevent="handleLogin">
        <div class="auth-form-group">
          <label class="auth-label" for="email">Email</label>
          <input id="email" v-model="email" class="auth-input" type="email" placeholder="email@example.com" required />
        </div>
        <div class="auth-form-group">
          <label class="auth-label" for="password">Password</label>
          <div class="auth-input-wrapper">
            <input
              id="password"
              v-model="password"
              class="auth-input auth-input--with-toggle"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              class="auth-password-toggle"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <span class="material-symbols-outlined">
                {{ showPassword ? 'visibility_off' : 'visibility' }}
              </span>
            </button>
          </div>
        </div>

        <div v-if="clientError || authStore.error" class="auth-error-message">
          {{ clientError || authStore.error }}
        </div>

        <button :disabled="authStore.loading" class="auth-submit-button" type="submit">
          <span v-if="authStore.loading">Processing...</span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <div class="auth-footer">
        {{ isAdminEntry ? 'Need customer storefront flow?' : 'No account yet?' }}
        <RouterLink :to="registerTarget" class="auth-link">{{ registerLabel }}</RouterLink>
      </div>
    </div>
  </div>
</template>

<style>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--catalog-surface-muted);
}

.auth-card {
  width: 100%;
  max-width: 28rem;
  padding: 3rem 2.5rem;
  background-color: var(--catalog-surface);
  border: 1px solid var(--catalog-border-soft);
  border-radius: 0.5rem;
}

.auth-title {
  margin: 0 0 0.5rem;
  font-family: 'Noto Serif', serif;
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  color: var(--catalog-text);
}

.auth-subtitle {
  margin: 0 0 2.5rem;
  text-align: center;
  color: var(--catalog-text-muted);
}

.auth-form-group {
  margin-bottom: 1.5rem;
}

.auth-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--catalog-text);
}

.auth-input {
  display: block;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid var(--catalog-border-soft);
  border-radius: 0.375rem;
  background-color: var(--catalog-surface-soft);
  color: var(--catalog-text);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.auth-input-wrapper {
  position: relative;
}

.auth-input--with-toggle {
  padding-right: 3rem;
}

.auth-password-toggle {
  position: absolute;
  top: 50%;
  right: 0.65rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--catalog-text-soft);
  cursor: pointer;
  transition: color 200ms ease, background-color 200ms ease;
}

.auth-password-toggle:hover {
  color: var(--catalog-primary-deep);
  background-color: rgba(139, 117, 0, 0.08);
}

.auth-password-toggle:focus-visible {
  outline: 2px solid rgba(139, 117, 0, 0.55);
  outline-offset: 1px;
}

.auth-input:focus {
  outline: none;
  border-color: var(--catalog-primary);
  box-shadow: 0 0 0 3px rgba(139, 117, 0, 0.15);
}

.auth-error-message {
    background-color: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    padding: 0.85rem 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    text-align: center;
}

.auth-submit-button {
  width: 100%;
  border: none;
  padding: 0.95rem 1.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  transition: transform 200ms ease, opacity 200ms ease, background-color 200ms ease;
  background: var(--catalog-primary);
  color: white;
  border-radius: 0.375rem;
  cursor: pointer;
}

.auth-submit-button:hover:not(:disabled) {
  opacity: 0.92;
}

.auth-submit-button:active:not(:disabled) {
  transform: scale(0.985);
}

.auth-submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.auth-footer {
  margin-top: 2rem;
  font-size: 0.875rem;
  text-align: center;
  color: var(--catalog-text-muted);
}

.auth-link {
  font-weight: 500;
  color: var(--catalog-primary);
  transition: opacity 200ms ease;
}

.auth-link:hover {
  opacity: 0.8;
}
</style>
