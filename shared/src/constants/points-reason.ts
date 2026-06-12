// 积分原因常量

export type PointsReason = 'register' | 'referral' | 'first_purchase' | 'redeem' | 'admin_adjust'
export type PointsType = 'earn' | 'spend'

export const POINTS_REASON_LABEL: Record<PointsReason, string> = {
  register: '注册赠送',
  referral: '推荐新人',
  first_purchase: '首次确认收货',
  redeem: '积分兑换',
  admin_adjust: '管理员调整',
}

export const POINTS_TYPE_LABEL: Record<PointsType, string> = {
  earn: '获得',
  spend: '消耗',
}

export const POINTS_TYPE_COLOR: Record<PointsType, string> = {
  earn: 'green',
  spend: 'red',
}

// 积分兑换订单状态
export type PointsRedeemStatus = 'pending' | 'shipped' | 'completed' | 'cancelled'

export const POINTS_REDEEM_STATUS_LABEL: Record<PointsRedeemStatus, string> = {
  pending: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}
