// 积分相关类型

import type { PointsType, PointsReason } from '../constants/points-reason'

// 积分流水
export interface PointsLedger {
  id: number
  user_id: string
  type: PointsType
  reason: PointsReason
  amount: number
  balance_after: number
  remark: string
  created_at: string
}

// 积分兑换商品
export interface PointsProduct {
  id: number
  name: string
  image: string
  points_cost: number
  stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// 新增/编辑积分商品请求
export interface PointsProductRequest {
  name: string
  image: string
  points_cost: number
  stock: number
  is_active: boolean
}

// 积分兑换订单
import type { PointsRedeemStatus } from '../constants/points-reason'

export interface PointsRedeemOrder {
  id: number
  user_id: string
  points_product_id: number
  product_name: string
  product_image: string
  points_used: number
  status: PointsRedeemStatus
  created_at: string
  updated_at: string
}

// 积分兑换请求
export interface PointsRedeemRequest {
  points_product_id: number
}

// 积分规则配置
export interface PointsConfig {
  register_points: number
  referral_points: number
  first_purchase_points: number
}

// 积分调整请求（管理后台）
export interface AdjustPointsRequest {
  type: 'add' | 'deduct'
  amount: number
  reason: string
}

// 积分余额响应
export interface PointsBalanceResponse {
  points_balance: number
}
