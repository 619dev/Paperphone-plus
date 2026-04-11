import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force CJS version of libsodium to avoid broken ESM import
      'libsodium-wrappers-sumo': 'libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js',
    },
  },
  optimizeDeps: {
    include: ['libsodium-wrappers-sumo'],
  },
  build: {
    commonjsOptions: {
      include: [/libsodium/],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
})
