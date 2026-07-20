<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../../stores/auth'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuth()
const { isAuthenticated, userName, user } = storeToRefs(authStore)
const { logout } = authStore

const isAdmin = computed(() => user.value?.role === 'admin')

// سایدبار در موبایل بسته است، در دسکتاپ باز است
const isSidebarOpen = ref(false)

const menuItems = computed(() => [
  { name: 'UserDashboard', label: t('user_nav_dashboard'), icon: '📊' },
  { name: 'UserOrders', label: t('user_nav_orders'), icon: '📦' },
  { name: 'UserWishlist', label: t('user_nav_wishlist'), icon: '❤️' },
  { name: 'UserAddresses', label: t('user_nav_addresses'), icon: '📍' },
  { name: 'UserTickets', label: t('user_nav_tickets'), icon: '💬' },
  { name: 'UserProfile', label: t('user_nav_profile'), icon: '👤' }
])

const currentPage = computed(() => {
  const item = menuItems.value.find(item => route.name === item.name)
  return item ? item.label : t('user_nav_dashboard')
})

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebarOnMobile = () => {
  isSidebarOpen.value = false
}

const handleLogout = () => {
  logout()
  router.push({ name: 'Login', params: { lang: locale.value } })
}
</script>

<template>
  <div class="user-layout">
    <!-- بک‌دراپ موبایل -->
    <Transition name="fade">
      <div v-if="isSidebarOpen" class="sidebar-overlay" @click="toggleSidebar"></div>
    </Transition>

    <!-- سایدبار -->
    <aside class="sidebar" :class="{ open: isSidebarOpen }">
      <div class="sidebar-header">
        <router-link :to="{ name: 'Home', params: { lang: locale } }" class="logo" @click="closeSidebarOnMobile">
          <span class="logo-icon">◆</span>
          <span class="logo-text">NOURMEHR</span>
        </router-link>
      </div>

      <!-- اطلاعات کاربر -->
      <div class="user-info">
        <div class="user-avatar">
          <span>{{ (userName || '?').charAt(0) }}</span>
        </div>
        <div class="user-details">
          <span class="user-name">{{ userName }}</span>
          <span class="user-phone">{{ user?.phone }}</span>
        </div>
      </div>

      <!-- منو -->
      <nav class="sidebar-nav">
        <router-link 
          v-for="item in menuItems" 
          :key="item.name"
          :to="{ name: item.name, params: { lang: locale } }"
          class="nav-item"
          :class="{ active: route.name === item.name }"
          @click="closeSidebarOnMobile"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- فوتر سایدبار -->
      <div class="sidebar-footer">
        <router-link :to="{ name: 'Home', params: { lang: locale } }" class="footer-link" @click="closeSidebarOnMobile">
          <span class="nav-icon">🏠</span>
          <span class="nav-text">{{ $t('user_back_to_site') }}</span>
        </router-link>
        <button class="logout-btn" @click="handleLogout">
          <span class="nav-icon">🚪</span>
          <span class="nav-text">{{ $t('user_logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- محتوای اصلی -->
    <main class="main-content">
      <!-- هدر -->
      <header class="content-header">
        <div class="header-right">
          <button class="mobile-menu-btn" @click="toggleSidebar">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M3 12h18M3 6h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <h1 class="page-title">{{ currentPage }}</h1>
        </div>
        
        <div class="header-left">
          <router-link v-if="isAdmin" to="/admin" class="header-icon-btn admin-btn" :title="$t('user_admin_panel')">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </router-link>
          <router-link :to="{ name: 'Cart', params: { lang: locale } }" class="header-icon-btn">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1" fill="currentColor"/>
              <circle cx="20" cy="21" r="1" fill="currentColor"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </router-link>
        </div>
      </header>

      <!-- محتوا -->
      <div class="content-body">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
.user-layout {
  display: flex;
  min-height: 100vh;
  background: #050814;
  color: #fff;
}

/* بک‌دراپ موبایل (در دسکتاپ مخفی است) */
.sidebar-overlay {
  display: none;
}

/* سایدبار */
.sidebar {
  width: 280px;
  background: rgba(5, 8, 20, 0.98);
  border-inline-end: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  inset-inline-start: 0;
  height: 100vh;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; }
.logo-icon { font-size: 1.5rem; color: #facc6b; }
.logo-text { font-size: 1rem; font-weight: 700; letter-spacing: 0.15em; }

.user-info { display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.user-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #c5a059, #8f7032); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; color: #000; flex-shrink: 0; }
.user-details { display: flex; flex-direction: column; overflow: hidden; }
.user-name { font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-phone { font-size: 0.8rem; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; direction: ltr; text-align: start; }

.sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; text-decoration: none; color: rgba(255, 255, 255, 0.75); transition: all 0.2s ease; }
.nav-item:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.nav-item.active { background: linear-gradient(135deg, rgba(197, 160, 89, 0.2), rgba(197, 160, 89, 0.1)); color: #facc6b; border: 1px solid rgba(197, 160, 89, 0.3); }
.nav-icon { font-size: 1.2rem; width: 28px; text-align: center; flex-shrink: 0; }
.nav-text { font-size: 0.9rem; }

.sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 6px; }
.footer-link, .logout-btn { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; text-decoration: none; font-size: 0.85rem; transition: all 0.2s ease; background: transparent; }
.footer-link { color: rgba(255, 255, 255, 0.6); }
.footer-link:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.logout-btn { border: none; color: #ef4444; background: rgba(239, 68, 68, 0.1); cursor: pointer; text-align: start; }
.logout-btn:hover { background: rgba(239, 68, 68, 0.2); }

/* محتوای اصلی */
.main-content { flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
.content-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 30px; background: rgba(5, 8, 20, 0.95); border-bottom: 1px solid rgba(255, 255, 255, 0.08); position: sticky; top: 0; z-index: 50; }
.header-right { display: flex; align-items: center; gap: 16px; }
.mobile-menu-btn { display: none; width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); background: transparent; color: #fff; cursor: pointer; align-items: center; justify-content: center; }
.page-title { font-size: 1.4rem; margin: 0; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-icon-btn { width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.8); color: #fff; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s ease; }
.header-icon-btn:hover { background: rgba(197, 160, 89, 0.2); border-color: rgba(197, 160, 89, 0.4); color: #facc6b; }
.admin-btn { border-color: rgba(197, 160, 89, 0.5); color: #facc6b; background: rgba(197, 160, 89, 0.08); }

.content-body { flex: 1; padding: 30px; background: radial-gradient(circle at top left, rgba(197, 160, 89, 0.05), transparent 50%); }

.page-fade-enter-active, .page-fade-leave-active { transition: all 0.3s ease; }
.page-fade-enter-from, .page-fade-leave-to { opacity: 0; transform: translateY(10px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* استایل‌های دسکتاپ */
@media (min-width: 1025px) {
  .sidebar { transform: translateX(0) !important; }
  .main-content { margin-inline-start: 280px; }
  .mobile-menu-btn { display: none !important; }
}

/* استایل‌های موبایل */
@media (max-width: 1024px) {
  .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 99; backdrop-filter: blur(4px); }
  .sidebar { transform: translateX(-100%); }
  [dir="rtl"] .sidebar { transform: translateX(100%); }
  .sidebar.open { transform: translateX(0) !important; }
  .main-content { margin-inline-start: 0; }
  .mobile-menu-btn { display: flex; }
}

@media (max-width: 768px) {
  .content-header { padding: 16px 20px; }
  .content-body { padding: 20px; }
  .page-title { font-size: 1.2rem; }
}
</style>