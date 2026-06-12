import type { SalesChannel } from '../constants/channel'

export interface Product {
  id: number
  name: string
  product_no: string
  barcode: string | null
  category_id: number
  main_image: string | null
  description: string
  price: number
  stock: number
  min_order_qty: number
  sales_count: number
  status: 'active' | 'inactive'
  // 零售扩展字段
  retail_price: number
  sales_channel: SalesChannel
  created_at: string
  updated_at: string
}

export interface ProductSku {
  id: number
  product_id: number
  sku_name: string
  quantity: number
  sort_order: number
}

// 商品详情（含规格列表）
export interface ProductDetail extends Product {
  category: {
    id: number
    name: string
  }
  skus: ProductSku[]
}

// 商品列表项（简化）
export interface ProductListItem {
  id: number
  name: string
  main_image: string | null
  price: number
  stock: number
  sales_count: number
}

// 新增商品请求
export interface CreateProductRequest {
  name: string
  barcode?: string
  category_id: number
  main_image?: string
  description?: string
  price: number
  stock: number
  min_order_qty: number
  skus: { sku_name: string; quantity: number }[]
  // 零售扩展字段
  retail_price?: number
  sales_channel?: SalesChannel
}

// 编辑商品请求
export interface UpdateProductRequest {
  name: string
  barcode?: string
  category_id: number
  main_image?: string
  description?: string
  price: number
  stock: number
  min_order_qty: number
  skus: { sku_name: string; quantity: number }[]
  // 零售扩展字段
  retail_price?: number
  sales_channel?: SalesChannel
}
