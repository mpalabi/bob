import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@bob/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      'lottie-react': resolve(__dirname, '../../node_modules/lottie-react')
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true
  }
})
