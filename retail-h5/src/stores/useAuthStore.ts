import { defineStore } from 'pinia'
import { ref } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface AuthUser {
  id: string
  user_no: number
  username: string
  phone: string
  channel: string
  avatar_url: string | null
  points_balance: number
  referrer_id: string | null
}

interface SmsLoginRes {
  token: string
  user: AuthUser
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(Taro.getStorageSync('retail_token') || '')
  const user = ref<AuthUser | null>(
    Taro.getStorageSync('retail_user')
      ? JSON.parse(Taro.getStorageSync('retail_user'))
      : null
  )
  const isLoggedIn = ref(!!Taro.getStorageSync('retail_token'))

  function checkToken(): boolean {
    const t = Taro.getStorageSync('retail_token')
    if (t) {
      token.value = t
      isLoggedIn.value = true
      return true
    }
    return false
  }

  async function sendCode(phone: string) {
    await api.post('/api/auth/send-code', { phone })
  }

  async function smsLogin(phone: string, code: string, ref?: string) {
    const data: Record<string, unknown> = { phone, code }
    if (ref) data.ref = ref

    const res = await api.post<SmsLoginRes>('/api/auth/sms-login', data)
    token.value = res.token
    user.value = res.user
    isLoggedIn.value = true
    Taro.setStorageSync('retail_token', res.token)
    Taro.setStorageSync('retail_user', JSON.stringify(res.user))
  }

  async function wxLogin(ref?: string) {
    const loginRes = await Taro.login()
    const data: Record<string, unknown> = { code: loginRes.code }
    if (ref) data.ref = ref

    const res = await api.post<SmsLoginRes>('/api/auth/wx-login', data)
    token.value = res.token
    user.value = res.user
    isLoggedIn.value = true
    Taro.setStorageSync('retail_token', res.token)
    Taro.setStorageSync('retail_user', JSON.stringify(res.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    isLoggedIn.value = false
    Taro.removeStorageSync('retail_token')
    Taro.removeStorageSync('retail_user')
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  return {
    token,
    user,
    isLoggedIn,
    checkToken,
    sendCode,
    smsLogin,
    wxLogin,
    logout,
  }
})
