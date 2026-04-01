import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyPrefix = env.VITE_API_PROXY_PREFIX || '/api'
  const proxyTarget = env.VITE_API_PROXY_TARGET

  return {
    plugins: [vue()],
    server: proxyTarget
      ? {
          proxy: {
            [proxyPrefix]: {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(new RegExp(`^${proxyPrefix}`), ''),
            },
          },
        }
      : undefined,
  }
})
