export interface Product {
  id: number | string
  name: string
  price: number
  main_image?: string
  code?: string
  stock?: number
  sales?: number
  description?: string
  category_id?: number
}
