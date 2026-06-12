<template>
  <view class="page-after-sales-apply">
    <scroll-view class="page-after-sales-apply__form" scroll-y>
      <!-- 售后类型 -->
      <view class="form-section">
        <text class="form-label">售后类型</text>
        <view class="type-options">
          <view
            class="type-option"
            :class="{ 'type-option--active': formData.type === 'refund' }"
            @tap="formData.type = 'refund'"
          >
            仅退款
          </view>
          <view
            class="type-option"
            :class="{ 'type-option--active': formData.type === 'return_refund' }"
            @tap="formData.type = 'return_refund'"
          >
            退货退款
          </view>
        </view>
      </view>

      <!-- 退款金额 -->
      <view class="form-section">
        <text class="form-label">退款金额</text>
        <input
          class="form-input"
          type="digit"
          v-model="formData.refund_amount"
          placeholder="请输入退款金额"
        />
      </view>

      <!-- 退款原因 -->
      <view class="form-section">
        <text class="form-label">退款原因</text>
        <textarea
          class="form-textarea"
          v-model="formData.reason"
          placeholder="请详细说明退款原因"
          maxlength="200"
        />
        <text class="form-hint">{{ formData.reason.length }}/200</text>
      </view>

      <!-- 凭证图片 -->
      <view class="form-section">
        <text class="form-label">凭证图片（选填）</text>
        <view class="image-upload">
          <view
            v-for="(img, index) in formData.images"
            :key="index"
            class="image-upload__item"
          >
            <image class="image-upload__img" :src="img" mode="aspectFill" />
            <view class="image-upload__delete" @tap="removeImage(index)">×</view>
          </view>
          <view v-if="formData.images.length < 3" class="image-upload__add" @tap="chooseImage">
            <text class="image-upload__add-icon">+</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="page-after-sales-apply__footer">
      <view class="submit-btn" @tap="submitApply">提交申请</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

const formData = ref({
  type: 'refund' as 'refund' | 'return_refund',
  refund_amount: '',
  reason: '',
  images: [] as string[],
})

const orderId = ref<number | null>(null)

onMounted(() => {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options

  if (options.order_id) {
    orderId.value = parseInt(options.order_id)
  }
})

async function chooseImage() {
  try {
    const res = await Taro.chooseImage({
      count: 3 - formData.value.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    formData.value.images = [...formData.value.images, ...res.tempFilePaths]
  } catch (err) {
    // 用户取消
  }
}

function removeImage(index: number) {
  formData.value.images.splice(index, 1)
}

async function submitApply() {
  if (!formData.value.refund_amount) {
    Taro.showToast({ title: '请输入退款金额', icon: 'none' })
    return
  }
  if (!formData.value.reason.trim()) {
    Taro.showToast({ title: '请输入退款原因', icon: 'none' })
    return
  }
  if (!orderId.value) {
    Taro.showToast({ title: '订单信息缺失', icon: 'none' })
    return
  }

  try {
    await api.post('/api/retail/after-sales', {
      order_id: orderId.value,
      type: formData.value.type,
      refund_amount: parseFloat(formData.value.refund_amount),
      reason: formData.value.reason,
      images: formData.value.images,
    })
    Taro.showToast({ title: '申请成功', icon: 'success' })
    setTimeout(() => {
      Taro.navigateBack({ delta: 2 })
    }, 1500)
  } catch (err) {
    Taro.showToast({ title: '提交失败', icon: 'none' })
  }
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-after-sales-apply {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-after-sales-apply__form {
  flex: 1;
  padding: 24px;
}

.form-section {
  background-color: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 26px;
  font-weight: 600;
  color: $text-color;
  display: block;
  margin-bottom: 16px;
}

.type-options {
  display: flex;
  gap: 16px;
}

.type-option {
  flex: 1;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid $border-color;
  font-size: 26px;
  color: $text-color;
}

.type-option--active {
  border-color: $primary-color;
  background-color: rgba(7, 193, 96, 0.1);
  color: $primary-color;
}

.form-input {
  width: 100%;
  height: 48px;
  font-size: 28px;
  color: $text-color;
}

.form-textarea {
  width: 100%;
  min-height: 200px;
  font-size: 26px;
  color: $text-color;
  line-height: 1.6;
}

.form-hint {
  display: block;
  text-align: right;
  font-size: 22px;
  color: $text-color-secondary;
  margin-top: 8px;
}

.image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.image-upload__item {
  position: relative;
  width: 160px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
}

.image-upload__img {
  width: 100%;
  height: 100%;
}

.image-upload__delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.image-upload__add {
  width: 160px;
  height: 160px;
  border: 2px dashed $border-color;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload__add-icon {
  font-size: 48px;
  color: $text-color-light;
}

.page-after-sales-apply__footer {
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.submit-btn {
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
