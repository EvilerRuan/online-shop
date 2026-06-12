<template>
  <view class="page-profile">
    <!-- 顶部用户信息卡片 -->
    <view class="page-profile__header">
      <view class="page-profile__avatar">
        <view class="avatar-circle">
          <text class="avatar-text">{{ userInitial }}</text>
        </view>
      </view>
      <view class="page-profile__info">
        <view class="page-profile__name">{{ username }}</view>
        <view class="page-profile__phone">{{ phoneDisplay }}</view>
      </view>
    </view>

    <!-- 数据卡片 -->
    <view class="page-profile__stats">
      <view class="stats-item" @tap="goPoints">
        <text class="stats-value">{{ pointsBalance }}</text>
        <text class="stats-label">我的积分</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item" @tap="goOrders">
        <text class="stats-value">{{ orderCount }}</text>
        <text class="stats-label">我的订单</text>
      </view>
      <view class="stats-divider"></view>
      <view class="stats-item" @tap="goReferral">
        <text class="stats-value">邀请</text>
        <text class="stats-label">推荐好友</text>
      </view>
    </view>

    <!-- 订单快捷入口 -->
    <view class="page-profile__section">
      <view class="section-header">
        <text class="section-title">我的订单</text>
        <text class="section-more" @tap="goOrders">查看全部 ›</text>
      </view>
      <view class="order-quick">
        <view class="order-quick__item" @tap="goOrderTab(0)">
          <text class="order-quick__icon">💰</text>
          <text class="order-quick__text">待付款</text>
        </view>
        <view class="order-quick__item" @tap="goOrderTab(1)">
          <text class="order-quick__icon">📦</text>
          <text class="order-quick__text">待发货</text>
        </view>
        <view class="order-quick__item" @tap="goOrderTab(2)">
          <text class="order-quick__icon">🚚</text>
          <text class="order-quick__text">待收货</text>
        </view>
        <view class="order-quick__item" @tap="goOrderTab(3)">
          <text class="order-quick__icon">⭐</text>
          <text class="order-quick__text">待评价</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="page-profile__section">
      <view class="menu-item" @tap="goAddress">
        <text class="menu-item__icon">📍</text>
        <text class="menu-item__text">收货地址</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goAfterSales">
        <text class="menu-item__icon">🔄</text>
        <text class="menu-item__text">售后服务</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goChat">
        <text class="menu-item__icon">💬</text>
        <text class="menu-item__text">联系客服</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goAbout">
        <text class="menu-item__icon">ℹ️</text>
        <text class="menu-item__text">关于我们</text>
        <text class="menu-item__arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="page-profile__logout" @tap="handleLogout">
      <text class="logout-text">退出登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/utils/request'

const authStore = useAuthStore()

const username = computed(() => authStore.user?.username || '用户')
const phoneDisplay = computed(() => {
  const phone = authStore.user?.phone || ''
  if (phone.length >= 7) {
    return phone.slice(0, 3) + '****' + phone.slice(7)
  }
  return phone
})
const userInitial = computed(() => username.value.charAt(0))
const pointsBalance = computed(() => authStore.user?.points_balance ?? 0)
const orderCount = ref(0)

async function fetchOrderCount() {
  try {
    const res = await api.get<any>('/api/retail/orders/count')
    orderCount.value = res?.total ?? 0
  } catch {
    orderCount.value = 0
  }
}

function goPoints() { Taro.navigateTo({ url: '/pages/points/index' }) }
function goOrders() { Taro.navigateTo({ url: '/pages/orders/index' }) }
function goReferral() { Taro.navigateTo({ url: '/pages/referral/index' }) }
function goOrderTab(tab: number) { Taro.navigateTo({ url: `/pages/orders/index?tab=${tab}` }) }
function goAddress() { Taro.navigateTo({ url: '/pages/address/index' }) }
function goAfterSales() { Taro.navigateTo({ url: '/pages/after-sales/index' }) }
function goChat() { Taro.navigateTo({ url: '/pages/chat/index' }) }
function goAbout() { Taro.showToast({ title: '功能开发中', icon: 'none' }) }

function handleLogout() {
  Taro.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout()
      }
    },
  })
}

onMounted(() => {
  if (!authStore.isLoggedIn) {
    Taro.redirectTo({ url: '/pages/login/index' })
  }
  fetchOrderCount()
})
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-profile {
  min-height: 100vh;
  background-color: $bg-color;
  padding-bottom: 100px;
}

/* ========== 顶部用户信息卡片 ========== */
.page-profile__header {
  display: flex;
  align-items: center;
  padding: 40px 24px 32px;
  background: linear-gradient(135deg, $gradient-start 0%, $gradient-end 100%);
}

.page-profile__avatar {
  flex-shrink: 0;
  margin-right: 20px;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.avatar-text {
  font-size: 36px;
  color: $primary-color;
  font-weight: 700;
}

.page-profile__info {
  color: #fff;
  flex: 1;
}

.page-profile__name {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 6px;
}

.page-profile__phone {
  font-size: 22px;
  opacity: 0.85;
}

/* ========== 数据卡片 ========== */
.page-profile__stats {
  display: flex;
  align-items: center;
  background-color: #fff;
  margin: -20px 16px 16px;
  border-radius: 16px;
  padding: 20px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 1;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
}

.stats-value {
  font-size: 26px;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 6px;
}

.stats-label {
  font-size: 20px;
  color: $text-color-secondary;
}

.stats-divider {
  width: 1px;
  height: 32px;
  background-color: $border-color;
}

/* ========== 区块通用样式 ========== */
.page-profile__section {
  background-color: #fff;
  margin: 0 16px 16px;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 26px;
  font-weight: 600;
  color: $text-color;
}

.section-more {
  font-size: 20px;
  color: $text-color-secondary;
}

/* ========== 订单快捷入口 ========== */
.order-quick {
  display: flex;
  justify-content: space-around;
}

.order-quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.order-quick__icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.order-quick__text {
  font-size: 20px;
  color: $text-color-secondary;
}

/* ========== 功能菜单 ========== */
.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid $border-color;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.menu-item__icon {
  font-size: 24px;
  margin-right: 16px;
}

.menu-item__text {
  flex: 1;
  font-size: 24px;
  color: $text-color;
}

.menu-item__arrow {
  font-size: 24px;
  color: $text-color-light;
}

/* ========== 退出登录 ========== */
.page-profile__logout {
  margin: 24px 16px 0;
  background-color: #fff;
  border-radius: 16px;
  padding: 18px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.logout-text {
  font-size: 26px;
  color: $danger-color;
  font-weight: 500;
}
</style>
