// 运费相关类型

export type FeeType = 'fixed' | 'free_threshold' | 'free'

// 运费配置
export interface ShippingFee {
  id: number
  province: string
  city: string
  fee_type: FeeType
  base_fee: number
  free_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// 新增/编辑运费配置请求
export interface ShippingFeeRequest {
  province: string
  city: string
  fee_type: FeeType
  base_fee: number
  free_threshold: number
  is_active: boolean
}

// 运费计算响应
export interface ShippingCalculateResponse {
  shipping_fee: number
  free_threshold: number
  is_free: boolean
}
