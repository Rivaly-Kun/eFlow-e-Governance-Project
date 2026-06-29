import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/admin': {
          target: 'http://localhost:8322',
          changeOrigin: true,
          rewrite: (p) => `/controlpanelEflow${p}`,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = process.env.VITE_BACKEND_API_KEY ?? ''
              const existingAuth = proxyReq.getHeader('authorization')
              if (!existingAuth && key) {
                proxyReq.setHeader('Authorization', `Bearer ${key}`)
              }
            })
          },
        },
        '/api/authkey': {
          target: 'http://localhost:8322',
          changeOrigin: true,
          rewrite: (p) => `/controlpanelEflow${p}`,
        },
        '/api': {
          target: 'http://localhost:8321',
          changeOrigin: true,
          rewrite: (p) => `/controlpanelEflow${p}`,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = process.env.VITE_BACKEND_API_KEY ?? ''
              const existingAuth = proxyReq.getHeader('authorization')
              if (!existingAuth && key) {
                proxyReq.setHeader('Authorization', `Bearer ${key}`)
              }
            })
          },
        },
      },
    },
  }
})
