import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    plugins: [react()],
    css: {
      postcss: resolve(__dirname, 'postcss.config.js')
    },
    server: {
      proxy: {
        // Proxy all /api/* HTTP calls to the NestJS server — avoids cross-origin
        // issues in Electron's renderer (ERR_NETWORK on localhost cross-origin XHR).
        '/api': {
          target: 'http://localhost:4233',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        // Proxy socket.io WebSocket connections for the AI and realtime gateways.
        '/socket.io': {
          target: 'http://localhost:4233',
          changeOrigin: true,
          ws: true
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@bob/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
        'lottie-react': resolve(__dirname, '../../node_modules/lottie-react')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html')
        }
      }
    }
  }
})
