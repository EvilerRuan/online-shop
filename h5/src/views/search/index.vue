<template>
  <div class="page-search">
    <div class="page-search__header">
      <van-search
        v-model="keyword"
        placeholder="搜索商品"
        autofocus
        show-action
        @update:model-value="onInput"
        @search="onSearch"
        @cancel="onCancel"
      >
        <template #action>
          <div @click="onSearch">搜索</div>
        </template>
      </van-search>
    </div>

    <div v-if="!hasSearched" class="page-search__placeholder">
      <div v-if="searchHistory.length > 0" class="page-search__history">
        <div class="page-search__history-header">
          <span class="page-search__history-title">搜索历史</span>
          <van-icon
            name="delete-o"
            size="16"
            color="var(--text-color-secondary)"
            @click="clearHistory"
          />
        </div>
        <div class="page-search__history-tags">
          <van-tag
            v-for="(item, index) in searchHistory"
            :key="index"
            plain
            type="primary"
            size="medium"
            class="page-search__history-tag"
            @click="onHistoryClick(item)"
          >
            {{ item }}
          </van-tag>
        </div>
      </div>
      <van-empty
        v-else
        image="search"
        description="输入关键词搜索商品"
      />
    </div>

    <div v-else class="page-search__results">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="loadMore"
        >
          <div class="page-search__grid">
            <div
              v-for="item in list"
              :key="item.id"
              class="product-card"
              @click="goDetail(item.id)"
            >
              <van-image
                :src="item.main_image || ''"
                fit="cover"
                class="product-card__image"
              >
                <template #error>
                  <div class="product-card__image-error">
                    <van-icon name="photo-o" size="32" color="#dcdee0" />
                  </div>
                </template>
              </van-image>
              <div class="product-card__info">
                <div class="product-card__name">{{ item.name }}</div>
                <div class="product-card__bottom">
                  <div class="product-card__price">
                    <span class="product-card__price-symbol">¥</span>
                    <span class="product-card__price-value">{{ item.price.toFixed(2) }}</span>
                  </div>
                  <div class="product-card__sales">已售{{ item.sales_count }}</div>
                </div>
              </div>
            </div>
          </div>

          <van-empty
            v-if="!loading && finished && list.length === 0"
            image="search"
            description="未找到相关商品"
          />
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash-es'
import type { ProductListItem } from 'shared/types/product'
import type { PageResult } from 'shared/types/api'
import request from '@/utils/request'

const router = useRouter()

const keyword = ref('')
const hasSearched = ref(false)
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 10
const list = ref<ProductListItem[]>([])
const searchHistory = ref<string[]>(loadHistory())

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem('search_history')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory() {
  localStorage.setItem('search_history', JSON.stringify(searchHistory.value))
}

function addToHistory(kw: string) {
  const trimmed = kw.trim()
  if (!trimmed) return
  const idx = searchHistory.value.indexOf(trimmed)
  if (idx > -1) searchHistory.value.splice(idx, 1)
  searchHistory.value.unshift(trimmed)
  if (searchHistory.value.length > 10) searchHistory.value.pop()
  saveHistory()
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem('search_history')
}

function formatPrice(min: number, max: number): string {
  return min === max ? min.toFixed(2) : `${min.toFixed(2)} - ${max.toFixed(2)}`
}

const debouncedSearch = debounce(() => {
  if (keyword.value.trim()) {
    doSearch()
  }
}, 300)

function onInput() {
  debouncedSearch()
}

function onSearch() {
  if (!keyword.value.trim()) return
  addToHistory(keyword.value)
  doSearch()
}

function onHistoryClick(item: string) {
  keyword.value = item
  doSearch()
}

function onCancel() {
  router.back()
}

function doSearch() {
  page.value = 1
  list.value = []
  finished.value = false
  hasSearched.value = true
  fetchProducts()
}

async function fetchProducts() {
  loading.value = true
  try {
    const res = await request.get('/products', {
      params: {
        keyword: keyword.value.trim(),
        page: page.value,
        page_size: pageSize,
      },
    })
    const data: PageResult<ProductListItem> = res.data.data
    if (page.value === 1) {
      list.value = data.list
    } else {
      list.value.push(...data.list)
    }
    finished.value = list.value.length >= data.total
    if (!finished.value) {
      page.value++
    }
  } catch {
    finished.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function loadMore() {
  fetchProducts()
}

function onRefresh() {
  page.value = 1
  finished.value = false
  fetchProducts()
}

function goDetail(id: number) {
  router.push({ name: 'ProductDetail', params: { id } })
}
</script>

<style scoped>
.page-search {
  min-height: 100vh;
  background: var(--bg-color);
}

.page-search__header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
}

.page-search__placeholder {
  padding: 16px;
}

.page-search__history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-search__history-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.page-search__history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.page-search__history-tag {
  cursor: pointer;
}

.page-search__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px;
}

.product-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.product-card__image {
  width: 100%;
  aspect-ratio: 1;
}

.product-card__image-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;
}

.product-card__info {
  padding: 8px;
}

.product-card__name {
  font-size: 13px;
  color: var(--text-color);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.product-card__bottom {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.product-card__price {
  color: var(--price-color);
  font-weight: 600;
}

.product-card__price-symbol {
  font-size: 12px;
}

.product-card__price-value {
  font-size: 16px;
}

.product-card__sales {
  font-size: 11px;
  color: var(--text-color-secondary);
}
</style>
