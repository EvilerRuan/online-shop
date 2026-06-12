<template>
  <view class="page-cart">
    <view class="page-cart__body" v-if="items.length > 0">
      <scroll-view scroll-y class="page-cart__scroll">
        <view class="page-cart__list">
          <view v-for="item in items" :key="item.id" class="cart-item">
            <image :src="item.main_image || ''" class="cart-item__img" mode="aspectFill" />
            <view class="cart-item__info">
              <text class="cart-item__name">{{ item.product_name }}</text>
              <text class="cart-item__sku">{{ item.sku_name }}</text>
              <view class="cart-item__bottom">
                <text class="cart-item__price">¥{{ formatPrice(item.price) }}</text>
                <view class="cart-item__qty">
                  <text class="cart-item__qty-btn" @tap="decreaseQty(item)">−</text>
                  <text class="cart-item__qty-value">{{ item.quantity }}</text>
                  <text class="cart-item__qty-btn" @tap="increaseQty(item)">+</text>
                </view>
              </view>
            </view>
            <view class="cart-item__delete" @tap="removeItem(item)">
              <text class="delete-icon">🗑️</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 底部结算栏 -->
      <view class="page-cart__footer">
        <view class="page-cart__total">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ totalPrice }}</text>
        </view>
        <view class="page-cart__checkout" @tap="goCheckout">
          <text class="checkout-text">结算({{ items.length }})</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="page-cart__empty">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车空空如也</text>
      <view class="empty-btn" @tap="goHome">
        <text class="empty-btn-text">去逛逛</text>
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
  product_name: string
  sku_name: string
  main_image: string | null
  price: number
  quantity: number
}

const items = ref<CartItem[]>([])

const totalPrice = computed(() => {
  return items.value.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
})

function formatPrice(price: number): string {
  return Number(price).toFixed(2)
}

async function fetchCart() {
  try {
    const res = await api.get<any[]>('/api/retail/cart')
    console.log('[Cart] API response:', JSON.stringify(res))
    console.log('[Cart] isArray:', Array.isArray(res))
    // api.get 已经通过 request.ts 返回 body.data，即购物车数组
    items.value = Array.isArray(res) ? res : []
    console.log('[Cart] items:', items.value.length, '条')
  } catch (err: any) {
    console.error('[Cart] fetch error:', err)
    Taro.showToast({ title: err.message || '加载失败', icon: 'none' })
  }
}

async function updateQuantity(itemId: number, quantity: number) {
  try {
    await api.put(`/api/retail/cart/${itemId}`, { quantity })
    fetchCart()
  } catch (err: any) {
    Taro.showToast({ title: err.message || '更新失败', icon: 'none' })
  }
}

async function removeItem(item: CartItem) {
  Taro.showModal({
    title: '提示',
    content: '确定要删除该商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await api.delete(`/api/retail/cart/${item.id}`)
          fetchCart()
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch (err: any) {
          Taro.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function increaseQty(item: CartItem) {
  updateQuantity(item.id, item.quantity + 1)
}

function decreaseQty(item: CartItem) {
  if (item.quantity <= 1) return
  updateQuantity(item.id, item.quantity - 1)
}

function goCheckout() {
  Taro.navigateTo({ url: '/pages/checkout/index' })
}

function goHome() {
  Taro.switchTab({ url: '/pages/home/index' })
}

onMounted(() => {
  fetchCart()
})

// 页面显示时刷新（TabBar 切换也会触发）
useDidShow(() => {
  fetchCart()
})
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-cart {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $bg-color;
  overflow: hidden;
}

.page-cart__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-cart__scroll {
  flex: 1;
  overflow: hidden;
}

.page-cart__list {
  padding: 16px;
}

.cart-item {
  display: flex;
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;

  &__img {
    width: 120px;
    height: 120px;
    border-radius: 8px;
    background-color: #f7f8fa;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    margin-left: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }

  &__name {
    font-size: 26px;
    color: $text-color;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  &__sku {
    font-size: 22px;
    color: $text-color-secondary;
    margin-top: 6px;
    display: block;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }

  &__price {
    font-size: 28px;
    font-weight: 600;
    color: $price-color;
  }

  &__qty {
    display: flex;
    align-items: center;
    border: 1px solid $border-color;
    border-radius: 8px;
    overflow: hidden;
  }

  &__qty-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: $text-color;
    background-color: #f7f8fa;
  }

  &__qty-value {
    min-width: 48px;
    text-align: center;
    font-size: 24px;
    color: $text-color;
  }

  &__delete {
    padding: 0 0 0 16px;
    display: flex;
    align-items: center;

    .delete-icon {
      font-size: 28px;
    }
  }
}

.page-cart__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #fff;
  border-top: 1px solid $border-color;
  flex-shrink: 0;
}

.page-cart__total {
  display: flex;
  align-items: baseline;

  .total-label {
    font-size: 24px;
    color: $text-color;
  }

  .total-price {
    font-size: 32px;
    font-weight: 600;
    color: $price-color;
  }
}

.page-cart__checkout {
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  padding: 12px 28px;
  border-radius: 24px;

  .checkout-text {
    font-size: 26px;
    color: #fff;
    font-weight: 600;
  }
}

.page-cart__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 100px;

  .empty-icon {
    font-size: 72px;
    margin-bottom: 20px;
  }

  .empty-text {
    font-size: 28px;
    color: $text-color-secondary;
    margin-bottom: 24px;
  }
}

.empty-btn {
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  padding: 12px 32px;
  border-radius: 24px;

  .empty-btn-text {
    font-size: 26px;
    color: #fff;
  }
}
</style>
