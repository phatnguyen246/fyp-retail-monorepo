<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const clientError = ref(null)

async function handleRegister() {
  clientError.value = null
  if (password.value !== confirmPassword.value) {
    clientError.value = 'Mật khẩu không khớp.'
    return
  }

  const success = await authStore.register({
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  })

  if (success) {
    await router.push('/')
  }
}
</script>

<template>
  <div class="auth-layout">
    <div class="auth-card">
      <h1 class="auth-title">Tạo tài khoản</h1>
      <p class="auth-subtitle">Bắt đầu hành trình của bạn với chúng tôi.</p>

      <form @submit.prevent="handleRegister">
        <div class="auth-form-group">
          <label class="auth-label" for="email">Email</label>
          <input id="email" v-model="email" class="auth-input" type="email" placeholder="email@example.com" required />
        </div>
        <div class="auth-form-group">
          <label class="auth-label" for="password">Mật khẩu</label>
          <input id="password" v-model="password" class="auth-input" type="password" placeholder="••••••••" required minlength="6"/>
        </div>
        <div class="auth-form-group">
          <label class="auth-label" for="confirmPassword">Xác nhận mật khẩu</label>
          <input id="confirmPassword" v-model="confirmPassword" class="auth-input" type="password" placeholder="••••••••" required minlength="6"/>
        </div>

        <div v-if="clientError || authStore.error" class="auth-error-message">
          {{ clientError || authStore.error }}
        </div>

        <button :disabled="authStore.loading" class="auth-submit-button" type="submit">
          <span v-if="authStore.loading">Đang xử lý...</span>
          <span v-else>Đăng ký</span>
        </button>
      </form>

      <div class="auth-footer">
        Đã có tài khoản?
        <RouterLink to="/login" class="auth-link">Đăng nhập</RouterLink>
      </div>
    </div>
  </div>
</template>
