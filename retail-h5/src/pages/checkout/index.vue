<template>
  <view class="page-checkout">
    <!-- 加载状态 -->
    <view v-if="loading" class="page-checkout__loading">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else class="page-checkout__content">
      <!-- 收货地址 -->
      <view class="section-card address-card" @tap="goAddress">
        <view v-if="defaultAddress" class="address-info">
          <view class="address-info__top">
            <text class="address-info__name">{{ defaultAddress.recipient_name }}</text>
            <text class="address-info__phone">{{ defaultAddress.phone }}</text>
          </view>
          <text class="address-info__detail">
            {{ defaultAddress.province }}{{ defaultAddress.city }}{{ defaultAddress.district }}{{ defaultAddress.detail }}
          </text>
        </view>
        <view v-else class="address-empty">
          <text class="empty-icon">📍</text>
          <text class="empty-text">暂无收货地址</text>
          <text class="empty-hint">点击添加收货地址</text>
        </view>
        <text class="arrow-icon">→</text>
      </view>

      <!-- 商品清单 -->
      <view class="section-card goods-list">
        <view v-for="item in orderItems" :key="item.id" class="goods-item">
          <image :src="item.main_image || ''" class="goods-item__image" mode="aspectFill" />
          <view class="goods-item__info">
            <text class="goods-item__name">{{ item.product_name }}</text>
            <text class="goods-item__sku">{{ item.sku_name }}</text>
            <view class="goods-item__bottom">
              <text class="goods-item__price">¥{{ formatPrice(item.price) }}</text>
              <text class="goods-item__qty">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
        <view class="goods-total">
          <text class="goods-total__text">共 {{ totalQty }} 件商品，合计：</text>
          <text class="goods-total__price">¥{{ totalPrice }}</text>
        </view>
      </view>

      <!-- 订单备注 -->
      <view class="section-card remark-card">
        <textarea
          class="remark-input"
          v-model="remark"
          placeholder="选填，请输入订单备注"
          maxlength="200"
          :auto-height="true"
        />
        <text class="remark-count">{{ remark.length }}/200</text>
      </view>
    </view>

    <!-- 底部提交 -->
    <view v-if="!loading" class="page-checkout__bottom">
      <view class="page-checkout__total">
        <text class="total-label">合计：</text>
        <text class="total-price">¥{{ totalPrice }}</text>
      </view>
      <view
        class="submit-btn"
        :class="{ 'submit-btn--disabled': !canSubmit || submitting }"
        @tap="handleSubmit"
      >
        <text class="submit-btn__text">{{ submitting ? '提交中...' : '提交订单' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'
import api from '@/utils/request'

interface CartItem {
  id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string
  main_image: string | null
  price: number
  quantity: number
}

interface Address {
  id: number
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
}

const loading = ref(false)
const submitting = ref(false)
const remark = ref('')
const orderItems = ref<CartItem[]>([])
const addresses = ref<Address[]>([])
const defaultAddress = ref<Address | null>(null)

const totalQty = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

const totalPrice = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
)

const canSubmit = computed(() => !!defaultAddress.value && orderItems.value.length > 0)

function formatPrice(price: number): string {
  return Number(price).toFixed(2)
}

async function loadAddresses() {
  try {
    const res = await api.get<any>('/api/retail/addresses')
    const list = res || []
    addresses.value = list

    // 如果有选中的地址 ID（从地址页返回时设置）
    const selectedId = Taro.getStorageSync('selected_address_id')
    if (selectedId) {
      const selected = list.find((a: Address) => a.id === selectedId)
      if (selected) {
        defaultAddress.value = selected
        return
      }
    }

    // 使用默认地址或第一个地址
    defaultAddress.value = list.find((a: Address) => a.is_default) || list[0] || null
  } catch {
    Taro.showToast({ title: '加载地址失败', icon: 'none' })
  }
}

async function loadCart() {
  try {
    const res = await api.get<any[]>('/api/retail/cart')
    // api.get 已经通过 request.ts 返回 body.data，即购物车数组
    orderItems.value = Array.isArray(res) ? res : []
  } catch {
    Taro.showToast({ title: '加载购物车失败', icon: 'none' })
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadCart()

    if (orderItems.value.length === 0) {
      Taro.showToast({ title: '没有可结算的商品', icon: 'none' })
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/cart/index' })
      }, 1000)
      return
    }

    await loadAddresses()
  } catch {
    Taro.showToast({ title: '加载数据失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

// 页面显示时重新加载地址（从地址页返回时）
useDidShow(() => {
  if (orderItems.value.length > 0) {
    loadAddresses()
  }
})

function goAddress() {
  Taro.navigateTo({ url: '/pages/address/index?from=checkout' })
}

async function handleSubmit() {
  if (!defaultAddress.value || submitting.value) return

  // 模拟支付确认
  Taro.showModal({
    title: '确认支付',
    content: `订单金额：¥${totalPrice.value}，确认支付？`,
    confirmText: '立即支付',
    success: async (res) => {
      if (!res.confirm) return

      submitting.value = true
      try {
        // 将购物车项转换为订单 API 需要的 items 格式
        const cartIds = orderItems.value.map((item) => item.id)
        const items = orderItems.value.map((item) => ({
          product_id: item.product_id,
          sku_id: item.sku_id || undefined,
          quantity: item.quantity,
        }))

        const apiRes = await api.post('/api/retail/orders', {
          address_id: defaultAddress.value.id,
          items,
          cart_ids: cartIds,
          remark: remark.value,
        })

        const orderId = apiRes?.order_id
        if (!orderId) {
          Taro.showToast({ title: '订单创建异常', icon: 'none' })
          return
        }

        // 清理选中的地址
        Taro.removeStorageSync('selected_address_id')

        Taro.showToast({ title: '支付成功', icon: 'success' })

        // 跳转到订单详情页
        setTimeout(() => {
          Taro.redirectTo({ url: `/pages/order-detail/index?id=${orderId}` })
        }, 500)
      } catch (err: any) {
        Taro.showToast({ title: err.message || '下单失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    },
  })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-checkout {
  min-height: 100vh;
  background-color: $bg-color;
  padding-bottom: 100px;
}

/* 加载状态 */
.page-checkout__loading {
  display: flex;
  justify-content: center;
  padding-top: 200px;
}

.loading-text {
  font-size: 28px;
  color: $text-color-secondary;
}

/* 内容区 */
.page-checkout__content {
  padding: 16px;
}

.section-card {
  background-color: #fff;
  border-radius: 16px;
  margin-bottom: 16px;
  overflow: hidden;
}

/* 地址卡片 */
.address-card {
  display: flex;
  align-items: center;
  padding: 20px 24px;
}

.address-info {
  flex: 1;
  min-width: 0;
}

.address-info__top {
  margin-bottom: 8px;
}

.address-info__name {
  font-size: 28px;
  font-weight: 600;
  margin-right: 16px;
  color: $text-color;
}

.address-info__phone {
  font-size: 24px;
  color: $text-color-secondary;
}

.address-info__detail {
  font-size: 24px;
  color: $text-color-secondary;
  line-height: 1.5;
}

.address-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 26px;
  color: $text-color-secondary;
}

.empty-hint {
  font-size: 22px;
  color: $primary-color;
  margin-top: 8px;
}

.arrow-icon {
  font-size: 28px;
  color: $text-color-light;
  margin-left: 8px;
}

/* 商品列表 */
.goods-list {
  padding: 16px 24px;
}

.goods-item {
  display: flex;
  padding: 16px 0;
  border-bottom: 1px solid $border-color;

  &:last-of-type {
    border-bottom: none;
  }
}

.goods-item__image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  background-color: #f7f8fa;
  flex-shrink: 0;
  margin-right: 16px;
}

.goods-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.goods-item__name {
  font-size: 26px;
  font-weight: 500;
  color: $text-color;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-item__sku {
  font-size: 22px;
  color: $text-color-secondary;
  margin-top: 6px;
}

.goods-item__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.goods-item__price {
  font-size: 28px;
  font-weight: 600;
  color: $price-color;
}

.goods-item__qty {
  font-size: 24px;
  color: $text-color-secondary;
}

.goods-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 16px;
}

.goods-total__text {
  font-size: 24px;
  color: $text-color-secondary;
  margin-right: 12px;
}

.goods-total__price {
  font-size: 32px;
  font-weight: 600;
  color: $price-color;
}

/* 备注卡片 */
.remark-card {
  padding: 16px 24px;
}

.remark-input {
  width: 100%;
  min-height: 80px;
  font-size: 26px;
  color: $text-color;
  line-height: 1.5;
}

.remark-count {
  font-size: 22px;
  color: $text-color-light;
  text-align: right;
  display: block;
  margin-top: 8px;
}

/* 底部 */
.page-checkout__bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
  gap: 16px;
  border-top: 1px solid $border-color;
  z-index: 100;
}

.page-checkout__total {
  display: flex;
  align-items: baseline;
}

.total-label {
  font-size: 24px;
  color: $text-color;
}

.total-price {
  font-size: 36px;
  font-weight: 600;
  color: $price-color;
}

.submit-btn {
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  padding: 16px 32px;
  border-radius: 24px;

  .submit-btn__text {
    font-size: 28px;
    color: #fff;
    font-weight: 600;
  }

  &--disabled {
    background: $border-color;

    .submit-btn__text {
      color: $text-color-light;
    }
  }
}
</style>
