<template>
  <header class="navbar-wrapper" :class="{ 'navbar-scrolled': isScrolled }">
    <nav class="navbar" :class="{ 'menu-open': mobileMenuOpen }">

      <!-- Logo -->
      <router-link :to="{ name: 'Home', params: { lang: locale } }" class="brand">
        <div class="brand-mark">
          <img :src="logoImg" alt="Noor Mehr Logo" class="brand-logo" width="45" height="45" />
        </div>
        <div class="brand-text">
          <span class="brand-name">{{ $t('brand_name') }}</span>
          <span class="brand-tagline">{{ $t('brand_tagline') }}</span>
        </div>
      </router-link>

      <!-- Desktop Navigation -->
      <div class="nav-desktop">
        <router-link :to="{ name: 'Home', params: { lang: locale } }" class="nav-link">
          <span>{{ $t('nav_home') }}</span><span class="nav-underline"></span>
        </router-link>

        <router-link :to="{ name: 'Products', params: { lang: locale } }" class="nav-link">
          <span>{{ $t('nav_products') }}</span><span class="nav-underline"></span>
        </router-link>

        <router-link :to="{ name: 'Discounts', params: { lang: locale } }" class="nav-link">
          <span>{{ $t('nav_discounts') }}</span><span class="nav-underline"></span>
        </router-link>

        <!-- Desktop Dropdown -->
        <div
          class="nav-dropdown"
          @mouseenter="dropdownOpen = true"
          @mouseleave="dropdownOpen = false"
          @focusout="onDropdownFocusOut"
        >
        <button
          class="nav-link dropdown-trigger"
          :class="{ active: dropdownOpen }"
          type="button"
          aria-haspopup="true"
          :aria-expanded="dropdownOpen ? 'true' : 'false'"
          @click.stop="dropdownOpen = !dropdownOpen"
        >

            <span>{{ $t('nav_categories') }}</span>
            <svg class="dropdown-arrow" :class="{ rotated: dropdownOpen }" viewBox="0 0 24 24" width="14" height="14">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="nav-underline"></span>
          </button>

          <Transition name="dropdown">
            <div v-if="dropdownOpen" class="dropdown-menu">
              <div class="dropdown-header">
                <span class="dropdown-title">{{ $t('nav_categories_title') }}</span>
              </div>

              <div v-if="categoriesLoading" class="dropdown-loading">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>

              <div v-else-if="categoriesError" class="dropdown-error">
                <span>{{ $t('error_loading') }}</span>
                <button @click="fetchCategories" class="retry-btn">{{ $t('retry') }}</button>
              </div>

              <div v-else class="dropdown-grid">
                <router-link
                  :to="{ name: 'Products', params: { lang: locale } }"
                  class="dropdown-item all-products"
                  @click="dropdownOpen = false"
                >
                  <span class="item-icon">🛍️</span>
                  <div class="item-content">
                    <span class="item-title">{{ $t('nav_all_products') }}</span>
                    <span class="item-desc">{{ $t('nav_all_products_desc') }}</span>
                  </div>
                </router-link>

                <div class="dropdown-divider"></div>

                <router-link
                  v-for="cat in categories"
                  :key="cat._id"
                  :to="{ name: 'Products', params: { lang: locale }, query: { category: cat.slug } }"
                  class="dropdown-item"
                  @click="dropdownOpen = false"
                >
                  <span class="item-icon">{{ cat.icon || '◆' }}</span>
                  <div class="item-content">
                    <span class="item-title">{{ getLocalizedText(cat.name) }}</span>
                    <span class="item-desc">{{ getLocalizedText(cat.description) }}</span>
                  </div>
                </router-link>

                <div v-if="categories.length === 0" class="dropdown-empty">
                  {{ $t('no_categories') }}
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <router-link :to="{ name: 'News', params: { lang: locale } }" class="nav-link">
          <span>{{ $t('nav_news') }}</span><span class="nav-underline"></span>
        </router-link>

        <router-link :to="{ name: 'About', params: { lang: locale } }" class="nav-link">
          <span>{{ $t('nav_about') }}</span><span class="nav-underline"></span>
        </router-link>

        <router-link :to="{ name: 'Contact', params: { lang: locale } }" class="nav-link">
          <span>{{ $t('nav_contact') }}</span><span class="nav-underline"></span>
        </router-link>
      </div>

      <!-- Right Actions -->
      <div class="nav-right">
        <button class="lang-btn" @click="toggleLanguage">
          {{ locale === 'fa' ? 'EN' : 'FA' }}
        </button>

       <router-link
          v-if="isLoggedIn"
          :to="{ name: 'UserWishlist', params: { lang: locale } }"
          class="wishlist-nav-btn"
          aria-label="Wishlist"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span v-if="wishlist.totalItems > 0" class="wishlist-nav-badge">{{ wishlist.totalItems }}</span>
        </router-link>

        <div class="cart-wrapper">
          <router-link :to="{ name: 'Cart', params: { lang: locale } }" class="cart-btn" @click="closeMiniCart" aria-label="Cart">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <circle cx="9" cy="21" r="1" fill="currentColor"/>
              <circle cx="20" cy="21" r="1" fill="currentColor"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span v-if="totalItems > 0" class="cart-badge">{{ totalItems }}</span>
          </router-link>

          <Transition name="mini-cart">
            <div v-if="state.isOpen && cartItems.length > 0" class="mini-cart">
              <div class="mini-cart-header">
                <span>{{ $t('cart_title') }}</span>
                <span class="mini-cart-count">{{ totalItems }} {{ $t('cart_items_count') }}</span>
              </div>
              <div class="mini-cart-items">
                <div v-for="item in cartItems.slice(0, 3)" :key="item.productId" class="mini-cart-item">
                  <img :src="item.product.image" :alt="getLocalizedText(item.product.name)" />
                  <div class="mini-cart-item-info">
                    <span class="mini-cart-item-name">{{ getLocalizedText(item.product.name) }}</span>
                    <span class="mini-cart-item-price">{{ item.quantity }} × {{ item.product.priceFormatted }}</span>
                  </div>
                </div>
              </div>
              <div class="mini-cart-footer">
                <router-link :to="{ name: 'Cart', params: { lang: locale } }" class="mini-cart-btn" @click="closeMiniCart">{{ $t('cart_view') }}</router-link>
              </div>
            </div>
          </Transition>
        </div>

        <template v-if="isLoggedIn">
          <div class="user-wrapper desktop-only" @mouseenter="userMenuOpen = true" @mouseleave="userMenuOpen = false">
            <button class="user-btn" :class="{ active: userMenuOpen }">
              <span class="user-avatar">{{ userInitial }}</span>
              <span class="user-name">{{ userName }}</span>
            </button>
            <Transition name="dropdown">
              <div v-if="userMenuOpen" class="user-menu">
                <router-link :to="{ name: 'UserDashboard', params: { lang: locale } }" class="user-menu-item" @click="userMenuOpen = false">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  <span>{{ $t('user_dashboard') }}</span>
                </router-link>
                <router-link :to="{ name: 'UserOrders', params: { lang: locale } }" class="user-menu-item" @click="userMenuOpen = false">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                  <span>{{ $t('user_orders') }}</span>
                </router-link>
                <router-link :to="{ name: 'UserProfile', params: { lang: locale } }" class="user-menu-item" @click="userMenuOpen = false">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>{{ $t('user_profile') }}</span>
                </router-link>
                <button class="user-menu-item logout" @click="handleLogout">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>{{ $t('logout') }}</span>
                </button>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <router-link :to="{ name: 'Login', params: { lang: locale } }" class="login-btn desktop-only">
            <span class="login-text">{{ $t('login') }}</span>
          </router-link>
        </template>

        <button class="mobile-toggle" @click="toggleMobile" aria-label="Menu">
          <div class="hamburger" :class="{ open: mobileMenuOpen }">
            <span></span><span></span><span></span>
          </div>
        </button>
      </div>
    </nav>

    <!-- Mobile Menu Drawer -->
    <div class="mobile-menu" :class="{ 'is-open': mobileMenuOpen }">
      <div class="mobile-menu-content">
        <div class="mobile-header">
          <span class="mobile-title">{{ $t('mobile_menu_title') }}</span>
          <button @click="closeMobile" class="mobile-close-btn" aria-label="Close">✕</button>
        </div>

        <div class="mobile-links">
          <router-link :to="{ name: 'Home', params: { lang: locale } }" class="mobile-link" @click="closeMobile">{{ $t('nav_home') }}</router-link>
          <router-link :to="{ name: 'Products', params: { lang: locale } }" class="mobile-link" @click="closeMobile">{{ $t('nav_products') }}</router-link>
          <router-link :to="{ name: 'Discounts', params: { lang: locale } }" class="mobile-link" @click="closeMobile">{{ $t('nav_discounts') }}</router-link>

          <div class="mobile-dropdown">
            <button class="mobile-link has-arrow" @click="toggleMobileDropdown">
              <span>{{ $t('nav_categories') }}</span>
              <svg :class="{ rotated: mobileDropdownOpen }" viewBox="0 0 24 24" width="16" height="16">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>

            <div class="mobile-dropdown-content" v-show="mobileDropdownOpen">
              <router-link :to="{ name: 'Products', params: { lang: locale } }" class="mobile-sublink all-products-link" @click="closeMobile">
                <span class="sublink-icon">🛍️</span>{{ $t('nav_all_products') }}
              </router-link>

              <div v-if="categoriesLoading" class="mobile-sublink-loading">{{ $t('loading') }}</div>

              <template v-else>
                <router-link
                  v-for="cat in categories"
                  :key="cat._id"
                  :to="{ name: 'Products', params: { lang: locale }, query: { category: cat.slug } }"
                  class="mobile-sublink"
                  @click="closeMobile"
                >
                  <span class="sublink-icon">{{ cat.icon || '◆' }}</span>{{ getLocalizedText(cat.name) }}
                </router-link>
              </template>
            </div>
          </div>

          <router-link :to="{ name: 'News', params: { lang: locale } }" class="mobile-link" @click="closeMobile">{{ $t('nav_news') }}</router-link>
          <router-link :to="{ name: 'About', params: { lang: locale } }" class="mobile-link" @click="closeMobile">{{ $t('nav_about') }}</router-link>
          <router-link :to="{ name: 'Contact', params: { lang: locale } }" class="mobile-link" @click="closeMobile">{{ $t('nav_contact') }}</router-link>
        </div>

        <div class="mobile-footer">
          <template v-if="isLoggedIn">
            <router-link :to="{ name: 'UserDashboard', params: { lang: locale } }" class="mobile-login-btn" @click="closeMobile">
              {{ $t('user_dashboard') }} ({{ userName }})
            </router-link>
            <button class="mobile-logout-btn" @click="handleLogout">{{ $t('logout') }}</button>
          </template>
          <template v-else>
            <router-link :to="{ name: 'Login', params: { lang: locale } }" class="mobile-login-btn" @click="closeMobile">
              {{ $t('login_register') }}
            </router-link>
          </template>
        </div>
      </div>
      <div class="mobile-backdrop" @click="closeMobile"></div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import logoImg from '../assests/logo/Nourmehr-gold.webp'
import { useCart } from '../stores/cart'
import { useWishlist } from '../stores/wishlist'
import { useAuth } from '../stores/auth'
import { getPublicCategories } from '../services/categoryApi'
import { fetchCategoriesCached } from '../services/categoryCache'
import { applyDirection } from '../i18n'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const getLocalizedText = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value[locale.value] || value.fa || ''
  return ''
}

const toggleLanguage = () => {
  const next = locale.value === 'fa' ? 'en' : 'fa'
  locale.value = next
  localStorage.setItem('app_lang', next)
  applyDirection(next)

  const current = router.currentRoute.value
  if (current.params.lang === next) return

  if (current.name) {
    router.push({ name: current.name, params: { ...current.params, lang: next }, query: current.query })
      .catch(() => {})
  } else {
    // مسیرهای بدون name (مثلاً 404) را دستی جایگزین می‌کنیم
    router.replace(current.fullPath.replace(/^\/(fa|en)(?=\/|$)/, `/${next}`)).catch(() => {})
  }
}

const { state, cartItems, totalItems, closeMiniCart } = useCart()
const wishlist = useWishlist()
const auth = useAuth()

const isLoggedIn = computed(() => auth.isAuthenticated)
const userName = computed(() => auth.userName || auth.user?.email || t('default_user'))
const userInitial = computed(() => (userName.value || '?').trim().charAt(0).toUpperCase())

const handleLogout = async () => {
  await auth.logout()
  userMenuOpen.value = false
  closeMobile()
  router.push({ name: 'Login', params: { lang: locale.value } }).catch(() => {})
}

// ---------- Categories (با کش مشترک) ----------
const categories = ref([])
const categoriesLoading = ref(false)
const categoriesError = ref(false)

const fetchCategories = async (force = false) => {
  categoriesLoading.value = true
  categoriesError.value = false
  categories.value = await getPublicCategories({ force })
  try {
    categories.value = await fetchCategoriesCached(force)
  } catch (err) {
    console.error('خطا در دریافت دسته‌بندی‌ها:', err)
    categoriesError.value = true
    categories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

// ---------- UI State ----------
const isScrolled = ref(false)
const dropdownOpen = ref(false)
const userMenuOpen = ref(false)
const mobileMenuOpen = ref(false)
const mobileDropdownOpen = ref(false)

const lockScroll = (lock) => {
  document.body.style.overflow = lock ? 'hidden' : ''
}

const toggleMobile = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
  lockScroll(mobileMenuOpen.value)
}

const closeMobile = () => {
  mobileMenuOpen.value = false
  mobileDropdownOpen.value = false
  lockScroll(false)
}

const toggleMobileDropdown = () => {
  mobileDropdownOpen.value = !mobileDropdownOpen.value
}

// بستن دراپ‌داون وقتی فوکوس از کل ناحیه خارج شد (پشتیبانی کیبورد)
const onDropdownFocusOut = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) dropdownOpen.value = false
}

// Esc همه‌ی منوها را می‌بندد
const onKeydown = (e) => {
  if (e.key !== 'Escape') return
  dropdownOpen.value = false
  userMenuOpen.value = false
  if (mobileMenuOpen.value) closeMobile()
}

// کلیک بیرون از منوها
const onDocClick = () => {
  dropdownOpen.value = false
  userMenuOpen.value = false
}

const handleResize = () => {
  if (window.innerWidth > 1024 && mobileMenuOpen.value) closeMobile()
}

let scrollTicking = false
const handleScroll = () => {
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    isScrolled.value = window.scrollY > 30
    scrollTicking = false
  })
}

// بستن منوها با تغییر مسیر (شامل دکمه‌ی Back مرورگر)
watch(() => route.fullPath, () => {
  dropdownOpen.value = false
  userMenuOpen.value = false
  if (mobileMenuOpen.value) closeMobile()
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocClick)
  fetchCategories()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocClick)
  lockScroll(false)
})

</script>

<style scoped>
/* فونت محدود به کامپوننت، بدون !important و بدون سلکتور سراسری * */
.navbar-wrapper,
.navbar-wrapper * {
  font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
}

.navbar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 30px;
  background: rgba(5, 8, 20, 0.92);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 30px rgba(0,0,0,0.5);
  width: 100%;
  transition: padding 0.3s ease, background-color 0.3s ease;
}


.navbar-scrolled .navbar {
  padding: 10px 30px;
  background: rgba(5, 8, 20, 0.98);
}

.brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; z-index: 1002; }
.brand-mark { width: 45px; height: 45px; flex-shrink: 0; }
.brand-logo { width: 100%; height: 100%; object-fit: contain; }
.brand-text { display: flex; flex-direction: column; }
.brand-name { font-size: 1.1rem; font-weight: 700; color: #c5a059; }
.brand-tagline { font-size: 0.7rem; color: rgba(255,255,255,0.6); }

.nav-desktop { display: flex; align-items: center; gap: 20px; }

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e5e7eb;
  font-size: 0.95rem;
  text-decoration: none;
  padding: 8px 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.3s ease;
  font-weight: 500;
}
.nav-link:hover, .nav-link.router-link-active { color: #c5a059; }

.nav-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0%;
  height: 2px;
  background: #c5a059;
  transition: width 0.3s ease;
}
.nav-link:hover .nav-underline { width: 100%; }

.dropdown-arrow { transition: transform 0.3s ease; }
.dropdown-arrow.rotated { transform: rotate(180deg); }

.nav-dropdown { position: relative; }

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  margin-top: 10px;
  background: rgba(8, 10, 18, 0.98);
  border: 1px solid rgba(197,160,89,0.3);
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.7);
  overflow: hidden;
}

.dropdown-header {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: rgba(197,160,89,0.08);
  color: #c5a059;
  font-weight: 700;
  font-size: 0.92rem;
}

.dropdown-loading { display: flex; justify-content: center; align-items: center; gap: 6px; padding: 20px; }
.loading-dot { width: 8px; height: 8px; background: #c5a059; border-radius: 50%; animation: bounce 0.8s infinite alternate; }
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { from { transform: translateY(0); opacity: 0.4; } to { transform: translateY(-6px); opacity: 1; } }

.dropdown-error { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; color: #ff6b6b; font-size: 0.85rem; }
.retry-btn { background: none; border: 1px solid #c5a059; color: #c5a059; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; transition: background-color 0.3s ease, color 0.3s ease; }
.retry-btn:hover { background: #c5a059; color: #000; }

.dropdown-empty { padding: 16px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.85rem; }
.dropdown-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 6px 16px; }

.all-products { background: rgba(197,160,89,0.1); }
.all-products:hover { background: rgba(197,160,89,0.2); }

.dropdown-item { display: flex; align-items: center; gap: 12px; padding: 13px 18px; text-decoration: none; color: #fff; transition: background-color 0.2s ease; }
.dropdown-item:hover { background: rgba(255,255,255,0.06); }
.item-icon { color: #c5a059; font-size: 1.3rem; flex-shrink: 0; }
.item-content { flex: 1; min-width: 0; }
.item-title { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; }
.item-desc { font-size: 0.75rem; color: rgba(255,255,255,0.5); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-10px); }

.nav-right { display: flex; align-items: center; gap: 12px; }

.lang-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #c5a059; font-weight: bold; cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  font-size: 0.8rem; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.lang-btn:hover { background: #c5a059; color: #000; border-color: #c5a059; }

.cart-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; text-decoration: none;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  flex-shrink: 0;
}
.cart-btn:hover { background: #c5a059; color: #000; border-color: #c5a059; }

.cart-wrapper { position: relative; }
.cart-badge {
  position: absolute; top: -5px; right: -5px;
  background: #c5a059; color: #000; font-size: 0.7rem; font-weight: bold;
  height: 18px; min-width: 18px; padding: 0 4px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
}

.wishlist-nav-btn {
  position: relative;
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; text-decoration: none;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  flex-shrink: 0;
}
.wishlist-nav-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
.wishlist-nav-badge {
  position: absolute; top: -5px; right: -5px;
  background: #ef4444; color: #fff; font-size: 0.7rem; font-weight: bold;
  height: 18px; min-width: 18px; padding: 0 4px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
}

.mini-cart {
  position: absolute; top: calc(100% + 15px); left: 50%;
  transform: translateX(-50%); width: 300px;
  background: rgba(10, 10, 10, 0.97);
  border: 1px solid #333; border-radius: 8px; overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 100;
}
.mini-cart-header { padding: 10px 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; font-weight: bold; color: #fff; }
.mini-cart-items { padding: 10px; max-height: 200px; overflow-y: auto; }
.mini-cart-item { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
.mini-cart-item img { width: 40px; height: 40px; border-radius: 4px; background: #222; object-fit: cover; }
.mini-cart-item-name { display: block; font-size: 0.8rem; color: #fff; }
.mini-cart-item-price { font-size: 0.75rem; color: #c5a059; }
.mini-cart-footer { padding: 10px; border-top: 1px solid #333; }
.mini-cart-btn { display: block; width: 100%; text-align: center; background: #c5a059; color: #000; padding: 8px; border-radius: 4px; text-decoration: none; font-weight: bold; }

.mini-cart-enter-active, .mini-cart-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.mini-cart-enter-from, .mini-cart-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }

.login-btn {
  padding: 8px 16px; border: 1px solid #c5a059; border-radius: 20px;
  color: #c5a059; text-decoration: none; font-weight: 600; font-size: 0.9rem;
  transition: background-color 0.3s ease, color 0.3s ease; white-space: nowrap;
}
.login-btn:hover { background: #c5a059; color: #000; }

.user-wrapper { position: relative; }
.user-btn {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(197,160,89,0.4);
  border-radius: 20px; padding: 4px 12px 4px 4px; color: #fff; cursor: pointer;
  transition: border-color 0.3s ease;
}
.user-btn:hover, .user-btn.active { border-color: #c5a059; }
.user-avatar { width: 30px; height: 30px; border-radius: 50%; background: #c5a059; color: #000; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.user-name { font-size: 0.85rem; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.user-menu {
  position: absolute; top: calc(100% + 12px); inset-inline-end: 0; width: 200px;
  background: rgba(8, 10, 18, 0.98); border: 1px solid rgba(197,160,89,0.3);
  border-radius: 10px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.7);
  display: flex; flex-direction: column; z-index: 100;
}
.user-menu-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  color: #fff; text-decoration: none; background: none; border: none;
  text-align: start; font-size: 0.88rem; cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.user-menu-item svg { flex-shrink: 0; color: #c5a059; }
.user-menu-item:hover { background: rgba(255,255,255,0.06); color: #c5a059; }
.user-menu-item.logout { color: #ff6b6b; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: none; }
.user-menu-item.logout svg { color: #ff6b6b; }
.user-menu-item.logout:hover { background: rgba(255,107,107,0.1); }

.mobile-toggle { display: none; background: none; border: none; padding: 0; cursor: pointer; }
.hamburger { width: 30px; height: 20px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
.hamburger span { width: 100%; height: 2px; background: #c5a059; border-radius: 2px; transition: transform 0.3s ease, opacity 0.3s ease; }
.hamburger.open span:nth-child(1) { transform: translateY(9px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-9px) rotate(-45deg); }

.mobile-menu { position: fixed; top: 0; right: 0; left: 0; bottom: 0; z-index: 1005; pointer-events: none; }
.mobile-menu.is-open { pointer-events: auto; }

.mobile-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); opacity: 0; transition: opacity 0.3s ease; z-index: 1004; }
.mobile-menu.is-open .mobile-backdrop { opacity: 1; }

.mobile-menu-content {
  position: absolute; top: 0; right: 0; width: 280px; max-width: 85vw; height: 100%;
  background: #080a12; border-left: 1px solid rgba(255,255,255,0.1);
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1006; display: flex; flex-direction: column;
  padding: 20px; padding-bottom: 40px;
  overflow-y: auto; overscroll-behavior: contain;
}
.mobile-menu.is-open .mobile-menu-content { transform: translateX(0); }

.mobile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; }
.mobile-title { color: #c5a059; font-size: 1.2rem; font-weight: bold; }
.mobile-close-btn { background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; }

.mobile-links { display: flex; flex-direction: column; gap: 10px; }
.mobile-link { color: #fff; text-decoration: none; font-size: 1rem; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-weight: 500; }
.mobile-link.has-arrow { display: flex; justify-content: space-between; align-items: center; width: 100%; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
.mobile-link svg { transition: transform 0.3s ease; }
.mobile-link svg.rotated { transform: rotate(180deg); }

.mobile-dropdown-content { background: rgba(255,255,255,0.03); padding: 8px 15px; display: flex; flex-direction: column; border-radius: 8px; margin-top: 6px; }
.mobile-sublink { color: #ccc; text-decoration: none; padding: 10px 0; font-size: 0.92rem; display: flex; gap: 10px; align-items: center; font-weight: 500; }
.mobile-sublink-loading { padding: 10px 0; color: rgba(255,255,255,0.4); font-size: 0.85rem; text-align: center; }
.sublink-icon { color: #c5a059; font-size: 1.1rem; }
.all-products-link { color: #c5a059; font-weight: 600; border-bottom: 1px solid rgba(197,160,89,0.2); margin-bottom: 4px; }

.mobile-footer { margin-top: auto; padding-top: 20px; display: flex; flex-direction: column; gap: 10px; }
.mobile-login-btn { display: block; width: 100%; padding: 12px; background: rgba(255,255,255,0.1); color: #fff; text-align: center; text-decoration: none; border-radius: 6px; font-weight: 500; }
.mobile-logout-btn { width: 100%; padding: 12px; background: transparent; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center; border-radius: 6px; cursor: pointer; font-weight: 500; }

@media (max-width: 1024px) {
  .nav-desktop, .desktop-only { display: none; }
  .mobile-toggle { display: block; }
  .navbar { padding: 12px 20px; }
}

@media (max-width: 480px) {
  .brand-name { font-size: 0.9rem; }
  .brand-tagline { font-size: 0.6rem; }
  .mini-cart { width: 90vw; left: 50%; transform: translateX(-50%); right: auto; }
}

@media (hover: none) {
  .nav-link:hover .nav-underline { width: 0%; }
}

@media (prefers-reduced-motion: reduce) {
  .navbar, .mobile-menu-content, .mobile-backdrop, .nav-underline,
  .dropdown-arrow, .hamburger span, .cart-btn, .lang-btn, .mobile-link svg {
    transition: none !important;
  }
}

.navbar.menu-open .brand {
  z-index: 1;
}


</style>
