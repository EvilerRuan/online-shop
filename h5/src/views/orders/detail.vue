<template>
  <div class="page-order-detail">
    <van-nav-bar title="订单详情" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" class="page-order-detail__loading" size="36" vertical>
      加载中...
    </van-loading>

    <template v-else-if="order">
      <!-- 订单状态卡片 -->
      <div class="order-status-card" :style="{ background: statusBgColor }">
        <div class="order-status-card__label">
          <van-tag :color="ORDER_STATUS_COLOR[order.status]" size="large">
            {{ statusText }}
          </van-tag>
        </div>
        <div class="order-status-card__desc">{{ statusDesc }}</div>
      </div>

      <!-- 收货地址 -->
      <div class="section">
        <van-cell-group :border="false">
          <van-cell>
            <template #icon>
              <van-icon name="location-o" size="20" class="section__icon" />
            </template>
            <template #title>
              <div class="address-info">
                <div class="address-info__name">
                  {{ order.recipient_name }}
                  <span class="address-info__phone">{{ order.recipient_phone }}</span>
                </div>
                <div class="address-info__detail">{{ order.address }}</div>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 商品列表 -->
      <div class="section">
        <div class="section__title">商品列表</div>
        <div
          v-for="item in order.items"
          :key="item.id"
          class="product-item"
        >
          <van-image
            width="88"
            height="88"
            radius="8"
            fit="cover"
            :src="item.main_image || ''"
          >
            <template #error>
              <div class="img-error">
                <van-icon name="photo-o" size="24" color="#dcdee0" />
              </div>
            </template>
          </van-image>
          <div class="product-item__info">
            <div class="product-item__top">
              <div class="product-item__name">{{ item.product_name }}</div>
              <div class="product-item__subtotal">{{ formatPrice(item.subtotal) }}</div>
            </div>
            <div class="product-item__sku">{{ item.sku_name }}</div>
            <div class="product-item__meta">
              <span class="product-item__price">{{ formatPrice(item.price) }}</span>
              <div class="product-item__qty-row">
                <span class="product-item__qty">×{{ item.quantity }}</span>
                <span class="product-item__spec">({{ item.quantity / item.unit_quantity }}{{ extractUnit(item.sku_name) }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 订单信息 -->
      <div class="section">
        <van-cell-group :border="false" title="订单信息">
          <van-cell title="订单编号">
            <template #value>
              <span class="copyable" @click="copyText(order.order_no)">
                {{ order.order_no }}
                <van-icon name="records" size="14" />
              </span>
            </template>
          </van-cell>
          <van-cell title="下单时间" :value="formatDateTime(order.created_at)" />
          <van-cell title="支付方式" value="线下支付" />
          <van-cell v-if="order.shipping_no" title="物流单号">
            <template #value>
              <span class="copyable" @click="copyText(order.shipping_no!)">
                {{ order.shipping_no }}
                <van-icon name="records" size="14" />
              </span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 订单金额 -->
      <div class="section">
        <van-cell-group :border="false" title="订单金额">
          <van-cell title="商品总额" :value="formatPrice(order.total_amount)" />
          <van-cell title="运费" value="¥0.00" />
          <van-cell title="实付款">
            <template #value>
              <span class="total-amount">{{ formatPrice(order.total_amount) }}</span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 底部操作栏 -->
      <div class="bottom-bar">
        <template v-if="order.status === 'pending_payment'">
          <van-button plain @click="cancelOrder">取消订单</van-button>
          <van-button type="primary" @click="goPay">去付款</van-button>
        </template>
        <template v-else-if="order.status === 'pending_shipment'">
          <van-button type="primary" plain @click="remindShip">提醒发货</van-button>
        </template>
        <template v-else-if="order.status === 'pending_receipt'">
          <van-button plain @click="viewLogistics">查看物流</van-button>
          <van-button type="primary" @click="confirmReceipt">确认收货</van-button>
        </template>
        <template v-else-if="order.status === 'cancelled'">
          <van-button plain @click="deleteOrder">删除订单</van-button>
        </template>
      </div>
      <!-- 底部占位 -->
      <div class="bottom-bar__placeholder" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '@/utils/request'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'
import { formatPrice, formatDateTime } from 'shared/utils/format'

interface OrderItemData {
  id: number
  product_name: string
  sku_name: string
  main_image: string | null
  price: number
  quantity: number
  subtotal: number
  unit_quantity: number
}

interface OrderData {
  id: number
  order_no: string
  total_amount: number
  status: OrderStatus
  remark: string
  recipient_name: string
  recipient_phone: string
  address: string
  shipping_no: string | null
  created_at: string
  items: OrderItemData[]
}

const router = useRouter()
const route = useRoute()

const orderId = Number(route.params.id)
const order = ref<OrderData | null>(null)
const loading = ref(true)

function extractUnit(skuName: string) {
  const match = skuName.match(/(箱|件|盒|瓶|包|袋|个|支|条)/)
  return match ? match[1] : '件'
}

const statusText = computed(() => ORDER_STATUS_LABEL[order.value!.status] || '')

const statusDesc = computed(() => {
  const descs: Record<OrderStatus, string> = {
    pending_payment: '请尽快完成付款，以免订单超时取消',
    pending_shipment: '商家正在准备发货，请耐心等待',
    pending_receipt: '商品已发出，请留意物流动态',
    completed: '订单已完成，感谢您的购买',
    cancelled: '订单已取消',
  }
  return descs[order.value!.status] || ''
})

const statusBgColor = computed(() => {
  const colors: Record<OrderStatus, string> = {
    pending_payment: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
    pending_shipment: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    pending_receipt: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    completed: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
    cancelled: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
  }
  return colors[order.value!.status] || ''
})

onMounted(async () => {
  await fetchDetail()
})

async function fetchDetail() {
  try {
    const res = await request.get(`/orders/${orderId}`)
    order.value = res.data.data
  } catch {
    showToast('加载订单详情失败')
  } finally {
    loading.value = false
  }
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板')
  }).catch(() => {
    showToast('复制失败')
  })
}

async function cancelOrder() {
  try {
    await showConfirmDialog({ title: '提示', message: '确定取消该订单吗？' })
    await request.post(`/orders/${orderId}/cancel`)
    showToast('订单已取消')
    await fetchDetail()
  } catch {
    // 用户取消
  }
}

function goPay() {
  showToast('请微信联系付款转账！')
}

function remindShip() {
  showToast('已提醒商家发货')
}

function viewLogistics() {
  showToast('物流查询功能暂未开放')
}

async function confirmReceipt() {
  try {
    await showConfirmDialog({ title: '提示', message: '确认已收到货物？' })
    await request.post(`/orders/${orderId}/confirm`)
    showToast('已确认收货')
    await fetchDetail()
  } catch {
    // 用户取消
  }
}

async function deleteOrder() {
  try {
    await showConfirmDialog({ title: '提示', message: '确定删除该订单吗？' })
    await request.delete(`/orders/${orderId}`)
    showToast('订单已删除')
    router.back()
  } catch (error: any) {
    if (error?.message !== 'cancel') {
      // 用户取消或其他错误
    }
  }
}
</script>

<style scoped>
.page-order-detail {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.page-order-detail__loading {
  display: flex;
  justify-content: center;
  padding-top: 120px;
}

.order-status-card {
  padding: 20px 16px;
  margin-bottom: 8px;
}

.order-status-card__label {
  margin-bottom: 8px;
}

.order-status-card__desc {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.section {
  margin-bottom: 8px;
  background: #fff;
}

.section__icon {
  margin-right: 12px;
  color: var(--primary-color);
}

.address-info__name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.address-info__phone {
  margin-left: 12px;
  color: var(--text-color-secondary);
  font-weight: normal;
}

.address-info__detail {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.section__title {
  padding: 12px 16px 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.product-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.product-item:last-child {
  border-bottom: none;
}

.product-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-item__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.product-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-item__sku {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
  background: #f7f8fa;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.product-item__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
}

.product-item__price {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.product-item__qty-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.product-item__qty {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.product-item__spec {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.product-item__subtotal {
  font-size: 15px;
  font-weight: 600;
  color: var(--price-color);
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

.copyable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--primary-color);
  font-size: 13px;
  cursor: pointer;
}

.total-amount {
  color: var(--price-color);
  font-size: 18px;
  font-weight: 600;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.bottom-bar__placeholder {
  height: 60px;
}
</style>
