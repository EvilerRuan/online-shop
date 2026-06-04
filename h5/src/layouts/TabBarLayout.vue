<template>
  <div class="tabbar-layout">
    <div class="tabbar-layout__content">
      <router-view />
    </div>
    <van-tabbar
      v-model="active"
      active-color="#07C160"
      route
      @change="onChange"
    >
      <van-tabbar-item icon="wap-home-o" to="/home">首页</van-tabbar-item>
      <van-tabbar-item icon="apps-o" to="/category">分类</van-tabbar-item>
      <van-tabbar-item icon="shopping-cart-o" to="/cart" :badge="cartBadge">
        购物车
      </van-tabbar-item>
      <van-tabbar-item icon="contact-o" to="/profile">中心</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/useCartStore'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const tabRoutes = ['/home', '/category', '/cart', '/profile']

const active = ref(0)

const cartBadge = computed(() => {
  const count = cartStore.items.length
  return count > 0 ? (count > 99 ? '99+' : String(count)) : ''
})

watch(
  () => route.path,
  (path) => {
    const index = tabRoutes.indexOf(path)
    if (index > -1) {
      active.value = index
    }
  },
  { immediate: true }
)

function onChange(index: number) {
  const target = tabRoutes[index]
  if (target) {
    router.push(target)
  }
}
</script>

<style scoped>
.tabbar-layout {
  min-height: 100vh;
  padding-bottom: 50px;
}

.tabbar-layout__content {
  min-height: calc(100vh - 50px);
}
</style>
