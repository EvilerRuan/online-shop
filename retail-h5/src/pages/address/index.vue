<template>
  <view class="page-address">
    <!-- 地址列表 -->
    <scroll-view class="page-address__list" scroll-y>
      <view
        v-for="item in addresses"
        :key="item.id"
        class="address-card"
        :class="{ 'address-card--selected': fromCheckout && selectedId === item.id }"
        @tap="selectAddress(item)"
      >
        <view class="address-card__header">
          <text class="address-card__name">{{ item.recipient_name }}</text>
          <text class="address-card__phone">{{ item.phone }}</text>
          <text v-if="item.is_default" class="address-card__default">默认</text>
        </view>
        <text class="address-card__detail">
          {{ item.province }}{{ item.city }}{{ item.district }}{{ item.detail }}
        </text>
        <view class="address-card__actions" v-if="!fromCheckout">
          <view class="action-btn" @tap.stop="editAddress(item)">
            <text class="action-icon">✏️</text>
            <text class="action-text">编辑</text>
          </view>
          <view class="action-btn action-btn--delete" @tap.stop="deleteAddress(item.id)">
            <text class="action-icon">🗑️</text>
            <text class="action-text">删除</text>
          </view>
        </view>
      </view>

      <view v-if="!loading && addresses.length === 0" class="empty">
        <text class="empty__icon">📍</text>
        <text class="empty__text">暂无收货地址</text>
        <view class="empty__btn" @tap="addAddress">
          <text class="empty__btn-text">+ 新增地址</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="page-address__footer">
      <view class="add-btn" @tap="addAddress">
        <text class="add-btn__icon">+</text>
        <text class="add-btn__text">新增地址</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro, { useDidShow } from '@tarojs/taro'
import api from '@/utils/request'

interface Address {
  id: number
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
}

const addresses = ref<Address[]>([])
const loading = ref(false)
const selectedId = ref<number | null>(null)
const fromCheckout = ref(false)

onMounted(() => {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options

  if (options.from === 'checkout') {
    fromCheckout.value = true
  }

  loadAddresses()
})

// 页面显示时重新加载地址列表（从编辑页返回时）
useDidShow(() => {
  loadAddresses()
})

async function loadAddresses() {
  loading.value = true
  try {
    const res = await api.get<Address[]>('/api/retail/addresses')
    addresses.value = res || []
  } catch (err) {
    Taro.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function selectAddress(item: Address) {
  if (fromCheckout.value) {
    selectedId.value = item.id
    Taro.setStorageSync('selected_address_id', item.id)
    Taro.navigateBack()
  }
}

function addAddress() {
  Taro.navigateTo({ url: `/pages/address-edit/index${fromCheckout.value ? '?from=checkout' : ''}` })
}

function editAddress(item: Address) {
  Taro.navigateTo({ url: `/pages/address-edit/index?id=${item.id}` })
}

async function deleteAddress(id: number) {
  Taro.showModal({
    title: '确认删除',
    content: '确定要删除该地址吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await api.delete(`/api/retail/addresses/${id}`)
          loadAddresses()
          Taro.showToast({ title: '删除成功', icon: 'success' })
        } catch (err: any) {
          Taro.showToast({ title: err.message || '删除失败', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-address {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-address__list {
  flex: 1;
  padding: 24px;
}

.address-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.address-card--selected {
  border: 2px solid $primary-color;
}

.address-card__header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.address-card__name {
  font-size: 28px;
  font-weight: 600;
  color: $text-color;
  margin-right: 16px;
}

.address-card__phone {
  font-size: 26px;
  color: $text-color;
}

.address-card__default {
  margin-left: auto;
  padding: 4px 12px;
  background-color: $primary-color;
  color: #fff;
  font-size: 20px;
  border-radius: 8px;
}

.address-card__detail {
  font-size: 26px;
  color: $text-color-secondary;
  line-height: 1.5;
  display: block;
  margin-bottom: 16px;
}

.address-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid $border-color;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-icon {
  font-size: 24px;
}

.action-text {
  font-size: 24px;
  color: $text-color-secondary;
}

.action-btn--delete {
  .action-text {
    color: #ff4d4f;
  }
}

.empty {
  padding: 120px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty__icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.empty__text {
  font-size: 26px;
  color: $text-color-secondary;
}

.empty__btn {
  margin-top: 24px;
  padding: 12px 32px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  border-radius: 24px;
}

.empty__btn-text {
  font-size: 26px;
  color: #fff;
}

.page-address__footer {
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.add-btn {
  height: 88px;
  background-color: #fff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn__icon {
  font-size: 32px;
  color: $primary-color;
  margin-right: 8px;
}

.add-btn__text {
  font-size: 28px;
  color: $primary-color;
}
</style>
