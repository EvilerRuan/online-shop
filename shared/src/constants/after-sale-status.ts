// 售后状态常量

export type AfterSaleStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'completed' | 'closed'
export type AfterSaleType = 'refund' | 'return_refund'

export const AFTER_SALE_STATUS_LABEL: Record<AfterSaleStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  approved: '已同意',
  rejected: '已拒绝',
  completed: '已完成',
  closed: '已关闭',
}

export const AFTER_SALE_STATUS_COLOR: Record<AfterSaleStatus, string> = {
  pending: 'orange',
  processing: 'blue',
  approved: 'green',
  rejected: 'red',
  completed: 'default',
  closed: 'default',
}

export const AFTER_SALE_TYPE_LABEL: Record<AfterSaleType, string> = {
  refund: '仅退款',
  return_refund: '退货退款',
}
