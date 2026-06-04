import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import TabBarLayout from '@/layouts/TabBarLayout.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
  },
  {
    path: '/',
    component: TabBarLayout,
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'category',
        name: 'Category',
        component: () => import('@/views/category/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'cart',
        name: 'Cart',
        component: () => import('@/views/cart/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/search/index.vue'),
  },
  {
    path: '/products',
    name: 'ProductList',
    component: () => import('@/views/product-list/index.vue'),
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/views/product-detail/index.vue'),
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/checkout/index.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/address',
    name: 'AddressList',
    component: () => import('@/views/address/index.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/address/edit/:id?',
    name: 'AddressEdit',
    component: () => import('@/views/address/edit.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'OrderList',
    component: () => import('@/views/orders/index.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/order/:id',
    name: 'OrderDetail',
    component: () => import('@/views/orders/detail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/page/:type',
    name: 'StaticPage',
    component: () => import('@/views/static-page/index.vue'),
  },
  {
    path: '/',
    redirect: '/home',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
