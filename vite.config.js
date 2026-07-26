import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'vue-i18n'],
  },

  build: {
    target: 'es2020',
    cssMinify: true,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,

    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',

        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue-i18n') || id.includes('@intlify')) return 'vendor-i18n'
            if (id.includes('axios')) return 'vendor-http'
            if (
              id.includes('/vue-router/') ||
              id.includes('/pinia/') ||
              id.includes('/@vue/') ||
              id.includes('/vue/dist/')
            ) return 'vendor-vue'
            return 'vendor'
          }
          if (id.includes('/src/views/admin/')) return 'panel-admin'
          if (id.includes('/src/views/user/')) return 'panel-user'
        },
      },
    },
  },
})
