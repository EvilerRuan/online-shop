<template>
  <view class="page-after-sales">
    <scroll-view class="page-after-sales__list" scroll-y>
      <view v-for="item in afterSales" :key="item.id" class="after-sales-card" @tap="viewDetail(item.id)">
        <view class="after-sales-card__header">
          <text class="after-sales-card__type">{{ getTypeText(item.type) }}</text>
          <text class="after-sales-card__status" :class="`status--${item.status}`">
            {{ getStatusText(item.status) }}
          </text>
        </view>

        <view class="after-sales-card__info">
          <text class="after-sales-card__order">订单号：{{ item.order_no }}</text>
          <text class="after-sales-card__reason">退款原因：{{ item.reason }}</text>
          <text class="after-sales-card__amount">退款金额：¥{{ item.refund_amount }}</text>
        </view>

        <view class="after-sales-card__footer">
          <text class="after-sales-card__time">{{ item.created_at }}</text>
        </view>
      </view>

      <view v-if="!loading && afterSales.length === 0" class="empty">
        <text class="empty__icon">📋</text>
        <text class="empty__text">暂无售后记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface AfterSale {
  id: number
  order_id: number
  order_no: string
  type: string
  reason: string
  refund_amount: number
  status: string
  created_at: string
}

const afterSales = ref<AfterSale[]>([])
const loading = ref(false)

onMounted(() => {
  loadAfterSales()
})

async function loadAfterSales() {
  loading.value = true
  try {
    const res = await api.get<AfterSale[]>('/api/retail/after-sales')
    afterSales.value = res
  } catch (err) {
    Taro.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function getTypeText(type: string): string {
  return type === 'refund' ? '仅退款' : '退货退款'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    approved: '已同意',
    processing: '处理中',
    completed: '已完成',
    rejected: '已拒绝',
  }
  return map[status] || status
}

function viewDetail(id: number) {
  Taro.navigateTo({ url: `/pages/after-sales/detail?id=${id}` })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-after-sales {
  min-height: 100vh;
  background-color: $bg-color;
}

.page-after-sales__list {
  padding: 24px;
}

.after-sales-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.after-sales-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;
}

.after-sales-card__type {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
}

.after-sales-card__status {
  font-size: 24px;
}

.status--pending { color: #ff9800; }
.status--approved { color: #2196f3; }
.status--processing { color: #9c27b0; }
.status--completed { color: #4caf50; }
.status--rejected { color: #ff4d4f; }

.after-sales-card__info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.after-sales-card__order,
.after-sales-card__reason,
.after-sales-card__amount {
  font-size: 24px;
  color: $text-color-secondary;
}

.after-sales-card__footer {
  padding-top: 16px;
  border-top: 1px solid $border-color;
}

.after-sales-card__time {
  font-size: 22px;
  color: $text-color-light;
}

.empty {
  padding: 120px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty__icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.empty__text {
  font-size: 26px;
  color: $text-color-secondary;
}
</style>
