<template>
  <div class="page-cart">
    <van-nav-bar title="购物车" />

    <div v-if="loading" class="page-cart__loading">
      <van-loading />
    </div>

    <template v-else-if="cartStore.items.length > 0">
      <div class="page-cart__content">
        <van-checkbox-group v-model="cartStore.selectedIds" class="cart-list">
          <div
            v-for="item in cartStore.items"
            :key="item.id"
            class="cart-item"
          >
            <van-checkbox :name="item.id" class="cart-item__checkbox" />
            <van-image
              :src="item.product.main_image || ''"
              width="80"
              height="80"
              fit="cover"
              radius="4"
              class="cart-item__image"
            />
            <div class="cart-item__info">
              <div class="cart-item__header">
                <span class="cart-item__name">{{ item.product.name }}</span>
                <van-icon
                  name="delete-o"
                  size="18"
                  color="var(--text-color-secondary)"
                  class="cart-item__delete"
                  @click="handleDelete(item.id)"
                />
              </div>
              <span class="cart-item__sku">{{ item.sku.sku_name }}</span>
              <div class="cart-item__footer">
                <span class="cart-item__price">¥{{ item.sku.price.toFixed(2) }}</span>
                <div class="cart-item__stepper">
                  <button
                    class="cart-item__stepper-btn"
                    :disabled="getUnits(item) <= getMinUnits(item)"
                    @click="decreaseQty(item)"
                  >
                    <van-icon name="minus" />
                  </button>
                  <span class="cart-item__stepper-value">{{ item.quantity }}</span>
                  <button
                    class="cart-item__stepper-btn"
                    :disabled="getUnits(item) >= getMaxUnits(item)"
                    @click="increaseQty(item)"
                  >
                    <van-icon name="plus" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </van-checkbox-group>
      </div>

      <div class="page-cart__bottom">
        <van-checkbox
          :model-value="cartStore.isAllSelected"
          @update:model-value="cartStore.toggleSelectAll()"
        >
          全选
        </van-checkbox>
        <div class="page-cart__total">
          合计：
          <span class="page-cart__total-price">¥{{ cartStore.totalPrice.toFixed(2) }}</span>
        </div>
        <van-button
          type="primary"
          size="small"
          round
          :disabled="cartStore.selectedCount === 0"
          @click="handleCheckout"
        >
          结算{{ cartStore.selectedCount > 0 ? `(${cartStore.selectedCount})` : '' }}
        </van-button>
      </div>
    </template>

    <van-empty v-else description="购物车是空的">
      <van-button type="primary" size="small" round @click="$router.push('/home')">
        去逛逛
      </van-button>
    </van-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import type { CartListItem } from 'shared/types/cart'
import { useCartStore } from '@/stores/useCartStore'

const router = useRouter()
const cartStore = useCartStore()
const loading = ref(false)

async function loadCart() {
  loading.value = true
  try {
    await cartStore.fetchCart()
  } catch {
    showToast('加载购物车失败')
  } finally {
    loading.value = false
  }
}

onActivated(() => {
  loadCart()
})

loadCart()

function getUnits(item: CartListItem) {
  return Math.round(item.quantity / item.sku.quantity)
}

function getMinUnits(item: CartListItem) {
  return Math.ceil(item.sku.min_order_qty / item.sku.quantity)
}

function getMaxUnits(item: CartListItem) {
  return Math.floor(item.sku.stock / item.sku.quantity)
}

function increaseQty(item: CartListItem) {
  if (getUnits(item) >= getMaxUnits(item)) return
  const newQty = item.quantity + item.sku.quantity
  cartStore.updateQuantity(item.id, newQty).catch(() => {
    showToast('修改数量失败')
  })
}

function decreaseQty(item: CartListItem) {
  if (getUnits(item) <= getMinUnits(item)) return
  const newQty = item.quantity - item.sku.quantity
  cartStore.updateQuantity(item.id, newQty).catch(() => {
    showToast('修改数量失败')
  })
}

function handleDelete(id: number) {
  showDialog({
    title: '提示',
    message: '确定要删除该商品吗？',
    showCancelButton: true,
  }).then(() => {
    cartStore.removeItem(id).catch(() => {
      showToast('删除失败')
    })
  }).catch(() => {})
}

function handleCheckout() {
  if (cartStore.selectedIds.length === 0) return
  router.push({
    name: 'Checkout',
    query: { cartIds: JSON.stringify(cartStore.selectedIds) },
  })
}
</script>

<style scoped>
.page-cart {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-bottom: 110px;
}

.page-cart__loading {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}

.page-cart__content {
  padding: 12px;
}

.cart-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.cart-item__checkbox {
  flex-shrink: 0;
  margin-right: 8px;
}

.cart-item__image {
  flex-shrink: 0;
  margin-right: 10px;
}

.cart-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cart-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cart-item__name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.cart-item__delete {
  flex-shrink: 0;
  padding: 2px;
}

.cart-item__sku {
  font-size: 12px;
  color: var(--text-color-secondary);
}

.cart-item__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cart-item__price {
  font-size: 14px;
  font-weight: 600;
  color: var(--price-color);
}

.cart-item__stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  overflow: hidden;
}

.cart-item__stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #f2f3f5;
  color: #323233;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.cart-item__stepper-btn:active:not(:disabled) {
  background: #e5e5e5;
}

.cart-item__stepper-btn:disabled {
  color: #c8c9cc;
  cursor: not-allowed;
}

.cart-item__stepper-value {
  display: inline-block;
  min-width: 36px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  font-size: 13px;
  color: #323233;
  background: #fff;
}

.page-cart__bottom {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  height: 50px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-top: 1px solid var(--border-color);
  z-index: 100;
}

.page-cart__total {
  flex: 1;
  text-align: right;
  margin-right: 12px;
  font-size: 14px;
}

.page-cart__total-price {
  color: var(--price-color);
  font-size: 16px;
  font-weight: 600;
}
</style>
