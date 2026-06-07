<template>
  <div class="page-address">
    <van-nav-bar
      :title="isFromCheckout ? '选择收货地址' : '收货地址'"
      left-arrow
      @click-left="$router.back()"
    />

    <div v-if="loading" class="page-address__loading">
      <van-loading />
    </div>

    <template v-else-if="addresses.length > 0">
      <div class="page-address__content">
        <div
          v-for="item in addresses"
          :key="item.id"
          class="address-card"
          :class="{
            'address-card--selectable': isFromCheckout,
            'address-card--selected': isFromCheckout && selectedId === item.id,
            'address-card--default': !isFromCheckout && item.is_default,
          }"
          @click="isFromCheckout ? handleSelect(item) : handleEdit(item.id)"
        >
          <van-checkbox
            v-if="isFromCheckout"
            :model-value="selectedId === item.id"
            class="address-card__checkbox"
          />
          <div class="address-card__header">
            <span class="address-card__name">{{ item.recipient_name }}</span>
            <span class="address-card__phone">{{ item.phone }}</span>
            <van-tag
              v-if="isFromCheckout && selectedId === item.id"
              type="success"
              size="medium"
              class="address-card__tag"
            >已选</van-tag>
            <van-tag
              v-else-if="isFromCheckout && item.is_default"
              plain
              size="medium"
              class="address-card__tag address-card__tag--default"
            >默认</van-tag>
            <van-tag
              v-else-if="item.is_default && !isFromCheckout"
              type="primary"
              size="medium"
              class="address-card__tag"
            >默认</van-tag>
          </div>
          <div class="address-card__detail">
            {{ item.province }}{{ item.city }}{{ item.district }}{{ item.detail }}
          </div>
          <div class="address-card__actions">
            <van-icon name="edit" size="18" @click.stop="handleEdit(item.id)" />
            <van-icon name="delete-o" size="18" color="#ee0a24" @click.stop="handleDelete(item)" />
          </div>
        </div>
      </div>
    </template>

    <van-empty v-else description="暂无收货地址">
      <van-button type="primary" size="small" round @click="handleAdd">
        添加地址
      </van-button>
    </van-empty>

    <!-- 底部添加按钮（非选择模式时显示） -->
    <div v-if="!isFromCheckout" class="page-address__footer">
      <van-button type="primary" block round @click="handleAdd">
        新增地址
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import type { Address } from 'shared/types/address'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const isFromCheckout = computed(() => route.query.from === 'checkout')

const addresses = ref<Address[]>([])
const loading = ref(false)
const selectedId = ref<number | null>(null)

async function fetchAddresses() {
  loading.value = true
  try {
    const res = await request.get('/addresses')
    addresses.value = res.data.data
    // 初始化选中地址
    if (isFromCheckout.value) {
      const savedId = sessionStorage.getItem('selectedAddressId')
      if (savedId) {
        const savedAddr = addresses.value.find((a) => a.id === Number(savedId))
        if (savedAddr) {
          selectedId.value = savedAddr.id
          return
        }
      }
      const defaultAddr = addresses.value.find((a) => a.is_default)
      if (defaultAddr) {
        selectedId.value = defaultAddr.id
      }
    }
  } catch {
    showToast('加载地址列表失败')
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  router.push({ name: 'AddressEdit' })
}

function handleEdit(id: number) {
  router.push({ name: 'AddressEdit', params: { id } })
}

function handleSelect(item: Address) {
  selectedId.value = item.id
  // 通过 sessionStorage 传递选中地址，直接返回到 Checkout
  sessionStorage.setItem('selectedAddressId', String(item.id))
  router.back()
}

function handleDelete(item: Address) {
  showDialog({
    title: '提示',
    message: '确定要删除该地址吗？',
    showCancelButton: true,
  }).then(async () => {
    try {
      await request.delete(`/addresses/${item.id}`)
      showToast('删除成功')
      await fetchAddresses()
    } catch {
      showToast('删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchAddresses()
})
</script>

<style scoped>
.page-address {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: 70px;
}

.page-address__loading {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}

.page-address__content {
  padding: 12px;
}

.address-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 10px;
  position: relative;
  border: 1px solid transparent;
}

.address-card--default {
  border-color: #e5e5e5;
}

.address-card--selectable {
  cursor: pointer;
}

.address-card--selectable:active {
  background: #f7f8fa;
}

.address-card--selected {
  border-color: #1989fa;
  border-width: 2px;
  background: #f0f8ff;
}

.address-card__tag--default {
  color: #969799;
}

.address-card__checkbox {
  flex-shrink: 0;
  margin-right: 6px;
}

.address-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.address-card__name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
}

.address-card__phone {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.address-card__tag {
  margin-left: auto;
}

.address-card__detail {
  font-size: 13px;
  color: var(--text-color-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.address-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.page-address__footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid var(--border-color);
  z-index: 100;
}
</style>
