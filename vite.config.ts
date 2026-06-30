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

// Populated once by authKeyPlugin when the dev server starts listening.
// Used synchronously in proxy handlers (http-proxy does NOT await async handlers).
let _proxyAuthKey: string | null = null;

/**
 * Vite plugin that fetches the LLM auth key from the eFlow control-panel
 * server once the dev server is listening, then caches it for the proxy.
 */
function authKeyPlugin() {
  return {
    name: 'auth-key-prefetch',
    configureServer(server: import('vite').ViteDevServer) {
      server.httpServer?.once('listening', () => {
        fetch('http://localhost:8322/controlpanelEflow/api/authkey')
          .then((res) => {
            if (!res.ok) throw new Error(`eFlow returned ${res.status}`);
            return res.json();
          })
          .then((data) => {
            _proxyAuthKey = (data.api_key as string).trim();
            console.log('[vite] Auth key loaded from eFlow server ✓');
          })
          .catch((e) => {
            console.warn(
              '[vite] Could not prefetch auth key from eFlow server.',
              'Make sure python server/main.py (port 8322) is running first.',
              e.message,
            );
          });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  Object.assign(process.env, env)

  return {
    plugins: [
      figmaAssetResolver(),
      authKeyPlugin(),
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
            // Synchronous handler — http-proxy ignores async/await here
            proxy.on('proxyReq', (proxyReq) => {
              const existingAuth = proxyReq.getHeader('authorization');
              if (!existingAuth && _proxyAuthKey) {
                proxyReq.setHeader('Authorization', `Bearer ${_proxyAuthKey}`);
              }
            });
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
            // Synchronous handler — http-proxy ignores async/await here
            proxy.on('proxyReq', (proxyReq) => {
              const existingAuth = proxyReq.getHeader('authorization');
              if (!existingAuth && _proxyAuthKey) {
                proxyReq.setHeader('Authorization', `Bearer ${_proxyAuthKey}`);
              }
            });
          },
        },
      },
    },
  }
})
