import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'
import { ORDER_STATUS_LABEL } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'

const orders = new Hono<Env>()

// GET / - Admin order list
orders.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const order_no = c.req.query('order_no')
  const user_phone = c.req.query('user_phone')
  const status = c.req.query('status')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  // If searching by user_phone, first find user ids
  let userIds: string[] | null = null
  if (user_phone) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .ilike('phone', `%${user_phone}%`)

    userIds = (profiles ?? []).map((p: { id: string }) => p.id)
    if (userIds.length === 0) {
      return paginate(c, [], 0, page, page_size)
    }
  }

  let query = db
    .from('orders')
    .select(
      'id, order_no, user_id, total_amount, status, shipping_no, created_at, updated_at, order_items(id, main_image)',
      { count: 'exact' },
    )

  if (order_no) {
    query = query.ilike('order_no', `%${order_no}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (userIds) {
    query = query.in('user_id', userIds)
  }

  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * page_size
  const to = from + page_size - 1
  query = query.range(from, to)

  const { data, count, error: dbError } = await query

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  const total = count ?? 0
  const rows = data ?? []

  // Get user phones
  const orderUserIds = [...new Set(rows.map((o: { user_id: string }) => o.user_id))]
  let phoneMap: Record<string, string> = {}
  if (orderUserIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, phone')
      .in('id', orderUserIds)

    if (profiles) {
      phoneMap = Object.fromEntries(
        profiles.map((p: { id: string; phone: string }) => [p.id, p.phone]),
      )
    }
  }

  const list = rows.map((o: Record<string, unknown>) => {
    const items = (o.order_items ?? []) as Array<{ main_image: string | null }>
    return {
      id: o.id,
      order_no: o.order_no,
      user_phone: phoneMap[o.user_id as string] ?? '',
      total_amount: o.total_amount,
      status: o.status,
      status_text: ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status,
      item_count: items.length,
      product_images: items.slice(0, 3).map((item) => item.main_image),
      created_at: o.created_at,
    }
  })

  return paginate(c, list, total, page, page_size)
})

// GET /:id - Admin order detail
orders.get('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return error(c, 404, '订单不存在')
  }

  const { data: items } = await db
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  // 查询 SKU 的 quantity
  let skuQuantityMap = new Map<number, number>()
  if (items && items.length > 0) {
    const skuIds = [...new Set(items.map((i) => i.sku_id))]
    const { data: skus } = await db
      .from('product_skus')
      .select('id, quantity')
      .in('id', skuIds)

    if (skus) {
      skuQuantityMap = new Map(skus.map((s) => [s.id, s.quantity || 1]))
    }
  }

  // Get user phone
  const { data: profile } = await db
    .from('profiles')
    .select('phone')
    .eq('id', order.user_id)
    .single()

  return success(c, {
    ...order,
    user_phone: profile?.phone ?? '',
    status_text: ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status,
    items: (items ?? []).map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      sku_id: item.sku_id,
      product_name: item.product_name,
      sku_name: item.sku_name,
      main_image: item.main_image,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      unit_quantity: skuQuantityMap.get(item.sku_id) || 1,
      remark: item.remark,
    })),
  })
})

// POST /:id/ship - Ship order
orders.post(
  '/:id/ship',
  zValidator(
    'json',
    z.object({
      shipping_no: z.string().optional().default(''),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const { shipping_no } = c.req.valid('json')

    const { data: order, error: orderError } = await db
      .from('orders')
      .select('status')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return error(c, 404, '订单不存在')
    }

    if (order.status !== 'pending_shipment') {
      return error(c, 400, '当前订单状态不允许发货')
    }

    const { error: updateError } = await db
      .from('orders')
      .update({
        status: 'pending_receipt',
        shipping_no,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return error(c, 500, '发货失败: ' + updateError.message)
    }

    return success(c, null)
  },
)

// POST /:id/cancel - Cancel order (admin)
orders.post('/:id/cancel', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return error(c, 404, '订单不存在')
  }

  if (order.status !== 'pending_payment' && order.status !== 'pending_shipment') {
    return error(c, 400, '当前订单状态不允许取消')
  }

  // Restore stock
  const { data: items } = await db
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', id)

  if (items && items.length > 0) {
    for (const item of items) {
      const { data: product } = await db
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (product) {
        await db
          .from('products')
          .update({ stock: product.stock + item.quantity })
          .eq('id', item.product_id)
      }
    }
  }

  const { error: updateError } = await db
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return error(c, 500, '取消订单失败: ' + updateError.message)
  }

  return success(c, null)
})

// PATCH /:id/status - Update order status
orders.patch(
  '/:id/status',
  zValidator(
    'json',
    z.object({
      status: z.string().min(1),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const { status: newStatus } = c.req.valid('json')

    const { error: updateError } = await db
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return error(c, 500, '更新状态失败: ' + updateError.message)
    }

    return success(c, null)
  },
)

export default orders
