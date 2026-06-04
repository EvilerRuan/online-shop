<template>
  <div class="page-profile">
    <!-- 顶部用户信息卡片 -->
    <div class="page-profile__header">
      <div class="page-profile__avatar">
        <van-image
          round
          width="64"
          height="64"
          :src="avatarUrl"
          fit="cover"
        >
          <template #error>
            <van-icon name="manager" size="32" color="#fff" />
          </template>
        </van-image>
      </div>
      <div class="page-profile__info">
        <div class="page-profile__name">{{ user?.username || '用户' }}</div>
        <div class="page-profile__no">用户编号：{{ user?.user_no || '-' }}</div>
      </div>
    </div>

    <!-- 订单快捷入口 -->
    <div class="page-profile__section">
      <van-grid :column-num="4" :border="false">
        <van-grid-item
          icon="balance-list-o"
          text="全部订单"
          :badge="''"
          @click="goOrders('all')"
        />
        <van-grid-item
          icon="credit-pay"
          text="待付款"
          :badge="orderCount.pending_payment > 0 ? String(orderCount.pending_payment) : ''"
          @click="goOrders('pending_payment')"
        />
        <van-grid-item
          icon="logistics"
          text="待发货"
          :badge="orderCount.pending_shipment > 0 ? String(orderCount.pending_shipment) : ''"
          @click="goOrders('pending_shipment')"
        />
        <van-grid-item
          icon="send-gift-o"
          text="待收货"
          :badge="orderCount.pending_receipt > 0 ? String(orderCount.pending_receipt) : ''"
          @click="goOrders('pending_receipt')"
        />
      </van-grid>
    </div>

    <!-- 功能列表 -->
    <div class="page-profile__section">
      <van-cell-group :border="false">
        <van-cell title="地址管理" is-link icon="location-o" @click="router.push('/address')" />
        <van-cell title="商家简介" is-link icon="info-o" @click="router.push('/page/merchant_intro')" />
        <van-cell title="商家公告" is-link icon="volume-o" @click="router.push('/page/merchant_notice')" />
        <van-cell title="买家须知" is-link icon="description" @click="router.push('/page/buyer_notice')" />
      </van-cell-group>
    </div>

    <!-- 退出登录 -->
    <div class="page-profile__logout">
      <van-button block plain type="default" @click="handleLogout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { useAuthStore } from '@/stores/useAuthStore'
import request from '@/utils/request'
import type { OrderCount } from 'shared/types/order'

const router = useRouter()
const authStore = useAuthStore()

const user = authStore.user

const avatarUrl = ''

const orderCount = ref<OrderCount>({
  pending_payment: 0,
  pending_shipment: 0,
  pending_receipt: 0,
})

onMounted(async () => {
  await fetchOrderCount()
})

async function fetchOrderCount() {
  try {
    const res = await request.get('/orders/count')
    orderCount.value = res.data.data
  } catch {
    // 静默处理
  }
}

function goOrders(status: string) {
  router.push({ path: '/orders', query: { status } })
}

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要退出登录吗？',
    })
    authStore.logout()
    router.replace('/login')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.page-profile {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.page-profile__header {
  display: flex;
  align-items: center;
  padding: 32px 20px;
  background: linear-gradient(135deg, #07C160 0%, #06AD56 100%);
}

.page-profile__avatar {
  flex-shrink: 0;
  margin-right: 16px;
}

.page-profile__info {
  color: #fff;
}

.page-profile__name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.page-profile__no {
  font-size: 13px;
  opacity: 0.85;
}

.page-profile__section {
  margin: 12px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.page-profile__logout {
  padding: 24px 16px;
}
</style>
