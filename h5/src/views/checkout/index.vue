<template>
  <div class="page-checkout">
    <van-nav-bar title="确认订单" left-arrow @click-left="$router.back()" />

    <div v-if="loading" class="page-checkout__loading">
      <van-loading />
    </div>

    <template v-else>
      <div class="page-checkout__content">
        <!-- 收货地址 -->
        <div class="section-card" @click="goAddress">
          <template v-if="defaultAddress">
            <div class="address-info">
              <div class="address-info__top">
                <span class="address-info__name">{{ defaultAddress.recipient_name }}</span>
                <span class="address-info__phone">{{ defaultAddress.phone }}</span>
              </div>
              <div class="address-info__detail">
                {{ defaultAddress.province }}{{ defaultAddress.city }}{{ defaultAddress.district }}{{ defaultAddress.detail }}
              </div>
            </div>
          </template>
          <template v-else>
            <div class="address-empty">请选择收货地址</div>
          </template>
          <van-icon name="arrow" size="16" color="var(--text-color-secondary)" />
        </div>

        <!-- 商品清单 -->
        <div class="section-card goods-list">
          <div
            v-for="item in orderItems"
            :key="item.id"
            class="goods-item"
          >
            <van-image
              :src="item.product.main_image || ''"
              width="64"
              height="64"
              fit="cover"
              radius="4"
              class="goods-item__image"
            />
            <div class="goods-item__info">
              <span class="goods-item__name">{{ item.product.name }}</span>
              <span class="goods-item__sku">{{ item.sku.sku_name }}</span>
              <div class="goods-item__bottom">
                <span class="goods-item__price">¥{{ item.sku.price.toFixed(2) }}</span>
                <span class="goods-item__qty">x{{ item.quantity }}</span>
              </div>
            </div>
          </div>
          <div class="goods-total">
            <span>共 {{ totalQty }} 件商品，合计：</span>
            <span class="goods-total__price">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>

        <!-- 订单备注 -->
        <div class="section-card">
          <van-field
            v-model="remark"
            label="备注"
            type="textarea"
            rows="2"
            placeholder="选填，请输入订单备注"
            maxlength="200"
            show-word-limit
            autosize
          />
        </div>
      </div>

      <!-- 底部提交 -->
      <div class="page-checkout__bottom">
        <div class="page-checkout__total">
          合计：<span class="page-checkout__total-price">¥{{ totalPrice.toFixed(2) }}</span>
        </div>
        <van-button
          type="primary"
          round
          :loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          提交订单
        </van-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import type { CartListItem } from 'shared/types/cart'
import type { Address } from 'shared/types/address'
import { useCartStore } from '@/stores/useCartStore'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()

const loading = ref(false)
const submitting = ref(false)
const remark = ref('')
const orderItems = ref<CartListItem[]>([])
const addresses = ref<Address[]>([])
const defaultAddress = ref<Address | null>(null)

// 获取选中的地址（优先从 sessionStorage，其次从 query 参数）
function getSelectedAddressId() {
  const sessionId = sessionStorage.getItem('selectedAddressId')
  // 不在这里清除，保留以便从 AddressList 返回时也能读取
  if (sessionId) {
    return Number(sessionId)
  }
  const queryId = route.query.selectedAddressId
  return queryId ? Number(queryId) : null
}

// 根据选中地址 ID 设置默认地址
function applySelectedAddress(addressList: Address[]) {
  const selectedId = getSelectedAddressId()
  if (selectedId) {
    const selected = addressList.find((a) => a.id === selectedId)
    if (selected) {
      defaultAddress.value = selected
      return
    }
  }
  // 否则使用默认地址
  defaultAddress.value = addressList.find((a) => a.is_default) || addressList[0] || null
}

const totalQty = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.quantity, 0)
)

const totalPrice = computed(() =>
  orderItems.value.reduce((sum, item) => sum + item.subtotal, 0)
)

const canSubmit = computed(() => !!defaultAddress.value && orderItems.value.length > 0)

async function loadAddresses() {
  try {
    const addrRes = await request.get('/addresses')
    addresses.value = addrRes.data.data
    applySelectedAddress(addresses.value)
  } catch {
    showToast('加载地址失败')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    // 从路由 query 获取已选商品 ID 列表
    const cartIdsStr = route.query.cartIds as string
    const cartIds = cartIdsStr ? JSON.parse(cartIdsStr) as number[] : []

    // 获取购物车列表
    const res = await request.get('/cart')
    const allItems: CartListItem[] = res.data.data

    // 过滤已选商品
    orderItems.value = cartIds.length > 0
      ? allItems.filter((item) => cartIds.includes(item.id))
      : allItems

    if (orderItems.value.length === 0) {
      showToast('没有可结算的商品')
      router.replace({ name: 'Cart' })
      return
    }

    await loadAddresses()
  } catch {
    showToast('加载数据失败')
  } finally {
    loading.value = false
  }
})

function goAddress() {
  router.push({ name: 'AddressList', query: { from: 'checkout' } })
}

async function handleSubmit() {
  if (!defaultAddress.value || submitting.value) return

  submitting.value = true
  try {
    const cartIds = orderItems.value.map((item) => item.id)
    const res = await request.post('/orders', {
      address_id: defaultAddress.value.id,
      cart_ids: cartIds,
      remark: remark.value,
    })

    const { order_id } = res.data.data
    if (!order_id) {
      showToast('订单创建异常')
      return
    }

    // 清理选中的地址
    sessionStorage.removeItem('selectedAddressId')

    showToast({ message: '下单成功', type: 'success' })

    // 订单创建成功后立即跳转，确保用户能看到订单
    router.replace({ name: 'OrderDetail', params: { id: String(order_id) } })

    // 异步清理购物车，不影响跳转
    cartStore.clearSelected()
    cartStore.fetchCart().catch(() => {})
  } catch {
    // 错误提示已在 request 拦截器中处理
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-checkout {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-bottom: 70px;
}

.page-checkout__loading {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}

.page-checkout__content {
  padding: 12px;
}

.section-card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

/* 地址卡片 */
.section-card:first-child {
  display: flex;
  align-items: center;
  padding: 14px 16px;
}

.address-info {
  flex: 1;
  min-width: 0;
}

.address-info__top {
  margin-bottom: 4px;
}

.address-info__name {
  font-size: 15px;
  font-weight: 600;
  margin-right: 12px;
}

.address-info__phone {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.address-info__detail {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.4;
}

.address-empty {
  flex: 1;
  font-size: 14px;
  color: var(--text-color-secondary);
}

/* 商品列表 */
.goods-list {
  padding: 12px 16px;
}

.goods-item {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.goods-item:last-of-type {
  border-bottom: none;
}

.goods-item__image {
  flex-shrink: 0;
  margin-right: 10px;
}

.goods-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.goods-item__name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-item__sku {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.goods-item__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-item__price {
  font-size: 14px;
  font-weight: 600;
  color: var(--price-color);
}

.goods-item__qty {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.goods-total {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 12px;
  font-size: 14px;
}

.goods-total__price {
  color: var(--price-color);
  font-size: 16px;
  font-weight: 600;
}

/* 底部 */
.page-checkout__bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  gap: 16px;
  border-top: 1px solid var(--border-color);
  z-index: 100;
}

.page-checkout__total {
  font-size: 14px;
}

.page-checkout__total-price {
  color: var(--price-color);
  font-size: 18px;
  font-weight: 600;
}
</style>
