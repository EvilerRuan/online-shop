// 统一响应格式
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 分页响应
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

// 分页响应包装
export type PaginatedResponse<T> = ApiResponse<PageResult<T>>

// 登录响应
export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: UserSession
}

// 用户 Session
export interface UserSession {
  id: string
  user_no: number
  username: string
  phone: string
  role: 'user' | 'admin'
}

// 上传文件响应
export interface UploadResponse {
  url: string
}
