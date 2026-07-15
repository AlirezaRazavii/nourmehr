<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuth } from '../../stores/auth'
import { useNotifications } from '../../stores/notifications'

const route = useRoute()
const authStore = useAuth()
const notifStore = useNotifications()
const { userName, user } = storeToRefs(authStore)
const { notifications, unreadCount } = storeToRefs(notifStore)
const { logout } = authStore

const isSuperAdmin = computed(() => user.value?.isSuperAdmin === true)
const myPermissions = computed(() => user.value?.permissions || [])

onMounted(() => {
  notifStore.fetchNotifications()
  // آپدیت دوره‌ای اعلان‌ها هر ۱ دقیقه
  setInterval(() => {
    notifStore.fetchNotifications()
  }, 60000)
})

const formatTime = (date) => {
  if (!date) return ''
  const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' })
  const diff = new Date(date).getTime() - Date.now()
  const diffMinutes = Math.round(diff / (1000 * 60))
  const diffHours = Math.round(diff / (1000 * 60 * 60))
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24))

  if (Math.abs(diffMinutes) < 1) return 'همین الان'
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute')
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  return rtf.format(diffDays, 'day')
}

const handleNotifClick = (notif) => {
  if (!notif.isRead) {
    notifStore.markAsRead(notif._id)
  }
}


const sidebarOpen = ref(window.innerWidth > 1024)
const userDropdownOpen = ref(false)
const notifOpen = ref(false)
const expandedMenus = ref({})

// بستن dropdown‌ها با کلیک بیرون از آن‌ها
const handleClickOutside = (e) => {
  if (!e.target.closest('.notif-wrapper')) notifOpen.value = false
  if (!e.target.closest('.user-wrapper')) userDropdownOpen.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// تنظیم مجدد sidebar هنگام resize
const handleResize = () => {
  if (window.innerWidth > 1024) sidebarOpen.value = true
  else sidebarOpen.value = false
}
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

const allMenuItems = [
  { path: '/admin/dashboard', name: 'داشبورد', perm: 'dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', children: null },
  { path: '/admin/orders', name: 'سفارشات', perm: 'orders', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', children: [
    { path: '/admin/orders', name: 'همه سفارشات' },
    { path: '/admin/orders?status=pending', name: 'در انتظار' },
    { path: '/admin/orders?status=processing', name: 'در حال پردازش' },
    { path: '/admin/orders?status=shipped', name: 'ارسال شده' },
    { path: '/admin/orders?status=delivered', name: 'تحویل داده شده' },
  ]},
  { path: '/admin/users', name: 'کاربران', perm: 'users', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M23 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z', children: null },
  { path: '/admin/payments', name: 'پرداخت‌ها', perm: 'payments', icon: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z', children: null },
  { path: '/admin/tickets', name: 'تیکت‌ها', perm: 'tickets', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', children: null },
  { path: '/admin/reviews', name: 'مدیریت نظرات', perm: 'reviews', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', children: null },
  { path: '/admin/discounts', name: 'تخفیف‌ها', perm: 'discounts', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', children: null },
  { path: '/admin/products', name: 'محصولات', perm: 'products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', children: [
    { path: '/admin/products', name: 'همه محصولات' },
    { path: '/admin/products?status=out_of_stock', name: 'اتمام موجودی' },
    { path: '/admin/products?status=active', name: 'فعال' },
  ]},
  { path: '/admin/categories', name: 'دسته‌بندی‌ها', perm: 'categories', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', children: null },
  { path: '/admin/collections', name: 'کالکشن‌ها', perm: 'collections', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', children: null },
  { path: '/admin/blogs', name: 'اخبار و مقالات', perm: 'blogs', icon: 'M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z M12 11h6 M12 15h6 M6 11h2 M6 15h2', children: null },
  { path: '/admin/settings', name: 'تنظیمات', perm: 'settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', children: null },
  { path: '/admin/admins', name: 'مدیریت ادمین‌ها', perm: '__super__', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 11l-3 3-1.5-1.5', children: null },
]


const menuItems = computed(() => {
  if (isSuperAdmin.value) {
    // مدیر کل همه را می‌بیند
    return allMenuItems
  }
  return allMenuItems.filter(item => {
    // آیتم مخصوص مدیر کل برای بقیه پنهان است
    if (item.perm === '__super__') return false
    // داشبورد همیشه برای همه ادمین‌ها باز است
    if (item.perm === 'dashboard') return true
    return myPermissions.value.includes(item.perm)
  })
})


const toggleMenu = (idx) => {
  expandedMenus.value[idx] = !expandedMenus.value[idx]
}

const closeSidebarOnMobile = () => {
  if (window.innerWidth <= 1024) sidebarOpen.value = false
}

const handleLogout = async () => {
  await logout()
  window.location.href = '/login'
}
</script>

<template>
  <div class="admin-layout">

    <!-- overlay فقط در موبایل و فقط وقتی sidebar باز است -->
    <Transition name="fade">
      <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>
    </Transition>

    <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" width="28" height="28">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="#c5a059" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="logo-text" v-if="sidebarOpen">NOURMEHR</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <template v-for="(item, idx) in menuItems" :key="item.path">
          <router-link
            v-if="!item.children"
            :to="item.path"
            class="nav-item"
            :class="{ active: route.path === item.path }"
            @click="closeSidebarOnMobile"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="item.icon"/>
            </svg>
            <span class="nav-text" v-if="sidebarOpen">{{ item.name }}</span>
          </router-link>

          <div v-else class="nav-group">
            <button class="nav-item" :class="{ active: route.path.startsWith(item.path), open: expandedMenus[idx] }" @click="toggleMenu(idx)">
              <svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path :d="item.icon"/>
              </svg>
              <span class="nav-text" v-if="sidebarOpen">{{ item.name }}</span>
              <svg v-if="sidebarOpen" class="arrow-icon" :class="{ rotated: expandedMenus[idx] }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
            <Transition name="sub">
              <div v-if="expandedMenus[idx] && sidebarOpen" class="sub-menu">
                <router-link
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="sub-item"
                  :class="{ active: route.path === child.path }"
                  @click="closeSidebarOnMobile"
                >
                  {{ child.name }}
                </router-link>
              </div>
            </Transition>
          </div>
        </template>
      </nav>

      <div class="sidebar-footer">
        <a href="/" class="back-link" v-if="sidebarOpen">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>بازگشت به سایت</span>
        </a>
        <button class="logout-btn" @click="handleLogout">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          <span v-if="sidebarOpen">خروج</span>
        </button>
      </div>
    </aside>

    <div class="main-wrapper" :class="{ expanded: !sidebarOpen }">
      <header class="admin-header">
        <div class="header-left">
          <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <div class="breadcrumb">
            <span class="breadcrumb-parent">پنل مدیریت</span>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">{{ $route.meta.title || 'داشبورد' }}</span>
          </div>
        </div>

        <div class="header-right">
          <div class="notif-wrapper">
            <button class="icon-btn" @click.stop="notifOpen = !notifOpen; userDropdownOpen = false; if(notifOpen) notifStore.markAllAsRead()">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            </button>
            <Transition name="dropdown">
              <div v-if="notifOpen" class="dropdown-panel">
                <div class="dropdown-header">اعلان‌ها</div>
                <div v-if="notifications.length === 0" class="notif-empty">هیچ اعلانی وجود ندارد</div>
                <div class="notif-list">
                  <component
                    :is="notif.link ? 'router-link' : 'div'"
                    :to="notif.link"
                    v-for="notif in notifications"
                    :key="notif._id"
                    class="notif-item"
                    :class="{ unread: !notif.isRead }"
                    @click="handleNotifClick(notif)"
                  >
                    <span class="notif-dot" :class="{
                      red: notif.type === 'order',
                      orange: notif.type === 'ticket',
                      green: notif.type === 'review',
                      blue: notif.type === 'system'
                    }"></span>
                    <div class="notif-text">
                      <span class="notif-title">{{ notif.title }}</span>
                      <span class="notif-message">{{ notif.message }}</span>
                    </div>
                    <span class="notif-time">{{ formatTime(notif.createdAt) }}</span>
                  </component>
                </div>
              </div>
            </Transition>
          </div>

          <div class="user-wrapper">
            <button class="user-btn" @click.stop="userDropdownOpen = !userDropdownOpen; notifOpen = false">
              <div class="user-avatar">{{ (userName || 'A').charAt(0) }}</div>
              <span class="user-name">{{ userName || 'ادمین' }}</span>
              <svg class="arrow-icon" :class="{ rotated: userDropdownOpen }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="userDropdownOpen" class="dropdown-panel">
                <div class="dropdown-header">{{ userName || 'ادمین' }}</div>
                <router-link to="/admin/settings" class="dropdown-item" @click="userDropdownOpen = false">پروفایل مدیریتی</router-link>
                <a href="/" class="dropdown-item" @click="userDropdownOpen = false">مشاهده سایت</a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item logout" @click="handleLogout">خروج</button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}

.admin-layout {
  display: flex;
  min-height: 100vh;
  max-width: 100vw;
  overflow-x: hidden;        /* ✅ جلوگیری از horizontal scroll */
  background: #050814;
  color: #fff;
  direction: rtl;
}

/* ─── Overlay ─── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 900;
}

/* ─── Sidebar ─── */
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: rgba(5, 8, 20, 0.98);
  border-left: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 1000;
  transition: transform 0.3s ease;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar.collapsed {
  transform: translateX(100%);
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.logo { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; overflow: hidden; }
.logo-icon { flex-shrink: 0; }
.logo-text { font-size: 1rem; font-weight: 700; letter-spacing: 0.15em; white-space: nowrap; }

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  background: none;
  width: 100%;
  text-decoration: none;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
}
.nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.nav-item.active { background: linear-gradient(135deg, rgba(197,160,89,0.2), rgba(197,160,89,0.1)); color: #facc6b; border-color: rgba(197,160,89,0.3); }
.nav-item.open { background: rgba(255,255,255,0.06); color: #fff; }

.nav-icon { flex-shrink: 0; }
.nav-text { flex: 1; text-align: right; overflow: hidden; text-overflow: ellipsis; }
.arrow-icon { transition: transform 0.3s ease; flex-shrink: 0; }
.arrow-icon.rotated { transform: rotate(180deg); }

.nav-group { display: flex; flex-direction: column; }
.sub-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: 24px;
  margin-top: 2px;
  margin-bottom: 6px;
  padding-right: 12px;
  border-right: 1px solid rgba(255,255,255,0.1);
}
.sub-item {
  display: block;
  padding: 8px 12px;
  border-radius: 8px;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.sub-item.active { color: #facc6b; background: rgba(197,160,89,0.1); }

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.back-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.back-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: rgba(239,68,68,0.1);
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  white-space: nowrap;
}
.logout-btn:hover { background: rgba(239,68,68,0.2); }

/* ─── Main Wrapper ─── */
.main-wrapper {
  flex: 1;
  min-width: 0;                /* ✅ کلیدی‌ترین fix: جلوگیری از flex overflow */
  width: 0;                    /* ✅ همراه flex:1 باعث می‌شه عرض صحیح باشه */
  margin-right: 260px;
  display: flex;
  flex-direction: column;
  transition: margin-right 0.3s ease;
  min-height: 100vh;
  overflow-x: hidden;          /* ✅ محتوای عریض داخل صفحه نره بیرون */
  background: radial-gradient(circle at top left, rgba(197,160,89,0.03), transparent 50%), #050814;
}
.main-wrapper.expanded {
  margin-right: 0;
}

/* ─── Header ─── */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  min-height: 64px;
  background: rgba(5,8,20,0.95);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;                /* ✅ */
  flex: 1;
  overflow: hidden;
}

.sidebar-toggle {
  display: none;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #fff;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
}
.breadcrumb-parent { overflow: hidden; text-overflow: ellipsis; }
.breadcrumb-current { color: #facc6b; font-weight: 500; overflow: hidden; text-overflow: ellipsis; }

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ─── Notif & User ─── */
.notif-wrapper { position: relative; }
.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.icon-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-wrapper { position: relative; }
.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.user-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }
.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #000;
  flex-shrink: 0;
}
.user-name { font-size: 0.85rem; }

/* ─── Dropdown Panel ─── */
.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  max-width: 280px;
  border-radius: 12px;
  padding: 8px;
  z-index: 1001;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  background: rgba(8, 10, 18, 0.97);
  border: 1px solid rgba(255,255,255,0.08);
}
.dropdown-header {
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: none;
  background: none;
  cursor: pointer;
  text-align: right;
  white-space: nowrap;
}
.dropdown-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
.dropdown-item.logout { color: #ef4444; }
.dropdown-item.logout:hover { background: rgba(239,68,68,0.1); }
.dropdown-divider { height: 1px; margin: 6px 0; background: rgba(255,255,255,0.06); }

.notif-list {
  max-height: 350px;
  overflow-y: auto;
}
.notif-list::-webkit-scrollbar { width: 4px; }
.notif-list::-webkit-scrollbar-thumb { background: rgba(197,160,89,0.3); border-radius: 4px; }

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.85);
  border-radius: 8px;
  transition: background 0.2s ease;
  text-decoration: none;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.notif-item:last-child { border-bottom: none; }
.notif-item.unread { background: rgba(255,255,255,0.06); }
.notif-item:hover { background: rgba(255,255,255,0.1); }
.notif-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.notif-dot.red { background: #ef4444; }
.notif-dot.orange { background: #f59e0b; }
.notif-dot.green { background: #22c55e; }
.notif-dot.blue { background: #3b82f6; }

.notif-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
}
.notif-title { font-weight: 600; color: #fff; }
.notif-message { font-size: 0.75rem; color: rgba(255,255,255,0.6); line-height: 1.4; }

.notif-time { margin-top: 2px; font-size: 0.7rem; color: rgba(255,255,255,0.4); white-space: nowrap; flex-shrink: 0; }
.notif-empty { padding: 16px; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.85rem; }

/* ─── Content ─── */
.content {
  flex: 1;
  padding: 24px;
  min-height: calc(100vh - 64px);
  overflow-x: hidden;          /* ✅ */
}

/* ─── Animations ─── */
.page-enter-active, .page-leave-active { transition: all 0.25s ease; }
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to { opacity: 0; transform: translateY(-8px); }
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }
.sub-enter-active, .sub-leave-active { transition: all 0.2s ease; }
.sub-enter-from, .sub-leave-to { opacity: 0; transform: translateY(-4px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ─── Tablet (≤ 1024px) ─── */
@media (max-width: 1024px) {
  .sidebar-overlay { display: block; }   /* ✅ overlay فعال */
  .sidebar-toggle { display: flex; }

  .main-wrapper {
    margin-right: 0 !important;           /* ✅ هیچ margin در موبایل */
    width: 100%;
  }
}

/* ─── Mobile (≤ 768px) ─── */
@media (max-width: 768px) {
  .content { padding: 12px; }
  .admin-header { padding: 0 12px; height: 56px; min-height: 56px; }
  .user-name { display: none; }

  /* dropdown تمام‌عرض در موبایل */
  .dropdown-panel {
    position: fixed;
    top: 60px;
    left: 8px;
    right: 8px;
    max-width: none;
    min-width: unset;
  }
}

/* ─── Small Mobile (≤ 480px) ─── */
@media (max-width: 480px) {
  .breadcrumb-parent,
  .breadcrumb-sep { display: none; }      /* فقط عنوان صفحه نشان داده می‌شه */
}
</style>