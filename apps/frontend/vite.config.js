import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyPrefix = env.VITE_API_PROXY_PREFIX || '/api'
  const proxyTarget = env.VITE_API_PROXY_TARGET
  const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url))

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        axios: fileURLToPath(new URL('./node_modules/axios/index.js', import.meta.url)),
        '@packages/location-client': fileURLToPath(
          new URL('../../packages/location-client/src/index.ts', import.meta.url),
        ),
      },
    },
    server: proxyTarget
      ? {
          allowedHosts: ['frontend'],
          fs: {
            allow: [workspaceRoot],
          },
          proxy: {
            [proxyPrefix]: {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(new RegExp(`^${proxyPrefix}`), ''),
            },
          },
        }
      : {
          allowedHosts: ['frontend'],
          fs: {
            allow: [workspaceRoot],
          },
        },
  }
})
