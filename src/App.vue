<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'

const route = useRoute()

// تشخیص مسیرهای ادمین و کاربر (با پشتیبانی از پیشوند زبان مثل /fa/user)
const isAdminRoute = computed(() => route.path.includes('/admin'))
const isUserRoute = computed(() => route.path.includes('/user'))

// نوبار و فوتر فقط در صفحات عمومی نمایش داده شوند
const showLayout = computed(() => !isAdminRoute.value && !isUserRoute.value)
</script>

<template>
  <div id="app" :class="{ 'has-navbar': showLayout }">
    <Navbar v-if="showLayout" />

    <main class="page-content">
      <router-view v-slot="{ Component }" :key="$route.fullPath">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <Footer v-if="showLayout" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #050814;
  font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex-shrink: 0;
  width: 100%;
}

.has-navbar {
  padding-top: 80px;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.4s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
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