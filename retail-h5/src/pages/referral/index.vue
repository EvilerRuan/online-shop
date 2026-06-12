<template>
  <view class="page-referral">
    <scroll-view class="page-referral__content" scroll-y>
      <!-- 推荐码 -->
      <view class="referral-header">
        <text class="referral-header__icon">🎁</text>
        <text class="referral-header__title">邀请好友赚积分</text>
        <text class="referral-header__desc">每邀请一位好友注册，即可获得50积分奖励</text>
      </view>

      <!-- 推荐码展示 -->
      <view class="referral-code-section">
        <text class="referral-code-section__label">我的推荐码</text>
        <view class="referral-code">
          <text class="referral-code__value">{{ referralInfo.referral_code || '--' }}</text>
        </view>
        <view class="referral-code__actions">
          <view class="copy-btn" @tap="copyCode">
            复制推荐码
          </view>
        </view>
      </view>

      <!-- 邀请统计 -->
      <view class="referral-stats">
        <view class="stat-item">
          <text class="stat-item__value">{{ referralInfo.referral_count || 0 }}</text>
          <text class="stat-item__label">已邀请人数</text>
        </view>
        <view class="stat-item">
          <text class="stat-item__value">{{ referralInfo.referral_points || 0 }}</text>
          <text class="stat-item__label">获得积分</text>
        </view>
      </view>

      <!-- 邀请历史 -->
      <view class="referral-section">
        <text class="referral-section__title">邀请记录</text>
        <view v-for="item in history" :key="item.id" class="history-item">
          <view class="history-item__avatar"></view>
          <view class="history-item__info">
            <text class="history-item__phone">{{ item.referee_phone }}</text>
            <text class="history-item__time">{{ item.created_at }}</text>
          </view>
          <text class="history-item__points">+{{ item.points }}积分</text>
        </view>
        <view v-if="!loading && history.length === 0" class="empty">
          <text class="empty__text">暂无邀请记录</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface ReferralInfo {
  referral_code: string
  referral_count: number
  referral_points: number
}

interface ReferralHistory {
  id: number
  referee_phone: string
  points: number
  created_at: string
}

const referralInfo = ref<Partial<ReferralInfo>>({})
const history = ref<ReferralHistory[]>([])
const loading = ref(false)

onMounted(() => {
  loadReferralInfo()
  loadHistory()
})

async function loadReferralInfo() {
  try {
    const res = await api.get<ReferralInfo>('/api/retail/referral/info')
    referralInfo.value = res
  } catch (err) {
    console.error('加载推荐信息失败', err)
  }
}

async function loadHistory() {
  loading.value = true
  try {
    const res = await api.get<ReferralHistory[]>('/api/retail/referral/history', {
      page: 1,
      limit: 20,
    })
    history.value = res
  } catch (err) {
    console.error('加载邀请历史失败', err)
  } finally {
    loading.value = false
  }
}

function copyCode() {
  const code = referralInfo.value.referral_code
  if (!code) return

  Taro.setClipboardData({
    data: code,
    success: () => {
      Taro.showToast({ title: '已复制', icon: 'success' })
    },
  })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-referral {
  min-height: 100vh;
  background-color: $bg-color;
}

.page-referral__content {
  min-height: 100vh;
}

.referral-header {
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  padding: 60px 32px 40px;
  text-align: center;
}

.referral-header__icon {
  font-size: 72px;
  display: block;
  margin-bottom: 16px;
}

.referral-header__title {
  display: block;
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.referral-header__desc {
  display: block;
  font-size: 24px;
  color: rgba(255, 255, 255, 0.9);
}

.referral-code-section {
  background-color: #fff;
  padding: 32px;
  margin: -20px 24px 24px;
  border-radius: 16px;
  position: relative;
  z-index: 1;
}

.referral-code-section__label {
  display: block;
  font-size: 26px;
  color: $text-color-secondary;
  margin-bottom: 16px;
}

.referral-code {
  background-color: $bg-color;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
}

.referral-code__value {
  font-size: 36px;
  font-weight: 600;
  color: $primary-color;
  letter-spacing: 4px;
}

.referral-code__actions {
  display: flex;
  justify-content: center;
}

.copy-btn {
  padding: 16px 40px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  border-radius: 32px;
  font-size: 26px;
  font-weight: 600;
  color: #fff;
}

.referral-stats {
  display: flex;
  background-color: #fff;
  margin: 0 24px 24px;
  border-radius: 16px;
  padding: 24px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-item:not(:last-child) {
  border-right: 1px solid $border-color;
}

.stat-item__value {
  display: block;
  font-size: 40px;
  font-weight: 600;
  color: $primary-color;
  margin-bottom: 8px;
}

.stat-item__label {
  font-size: 22px;
  color: $text-color-secondary;
}

.referral-section {
  background-color: #fff;
  padding: 24px;
  margin: 0 24px 24px;
  border-radius: 16px;
}

.referral-section__title {
  display: block;
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 20px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid $border-color;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: $bg-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-right: 16px;
}

.history-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.history-item__phone {
  font-size: 26px;
  color: $text-color;
}

.history-item__time {
  font-size: 22px;
  color: $text-color-secondary;
  margin-top: 4px;
}

.history-item__points {
  font-size: 26px;
  font-weight: 600;
  color: $primary-color;
}

.empty {
  padding: 40px 0;
  text-align: center;
}

.empty__text {
  font-size: 24px;
  color: $text-color-secondary;
}
</style>
