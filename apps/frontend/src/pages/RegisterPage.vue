<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { registerFormSchema } from '../validation/forms'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const clientError = ref(null)

async function handleRegister() {
  clientError.value = null
  const validationResult = registerFormSchema.safeParse({
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  })

  if (!validationResult.success) {
    clientError.value = validationResult.error.issues[0]?.message || 'Registration information is invalid.'
    return
  }

  const success = await authStore.register({
    email: validationResult.data.email,
    password: validationResult.data.password,
    confirmPassword: validationResult.data.confirmPassword,
  })

  if (success) {
    await router.push('/')
  }
}
</script>

<template>
  <div class="auth-layout">
    <div class="auth-card">
      <h1 class="auth-title">Create account</h1>
      <p class="auth-subtitle">Start your journey with us.</p>

      <form @submit.prevent="handleRegister">
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
              minlength="6"
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
        <div class="auth-form-group">
          <label class="auth-label" for="confirmPassword">Confirm password</label>
          <div class="auth-input-wrapper">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              class="auth-input auth-input--with-toggle"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              minlength="6"
            />
            <button
              type="button"
              class="auth-password-toggle"
              :aria-label="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <span class="material-symbols-outlined">
                {{ showConfirmPassword ? 'visibility_off' : 'visibility' }}
              </span>
            </button>
          </div>
        </div>

        <div v-if="clientError || authStore.error" class="auth-error-message">
          {{ clientError || authStore.error }}
        </div>

        <button :disabled="authStore.loading" class="auth-submit-button" type="submit">
          <span v-if="authStore.loading">Processing...</span>
          <span v-else>Sign up</span>
        </button>
      </form>

      <div class="auth-footer">
        Already have an account?
        <RouterLink to="/login" class="auth-link">Sign in</RouterLink>
      </div>
    </div>
  </div>
</template>
