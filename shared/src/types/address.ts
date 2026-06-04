export interface Address {
  id: number
  user_id: string
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// 新增/编辑地址请求
export interface AddressRequest {
  recipient_name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
}
