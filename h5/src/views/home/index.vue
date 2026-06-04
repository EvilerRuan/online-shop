<template>
  <div class="page-home">
    <!-- 顶部导航栏 -->
    <div class="page-home__navbar">
      <van-icon name="scan" size="20" color="#fff" class="page-home__scan" />
      <van-search
        placeholder="输入关键字进行搜索"
        shape="round"
        readonly
        @click-input="goSearch"
        class="page-home__search"
      />
    </div>

    <!-- 下拉刷新 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- Banner 轮播 -->
      <van-swipe
        class="page-home__banner"
        autoplay="3000"
        indicator-color="#07C160"
        :height="160"
      >
        <van-swipe-item
          v-for="banner in banners"
          :key="banner.id"
          @click="handleBannerClick(banner)"
        >
          <img :src="banner.image_url" :alt="'banner'" class="page-home__banner-img" />
        </van-swipe-item>
      </van-swipe>

      <!-- 金刚区图标 -->
      <van-grid
        :column-num="5"
        :border="false"
        class="page-home__icons"
      >
        <van-grid-item
          v-for="icon in quickIcons"
          :key="icon.id"
          @click="handleIconClick(icon)"
        >
          <div class="page-home__icon-wrap">
            <img
              v-if="icon.icon_url"
              :src="icon.icon_url"
              :alt="icon.name"
              class="page-home__icon-img"
            />
            <span v-else class="page-home__icon-placeholder">{{ icon.name.slice(0, 1) }}</span>
          </div>
          <span class="page-home__icon-name">{{ icon.name }}</span>
        </van-grid-item>
      </van-grid>

      <!-- 热销推荐 -->
      <div class="page-home__section">
        <div class="page-home__section-header">
          <span class="page-home__section-title">新品上市</span>
          <span class="page-home__section-more" @click="goMore">更多 &gt;</span>
        </div>

        <div class="page-home__product-grid">
          <div
            v-for="product in hotProducts"
            :key="product.id"
            class="product-card"
            @click="goProductDetail(product.id)"
          >
            <div class="product-card__img-wrap">
              <img
                :src="product.main_image || ''"
                :alt="product.name"
                class="product-card__img"
              />
              <van-button
                size="mini"
                type="primary"
                round
                class="product-card__cart-btn"
                @click.stop="goProductDetail(product.id)"
              >
                <van-icon name="shopping-cart-o" size="12" />
              </van-button>
            </div>
            <div class="product-card__info">
              <p class="product-card__name">{{ product.name }}</p>
              <div class="product-card__bottom">
                <span class="product-card__price">¥{{ formatPrice(product.min_price) }}</span>
                <span class="product-card__sales">销量: {{ product.sales_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

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

interface HomeData {
  banners: Banner[]
  quick_icons: QuickIcon[]
  hot_products: HotProduct[]
}

const router = useRouter()

const banners = ref<Banner[]>([])
const quickIcons = ref<QuickIcon[]>([])
const hotProducts = ref<HotProduct[]>([])
const refreshing = ref(false)

function formatPrice(price: number): string {
  return Number(price).toFixed(2)
}

async function fetchHomeData() {
  try {
    const res = await request.get('/home')
    const data: HomeData = res.data.data
    banners.value = data.banners
    quickIcons.value = data.quick_icons
    hotProducts.value = data.hot_products
  } catch (err: any) {
    showToast(err.message || '加载失败')
  }
}

function onRefresh() {
  fetchHomeData().finally(() => {
    refreshing.value = false
  })
}

function goSearch() {
  router.push('/search')
}

function handleBannerClick(banner: Banner) {
  if (banner.link_url) {
    router.push(banner.link_url)
  }
}

function handleIconClick(icon: QuickIcon) {
  if (icon.link_url) {
    router.push(icon.link_url)
  }
}

function goMore() {
  router.push('/products')
}

function goProductDetail(id: number) {
  router.push('/product/' + id)
}

onMounted(() => {
  fetchHomeData()
})
</script>

<style scoped>
.page-home {
  background-color: var(--bg-color);
  min-height: 100vh;
}

/* 顶部导航 */
.page-home__navbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--primary-color);
}

.page-home__scan {
  margin-right: 8px;
  flex-shrink: 0;
}

.page-home__search {
  flex: 1;
}

.page-home__search :deep(.van-search__content) {
  background-color: rgba(255, 255, 255, 0.9);
}

/* Banner */
.page-home__banner {
  width: 100%;
}

.page-home__banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 金刚区 */
.page-home__icons {
  background-color: #fff;
  padding: 12px 0;
}

.page-home__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: #f0f9f4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.page-home__icon-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.page-home__icon-placeholder {
  font-size: 18px;
}

.page-home__icon-name {
  font-size: 12px;
  color: var(--text-color);
}

/* 区块标题 */
.page-home__section {
  margin-top: 8px;
}

.page-home__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
  background-color: #fff;
}

.page-home__section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.page-home__section-more {
  font-size: 13px;
  color: var(--text-color-secondary);
}

/* 商品网格 */
.page-home__product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px;
  background-color: #fff;
}

/* 商品卡片 */
.product-card {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.product-card__img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background-color: #f7f8fa;
}

.product-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__cart-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-card__info {
  padding: 8px;
}

.product-card__name {
  font-size: 13px;
  color: var(--text-color);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-card__bottom {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 6px;
}

.product-card__price {
  font-size: 16px;
  font-weight: 600;
  color: var(--price-color);
}

.product-card__sales {
  font-size: 11px;
  color: var(--text-color-secondary);
}
</style>
