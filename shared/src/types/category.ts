export interface Category {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
  show_in_client: boolean
  created_at: string
  updated_at: string
}

// 分类树节点（含子分类）
export interface CategoryTreeNode extends Omit<Category, 'parent_id'> {
  children: Category[]
}

// 新增/编辑分类请求
export interface CategoryRequest {
  name: string
  parent_id: number | null
  sort_order: number
  show_in_client: boolean
}
