<template>
  <view class="page-points">
    <scroll-view class="page-points__content" scroll-y>
      <!-- 积分余额 -->
      <view class="points-header">
        <view class="points-balance">
          <text class="points-balance__label">我的积分</text>
          <text class="points-balance__value">{{ pointsInfo.balance || 0 }}</text>
        </view>
        <view class="points-actions">
          <view class="points-action-btn" @tap="goToRedeemProducts">
            积分兑换
          </view>
          <view class="points-action-btn" @tap="goToRedeemHistory">
            兑换记录
          </view>
        </view>
      </view>

      <!-- 积分获取规则 -->
      <view class="points-section">
        <text class="points-section__title">积分获取规则</text>
        <view class="rules-list">
          <view class="rule-item">
            <text class="rule-item__icon">🎁</text>
            <view class="rule-item__info">
              <text class="rule-item__name">注册赠送</text>
              <text class="rule-item__desc">新用户注册即送100积分</text>
            </view>
          </view>
          <view class="rule-item">
            <text class="rule-item__icon">👥</text>
            <view class="rule-item__info">
              <text class="rule-item__name">邀请好友</text>
              <text class="rule-item__desc">每邀请一位好友注册奖励50积分</text>
            </view>
          </view>
          <view class="rule-item">
            <text class="rule-item__icon">📦</text>
            <view class="rule-item__info">
              <text class="rule-item__name">首次确认收货</text>
              <text class="rule-item__desc">首次确认收货奖励200积分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 积分流水 -->
      <view class="points-section">
        <text class="points-section__title">积分明细</text>
        <view v-for="item in ledger" :key="item.id" class="ledger-item">
          <view class="ledger-item__info">
            <text class="ledger-item__type">{{ getTypeText(item.type) }}</text>
            <text class="ledger-item__time">{{ item.created_at }}</text>
          </view>
          <text class="ledger-item__amount" :class="item.amount > 0 ? 'ledger-item__amount--add' : 'ledger-item__amount--minus'">
            {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
          </text>
        </view>
        <view v-if="!loading && ledger.length === 0" class="empty">
          <text class="empty__text">暂无积分记录</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface PointsInfo {
  balance: number
  total_earned: number
  total_spent: number
}

interface LedgerItem {
  id: number
  type: string
  amount: number
  created_at: string
}

const pointsInfo = ref<Partial<PointsInfo>>({})
const ledger = ref<LedgerItem[]>([])
const loading = ref(false)

onMounted(() => {
  loadPointsInfo()
  loadLedger()
})

async function loadPointsInfo() {
  try {
    const res = await api.get<PointsInfo>('/api/retail/points/balance')
    pointsInfo.value = res
  } catch (err) {
    console.error('加载积分信息失败', err)
  }
}

async function loadLedger() {
  loading.value = true
  try {
    const res = await api.get<LedgerItem[]>('/api/retail/points/ledger', {
      page: 1,
      limit: 20,
    })
    ledger.value = res
  } catch (err) {
    console.error('加载积分流水失败', err)
  } finally {
    loading.value = false
  }
}

function getTypeText(type: string): string {
  const map: Record<string, string> = {
    register: '注册赠送',
    referral: '邀请奖励',
    first_purchase: '首次购买奖励',
    redeem: '积分兑换',
  }
  return map[type] || type
}

function goToRedeemProducts() {
  Taro.navigateTo({ url: '/pages/points/products' })
}

function goToRedeemHistory() {
  Taro.navigateTo({ url: '/pages/points/redeems' })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-points {
  min-height: 100vh;
  background-color: $bg-color;
}

.page-points__content {
  min-height: 100vh;
}

.points-header {
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  padding: 60px 32px 40px;
}

.points-balance {
  text-align: center;
  margin-bottom: 32px;
}

.points-balance__label {
  display: block;
  font-size: 26px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 12px;
}

.points-balance__value {
  font-size: 72px;
  font-weight: 600;
  color: #fff;
}

.points-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.points-action-btn {
  padding: 16px 32px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 32px;
  font-size: 26px;
  color: #fff;
}

.points-section {
  background-color: #fff;
  padding: 24px;
  margin-bottom: 16px;
}

.points-section__title {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
  display: block;
  margin-bottom: 20px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: $bg-color;
  border-radius: 12px;
}

.rule-item__icon {
  font-size: 40px;
  margin-right: 16px;
}

.rule-item__info {
  display: flex;
  flex-direction: column;
}

.rule-item__name {
  font-size: 26px;
  font-weight: 600;
  color: $text-color;
}

.rule-item__desc {
  font-size: 22px;
  color: $text-color-secondary;
  margin-top: 4px;
}

.ledger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid $border-color;
}

.ledger-item:last-child {
  border-bottom: none;
}

.ledger-item__info {
  display: flex;
  flex-direction: column;
}

.ledger-item__type {
  font-size: 26px;
  color: $text-color;
}

.ledger-item__time {
  font-size: 22px;
  color: $text-color-secondary;
  margin-top: 4px;
}

.ledger-item__amount {
  font-size: 28px;
  font-weight: 600;
}

.ledger-item__amount--add {
  color: $primary-color;
}

.ledger-item__amount--minus {
  color: #ff4d4f;
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
