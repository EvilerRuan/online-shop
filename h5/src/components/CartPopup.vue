<template>
  <van-action-sheet
    v-model:show="visible"
    :close-on-click-overlay="false"
    class="cart-popup"
  >
    <div class="cart-popup__header">
      <img
        v-if="product?.main_image"
        :src="product.main_image"
        class="cart-popup__image"
      />
      <div v-else class="cart-popup__image cart-popup__image--placeholder">
        <van-icon name="photo-o" size="32" color="#dcdee0" />
      </div>
      <div class="cart-popup__info">
        <div class="cart-popup__price">
          <span class="cart-popup__price-symbol">¥</span>
          <span class="cart-popup__price-value">{{ displayPrice }}</span>
        </div>
        <div class="cart-popup__stock">
          库存：{{ product?.stock ?? '-' }}
        </div>
        <div class="cart-popup__name">{{ product?.name }}</div>
      </div>
      <van-icon
        name="cross"
        class="cart-popup__close"
        @click="visible = false"
      />
    </div>

    <div class="cart-popup__body">
      <div class="cart-popup__section">
        <div class="cart-popup__section-title">规格</div>
        <van-radio-group
          v-model="selectedSkuId"
          direction="horizontal"
          class="cart-popup__sku-group"
        >
          <van-radio
            v-for="sku in product?.skus"
            :key="sku.id"
            :name="sku.id"
            shape="dot"
            icon-size="0"
            class="cart-popup__sku-item"
            :class="{ 'cart-popup__sku-item--active': selectedSkuId === sku.id }"
          >
            {{ sku.sku_name }}
          </van-radio>
        </van-radio-group>
      </div>

      <div class="cart-popup__section">
        <div class="cart-popup__section-title">数量</div>
        <div class="cart-popup__stepper">
          <button
            class="cart-popup__stepper-btn"
            :disabled="units <= minUnits"
            @click="decreaseQty"
          >
            <van-icon name="minus" />
          </button>
          <span class="cart-popup__stepper-value">{{ displayQty }}</span>
          <button
            class="cart-popup__stepper-btn"
            :disabled="units >= maxUnits"
            @click="increaseQty"
          >
            <van-icon name="plus" />
          </button>
        </div>
      </div>

      <div class="cart-popup__section">
        <div class="cart-popup__section-title">备注</div>
        <van-field
          v-model="remark"
          type="textarea"
          placeholder="选填，请输入备注信息"
          rows="2"
          autosize
          border
        />
      </div>

      <div class="cart-popup__total">
        <span>合计：</span>
        <span class="cart-popup__total-price">¥{{ totalAmount }}</span>
      </div>
    </div>

    <div class="cart-popup__footer">
      <van-button
        type="danger"
        block
        round
        :loading="submitting"
        @click="handleConfirm"
      >
        确定
      </van-button>
    </div>
  </van-action-sheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import type { ProductDetail } from 'shared/types/product'
import type { AddToCartRequest } from 'shared/types/cart'
import request from '@/utils/request'

const props = defineProps<{
  product: ProductDetail | null
}>()

const emit = defineEmits<{
  (e: 'added'): void
}>()

const visible = defineModel<boolean>('show', { default: false })

const selectedSkuId = ref<number | null>(null)
// Internal: number of "units" (each unit = sku.quantity items)
const units = ref(1)
const remark = ref('')
const submitting = ref(false)

// Step = current SKU's quantity (e.g., if SKU is "件", quantity = 24 means 1件=24个)
const step = computed(() => {
  const sku = props.product?.skus.find((s) => s.id === selectedSkuId.value)
  return sku?.quantity ?? 1
})

const minOrderQty = computed(() => props.product?.min_order_qty ?? 1)
const stock = computed(() => props.product?.stock ?? 99)

// Convert product-level min_order_qty and stock to unit counts
const minUnits = computed(() => Math.ceil(minOrderQty.value / step.value))
const maxUnits = computed(() => Math.floor(stock.value / step.value))

// Display quantity in actual items
const displayQty = computed(() => units.value * step.value)

const displayPrice = computed(() => {
  if (props.product) {
    return props.product.price.toFixed(2)
  }
  return '0.00'
})

const totalAmount = computed(() => {
  if (!props.product) return '0.00'
  return (props.product.price * displayQty.value).toFixed(2)
})

function increaseQty() {
  if (units.value >= maxUnits.value) return
  units.value++
}

function decreaseQty() {
  if (units.value <= minUnits.value) return
  units.value--
}

function resetUnits() {
  // Reset to minimum aligned units
  units.value = minUnits.value
}

watch(visible, (val) => {
  if (val && props.product?.skus.length) {
    selectedSkuId.value = props.product.skus[0].id
    units.value = minUnits.value
    remark.value = ''
  }
})

watch(selectedSkuId, () => {
  resetUnits()
})

watch(step, () => {
  // If step changes, make sure units is within valid range
  if (units.value < minUnits.value) units.value = minUnits.value
  if (units.value > maxUnits.value) units.value = maxUnits.value
})

async function handleConfirm() {
  if (!selectedSkuId.value) {
    showToast('请选择规格')
    return
  }

  const payload: AddToCartRequest = {
    product_id: props.product!.id,
    sku_id: selectedSkuId.value,
    quantity: displayQty.value,
    remark: remark.value || undefined,
  }

  submitting.value = true
  try {
    await request.post('/cart', payload)
    showToast('已加入购物车')
    visible.value = false
    emit('added')
  } catch {
    // request interceptor already handles error display
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cart-popup__header {
  display: flex;
  padding: 16px;
  position: relative;
}

.cart-popup__image {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.cart-popup__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f8fa;
}

.cart-popup__info {
  flex: 1;
  margin-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
}

.cart-popup__price {
  color: var(--price-color);
  font-size: 20px;
  font-weight: 600;
}

.cart-popup__price-symbol {
  font-size: 14px;
}

.cart-popup__stock {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.cart-popup__name {
  font-size: 13px;
  color: var(--text-color);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-popup__close {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  color: var(--text-color-secondary);
}

.cart-popup__body {
  padding: 0 16px 16px;
  max-height: 50vh;
  overflow-y: auto;
}

.cart-popup__section {
  margin-bottom: 16px;
}

.cart-popup__section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 10px;
}

.cart-popup__sku-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cart-popup__sku-item {
  padding: 6px 16px;
  border-radius: 20px;
  background: #f2f3f5;
  font-size: 13px;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
}

.cart-popup__sku-item--active {
  background: rgba(238, 10, 36, 0.1);
  color: var(--danger-color);
}

/* Custom stepper */
.cart-popup__stepper {
  display: flex;
  align-items: center;
  gap: 0;
  width: fit-content;
  border: 1px solid #ebedf0;
  border-radius: 4px;
  overflow: hidden;
}

.cart-popup__stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f2f3f5;
  color: #323233;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.cart-popup__stepper-btn:active:not(:disabled) {
  background: #e5e5e5;
}

.cart-popup__stepper-btn:disabled {
  color: #c8c9cc;
  cursor: not-allowed;
}

.cart-popup__stepper-value {
  display: inline-block;
  min-width: 48px;
  height: 32px;
  line-height: 32px;
  text-align: center;
  font-size: 14px;
  color: #323233;
  background: #fff;
}

.cart-popup__total {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 0;
  font-size: 14px;
}

.cart-popup__total-price {
  color: var(--price-color);
  font-size: 18px;
  font-weight: 600;
}

.cart-popup__footer {
  padding: 8px 16px 16px;
}
</style>
