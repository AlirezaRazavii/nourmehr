import { createRouter, createWebHistory } from 'vue-router'
import i18n, { applyDirection, setLocale, loadLocaleMessages, SUPPORTED_LOCALES, getSavedLocale } from './i18n'

// --- لود تدریجی (Lazy Loading) ---
const Home = () => import('./views/Home.vue')
const About = () => import('./views/About.vue')
const Contact = () => import('./views/Contact.vue')
const Collection = () => import('./views/Collection.vue')
const CollectionView = () => import('./views/CollectionView.vue')
const Cart = () => import('./views/Cart.vue')
const Checkout = () => import('./views/Checkout.vue')
const Login = () => import('./views/Login.vue')
const CompleteProfile = () => import('./views/CompleteProfile.vue')
const UserLayout = () => import('./views/user/UserLayout.vue')
const UserDashboard = () => import('./views/user/UserDashboard.vue')
const News = () => import('./views/News.vue')

const Products = () => import('./components/Products.vue')
const ProductDetails = () => import('./components/ProductDetails.vue')

const AdminLayout = () => import('./views/admin/AdminLayout.vue')
const AdminDashboard = () => import('./views/admin/AdminDashboard.vue')
const AdminOrders = () => import('./views/admin/AdminOrders.vue')
const AdminUsers = () => import('./views/admin/AdminUsers.vue')
const AdminPayments = () => import('./views/admin/AdminPayments.vue')
const AdminTickets = () => import('./views/admin/AdminTickets.vue')
const AdminDiscounts = () => import('./views/admin/AdminDiscounts.vue')
const AdminProducts = () => import('./views/admin/AdminProducts.vue')
const AdminSettings = () => import('./views/admin/AdminSettings.vue')
const AdminHero = () => import('./views/admin/AdminHero.vue')

const routes = [
  { path: '/:lang', name: 'Home', component: Home },
  { path: '/:lang/products', name: 'Products', component: Products },
  { path: '/:lang/product/:id', name: 'ProductDetails', component: ProductDetails },
  { path: '/:lang/collection/:slug', name: 'Collection', component: Collection },
  { path: '/:lang/collections/:slug', name: 'CollectionView', component: CollectionView },
  { path: '/:lang/about', name: 'About', component: About },
  { path: '/:lang/contact', name: 'Contact', component: Contact },
  { path: '/:lang/news', name: 'News', component: News },
  { path: '/:lang/news/:slug', name: 'NewsDetails', component: () => import('./views/NewsDetails.vue') },
  { path: '/:lang/cart', name: 'Cart', component: Cart },
  { path: '/:lang/checkout', name: 'Checkout', component: Checkout, meta: { requiresAuth: true } },
  { path: '/:lang/payment/callback', name: 'PaymentCallback', component: () => import('./views/PaymentCallback.vue') },
  { path: '/:lang/login', name: 'Login', component: Login },
  { path: '/:lang/complete-profile', name: 'CompleteProfile', component: CompleteProfile, meta: { requiresAuth: true } },
  { path: '/:lang/orders', redirect: to => `/${to.params.lang}/user/orders` },
  { path: '/:lang/profile', redirect: to => ({ name: 'UserProfile', params: { lang: to.params.lang } }), meta: { requiresAuth: true } },
  { path: '/:lang/discounts', name: 'Discounts', component: () => import('./views/Discounts.vue') },

  {
    path: '/:lang/user',
    component: UserLayout,
    redirect: to => `/${to.params.lang}/user/dashboard`,
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'UserDashboard', component: UserDashboard, meta: { requiresAuth: true } },
      { path: 'orders', name: 'UserOrders', component: () => import('./views/user/UserOrders.vue'), meta: { requiresAuth: true } },
      { path: 'addresses', name: 'UserAddresses', component: () => import('./views/user/UserAddresses.vue'), meta: { requiresAuth: true } },
      { path: 'profile', name: 'UserProfile', component: () => import('./views/user/UserProfile.vue'), meta: { requiresAuth: true } },
      { path: 'tickets', name: 'UserTickets', component: () => import('./views/user/UserTickets.vue'), meta: { requiresAuth: true } },
      { path: 'wishlist', name: 'UserWishlist', component: () => import('./views/user/UserWishlist.vue'), meta: { requiresAuth: true } }
    ]
  },

  { path: '/:lang/search', name: 'Search', component: () => import('./views/Search.vue') },

  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, adminOnly: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'blogs', name: 'AdminBlogs', component: () => import('./views/admin/AdminBlogs.vue') },
      { path: 'dashboard', name: 'AdminDashboard', component: AdminDashboard },
      { path: 'orders', name: 'AdminOrders', component: AdminOrders },
      { path: 'users', name: 'AdminUsers', component: AdminUsers },
      { path: 'payments', name: 'AdminPayments', component: AdminPayments },
      { path: 'tickets', name: 'AdminTickets', component: AdminTickets },
      { path: 'discounts', name: 'AdminDiscounts', component: AdminDiscounts },
      { path: 'products', name: 'AdminProducts', component: AdminProducts },
      { path: 'settings', name: 'AdminSettings', component: AdminSettings },
      { path: 'categories', name: 'AdminCategories', component: () => import('./views/admin/AdminCategories.vue') },
      { path: 'collections', name: 'AdminCollections', component: () => import('./views/admin/AdminCollections.vue') },
      { path: 'reviews', name: 'AdminReviews', component: () => import('./views/admin/AdminReviews.vue') },
      { path: 'admins', name: 'AdminAdmins', component: () => import('./views/admin/AdminAdmins.vue') },
      { path: 'hero', name: 'AdminHero', component: AdminHero, meta: { title: 'مدیریت هیرو' } },
    ]
  },

  { path: '/:lang/:pathMatch(.*)*', name: 'NotFound', component: () => import('./views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 80 }
    return { top: 0 }
  }
})

let cachedUserRaw = null
let cachedUser = null

const getStoredUser = () => {
  let raw = null
  try {
    raw = localStorage.getItem('auth_user')
  } catch (e) {
    return null
  }
  if (raw === cachedUserRaw) return cachedUser
  cachedUserRaw = raw
  try {
    cachedUser = JSON.parse(raw || 'null')
  } catch (e) {
    cachedUser = null
  }
  return cachedUser
}

const getStoredToken = () => {
  const fromCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth_token='))
    ?.split('=')[1]
  if (fromCookie) return fromCookie
  try {
    return localStorage.getItem('auth_token')
  } catch (e) {
    return null
  }
}

const isAuthenticated = () => {
  const user = getStoredUser()
  const token = getStoredToken()
  return !!user && !!token
}

const isAdmin = () => {
  const user = getStoredUser()
  const token = getStoredToken()
  return !!user && !!token && user.role === 'admin'
}

// آیا کاربر لاگین کرده ولی پروفایلش ناقص است؟
const needsProfile = () => {
  const user = getStoredUser()
  return !!user && user.isProfileComplete === false
}

const routePathMap = {
  Home: '',
  Products: 'products',
  ProductDetails: 'product/:id',
  Collection: 'collection/:slug',
  CollectionView: 'collections/:slug',
  About: 'about',
  Contact: 'contact',
  Cart: 'cart',
  Checkout: 'checkout',
  Login: 'login',
  CompleteProfile: 'complete-profile',
  Search: 'search',
  UserDashboard: 'user/dashboard',
  UserOrders: 'user/orders',
  UserAddresses: 'user/addresses',
  UserProfile: 'user/profile',
  UserTickets: 'user/tickets',
  UserWishlist: 'user/wishlist',
  Discounts: 'discounts',
}

router.beforeEach(async (to, from, next) => {
  if (to.path.endsWith('.txt')) return next()

  const defaultLang = getSavedLocale()

  if (to.path.startsWith('/admin')) {
    if (!isAdmin()) {
      return next({ name: 'Login', params: { lang: defaultLang }, query: { redirect: to.fullPath } })
    }
    return next()
  }

  const langParam = to.params.lang

  // 2. اصلاح زبان در URL
  if (!langParam || !SUPPORTED_LOCALES.includes(langParam)) {
    let path = to.path
    if (path.startsWith('/undefined')) path = path.replace('/undefined', '')
    if (path.startsWith('/null')) path = path.replace('/null', '')

    if (to.name && routePathMap[to.name]) {
      const mappedPath = routePathMap[to.name]
      let finalPath = mappedPath
      Object.keys(to.params).forEach(param => {
        if (param !== 'lang') {
          finalPath = finalPath.replace(`:${param}`, to.params[param])
        }
      })
      return next(`/${defaultLang}/${finalPath}`)
    }

    const cleanPath = path === '/' ? '' : path
    return next(`/${defaultLang}${cleanPath}`)
  }

  // 3. همگام‌سازی زبان i18n (فایل ترجمه فقط در صورت نیاز دانلود می‌شود)
  if (i18n.global.locale.value !== langParam) {
    try {
      await setLocale(langParam)
    } catch (e) {
      applyDirection(langParam)
    }
  } else {
    try {
      await loadLocaleMessages(langParam)
    } catch (e) {}
    applyDirection(langParam)
  }

  // 4. بررسی احراز هویت
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  if (requiresAuth && !isAuthenticated()) {
    return next({ name: 'Login', params: { lang: langParam }, query: { redirect: to.fullPath } })
  }

  // 5. اجبار به تکمیل پروفایل
  if (isAuthenticated() && needsProfile() && to.name !== 'CompleteProfile') {
    return next({ name: 'CompleteProfile', params: { lang: langParam } })
  }

  // 6. اگر پروفایل کامل است ولی می‌خواهد به صفحه تکمیل پروفایل برود
  if (isAuthenticated() && !needsProfile() && to.name === 'CompleteProfile') {
    return next({ name: 'UserDashboard', params: { lang: langParam } })
  }

  next()
})

// prefetch سبک و کنترل‌شده: فقط بعد از کامل شدن لود صفحه و روی اینترنت مناسب
if (typeof window !== 'undefined') {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const saveData = conn?.saveData === true
  const slowNet = conn?.effectiveType ? /(^|-)2g$/.test(conn.effectiveType) : false

  if (!saveData && !slowNet) {
    const prefetch = () => {
      import('./components/Products.vue')
    }
    const start = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prefetch, { timeout: 8000 })
      } else {
        setTimeout(prefetch, 6000)
      }
    }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
  }
}

export default router
