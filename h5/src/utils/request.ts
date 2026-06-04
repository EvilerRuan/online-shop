import axios from 'axios'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/useAuthStore'
import router from '@/router'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.session?.access_token) {
    config.headers.Authorization = `Bearer ${authStore.session.access_token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      showToast(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      // 尝试刷新 token
      if (authStore.session?.refresh_token) {
        const refreshed = await authStore.refreshToken()
        if (refreshed) {
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${authStore.session!.access_token}`
          return request(error.config)
        }
      }
      authStore.logout()
      router.replace({ path: '/login' })
    }
    // 提取后端返回的具体错误信息
    const msg = error.response?.data?.message
    showToast(msg || '网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
