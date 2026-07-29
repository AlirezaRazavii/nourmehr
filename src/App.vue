<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'

const Footer = defineAsyncComponent(() => import('./components/Footer.vue'))

const route = useRoute()

const isAdminRoute = computed(() => /(^|\/)admin(\/|$)/.test(route.path))
const isUserRoute = computed(() => /(^|\/)user(\/|$)/.test(route.path))

const showLayout = computed(() => !isAdminRoute.value && !isUserRoute.value)

const footerReady = ref(false)

onMounted(() => {
  const enable = () => { footerReady.value = true }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(enable, { timeout: 2500 })
  } else {
    setTimeout(enable, 1200)
  }
})

const viewKey = computed(() =>
  route.name === 'Search' ? route.fullPath : route.path
)
</script>

<template>
  <div id="app" :class="{ 'has-navbar': showLayout }">
    <Navbar v-if="showLayout" />

    <main class="page-content">
      <router-view v-slot="{ Component }" :key="viewKey">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <Footer v-if="showLayout && footerReady" />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex-shrink: 0;
  width: 100%;
}

.has-navbar { padding-top: var(--nav-total, 112px); }

.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active { transition: none; }
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #0a0d14;
}

::-webkit-scrollbar-thumb {
  background: rgba(197, 160, 89, 0.4);
  border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(197, 160, 89, 0.7);
}

::selection {
  background: rgba(197, 160, 89, 0.4);
  color: #fff;
}
</style>
