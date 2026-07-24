import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../views/admin/AdminLayout.vue'

const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'AdminDashboard', component: () => import('../views/admin/AdminDashboard.vue') },
      { path: 'orders', name: 'AdminOrders', component: () => import('../views/admin/AdminOrders.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('../views/admin/AdminUsers.vue') },
      { path: 'payments', name: 'AdminPayments', component: () => import('../views/admin/AdminPayments.vue') },
      { path: 'tickets', name: 'AdminTickets', component: () => import('../views/admin/AdminTickets.vue') },
      { path: 'discounts', name: 'AdminDiscounts', component: () => import('../views/admin/AdminDiscounts.vue') },
      { path: 'products', name: 'AdminProducts', component: () => import('../views/admin/AdminProducts.vue') },
      { path: 'settings', name: 'AdminSettings', component: () => import('../views/admin/AdminSettings.vue') },
      {
        path: 'hero',
        name: 'admin-hero',
        component: () => import('../views/admin/AdminHero.vue'),
        meta: { permission: 'hero' },
      },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  }
})

const isAdmin = () => {
  const user = JSON.parse(localStorage.getItem('auth_user') || 'null')
  const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] || localStorage.getItem('auth_token')
  return !!user && !!token && user.role === 'admin'
}

router.beforeEach(async (to, from, next) => {
  if (to.path.startsWith('/admin')) {
    if (!isAdmin()) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
  }
  next()
})

export default router
