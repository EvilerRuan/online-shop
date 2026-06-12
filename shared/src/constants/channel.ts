// 渠道常量

export type Channel = 'wholesale' | 'retail'

export const CHANNEL_LABEL: Record<Channel, string> = {
  wholesale: '批发',
  retail: '零售',
}

export const CHANNEL_COLOR: Record<Channel, string> = {
  wholesale: 'blue',
  retail: 'green',
}

// 销售渠道
export type SalesChannel = 'wholesale' | 'retail' | 'both'

export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  wholesale: '仅批发',
  retail: '仅零售',
  both: '双渠道',
}
