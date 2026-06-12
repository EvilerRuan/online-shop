// 零售用户类型

import type { Channel } from '../constants/channel'

// 零售用户资料（扩展 UserProfile）
export interface RetailUser {
  id: string
  user_no: number
  username: string
  phone: string
  role: string
  status: string
  channel: Channel
  openid: string | null
  unionid: string | null
  avatar_url: string
  referrer_id: string | null
  points_balance: number
  created_at: string
}

// 微信登录请求
export interface WxLoginRequest {
  code: string
  ref?: string
}

// 验证码登录请求
export interface SmsLoginRequest {
  phone: string
  code: string
  ref?: string
}

// 发送验证码请求
export interface SendCodeRequest {
  phone: string
}

// 零售登录响应
export interface RetailLoginResponse {
  token: string
  refresh_token?: string
  user: RetailUser
}

// 更新零售用户资料请求
export interface UpdateRetailProfileRequest {
  username?: string
  avatar_url?: string
}
