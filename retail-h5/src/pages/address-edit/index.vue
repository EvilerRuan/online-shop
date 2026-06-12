<template>
  <view class="page-address-edit">
    <scroll-view class="page-address-edit__form" scroll-y>
      <view class="form-group">
        <text class="form-label">收货人</text>
        <input
          class="form-input"
          v-model="formData.recipient_name"
          placeholder="请输入收货人姓名"
        />
      </view>

      <view class="form-group">
        <text class="form-label">手机号</text>
        <input
          class="form-input"
          type="number"
          maxlength="11"
          v-model="formData.phone"
          placeholder="请输入手机号码"
        />
      </view>

      <view class="form-group">
        <text class="form-label">所在地区</text>
        <picker mode="region" :value="regionValue" @change="onRegionChange">
          <view class="form-picker">
            <text :class="{ 'form-picker--placeholder': !formData.province }">
              {{ formData.province ? `${formData.province} ${formData.city} ${formData.district}` : '请选择省市区' }}
            </text>
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="form-label">详细地址</text>
        <input
          class="form-input"
          v-model="formData.detail"
          placeholder="请输入详细地址（街道、门牌号等）"
        />
      </view>

      <view class="form-group form-group--switch">
        <text class="form-label">设为默认地址</text>
        <switch :checked="formData.is_default" @change="onSwitchChange" color="#07C160" />
      </view>
    </scroll-view>

    <view class="page-address-edit__footer">
      <view class="save-btn" @tap="saveAddress">保存地址</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface FormData {
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
}

const formData = ref<FormData>({
  recipient_name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false,
})

const regionValue = ref<string[]>([])
const addressId = ref<number | null>(null)
const fromCheckout = ref(false)

onMounted(() => {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options

  if (options.id) {
    addressId.value = parseInt(options.id)
    loadAddress(addressId.value)
  }
  
  if (options.from === 'checkout') {
    fromCheckout.value = true
  }
})

async function loadAddress(id: number) {
  try {
    const res = await api.get<FormData>(`/api/retail/addresses/${id}`)
    formData.value = res
    if (res.province) {
      regionValue.value = [res.province, res.city, res.district]
    }
  } catch (err) {
    Taro.showToast({ title: '加载失败', icon: 'none' })
  }
}

function onRegionChange(e: any) {
  const [province, city, district] = e.detail.value
  formData.value.province = province
  formData.value.city = city
  formData.value.district = district
}

function onSwitchChange(e: any) {
  formData.value.is_default = e.detail.value
}

async function saveAddress() {
  const { recipient_name, phone, province, city, district, detail } = formData.value

  const name = String(recipient_name || '').trim()
  const phoneNumber = String(phone || '').trim()
  const addressDetail = String(detail || '').trim()

  if (!name) {
    Taro.showToast({ title: '请输入收货人', icon: 'none' })
    return
  }
  
  // 手机号正则校验：11 位数字，以 1 开头
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phoneNumber)) {
    Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  
  if (!province || !city || !district) {
    Taro.showToast({ title: '请选择所在地区', icon: 'none' })
    return
  }
  if (!addressDetail) {
    Taro.showToast({ title: '请输入详细地址', icon: 'none' })
    return
  }

  // 更新表单数据为处理后的值
  formData.value.recipient_name = name
  formData.value.phone = phoneNumber
  formData.value.detail = addressDetail

  try {
    if (addressId.value) {
      await api.put(`/api/retail/addresses/${addressId.value}`, formData.value)
    } else {
      const res = await api.post('/api/retail/addresses', formData.value)
      // 如果是从结算页来的新增地址，自动选中这个地址
      if (fromCheckout.value && res?.id) {
        Taro.setStorageSync('selected_address_id', res.id)
      }
    }
    Taro.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      Taro.navigateBack()
    }, 1000)
  } catch (err: any) {
    Taro.showToast({ title: err.message || '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-address-edit {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-address-edit__form {
  flex: 1;
  padding: 24px;
}

.form-group {
  background-color: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.form-group--switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  font-size: 26px;
  color: $text-color;
  display: block;
  margin-bottom: 16px;
}

.form-input {
  width: 100%;
  height: 48px;
  font-size: 28px;
  color: $text-color;
}

.form-picker {
  height: 48px;
  display: flex;
  align-items: center;
  font-size: 28px;
  color: $text-color;
}

.form-picker--placeholder {
  color: $text-color-secondary;
}

.page-address-edit__footer {
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.save-btn {
  height: 88px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  border-radius: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 600;
  color: #fff;
}
</style>
