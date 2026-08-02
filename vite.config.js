import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join('; ')

const cspPlugin = () => ({
  name: 'nourmehr-csp',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (!ctx.bundle) return html
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP_DIRECTIVES}" />`
      )
    },
  },
})


export default defineConfig(({ command }) => ({
  plugins: [vue(), cspPlugin()],

  define: {
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
    __INTLIFY_JIT_COMPILATION__: true,
  },

  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    warmup: {
      clientFiles: [
        './src/main.js',
        './src/App.vue',
        './src/router.js',
        './src/i18n.js',
        './src/components/Navbar.vue',
        './src/views/Home.vue',
      ],
    },
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

  esbuild: {
    drop: command === 'build' ? ['debugger'] : [],
    legalComments: 'none',
  },

  build: {
    target: 'es2020',
    cssMinify: true,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
    modulePreload: { polyfill: false },

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
          if (id.includes('/src/assests/locales/fa.json')) return 'locale-fa'
          if (id.includes('/src/assests/locales/en.json')) return 'locale-en'
          if (id.includes('/src/views/admin/')) return 'panel-admin'
          if (id.includes('/src/views/user/')) return 'panel-user'
        },
      },
    },
  },
}))
