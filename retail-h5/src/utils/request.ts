import Taro from '@tarojs/taro'

// 小程序环境直接使用完整 API URL
const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://localhost:8787'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: Record<string, unknown> | unknown[]
  header?: Record<string, string>
  showLoading?: boolean
}

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

async function request<T>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {}, showLoading = false } = options

  const token = Taro.getStorageSync('retail_token')
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  if (showLoading) {
    Taro.showLoading({ title: '加载中...', mask: true })
  }

  try {
    const res = await Taro.request<ApiResponse<T>>({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
    })

    if (showLoading) Taro.hideLoading()

    if (res.statusCode === 401) {
      Taro.removeStorageSync('retail_token')
      Taro.removeStorageSync('retail_user')
      Taro.navigateTo({ url: '/pages/login/index' })
      throw new Error('未登录')
    }

    const body = res.data
    if (body.code !== 0) {
      throw new Error(body.message || '请求失败')
    }

    return body.data
  } catch (err) {
    if (showLoading) Taro.hideLoading()
    throw err
  }
}

export const api = {
  get: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'GET', data }),

  post: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'POST', data }),

  put: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data }),

  delete: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'DELETE', data }),

  patch: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PATCH', data }),
}

export default api
