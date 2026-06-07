<template>
  <div class="page-product-detail">
    <van-nav-bar
      title="商品详情"
      left-arrow
      @click-left="$router.back()"
    />

    <van-loading v-if="loading" class="page-product-detail__loading" vertical>
      加载中...
    </van-loading>

    <template v-if="product">
      <!-- 商品主图 -->
      <van-swipe class="page-product-detail__swipe" :autoplay="3000" indicator-color="#fff">
        <van-swipe-item v-if="product.main_image">
          <van-image
            :src="product.main_image"
            fit="cover"
            class="page-product-detail__main-image"
          />
        </van-swipe-item>
        <van-swipe-item v-else>
          <div class="page-product-detail__main-image page-product-detail__main-image--empty">
            <van-icon name="photo-o" size="48" color="#dcdee0" />
          </div>
        </van-swipe-item>
      </van-swipe>

      <!-- 商品信息 -->
      <div class="page-product-detail__info">
        <div class="page-product-detail__price-row">
          <span class="page-product-detail__price">
            <span class="page-product-detail__price-symbol">¥</span>
            <span class="page-product-detail__price-value">{{ priceRange }}</span>
          </span>
          <span class="page-product-detail__product-no">编号：{{ product.product_no }}</span>
        </div>
        <h1 class="page-product-detail__name">{{ product.name }}</h1>
        <div class="page-product-detail__meta">
          <span v-if="product.min_order_qty > 1">最低订购量：{{ product.min_order_qty }}</span>
        </div>
        <div class="page-product-detail__sku-quick">
          <span class="page-product-detail__sku-quick-label">规格：</span>
          <span class="page-product-detail__sku-quick-value">
            <template v-for="(sku, i) in product.skus" :key="sku.id">
              {{ i > 0 ? ' | ' : '' }}{{ sku.sku_name }}：{{ sku.quantity }}个
            </template>
          </span>
        </div>
        <div class="page-product-detail__meta page-product-detail__meta--second">
          <span v-if="product.barcode">条码：{{ product.barcode }}</span>
          <span v-if="product.barcode" class="page-product-detail__meta-divider">|</span>
          <span>库存：{{ product.stock }}</span>
        </div>
      </div>

      <!-- 商品描述 -->
      <div class="page-product-detail__section">
        <div class="page-product-detail__section-title">商品详情</div>
        <div class="page-product-detail__description" v-html="sanitizedDescription" />
      </div>

      <!-- 底部占位 -->
      <div class="page-product-detail__bottom-placeholder" />
    </template>

    <!-- 底部操作栏 -->
    <div class="page-product-detail__bottom-bar">
      <div class="page-product-detail__bottom-left">
        <div class="page-product-detail__bottom-icon" @click="onContact">
          <van-icon name="service-o" size="22" />
          <span>联系客服</span>
        </div>
        <div class="page-product-detail__bottom-icon" @click="goCart">
          <van-badge :content="cartBadge" :show-zero="false">
            <van-icon name="shopping-cart-o" size="22" />
          </van-badge>
          <span>购物车</span>
        </div>
      </div>
      <van-button
        type="primary"
        round
        class="page-product-detail__btn-cart"
        @click="showCartPopup = true"
      >
        加入购物车
      </van-button>
    </div>

    <!-- 加购弹框 -->
    <CartPopup
      v-model:show="showCartPopup"
      :product="product"
      @added="onCartAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import DOMPurify from 'dompurify'
import type { ProductDetail } from 'shared/types/product'
import { useCartStore } from '@/stores/useCartStore'
import request from '@/utils/request'
import CartPopup from '@/components/CartPopup.vue'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const product = ref<ProductDetail | null>(null)
const loading = ref(true)
const showCartPopup = ref(false)

const cartBadge = computed(() => {
  const count = cartStore.items.length
  return count > 0 ? (count > 99 ? '99+' : String(count)) : ''
})

const priceRange = computed(() => {
  if (!product.value) return '0.00'
  return product.value.price.toFixed(2)
})

const sanitizedDescription = computed(() => {
  if (!product.value?.description) return '<p style="color:#999;text-align:center;padding:20px 0;">暂无商品详情</p>'
  return DOMPurify.sanitize(product.value.description)
})

async function fetchProduct() {
  const id = route.params.id as string
  loading.value = true
  try {
    const res = await request.get(`/products/${id}`)
    product.value = res.data.data
  } catch {
    showToast('获取商品信息失败')
  } finally {
    loading.value = false
  }
}

function onContact() {
  showToast('客服功能暂未开放')
}

function goCart() {
  router.push({ name: 'Cart' })
}

function onCartAdded() {
  cartStore.fetchCart()
}

onMounted(() => {
  fetchProduct()
})
</script>

<style scoped>
.page-product-detail {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: env(safe-area-inset-bottom);
}

.page-product-detail__loading {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}

.page-product-detail__swipe {
  width: 100%;
}

.page-product-detail__main-image {
  width: 100%;
  aspect-ratio: 1;
}

.page-product-detail__main-image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;
}

.page-product-detail__info {
  background: #fff;
  padding: 12px 16px;
}

.page-product-detail__price-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.page-product-detail__price {
  color: var(--price-color);
  font-weight: 600;
}

.page-product-detail__price-symbol {
  font-size: 14px;
}

.page-product-detail__price-value {
  font-size: 22px;
}

.page-product-detail__product-no {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.page-product-detail__name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
  margin-top: 6px;
  line-height: 1.5;
}

.page-product-detail__meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.page-product-detail__meta--second {
  margin-top: 2px;
}

.page-product-detail__meta-divider {
  margin: 0 4px;
  color: #e5e5e5;
}

.page-product-detail__sku-quick {
  margin-top: 8px;
  padding: 6px 10px;
  background: #f7f8fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}

.page-product-detail__sku-quick-label {
  color: var(--text-color-secondary);
}

.page-product-detail__sku-quick-value {
  color: var(--text-color);
}

.page-product-detail__section {
  background: #fff;
  margin-top: 8px;
  padding: 12px 16px;
}

.page-product-detail__section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 10px;
}

.page-product-detail__description {
  font-size: 14px;
  color: var(--text-color);
  line-height: 1.8;
  word-break: break-all;
}

.page-product-detail__bottom-placeholder {
  height: 56px;
}

.page-product-detail__bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.page-product-detail__bottom-left {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-right: 12px;
}

.page-product-detail__bottom-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  color: var(--text-color);
  cursor: pointer;
  gap: 2px;
}

.page-product-detail__btn-cart {
  flex: 1;
  height: 36px;
  font-size: 14px;
}
</style>
