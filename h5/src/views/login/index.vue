<template>
  <div class="page-login">
    <div class="page-login__header">
      <div class="page-login__logo">🛒</div>
      <h1 class="page-login__title">贝贝优品百货</h1>
    </div>

    <div class="page-login__form">
      <van-cell-group inset>
        <van-field
          v-model="phone"
          placeholder="请输入手机号"
          type="tel"
          clearable
          maxlength="11"
          @blur="validatePhone"
        />
        <van-field
          v-model="password"
          placeholder="请输入密码"
          type="password"
          clearable
          @blur="validatePassword"
        />
      </van-cell-group>

      <div class="page-login__actions">
        <van-button
          type="primary"
          block
          round
          :loading="loading"
          :disabled="!isValid"
          @click="handleLogin"
        >
          登录
        </van-button>
        <div class="page-login__forget" @click="handleForget">忘记密码</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const phone = ref('')
const password = ref('')
const loading = ref(false)

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value))
const passwordValid = computed(() => password.value.length >= 6)
const isValid = computed(() => phoneValid.value && passwordValid.value)

function validatePhone() {
  if (phone.value && !phoneValid.value) {
    showToast('请输入正确的11位手机号')
  }
}

function validatePassword() {
  if (password.value && !passwordValid.value) {
    showToast('密码至少6位')
  }
}

function handleForget() {
  showToast('请联系商家重置密码')
}

async function handleLogin() {
  if (!isValid.value || loading.value) return

  loading.value = true
  try {
    await authStore.login(phone.value, password.value)
    showToast({ message: '登录成功', type: 'success' })
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } catch (err: any) {
    showToast(err.message || '登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-login {
  min-height: 100vh;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  padding-top: 120px;
}

.page-login__header {
  text-align: center;
  margin-bottom: 48px;
}

.page-login__logo {
  font-size: 56px;
  margin-bottom: 12px;
}

.page-login__title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-color);
}

.page-login__form {
  padding: 0 24px;
}

.page-login__actions {
  margin-top: 32px;
}

.page-login__actions :deep(.van-button--primary) {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.page-login__forget {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-color-secondary);
}
</style>
