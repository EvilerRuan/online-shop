<template>
  <view class="page-order-detail">
    <scroll-view class="page-order-detail__content" scroll-y>
      <!-- 订单状态 -->
      <view class="order-status" :class="`order-status--${order.status}`">
        <text class="order-status__icon">{{ getStatusIcon(order.status) }}</text>
        <text class="order-status__text">{{ getStatusText(order.status) }}</text>
      </view>

      <!-- 收货地址 -->
      <view v-if="order.recipient_name" class="order-section">
        <view class="order-section__header">
          <text class="order-section__title">收货地址</text>
        </view>
        <view class="address-info">
          <text class="address-info__name">{{ order.recipient_name }}</text>
          <text class="address-info__phone">{{ order.recipient_phone }}</text>
          <text class="address-info__detail">
            {{ order.address }}
          </text>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="order-section">
        <view class="order-section__header">
          <text class="order-section__title">商品信息</text>
        </view>
        <view v-for="item in order.items" :key="item.id" class="order-product">
          <image
            v-if="item.main_image"
            class="order-product__img"
            :src="item.main_image"
            mode="aspectFill"
          />
          <view v-else class="order-product__placeholder"></view>
          <view class="order-product__info">
            <text class="order-product__name">{{ item.product_name }}</text>
            <view class="order-product__bottom">
              <text class="order-product__price">¥{{ formatPrice(item.price) }}</text>
              <text class="order-product__qty">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="order-section">
        <view class="order-section__header">
          <text class="order-section__title">订单信息</text>
        </view>
        <view class="order-info">
          <view class="order-info__row">
            <text class="order-info__label">订单编号</text>
            <text class="order-info__value">{{ order.order_no }}</text>
          </view>
          <view class="order-info__row">
            <text class="order-info__label">下单时间</text>
            <text class="order-info__value">{{ order.created_at }}</text>
          </view>
          <view v-if="order.shipping_fee" class="order-info__row">
          <text class="order-info__label">运费</text>
          <text class="order-info__value">¥{{ formatPrice(order.shipping_fee) }}</text>
        </view>
        </view>
      </view>

      <!-- 金额明细 -->
      <view class="order-section order-section--total">
        <view class="order-info__row">
          <text class="order-info__label">商品合计</text>
          <text class="order-info__value">¥{{ formatPrice(order.total_amount) }}</text>
        </view>
        <view class="order-info__row order-info__row--total">
          <text class="order-info__label">实付金额</text>
          <text class="order-info__value order-info__value--total">¥{{ formatPrice(order.total_amount) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作 -->
    <view v-if="order.status" class="page-order-detail__footer">
      <view v-if="order.status === 'pending_shipment'" class="action-btn" @tap="cancelOrder">
        取消订单
      </view>
      <view v-if="order.status === 'pending_receipt'" class="action-btn action-btn--primary" @tap="confirmReceipt">
        确认收货
      </view>
      <view v-if="order.status === 'completed'" class="action-btn" @tap="applyAfterSales">
        申请售后
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface OrderDetail {
  id: number
  order_no: string
  status: string
  total_amount: number
  shipping_fee?: number
  created_at: string
  recipient_name?: string
  recipient_phone?: string
  address?: string
  items: Array<{
    id: number
    product_id: number
    product_name: string
    main_image: string
    price: number
    quantity: number
  }>
}

const order = ref<Partial<OrderDetail>>({})

onMounted(() => {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options

  if (options.id) {
    loadOrder(parseInt(options.id))
  }
})

async function loadOrder(id: number) {
  try {
    const res = await api.get<OrderDetail>(`/api/retail/orders/${id}`)
    order.value = res
  } catch (err) {
    Taro.showToast({ title: '加载失败', icon: 'none' })
  }
}

function formatPrice(price: number): string {
  return Number(price || 0).toFixed(2)
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending_payment: '待付款',
    pending_shipment: '待发货',
    pending_receipt: '待收货',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getStatusIcon(status: string): string {
  const map: Record<string, string> = {
    pending_payment: '⏳',
    pending_shipment: '📦',
    pending_receipt: '🚚',
    completed: '✅',
    cancelled: '❌',
  }
  return map[status] || '📋'
}

async function cancelOrder() {
  try {
    await api.put(`/api/retail/orders/${order.value.id}/cancel`)
    Taro.showToast({ title: '订单已取消', icon: 'success' })
    loadOrder(order.value.id!)
  } catch (err) {
    Taro.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function confirmReceipt() {
  try {
    await api.put(`/api/retail/orders/${order.value.id}/confirm`)
    Taro.showToast({ title: '确认收货成功', icon: 'success' })
    loadOrder(order.value.id!)
  } catch (err) {
    Taro.showToast({ title: '操作失败', icon: 'none' })
  }
}

function applyAfterSales() {
  Taro.navigateTo({ url: `/pages/after-sales/apply?order_id=${order.value.id}` })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-order-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-order-detail__content {
  flex: 1;
}

.order-status {
  padding: 40px 32px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  display: flex;
  align-items: center;
}

.order-status__icon {
  font-size: 48px;
  margin-right: 16px;
}

.order-status__text {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
}

.order-section {
  background-color: #fff;
  padding: 24px;
  margin-bottom: 16px;
}

.order-section--total {
  border-top: none;
}

.order-section__header {
  margin-bottom: 20px;
}

.order-section__title {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
}

.address-info {
  display: flex;
  flex-direction: column;
}

.address-info__name {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 8px;
}

.address-info__phone {
  font-size: 26px;
  color: $text-color;
  margin-bottom: 8px;
}

.address-info__detail {
  font-size: 26px;
  color: $text-color-secondary;
  line-height: 1.5;
}

.order-product {
  display: flex;
  margin-bottom: 16px;
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
}

.order-product__bottom {
  display: flex;
  justify-content: space-between;
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

.order-info__row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
}

.order-info__label {
  font-size: 26px;
  color: $text-color-secondary;
}

.order-info__value {
  font-size: 26px;
  color: $text-color;
}

.order-info__row--total {
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid $border-color;
}

.order-info__value--total {
  font-size: 32px;
  font-weight: 600;
  color: $price-color;
}

.page-order-detail__footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 24px;
  background-color: #fff;
  border-top: 1px solid $border-color;
}

.action-btn {
  padding: 16px 32px;
  border-radius: 16px;
  font-size: 26px;
  color: $text-color;
  border: 1px solid $border-color;
}

.action-btn--primary {
  background-color: $primary-color;
  color: #fff;
  border: none;
}
</style>
