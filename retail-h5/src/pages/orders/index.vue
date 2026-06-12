<template>
  <view class="page-orders">
    <!-- Tab 筛选 -->
    <view class="page-orders__tabs">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === index }"
        @tap="switchTab(index)"
      >
        {{ tab.label }}
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view class="page-orders__list" scroll-y @scrolltolower="loadMore">
      <view v-for="order in orders" :key="order.id" class="order-card">
        <view class="order-card__header">
          <text class="order-card__no">订单号：{{ order.order_no }}</text>
          <text class="order-card__status" :class="`status--${order.status}`">
            {{ getStatusText(order.status) }}
          </text>
        </view>

        <view class="order-card__products">
          <view
            v-for="item in order.items"
            :key="item.id"
            class="order-product"
            @tap="goToDetail(item.product_id)"
          >
            <image
              v-if="item.product_image"
              class="order-product__img"
              :src="item.product_image"
              mode="aspectFill"
            />
            <view v-else class="order-product__placeholder">📦</view>
            <view class="order-product__info">
              <text class="order-product__name">{{ item.product_name }}</text>
              <view class="order-product__bottom">
                <text class="order-product__price">¥{{ item.price }}</text>
                <text class="order-product__qty">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="order-card__footer">
          <text class="order-card__total">共{{ order.total_quantity }}件，合计 ¥{{ order.total_amount }}</text>
          <view class="order-card__actions">
            <view v-if="order.status === 'pending_payment'" class="action-btn action-btn--primary" @tap="payOrder(order.id)">
              去付款
            </view>
            <view v-if="order.status === 'pending_shipment'" class="action-btn" @tap="cancelOrder(order.id)">
              取消订单
            </view>
            <view v-if="order.status === 'pending_receipt'" class="action-btn action-btn--primary" @tap="confirmReceipt(order.id)">
              确认收货
            </view>
            <view class="action-btn" @tap="viewDetail(order.id)">
              查看详情
            </view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-more">加载中...</view>
      <view v-else-if="!hasMore && orders.length > 0" class="no-more">没有更多了</view>
      <view v-else-if="!loading && orders.length === 0" class="empty">
        <text class="empty__icon">📋</text>
        <text class="empty__text">暂无订单</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface Order {
  id: number
  order_no: string
  status: string
  total_amount: number
  total_quantity: number
  items: Array<{
    id: number
    product_id: number
    product_name: string
    product_image: string
    price: number
    quantity: number
  }>
}

const orders = ref<Order[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const activeTab = ref(0)

const tabs = [
  { label: '全部', status: '' },
  { label: '待付款', status: 'pending_payment' },
  { label: '待发货', status: 'pending_shipment' },
  { label: '待收货', status: 'pending_receipt' },
  { label: '已完成', status: 'completed' },
  { label: '已取消', status: 'cancelled' },
]

const statusMap: Record<string, string> = {
  pending_payment: '待付款',
  pending_shipment: '待发货',
  pending_receipt: '待收货',
  completed: '已完成',
  cancelled: '已取消',
}

onMounted(() => {
  loadOrders()
})

function switchTab(index: number) {
  if (activeTab.value === index) return
  activeTab.value = index
  page.value = 1
  hasMore.value = true
  orders.value = []
  loadOrders()
}

async function loadOrders() {
  if (loading.value || !hasMore.value) return
  loading.value = true

  try {
    const params: Record<string, any> = {
      page: page.value,
      page_size: 10,
    }

    const status = tabs[activeTab.value].status
    if (status) params.status = status

    const res = await api.get<any>('/api/retail/orders', params)

    const list = res?.list || []
    const total = res?.total || 0

    if (page.value === 1) {
      orders.value = list
    } else {
      orders.value = [...orders.value, ...list]
    }

    hasMore.value = orders.value.length < total
  } catch (err) {
    Taro.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (hasMore.value && !loading.value) {
    page.value++
    loadOrders()
  }
}

function getStatusText(status: string): string {
  return statusMap[status] || status
}

function goToDetail(productId: number) {
  Taro.navigateTo({ url: `/pages/product-detail/index?id=${productId}` })
}

function viewDetail(orderId: number) {
  Taro.navigateTo({ url: `/pages/order-detail/index?id=${orderId}` })
}

async function payOrder(orderId: number) {
  Taro.showToast({ title: '模拟支付成功', icon: 'success' })
}

async function cancelOrder(orderId: number) {
  try {
    await api.put(`/api/retail/orders/${orderId}/cancel`)
    Taro.showToast({ title: '订单已取消', icon: 'success' })
    loadOrders()
  } catch (err) {
    Taro.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function confirmReceipt(orderId: number) {
  try {
    await api.put(`/api/retail/orders/${orderId}/confirm`)
    Taro.showToast({ title: '确认收货成功', icon: 'success' })
    loadOrders()
  } catch (err) {
    Taro.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-orders {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-orders__tabs {
  display: flex;
  background-color: #fff;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
  overflow-x: auto;
}

.tab-item {
  padding: 24px 20px;
  font-size: 26px;
  color: $text-color-secondary;
  white-space: nowrap;
  position: relative;
}

.tab-item--active {
  color: $primary-color;
  font-weight: 600;
}

.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background-color: $primary-color;
  border-radius: 2px;
}

.page-orders__list {
  flex: 1;
  padding: 24px;
}

.order-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;
  margin-bottom: 16px;
}

.order-card__no {
  font-size: 24px;
  color: $text-color-secondary;
}

.order-card__status {
  font-size: 26px;
  font-weight: 600;
}

.status--pending_payment { color: #ff9800; }
.status--pending_shipment { color: #2196f3; }
.status--pending_receipt { color: #9c27b0; }
.status--completed { color: #4caf50; }
.status--cancelled { color: #999; }

.order-card__products {
  margin-bottom: 16px;
}

.order-product {
  display: flex;
  margin-bottom: 12px;
}

.order-product:last-child {
  margin-bottom: 0;
}

.order-product__img,
.order-product__placeholder {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  flex-shrink: 0;
}

.order-product__img {
  object-fit: cover;
}

.order-product__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background-color: $bg-color;
}

.order-product__info {
  flex: 1;
  margin-left: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.order-product__name {
  font-size: 26px;
  color: $text-color;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.order-product__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-product__price {
  font-size: 28px;
  font-weight: 600;
  color: $price-color;
}

.order-product__qty {
  font-size: 24px;
  color: $text-color-secondary;
}

.order-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid $border-color;
}

.order-card__total {
  font-size: 26px;
  color: $text-color;
}

.order-card__actions {
  display: flex;
  gap: 16px;
}

.action-btn {
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 24px;
  color: $text-color;
  border: 1px solid $border-color;
}

.action-btn--primary {
  background-color: $primary-color;
  color: #fff;
  border: none;
}

.loading-more,
.no-more {
  padding: 40px 0;
  text-align: center;
  font-size: 24px;
  color: $text-color-secondary;
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
