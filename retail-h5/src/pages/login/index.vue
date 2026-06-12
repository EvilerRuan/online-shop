<template>
  <view class="page-login">
    <view class="page-login__header">
      <view class="page-login__logo">🛒</view>
      <view class="page-login__title">贝壳优品零售</view>
    </view>

    <view class="page-login__form">
      <!-- 手机号输入 -->
      <view class="input-group">
        <input
          class="input-field"
          type="tel"
          :maxlength="11"
          placeholder="请输入手机号"
          placeholder-class="input-placeholder"
          :value="phone"
          @input="onPhoneInput"
          @blur="validatePhone"
        />
        <view
          v-if="phone.length > 0"
          class="input-clear"
          @tap="phone = ''"
        >
          <text class="clear-icon">✕</text>
        </view>
      </view>

      <view class="input-divider"></view>

      <!-- 验证码输入 -->
      <view class="input-group">
        <input
          class="input-field"
          type="tel"
          :maxlength="6"
          placeholder="请输入验证码"
          placeholder-class="input-placeholder"
          :value="code"
          @input="onCodeInput"
          @blur="validateCode"
        />
        <view
          class="code-btn"
          :class="{ 'code-btn--disabled': countdown > 0 || !phoneValid }"
          @tap="handleSendCode"
        >
          <text class="code-btn__text">
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </text>
        </view>
      </view>

      <!-- 登录按钮 -->
      <view class="page-login__actions">
        <view
          class="login-btn"
          :class="{ 'login-btn--disabled': !isValid || loading }"
          @tap="handleLogin"
        >
          <text class="login-btn__text">{{ loading ? '登录中...' : '登 录' }}</text>
        </view>
      </view>

      <!-- 用户协议 -->
      <view class="page-login__agreement">
        <text class="page-login__agreement-text">登录即表示同意</text>
        <text class="page-login__agreement-link">《用户协议》</text>
        <text class="page-login__agreement-text">和</text>
        <text class="page-login__agreement-link">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/useAuthStore'

const authStore = useAuthStore()

const phone = ref('17612167268')
const code = ref('123456')
const countdown = ref(0)
const loading = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value))
const codeValid = computed(() => /^\d{4,6}$/.test(code.value))
const isValid = computed(() => phoneValid.value && codeValid.value)

function onPhoneInput(e: any) {
  phone.value = (e.detail.value || '').replace(/\D/g, '')
}

function onCodeInput(e: any) {
  code.value = (e.detail.value || '').replace(/\D/g, '')
}

function validatePhone() {
  if (phone.value && !phoneValid.value) {
    Taro.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
  }
}

function validateCode() {
  if (code.value && !codeValid.value) {
    Taro.showToast({ title: '请输入4-6位验证码', icon: 'none' })
  }
}

async function handleSendCode() {
  if (countdown.value > 0 || !phoneValid.value) {
    if (!phoneValid.value) {
      Taro.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
    }
    return
  }

  try {
    await authStore.sendCode(phone.value)
    Taro.showToast({ title: '验证码已发送', icon: 'none' })

    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        if (timer) clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch (err: any) {
    Taro.showToast({ title: err.message || '发送失败', icon: 'none' })
  }
}

async function handleLogin() {
  if (!isValid.value || loading.value) return

  loading.value = true
  try {
    await authStore.smsLogin(phone.value, code.value)
    Taro.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/home/index' })
    }, 500)
  } catch (err: any) {
    Taro.showToast({ title: err.message || '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-login {
  min-height: 100vh;
  background-color: $bg-white;
  display: flex;
  flex-direction: column;
  padding-top: 240px;
}

.page-login__header {
  text-align: center;
  margin-bottom: 96px;
}

.page-login__logo {
  font-size: 112px;
  margin-bottom: 24px;
}

.page-login__title {
  font-size: 44px;
  font-weight: 600;
  color: $text-color;
}

.page-login__form {
  padding: 0 48px;
}

.input-group {
  display: flex;
  align-items: center;
  padding: 32px 0;
  min-height: 104px;
}

.input-field {
  flex: 1;
  min-width: 0;
  height: 48px;
  line-height: 48px;
  font-size: 30px;
  color: $text-color;
  border: none;
  outline: none;
  background: transparent;
  padding: 0 16px;
  -webkit-appearance: none;
  appearance: none;
}

.input-placeholder {
  color: $text-color-secondary;
  font-size: 30px;
}

.input-clear {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: $text-color-light;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.clear-icon {
  color: #fff;
  font-size: 20px;
  line-height: 1;
}

.input-divider {
  height: 1px;
  background-color: $border-color;
}

.code-btn {
  flex-shrink: 0;
  padding: 0 32px;
  height: 64px;
  line-height: 64px;
  border-radius: 12px;
  background-color: $primary-color;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    opacity: 0.8;
  }
}

.code-btn--disabled {
  background-color: $border-color;

  .code-btn__text {
    color: $text-color-light;
  }
}

.code-btn--disabled:active {
  opacity: 1;
}

.code-btn__text {
  font-size: 26px;
  color: #fff;
  white-space: nowrap;
}

.page-login__actions {
  margin-top: 64px;
}

.login-btn {
  height: 96px;
  border-radius: 48px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 40px rgba(7, 193, 96, 0.3);

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }

  &--disabled {
    background: linear-gradient(135deg, #a8e6c1, #8fd8ad);
    box-shadow: none;

    &:active {
      opacity: 1;
      transform: none;
    }
  }
}

.login-btn__text {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 8px;
}

.page-login__agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 64px;
  padding-bottom: 80px;
}

.page-login__agreement-text {
  font-size: 22px;
  color: $text-color-secondary;
}

.page-login__agreement-link {
  font-size: 22px;
  color: $primary-color;
}
</style>
