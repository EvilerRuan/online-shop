<template>
  <div class="page-product-list">
    <van-nav-bar
      :title="pageTitle"
      left-arrow
      @click-left="$router.back()"
    />

    <van-tabs
      v-model:active="activeSort"
      sticky
      offset-top="46"
      @change="onSortChange"
    >
      <van-tab title="综合" name="default" />
      <van-tab title="价格升序" name="price_asc" />
      <van-tab title="价格降序" name="price_desc" />
      <van-tab title="销量" name="sales" />
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div class="page-product-list__grid">
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
              <div class="product-card__cart-btn" @click.stop="goDetail(item.id)">
                <van-icon name="shopping-cart-o" size="18" color="#fff" />
              </div>
            </div>
          </div>
        </div>

        <van-empty
          v-if="!loading && finished && list.length === 0"
          description="暂无商品"
        />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ProductListItem } from 'shared/types/product'
import type { PageResult } from 'shared/types/api'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const categoryId = computed(() => route.query.category_id as string | undefined)
const keyword = computed(() => route.query.keyword as string | undefined)

const pageTitle = computed(() => {
  if (keyword.value) return `搜索: ${keyword.value}`
  if (route.query.category_name) return route.query.category_name as string
  return '商品列表'
})

const activeSort = ref('default')
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 10
const list = ref<ProductListItem[]>([])

function formatPrice(min: number, max: number): string {
  return min === max ? min.toFixed(2) : `${min.toFixed(2)} - ${max.toFixed(2)}`
}

async function fetchProducts() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      page_size: pageSize,
    }

    if (categoryId.value) params.category_id = categoryId.value
    if (keyword.value) params.keyword = keyword.value

    const sortMap: Record<string, string> = {
      price_asc: 'price_asc',
      price_desc: 'price_desc',
      sales: 'sales_desc',
    }
    if (sortMap[activeSort.value]) {
      params.sort = sortMap[activeSort.value]
    }

    const res = await request.get('/products', { params })
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

function onSortChange() {
  page.value = 1
  list.value = []
  finished.value = false
  fetchProducts()
}

function goDetail(id: number) {
  router.push({ name: 'ProductDetail', params: { id } })
}
</script>

<style scoped>
.page-product-list {
  min-height: 100vh;
  background: var(--bg-color);
}

.page-product-list__grid {
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
  position: relative;
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

.product-card__cart-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
