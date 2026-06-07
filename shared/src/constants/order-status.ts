export type OrderStatus =
  | 'pending_payment'
  | 'pending_shipment'
  | 'pending_receipt'
  | 'completed'
  | 'cancelled'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: '待付款',
  pending_shipment: '待发货',
  pending_receipt: '待收货',
  completed: '已完成',
  cancelled: '已取消',
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: '#fa8c16',
  pending_shipment: '#1677ff',
  pending_receipt: '#07C160',
  completed: '#8c8c8c',
  cancelled: '#ee0a24',
}
