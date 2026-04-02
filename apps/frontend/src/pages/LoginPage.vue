<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

async function handleLogin() {
  const success = await authStore.login({
    email: email.value,
    password: password.value,
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
      <h1 class="auth-title">Đăng nhập</h1>
      <p class="auth-subtitle">Chào mừng trở lại. Vui lòng nhập thông tin của bạn.</p>

      <form @submit.prevent="handleLogin">
        <div class="auth-form-group">
          <label class="auth-label" for="email">Email</label>
          <input id="email" v-model="email" class="auth-input" type="email" placeholder="email@example.com" required />
        </div>
        <div class="auth-form-group">
          <label class="auth-label" for="password">Mật khẩu</label>
          <input id="password" v-model="password" class="auth-input" type="password" placeholder="••••••••" required />
        </div>

        <div v-if="authStore.error" class="auth-error-message">
          {{ authStore.error }}
        </div>

        <button :disabled="authStore.loading" class="auth-submit-button" type="submit">
          <span v-if="authStore.loading">Đang xử lý...</span>
          <span v-else>Đăng nhập</span>
        </button>
      </form>

      <div class="auth-footer">
        Chưa có tài khoản?
        <RouterLink to="/register" class="auth-link">Đăng ký ngay</RouterLink>
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
