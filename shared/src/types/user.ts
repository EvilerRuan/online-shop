export interface UserProfile {
  id: string
  user_no: number
  username: string
  phone: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
  created_at: string
  updated_at: string
}

// 新增用户请求
export interface CreateUserRequest {
  username: string
  phone: string
  password: string
}

// 重置密码请求
export interface ResetPasswordRequest {
  password: string
}
