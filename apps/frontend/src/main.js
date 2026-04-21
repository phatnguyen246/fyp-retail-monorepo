import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import clickOutside from './directives/click-outside'
import { useAuthStore } from './store/auth'
import { configureHttpSessionHandling } from './services/http'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/noto-serif/400.css'
import '@fontsource/noto-serif/400-italic.css'
import '@fontsource/noto-serif/700.css'
import '@fontsource/noto-serif/700-italic.css'
import 'material-symbols/outlined.css'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
const authStore = useAuthStore(pinia)

configureHttpSessionHandling({
  authStore,
  router,
})

app.directive('click-outside', clickOutside)
app.use(pinia)
app.use(router)
app.mount('#app')
