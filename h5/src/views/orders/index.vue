<template>
  <div class="page-orders">
    <van-nav-bar title="我的订单" left-arrow @click-left="router.back()" />

    <van-tabs
      v-model:active="activeTab"
      sticky
      swipeable
      @change="onTabChange"
      class="order-tabs"
    >
      <van-tab v-for="tab in tabs" :key="tab.value" :title="tab.label" :name="tab.value" />
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="router.push(`/order/${order.id}`)"
        >
          <!-- 订单头部 -->
          <div class="order-card__header">
            <span class="order-card__no">{{ order.order_no }}</span>
            <van-tag
              :color="ORDER_STATUS_COLOR[order.status]"
              size="medium"
            >
              {{ order.status_text }}
            </van-tag>
          </div>

          <!-- 商品图片 -->
          <div class="order-card__body">
            <div class="order-card__images">
              <van-image
                v-for="(img, idx) in order.product_images"
                :key="idx"
                width="80"
                height="80"
                radius="4"
                fit="cover"
                :src="img || ''"
              >
                <template #error>
                  <div class="img-error">
                    <van-icon name="photo-o" size="24" color="#dcdee0" />
                  </div>
                </template>
              </van-image>
            </div>
            <div class="order-card__summary">
              <div class="order-card__count">共 {{ order.item_count }} 件商品</div>
              <div class="order-card__amount">
                <span class="order-card__amount-label">合计：</span>
                <span class="order-card__amount-value">{{ formatPrice(order.total_amount) }}</span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="order-card__footer" @click.stop>
            <template v-if="order.status === 'pending_payment'">
              <van-button size="small" type="primary" @click="goPay(order)">去付款</van-button>
            </template>
            <template v-else-if="order.status === 'pending_shipment'">
              <van-button size="small" type="primary" plain @click="remindShip(order)">提醒发货</van-button>
            </template>
            <template v-else-if="order.status === 'pending_receipt'">
              <van-button size="small" plain @click="viewLogistics(order)">查看物流</van-button>
              <van-button size="small" type="primary" @click="confirmReceipt(order)">确认收货</van-button>
            </template>
            <template v-else-if="order.status === 'cancelled'">
              <van-button size="small" plain @click="deleteOrder(order)">删除订单</van-button>
            </template>
          </div>
        </div>

        <!-- 空状态 -->
        <van-empty v-if="!loading && orders.length === 0" description="暂无订单" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '@/utils/request'
import { ORDER_STATUS_COLOR } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'
import { formatPrice } from 'shared/utils/format'

interface OrderItem {
  id: number
  order_no: string
  total_amount: number
  status: OrderStatus
  status_text: string
  item_count: number
  product_images: (string | null)[]
  created_at: string
}

const router = useRouter()
const route = useRoute()

const tabs = [
  { label: '全部', value: 'all' },
  { label: '待付款', value: 'pending_payment' },
  { label: '待发货', value: 'pending_shipment' },
  { label: '待收货', value: 'pending_receipt' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const activeTab = ref((route.query.status as string) || 'all')
const orders = ref<OrderItem[]>([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

onMounted(() => {
  // van-list 会自动触发第一次 load
})

async function onLoad() {
  try {
    const res = await request.get('/orders', {
      params: {
        status: activeTab.value,
        page: page.value,
        page_size: 10,
      },
    })

    const { list, total } = res.data.data
    if (page.value === 1) {
      orders.value = list
    } else {
      orders.value.push(...list)
    }

    if (orders.value.length >= total) {
      finished.value = true
    } else {
      page.value++
    }
  } catch {
    finished.value = true
  } finally {
    loading.value = false
  }
}

function onRefresh() {
  page.value = 1
  finished.value = false
  refreshing.value = false
  onLoad()
}

function onTabChange() {
  page.value = 1
  orders.value = []
  finished.value = false
  onLoad()
}

function goPay() {
  showToast('请微信联系付款转账！')
}

function remindShip(order: OrderItem) {
  showToast('已提醒商家发货')
}

function viewLogistics(order: OrderItem) {
  router.push(`/order/${order.id}`)
}

async function confirmReceipt(order: OrderItem) {
  try {
    await showConfirmDialog({ title: '提示', message: '确认已收到货物？' })
    await request.post(`/orders/${order.id}/confirm`)
    showToast('已确认收货')
    refreshList()
  } catch {
    // 用户取消
  }
}

async function deleteOrder(order: OrderItem) {
  try {
    await showConfirmDialog({ title: '提示', message: '确定删除该订单吗？' })
    await request.delete(`/orders/${order.id}`)
    showToast('订单已删除')
    refreshList()
  } catch (error: any) {
    if (error?.message !== 'cancel') {
      // 用户取消或其他错误
    }
  }
}

function refreshList() {
  page.value = 1
  finished.value = false
  orders.value = []
  onLoad()
}
</script>

<style scoped>
.page-orders {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.order-tabs :deep(.van-tabs__wrap) {
  background: #fff;
}

.order-tabs :deep(.van-tabs__nav) {
  padding: 0 8px;
}

.order-tabs :deep(.van-tab) {
  font-size: 14px;
  padding: 12px 16px;
}

.order-tabs :deep(.van-tabs__line) {
  border-radius: 2px;
  height: 3px;
}

.order-card {
  margin: 8px 12px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.order-card__no {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.order-card__body {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.order-card__images {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.img-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #f7f8fa;
  border-radius: 4px;
}

.order-card__summary {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  margin-left: 12px;
  min-height: 80px;
}

.order-card__count {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.order-card__amount {
  font-size: 14px;
}

.order-card__amount-label {
  color: var(--text-color-secondary);
}

.order-card__amount-value {
  color: var(--price-color);
  font-weight: 600;
  font-size: 16px;
}

.order-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
}
</style>
