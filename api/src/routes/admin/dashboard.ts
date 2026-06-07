import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { success } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'
import { ORDER_STATUS_LABEL } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'

const dashboard = new Hono<Env>()

dashboard.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const [userCountRes, productCountRes, orderCountRes, todayAmountRes, recentOrdersRes] =
    await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
      db.from('products').select('id', { count: 'exact', head: true }),
      db.from('orders').select('id', { count: 'exact', head: true }),
      (() => {
        const today = new Date().toISOString().slice(0, 10)
        return db
          .from('orders')
          .select('total_amount')
          .gte('created_at', today)
      })(),
      db
        .from('orders')
        .select('id, order_no, user_id, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

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
    created_at: string
  }) => ({
    id: o.id,
    order_no: o.order_no,
    user_phone: phoneMap[o.user_id] ?? '',
    total_amount: o.total_amount,
    status: o.status,
    status_text: ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status,
    created_at: o.created_at,
  }))

  return success(c, {
    user_count,
    product_count,
    order_count,
    today_order_amount,
    recent_orders,
  })
})

export default dashboard
