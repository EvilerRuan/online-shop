<template>
  <view class="page-product-detail">
    <scroll-view class="page-product-detail__content" scroll-y>
      <!-- 商品图片 -->
      <view class="product-images">
        <image
          v-if="product.main_image"
          class="product-images__main"
          :src="product.main_image"
          mode="aspectFill"
        />
        <view v-else class="product-images__placeholder">📦</view>
      </view>

      <!-- 商品信息 -->
      <view class="product-info">
        <view class="product-info__price">
          <text class="price-symbol">¥</text>
          <text class="price-value">{{ product.price }}</text>
        </view>
        <text class="product-info__name">{{ product.name }}</text>
        <view class="product-info__meta">
          <text class="product-info__code">编号：{{ product.code }}</text>
          <text class="product-info__stock">库存：{{ product.stock }}</text>
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="product-detail">
        <text class="product-detail__title">商品详情</text>
        <view class="product-detail__content">{{ product.description }}</view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="page-product-detail__footer">
      <view class="footer-actions">
        <view class="footer-btn" @tap="goToCart">
          <text class="footer-btn__icon">🛒</text>
          <text class="footer-btn__text">购物车</text>
        </view>
      </view>
      <view class="footer-buy" @tap="addToCart">
        <text class="footer-buy__text">加入购物车</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'
import type { Product } from '@/types'

const product = ref<Partial<Product>>({
  id: 0,
  name: '',
  price: 0,
  main_image: '',
  code: '',
  stock: 0,
  description: '',
})

onMounted(() => {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options

  if (options.id) {
    loadProduct(parseInt(options.id))
  }
})

async function loadProduct(id: number) {
  try {
    const res = await api.get<Product>(`/api/retail/products/${id}`)
    product.value = res
  } catch (err) {
    Taro.showToast({ title: '加载失败', icon: 'none' })
  }
}

async function addToCart() {
  try {
    if (!product.value.id) {
      Taro.showToast({ title: '商品信息无效', icon: 'none' })
      return
    }

    const res = await api.post('/api/retail/cart', {
      product_id: product.value.id,
      quantity: 1,
    })
    console.log('Cart response:', res)
    Taro.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err: any) {
    console.error('Add to cart error:', err)
    Taro.showToast({ title: err.message || '添加失败', icon: 'none' })
  }
}

function goToCart() {
  Taro.switchTab({ url: '/pages/cart/index' })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-product-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-product-detail__content {
  flex: 1;
}

.product-images {
  width: 100%;
  height: 750px;
  background-color: #fff;
}

.product-images__main {
  width: 100%;
  height: 100%;
}

.product-images__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 160px;
}

.product-info {
  background-color: #fff;
  padding: 32px;
  margin-bottom: 16px;
}

.product-info__price {
  display: flex;
  align-items: baseline;
  margin-bottom: 16px;
}

.price-symbol {
  font-size: 28px;
  color: $price-color;
}

.price-value {
  font-size: 48px;
  font-weight: 600;
  color: $price-color;
}

.product-info__name {
  font-size: 32px;
  color: $text-color;
  line-height: 1.5;
  display: block;
  margin-bottom: 16px;
}

.product-info__meta {
  display: flex;
  justify-content: space-between;
  font-size: 24px;
  color: $text-color-secondary;
}

.product-detail {
  background-color: #fff;
  padding: 32px;
}

.product-detail__title {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
  display: block;
  margin-bottom: 20px;
}

.product-detail__content {
  font-size: 26px;
  color: $text-color;
  line-height: 1.6;
}

.page-product-detail__footer {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-top: 1px solid $border-color;
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.footer-actions {
  display: flex;
  margin-right: 20px;
}

.footer-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 24px;
}

.footer-btn__icon {
  font-size: 36px;
  margin-bottom: 4px;
}

.footer-btn__text {
  font-size: 20px;
  color: $text-color-secondary;
}

.footer-buy {
  flex: 1;
  height: 80px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-buy__text {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
}
</style>
