<template>
  <view class="page-product-list">
    <!-- 顶部筛选栏 -->
    <view class="page-product-list__filter">
      <view
        v-for="(tab, index) in tabs"
        :key="index"
        class="filter-tab"
        :class="{ 'filter-tab--active': activeTab === index }"
        @tap="switchTab(index)"
      >
        <text>{{ tab.label }}</text>
        <view v-if="tab.sort && activeTab === index" class="filter-tab__arrow"></view>
      </view>
    </view>

    <!-- 商品列表 -->
    <scroll-view class="page-product-list__content" scroll-y @scrolltolower="loadMore">
      <view class="product-grid">
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
            <view v-else class="product-card__placeholder">📦</view>
          </view>
          <view class="product-card__info">
              <text class="product-card__name">{{ item.name }}</text>
              <view class="product-card__bottom">
                <text class="product-card__price">¥{{ formatPrice(item.price) }}</text>
                <text class="product-card__sales">已售{{ item.sales_count }}</text>
              </view>
            </view>
        </view>
      </view>

      <view v-if="loading" class="loading-more">
        <text>加载中...</text>
      </view>

      <view v-else-if="!hasMore && products.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>

      <view v-else-if="!loading && products.length === 0" class="empty">
        <text class="empty__icon">📦</text>
        <text class="empty__text">暂无商品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface Product {
  id: number
  name: string
  main_image: string | null
  price: number
  sales_count: number
}

interface PageResult {
  list: Product[]
  total: number
  page: number
  page_size: number
}

const products = ref<Product[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 10
const activeTab = ref(0)

const tabs = [
  { label: '综合', sort: 'default' },
  { label: '销量', sort: 'sales_desc' },
  { label: '价格↑', sort: 'price_asc' },
  { label: '价格↓', sort: 'price_desc' },
]

const categoryId = ref<number | null>(null)
const keyword = ref('')
const categoryName = ref('')

const pageTitle = computed(() => {
  if (keyword.value) return `搜索: ${keyword.value}`
  if (categoryName.value) return categoryName.value
  return '商品列表'
})

onMounted(() => {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options

  if (options.category_id) {
    categoryId.value = parseInt(options.category_id)
  }
  if (options.category_name) {
    categoryName.value = decodeURIComponent(options.category_name)
  }
  if (options.keyword) {
    keyword.value = decodeURIComponent(options.keyword)
  }

  // 设置页面标题
  Taro.setNavigationBarTitle({ title: pageTitle.value })

  loadProducts()
})

function switchTab(index: number) {
  if (activeTab.value === index) return
  activeTab.value = index
  page.value = 1
  hasMore.value = true
  products.value = []
  loadProducts()
}

async function loadProducts() {
  if (loading.value || !hasMore.value) return
  loading.value = true

  try {
    const params: Record<string, any> = {
      page: String(page.value),
      page_size: String(pageSize),
    }

    if (categoryId.value) {
      params.category_id = String(categoryId.value)
    }
    if (keyword.value) {
      params.keyword = keyword.value
    }

    const tab = tabs[activeTab.value]
    if (tab.sort !== 'default') {
      params.sort = tab.sort
    }

    const res = await api.get<PageResult>('/api/retail/products', params)

    const list = res?.list || []
    const total = res?.total || 0

    if (page.value === 1) {
      products.value = list
    } else {
      products.value = [...products.value, ...list]
    }

    hasMore.value = products.value.length < total
  } catch (err: any) {
    Taro.showToast({ title: err.message || '加载失败', icon: 'none' })
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

function goToDetail(id: number) {
  Taro.navigateTo({ url: `/pages/product-detail/index?id=${id}` })
}

function formatPrice(price: number): string {
  return Number(price).toFixed(2)
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-product-list {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-product-list__filter {
  display: flex;
  background-color: #fff;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.filter-tab {
  flex: 1;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: $text-color;
  position: relative;
}

.filter-tab--active {
  color: $primary-color;
  font-weight: 600;
}

.filter-tab__arrow {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid $primary-color;
  margin-left: 6px;
}

.page-product-list__content {
  flex: 1;
  padding: 16px;
}

.product-grid {
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

.loading-more,
.no-more,
.empty {
  padding: 40px 0;
  text-align: center;
  font-size: 24px;
  color: $text-color-secondary;
}

.empty__icon {
  font-size: 72px;
  display: block;
  margin-bottom: 16px;
}

.empty__text {
  font-size: 26px;
}
</style>
