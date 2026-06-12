<template>
  <view class="page-home">
    <!-- 顶部导航栏 -->
    <view class="page-home__navbar">
      <view class="page-home__scan" @tap="goSearch">
        <text class="iconfont icon-scan">🔍</text>
      </view>
      <view class="page-home__search" @tap="goSearch">
        <text class="search-placeholder">输入关键字进行搜索</text>
      </view>
    </view>

    <!-- 下拉刷新 -->
    <scroll-view
      scroll-y
      class="page-home__scroll"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 加载状态 -->
      <view v-if="loading" class="page-home__loading">
        <text class="loading-text">加载中...</text>
      </view>

      <template v-else>
        <!-- Banner 轮播 -->
        <swiper
          class="page-home__banner"
          autoplay
          circular
          :interval="3000"
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#07C160"
        >
          <swiper-item
            v-for="banner in banners"
            :key="banner.id"
            @tap="handleBannerClick(banner)"
          >
            <image
              :src="banner.image_url"
              class="page-home__banner-img"
              mode="aspectFill"
            />
          </swiper-item>
          <!-- 空状态 -->
          <swiper-item v-if="banners.length === 0">
            <view class="page-home__banner-placeholder">
              <text class="banner-ph-text">🎉 欢迎来到贝壳优品零售</text>
            </view>
          </swiper-item>
        </swiper>

        <!-- 金刚区图标 -->
        <view class="page-home__icons">
          <view
            v-for="icon in quickIcons"
            :key="icon.id"
            class="page-home__icon-item"
            @tap="handleIconClick(icon)"
          >
            <view class="page-home__icon-wrap">
              <image
                v-if="icon.icon_url"
                :src="icon.icon_url"
                class="page-home__icon-img"
                mode="aspectFit"
              />
              <text v-else class="page-home__icon-placeholder">{{ icon.name.slice(0, 1) }}</text>
            </view>
            <text class="page-home__icon-name">{{ icon.name }}</text>
          </view>
        </view>

        <!-- 新品上市 -->
        <view class="page-home__section">
          <view class="page-home__section-header">
            <text class="page-home__section-title">新品上市</text>
            <text class="page-home__section-more" @tap="goMore">更多 ›</text>
          </view>

          <view class="page-home__product-grid">
            <view
              v-for="product in hotProducts"
              :key="product.id"
              class="product-card"
              @tap="goProductDetail(product.id)"
            >
              <view class="product-card__img-wrap">
                <image
                  :src="product.main_image || ''"
                  class="product-card__img"
                  mode="aspectFill"
                />
                <view class="product-card__cart-btn" @tap.stop="openCartPopup(product)">
                  <text class="cart-icon-text">🛒</text>
                </view>
              </view>
              <view class="product-card__info">
                <text class="product-card__name">{{ product.name }}</text>
                <view class="product-card__bottom">
                  <text class="product-card__price">¥{{ formatPrice(product.min_price) }}</text>
                  <text class="product-card__sales">销量: {{ product.sales_count }}</text>
                </view>
              </view>
            </view>
            <!-- 空状态 -->
            <view v-if="hotProducts.length === 0" class="page-home__empty">
              <text class="empty-icon">📦</text>
              <text class="empty-text">暂无商品</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface Banner {
  id: number
  image_url: string
  link_url: string
  sort_order: number
}

interface QuickIcon {
  id: number
  name: string
  icon_url: string
  link_url: string
  sort_order: number
}

interface HotProduct {
  id: number
  name: string
  main_image: string | null
  min_price: number
  sales_count: number
}

const banners = ref<Banner[]>([])
const quickIcons = ref<QuickIcon[]>([])
const hotProducts = ref<HotProduct[]>([])
const refreshing = ref(false)
const loading = ref(false)

function formatPrice(price: number): string {
  return Number(price).toFixed(2)
}

async function fetchHomeData() {
  loading.value = true
  try {
    const res = await api.get<any>('/api/retail/home')
    const data = res?.data || res
    banners.value = data.banners || []
    quickIcons.value = data.quick_icons || []
    hotProducts.value = data.hot_products || []
  } catch (err: any) {
    Taro.showToast({ title: err.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onRefresh() {
  refreshing.value = true
  fetchHomeData().finally(() => {
    refreshing.value = false
  })
}

function goSearch() {
  Taro.navigateTo({ url: '/pages/search/index' })
}

function handleBannerClick(banner: Banner) {
  if (banner.link_url) {
    Taro.navigateTo({ url: banner.link_url })
  }
}

function handleIconClick(icon: QuickIcon) {
  if (icon.link_url) {
    Taro.navigateTo({ url: icon.link_url })
  }
}

function goMore() {
  Taro.navigateTo({ url: '/pages/product-list/index' })
}

function goProductDetail(id: number) {
  Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` })
}

function openCartPopup(product: HotProduct) {
  Taro.navigateTo({ url: `/pages/product-detail/index?id=${product.id}` })
}

onMounted(() => {
  fetchHomeData()
})
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-home {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $bg-color;
  overflow: hidden;
}

/* 顶部导航 */
.page-home__navbar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, $gradient-start 0%, $gradient-end 100%);
  flex-shrink: 0;
}

.page-home__scan {
  margin-right: 16px;
  flex-shrink: 0;

  .iconfont {
    font-size: 32px;
    color: #fff;
  }
}

.page-home__search {
  flex: 1;
  height: 56px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;

  .search-placeholder {
    font-size: 24px;
    color: #c8c9cc;
  }
}

/* 滚动区域 */
.page-home__scroll {
  flex: 1;
  overflow: hidden;
}

/* 加载状态 */
.page-home__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 0;

  .loading-text {
    font-size: 28px;
    color: $text-color-secondary;
  }
}

/* Banner */
.page-home__banner {
  width: 100%;
  height: 280px;
}

.page-home__banner-img {
  width: 100%;
  height: 100%;
}

.page-home__banner-placeholder {
  width: 100%;
  height: 280px;
  background: linear-gradient(135deg, #f0f9f4, #e0f2e9);
  display: flex;
  align-items: center;
  justify-content: center;

  .banner-ph-text {
    font-size: 26px;
    color: $primary-color;
  }
}

/* 金刚区 */
.page-home__icons {
  display: flex;
  flex-wrap: wrap;
  background-color: #fff;
  padding: 20px 0;
}

.page-home__icon-item {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}

.page-home__icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background-color: #f0f9f4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.page-home__icon-img {
  width: 44px;
  height: 44px;
}

.page-home__icon-placeholder {
  font-size: 28px;
  color: $primary-color;
}

.page-home__icon-name {
  font-size: 22px;
  color: $text-color;
}

/* 区块标题 */
.page-home__section {
  margin-top: 16px;
}

.page-home__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 12px;
  background-color: #fff;
}

.page-home__section-title {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
}

.page-home__section-more {
  font-size: 22px;
  color: $text-color-secondary;
}

/* 商品网格 */
.page-home__product-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 12px 12px;
  background-color: #fff;
}

/* 商品卡片 */
.product-card {
  width: 50%;
  padding: 0 8px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.product-card__img-wrap {
  position: relative;
  width: 100%;
  padding-top: 100%;
  overflow: hidden;
  border-radius: 12px;
  background-color: #f7f8fa;
}

.product-card__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.product-card__cart-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 44px;
  height: 44px;
  background-color: $primary-color;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;

  .cart-icon-text {
    font-size: 24px;
    color: #fff;
    line-height: 1;
  }
}

.product-card__info {
  padding: 10px 4px;
}

.product-card__name {
  font-size: 24px;
  color: $text-color;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.product-card__bottom {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 6px;
}

.product-card__price {
  font-size: 28px;
  font-weight: 600;
  color: $price-color;
}

.product-card__sales {
  font-size: 20px;
  color: $text-color-secondary;
}

/* 空状态 */
.page-home__empty {
  width: 100%;
  padding: 80px 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 12px;
  }

  .empty-text {
    font-size: 24px;
    color: $text-color-secondary;
  }
}
</style>
