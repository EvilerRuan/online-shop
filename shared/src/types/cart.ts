export interface CartItem {
  id: number
  user_id: string
  product_id: number
  sku_id: number
  quantity: number
  remark: string
  created_at: string
  updated_at: string
}

// 购物车列表项（含关联商品和规格信息）
export interface CartListItem {
  id: number
  product: {
    id: number
    name: string
    main_image: string | null
  }
  sku: {
    id: number
    sku_name: string
    price: number
    stock: number
    min_order_qty: number
    quantity: number
  }
  quantity: number
  subtotal: number
  remark: string
}

// 加入购物车请求
export interface AddToCartRequest {
  product_id: number
  sku_id: number
  quantity: number
  remark?: string
}

// 更新购物车请求
export interface UpdateCartRequest {
  quantity: number
}
