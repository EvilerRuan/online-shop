import axios from 'axios'
import { message } from 'antd'
import { API_CODES } from 'shared/constants/api-codes'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== undefined && data.code !== API_CODES.SUCCESS) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }
    return response
  },
  (error) => {
    if (error.response) {
      const { status } = error.response
      if (status === API_CODES.UNAUTHORIZED || status === API_CODES.FORBIDDEN) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        message.error(status === API_CODES.UNAUTHORIZED ? '登录已过期' : '无权限访问')
        window.location.href = '/admin/login'
        return Promise.reject(error)
      }
      message.error(error.response.data?.message || '请求失败')
    } else {
      message.error('网络异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)

export default request
