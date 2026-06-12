<template>
  <view class="page-category">
    <!-- 顶部导航栏 -->
    <view class="page-category__navbar">
      <view class="page-category__scan" @tap="goSearch">
        <text class="scan-icon">🔍</text>
      </view>
      <view class="page-category__search" @tap="goSearch">
        <text class="search-placeholder">输入关键字进行搜索</text>
      </view>
    </view>

    <!-- 主体区域 -->
    <view class="page-category__body">
      <!-- 左侧一级分类 -->
      <scroll-view scroll-y class="page-category__sidebar">
        <view
          class="page-category__sidebar-item"
          :class="{ 'page-category__sidebar-item--active': activeId === 0 }"
          @tap="handleAllCategoriesClick"
        >
          <text class="sidebar-text">全部分类</text>
        </view>
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="page-category__sidebar-item"
          :class="{ 'page-category__sidebar-item--active': activeId === cat.id }"
          @tap="handleCategoryClick(cat)"
        >
          <text class="sidebar-text">{{ cat.name }}</text>
        </view>
      </scroll-view>

      <!-- 右侧二级分类 -->
      <scroll-view scroll-y class="page-category__content">
        <template v-if="activeChildren.length > 0">
          <view
            v-for="child in activeChildren"
            :key="child.id"
            class="page-category__sub-item"
            @tap="goProductList(child.id, child.name)"
          >
            <text class="sub-text">{{ child.name }}</text>
          </view>
        </template>
        <template v-else>
          <view class="page-category__empty">
            <text class="empty-icon">📂</text>
            <text class="empty-text">暂无子分类</text>
          </view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface CategoryChild {
  id: number
  name: string
}

interface CategoryTreeNode {
  id: number
  name: string
  children: CategoryChild[]
}

const categories = ref<CategoryTreeNode[]>([])
const activeId = ref<number | null>(null)

const activeCategory = computed(() =>
  categories.value.find((c) => c.id === activeId.value)
)

const activeChildren = computed(() =>
  activeCategory.value?.children ?? []
)

async function fetchCategories() {
  try {
    const res = await api.get<any>('/api/retail/categories')
    const data: CategoryTreeNode[] = res || []
    categories.value = data

    // 默认选中第一个分类
    if (data.length > 0) {
      activeId.value = data[0].id
    }
  } catch (err: any) {
    Taro.showToast({ title: err.message || '加载分类失败', icon: 'none' })
  }
}

function handleAllCategoriesClick() {
  activeId.value = 0
  Taro.navigateTo({
    url: '/pages/product-list/index?category_name=全部商品',
  })
}

function handleCategoryClick(cat: CategoryTreeNode) {
  if (cat.children.length === 0) {
    // 无二级分类，直接跳转商品列表
    goProductList(cat.id, cat.name)
  } else {
    activeId.value = cat.id
  }
}

function goProductList(categoryId: number, categoryName: string) {
  Taro.navigateTo({
    url: `/pages/product-list/index?category_id=${categoryId}&category_name=${categoryName}`,
  })
}

function goSearch() {
  Taro.navigateTo({ url: '/pages/search/index' })
}

onMounted(() => {
  fetchCategories()
})
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-category {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
  overflow: hidden;
}

/* 顶部导航 */
.page-category__navbar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, $gradient-start 0%, $gradient-end 100%);
  flex-shrink: 0;
}

.page-category__scan {
  margin-right: 16px;
  flex-shrink: 0;

  .scan-icon {
    font-size: 32px;
    color: #fff;
  }
}

.page-category__search {
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

/* 主体 */
.page-category__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧一级分类 */
.page-category__sidebar {
  flex: 0 0 120px;
  background-color: #f7f8fa;
  overflow-y: auto;
}

.page-category__sidebar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  text-align: center;
  padding: 0 12px;
  position: relative;

  .sidebar-text {
    font-size: 24px;
    color: $text-color;
  }

  &--active {
    background-color: #fff;

    .sidebar-text {
      color: $primary-color;
      font-weight: 600;
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 28px;
      background-color: $primary-color;
      border-radius: 0 4px 4px 0;
    }
  }
}

/* 右侧二级分类 */
.page-category__content {
  flex: 1;
  background-color: #fff;
  overflow-y: auto;
}

.page-category__sub-item {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid $border-color;

  .sub-text {
    font-size: 24px;
    color: $text-color;
  }

  &:active {
    background-color: #f7f8fa;
  }
}

.page-category__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 80px 0;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 24px;
    color: $text-color-secondary;
  }
}
</style>
