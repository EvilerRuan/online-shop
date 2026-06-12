import type { OrderStatus } from '../constants/order-status'
import type { Channel } from '../constants/channel'

export interface Order {
  id: number
  order_no: string
  user_id: string
  total_amount: number
  status: OrderStatus
  remark: string
  recipient_name: string
  recipient_phone: string
  address: string
  shipping_no: string | null
  // 零售扩展字段
  channel: Channel
  shipping_fee: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string
  main_image: string | null
  price: number
  quantity: number
  subtotal: number
  remark: string
}

// 订单详情
export interface OrderDetail extends Order {
  items: OrderItem[]
}

// 订单列表项（简化）
export interface OrderListItem {
  id: number
  order_no: string
  total_amount: number
  status: OrderStatus
  status_text: string
  item_count: number
  product_images: (string | null)[]
  // 零售扩展字段
  channel?: Channel
  shipping_fee?: number
  created_at: string
}

// 订单状态计数
export interface OrderCount {
  pending_payment: number
  pending_shipment: number
  pending_receipt: number
}

// 创建订单请求
export interface CreateOrderRequest {
  address_id: number
  cart_ids: number[]
  remark?: string
}

// 发货请求
export interface ShipOrderRequest {
  shipping_no: string
}
