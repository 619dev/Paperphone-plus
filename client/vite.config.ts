import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Fix libsodium-wrappers-sumo broken ESM import
    {
      name: 'fix-libsodium-esm',
      resolveId(source, importer) {
        if (
          source === './libsodium-sumo.mjs' &&
          importer &&
          importer.includes('libsodium-wrappers-sumo')
        ) {
          // Redirect to the actual file in the libsodium-sumo package
          return path.resolve(
            __dirname,
            'node_modules/libsodium-sumo/dist/modules-sumo/libsodium-sumo.js'
          )
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
