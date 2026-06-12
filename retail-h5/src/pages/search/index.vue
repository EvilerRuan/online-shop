<template>
  <view class="page-search">
    <!-- 搜索栏 -->
    <view class="page-search__header">
      <view class="search-bar">
        <view class="search-bar__icon"></view>
        <input
          class="search-bar__input"
          type="text"
          :value="keyword"
          placeholder="搜索商品"
          @input="onInput"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <view v-if="keyword" class="search-bar__clear" @tap="clearKeyword"></view>
      </view>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!keyword && searchHistory.length > 0" class="search-history">
      <view class="search-history__header">
        <text class="search-history__title">搜索历史</text>
        <text class="search-history__clear" @tap="clearHistory">清空</text>
      </view>
      <view class="search-history__tags">
        <view
          v-for="(item, index) in searchHistory"
          :key="index"
          class="search-history__tag"
          @tap="searchFromHistory(item)"
        >
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <scroll-view
      v-if="keyword"
      class="page-search__results"
      scroll-y
      @scrolltolower="loadMore"
    >
      <view v-if="products.length > 0" class="product-grid">
        <view
          v-for="item in products"
          :key="item.id"
          class="product-card"
          @tap="goToDetail(item.id)"
        >
          <view class="product-card__img-wrap">
            <image
              v-if="item.main_image"
              class="product-card__img"
              :src="item.main_image"
              mode="aspectFill"
            />
            <view v-else class="product-card__placeholder"></view>
          </view>
          <view class="product-card__info">
            <text class="product-card__name">{{ item.name }}</text>
            <view class="product-card__bottom">
              <text class="product-card__price">¥{{ item.price }}</text>
              <text class="product-card__sales">已售{{ item.sales }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="!loading && searched" class="empty-result">
        <text class="empty-result__icon"></text>
        <text class="empty-result__text">没有找到相关商品</text>
      </view>
    </scroll-view>

    <!-- 热门推荐 -->
    <view v-else class="page-search__hot">
      <view class="hot-header">
        <text class="hot-header__title">热门推荐</text>
      </view>
      <view class="hot-grid">
        <view
          v-for="item in hotProducts"
          :key="item.id"
          class="product-card"
          @tap="goToDetail(item.id)"
        >
          <view class="product-card__img-wrap">
            <image
              v-if="item.main_image"
              class="product-card__img"
              :src="item.main_image"
              mode="aspectFill"
            />
            <view v-else class="product-card__placeholder">📦</view>
          </view>
          <view class="product-card__info">
            <text class="product-card__name">{{ item.name }}</text>
            <view class="product-card__bottom">
              <text class="product-card__price">¥{{ item.price }}</text>
              <text class="product-card__sales">已售{{ item.sales }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'
import type { Product } from '@/types'

const keyword = ref('')
const products = ref<Product[]>([])
const hotProducts = ref<Product[]>([])
const searchHistory = ref<string[]>([])
const loading = ref(false)
const searched = ref(false)
const page = ref(1)
const hasMore = ref(true)

let searchTimer: NodeJS.Timeout | null = null

onMounted(() => {
  loadSearchHistory()
  loadHotProducts()
})

function onInput(e: any) {
  keyword.value = e.detail.value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (keyword.value.trim()) {
      handleSearch()
    }
  }, 300)
}

function handleSearch() {
  if (!keyword.value.trim()) return
  page.value = 1
  hasMore.value = true
  searched.value = true
  loadProducts()
  saveSearchHistory(keyword.value.trim())
}

function clearKeyword() {
  keyword.value = ''
  searched.value = false
  products.value = []
}

async function loadProducts() {
  if (loading.value || !hasMore.value) return
  loading.value = true

  try {
    const res = await api.get<Product[]>('/api/retail/products', {
      keyword: keyword.value,
      page: page.value,
      limit: 10,
    })
    if (page.value === 1) {
      products.value = res
    } else {
      products.value = [...products.value, ...res]
    }
    hasMore.value = res.length >= 10
  } catch (err) {
    Taro.showToast({ title: '搜索失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (hasMore.value && !loading.value) {
    page.value++
    loadProducts()
  }
}

async function loadHotProducts() {
  try {
    const res = await api.get<Product[]>('/api/retail/products', {
      sort: 'sales',
      order: 'desc',
      limit: 10,
    })
    hotProducts.value = res
  } catch (err) {
    console.error('加载热门商品失败', err)
  }
}

function searchFromHistory(kw: string) {
  keyword.value = kw
  handleSearch()
}

function loadSearchHistory() {
  try {
    const history = Taro.getStorageSync('search_history')
    if (history) {
      searchHistory.value = JSON.parse(history)
    }
  } catch (err) {
    console.error('加载搜索历史失败', err)
  }
}

function saveSearchHistory(kw: string) {
  try {
    let history = searchHistory.value.filter(item => item !== kw)
    history.unshift(kw)
    if (history.length > 10) history = history.slice(0, 10)
    searchHistory.value = history
    Taro.setStorageSync('search_history', JSON.stringify(history))
  } catch (err) {
    console.error('保存搜索历史失败', err)
  }
}

function clearHistory() {
  searchHistory.value = []
  Taro.removeStorageSync('search_history')
}

function goToDetail(id: number | string) {
  Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-search {
  min-height: 100vh;
  background-color: $bg-color;
}

.page-search__header {
  background-color: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid $border-color;
}

.search-bar {
  display: flex;
  align-items: center;
  height: 64px;
  background-color: $bg-color;
  border-radius: 32px;
  padding: 0 24px;
}

.search-bar__icon {
  font-size: 28px;
  margin-right: 12px;
}

.search-bar__input {
  flex: 1;
  height: 48px;
  font-size: 26px;
  background: transparent;
}

.search-bar__clear {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: $text-color-secondary;
}

.search-history {
  padding: 24px;
}

.search-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-history__title {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
}

.search-history__clear {
  font-size: 24px;
  color: $text-color-secondary;
}

.search-history__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search-history__tag {
  padding: 12px 24px;
  background-color: #fff;
  border-radius: 12px;
  font-size: 24px;
  color: $text-color;
}

.page-search__results,
.page-search__hot {
  padding: 16px;
}

.product-grid,
.hot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.product-card {
  width: calc(50% - 8px);
  background-color: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.product-card__img-wrap {
  position: relative;
  width: 100%;
  padding-top: 100%;
  background-color: $bg-color;
}

.product-card__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.product-card__placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
}

.product-card__info {
  padding: 16px;
}

.product-card__name {
  font-size: 24px;
  color: $text-color;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.product-card__price {
  font-size: 28px;
  font-weight: 600;
  color: $price-color;
}

.product-card__sales {
  font-size: 22px;
  color: $text-color-secondary;
}

.empty-result {
  padding: 120px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-result__icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.empty-result__text {
  font-size: 26px;
  color: $text-color-secondary;
}

.hot-header {
  margin-bottom: 20px;
}

.hot-header__title {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
}
</style>
