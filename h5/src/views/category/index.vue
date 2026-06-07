<template>
  <div class="page-category">
    <!-- 顶部导航栏 -->
    <div class="page-category__navbar">
      <van-icon name="scan" size="20" color="#fff" class="page-category__scan" />
      <van-search
        placeholder="输入关键字进行搜索"
        shape="round"
        readonly
        @click-input="goSearch"
        class="page-category__search"
      />
    </div>

    <!-- 主体区域 -->
    <div class="page-category__body">
      <!-- 左侧一级分类 -->
      <div class="page-category__sidebar">
        <div
          class="page-category__sidebar-item"
          :class="{ 'page-category__sidebar-item--active': activeId === 0 }"
          @click="handleAllCategoriesClick"
        >
          全部分类
        </div>
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="page-category__sidebar-item"
          :class="{ 'page-category__sidebar-item--active': activeId === cat.id }"
          @click="handleCategoryClick(cat)"
        >
          {{ cat.name }}
        </div>
      </div>

      <!-- 右侧二级分类 -->
      <div class="page-category__content">
        <template v-if="activeChildren.length > 0">
          <div
            v-for="child in activeChildren"
            :key="child.id"
            class="page-category__sub-item"
            @click="goProductList(child.id, child.name)"
          >
            {{ child.name }}
          </div>
        </template>
        <template v-else>
          <div class="page-category__empty">
            <van-empty description="暂无子分类" :image-size="80" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/utils/request'

interface CategoryChild {
  id: number
  name: string
}

interface CategoryTreeNode {
  id: number
  name: string
  children: CategoryChild[]
}

const router = useRouter()

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
    const res = await request.get('/categories')
    const data: CategoryTreeNode[] = res.data.data
    categories.value = data

    // 默认选中第一个分类
    if (data.length > 0) {
      activeId.value = data[0].id
    }
  } catch (err: any) {
    showToast(err.message || '加载分类失败')
  }
}

function handleAllCategoriesClick() {
  activeId.value = 0
  router.push({
    path: '/products',
    query: { category_name: '全部商品' },
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
  router.push({
    path: '/products',
    query: { category_id: categoryId, category_name: categoryName },
  })
}

function goSearch() {
  router.push('/search')
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.page-category {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-color);
}

/* 顶部导航 */
.page-category__navbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--primary-color);
  flex-shrink: 0;
}

.page-category__scan {
  margin-right: 8px;
  flex-shrink: 0;
}

.page-category__search {
  flex: 1;
}

.page-category__search :deep(.van-search__content) {
  background-color: rgba(255, 255, 255, 0.9);
}

/* 主体 */
.page-category__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧一级分类 */
.page-category__sidebar {
  flex: 0 0 100px;
  background-color: var(--bg-color);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.page-category__sidebar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  font-size: 13px;
  color: var(--text-color);
  text-align: center;
  padding: 0 8px;
  position: relative;
  cursor: pointer;
}

.page-category__sidebar-item--active {
  background-color: #fff;
  color: var(--danger-color);
  font-weight: 600;
}

.page-category__sidebar-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background-color: var(--danger-color);
  border-radius: 0 3px 3px 0;
}

/* 右侧二级分类 */
.page-category__content {
  flex: 1;
  background-color: #fff;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.page-category__sub-item {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 48px;
  font-size: 14px;
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.page-category__sub-item:active {
  background-color: var(--bg-color);
}

.page-category__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
