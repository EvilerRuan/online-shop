import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { success } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'
import { ORDER_STATUS_LABEL } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'

const dashboard = new Hono<Env>()

dashboard.get('/', async (c) => {
  const db = createAdminClient(c.env)
  const channel = c.req.query('channel') // 'all' | 'wholesale' | 'retail'

  // 构建订单查询（按渠道过滤）
  const buildOrderQuery = () => {
    let q = db.from('orders').select('id, order_no, user_id, total_amount, status, channel, created_at')
    if (channel && channel !== 'all') {
      q = q.eq('channel', channel)
    }
    return q
  }

  const buildOrderCountQuery = () => {
    let q = db.from('orders').select('id', { count: 'exact', head: true })
    if (channel && channel !== 'all') {
      q = q.eq('channel', channel)
    }
    return q
  }

  const buildTodayAmountQuery = () => {
    const today = new Date().toISOString().slice(0, 10)
    let q = db.from('orders').select('total_amount').gte('created_at', today)
    if (channel && channel !== 'all') {
      q = q.eq('channel', channel)
    }
    return q
  }

  // 用户查询（按渠道过滤）
  const buildUserCountQuery = () => {
    let q = db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user')
    if (channel && channel !== 'all') {
      q = q.eq('channel', channel)
    }
    return q
  }

  const [userCountRes, productCountRes, orderCountRes, todayAmountRes, recentOrdersRes] =
    await Promise.all([
      buildUserCountQuery(),
      db.from('products').select('id', { count: 'exact', head: true }),
      buildOrderCountQuery(),
      buildTodayAmountQuery(),
      buildOrderQuery().order('created_at', { ascending: false }).limit(5),
    ])

  // 零售模式额外查询：待处理售后 + 待回复消息
  let retailExtra: { pending_after_sales: number; unread_messages: number } | null = null
  if (channel === 'retail' || channel === 'all') {
    const [afterSalesRes, messagesRes] = await Promise.all([
      db.from('after_sales').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      db.from('customer_messages').select('id', { count: 'exact', head: true }).eq('sender_type', 'user').eq('is_read', false),
    ])
    retailExtra = {
      pending_after_sales: afterSalesRes.count ?? 0,
      unread_messages: messagesRes.count ?? 0,
    }
  }

  const user_count = userCountRes.count ?? 0
  const product_count = productCountRes.count ?? 0
  const order_count = orderCountRes.count ?? 0

  const today_order_amount = (todayAmountRes.data ?? []).reduce(
    (sum: number, row: { total_amount: number }) => sum + Number(row.total_amount),
    0,
  )

  const recentOrders = recentOrdersRes.data ?? []

  // Get user phones for recent orders
  const userIds = [...new Set(recentOrders.map((o: { user_id: string }) => o.user_id))]
  let phoneMap: Record<string, string> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, phone')
      .in('id', userIds)

    if (profiles) {
      phoneMap = Object.fromEntries(
        profiles.map((p: { id: string; phone: string }) => [p.id, p.phone]),
      )
    }
  }

  const recent_orders = recentOrders.map((o: {
    id: number
    order_no: string
    user_id: string
    total_amount: number
    status: string
    channel: string
    created_at: string
  }) => ({
    id: o.id,
    order_no: o.order_no,
    user_phone: phoneMap[o.user_id] ?? '',
    total_amount: o.total_amount,
    status: o.status,
    channel: o.channel,
    status_text: ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status,
    created_at: o.created_at,
  }))

  return success(c, {
    user_count,
    product_count,
    order_count,
    today_order_amount,
    recent_orders,
    ...(retailExtra ? retailExtra : {}),
  })
})

export default dashboard
