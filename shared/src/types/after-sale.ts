// 售后相关类型

import type { AfterSaleStatus, AfterSaleType } from '../constants/after-sale-status'

// 售后工单
export interface AfterSale {
  id: number
  order_id: number
  order_item_id: number
  user_id: string
  type: AfterSaleType
  status: AfterSaleStatus
  reason: string
  refund_amount: number
  evidence_images: string[]
  return_shipping_no: string
  reject_reason: string
  created_at: string
  updated_at: string
}

// 售后工单详情（含关联信息）
export interface AfterSaleDetail extends AfterSale {
  order: {
    order_no: string
    total_amount: number
    shipping_fee: number
  }
  order_item: {
    product_name: string
    sku_name: string
    price: number
    quantity: number
    image: string
  }
  user: {
    username: string
    phone: string
  }
}

// 申请售后请求
export interface CreateAfterSaleRequest {
  order_id: number
  order_item_id: number
  type: AfterSaleType
  reason: string
  refund_amount: number
  evidence_images?: string[]
}

// 填写退货快递单号请求
export interface ReturnShippingRequest {
  return_shipping_no: string
}

// 拒绝售后请求（管理后台）
export interface RejectAfterSaleRequest {
  reject_reason: string
}
