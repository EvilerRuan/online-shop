import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const afterSales = new Hono<Env>()

// GET / - After-sales list
afterSales.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const status = c.req.query('status')
  const type = c.req.query('type')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db.from('after_sales').select('*', { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }
  if (type) {
    query = query.eq('type', type)
  }

  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * page_size
  const to = from + page_size - 1
  query = query.range(from, to)

  const { data, count, error: dbError } = await query

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  const rows = data ?? []

  // Get order info (order_no)
  const orderIds = [...new Set(rows.map((r: { order_id: number }) => r.order_id))]
  let orderMap: Record<number, { order_no: string }> = {}
  if (orderIds.length > 0) {
    const { data: orders } = await db
      .from('orders')
      .select('id, order_no')
      .in('id', orderIds)

    if (orders) {
      orderMap = Object.fromEntries(
        orders.map((o: { id: number; order_no: string }) => [o.id, { order_no: o.order_no }]),
      )
    }
  }

  // Get user info
  const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id))]
  let userMap: Record<string, { username: string; phone: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, username, phone')
      .in('id', userIds)

    if (profiles) {
      userMap = Object.fromEntries(
        profiles.map((p: { id: string; username: string; phone: string }) => [
          p.id,
          { username: p.username, phone: p.phone },
        ]),
      )
    }
  }

  const list = rows.map((r: Record<string, unknown>) => ({
    ...r,
    order_no: orderMap[r.order_id as number]?.order_no ?? '',
    username: userMap[r.user_id as string]?.username ?? '',
    phone: userMap[r.user_id as string]?.phone ?? '',
  }))

  return paginate(c, list, count ?? 0, page, page_size)
})

// GET /:id - After-sale detail
afterSales.get('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: afterSale, error: afterSaleError } = await db
    .from('after_sales')
    .select('*')
    .eq('id', id)
    .single()

  if (afterSaleError || !afterSale) {
    return error(c, 404, '售后记录不存在')
  }

  // Get order info
  const { data: order } = await db
    .from('orders')
    .select('order_no, total_amount, shipping_fee')
    .eq('id', afterSale.order_id)
    .single()

  // Get order item info
  const { data: orderItem } = await db
    .from('order_items')
    .select('product_name, sku_name, price, quantity, main_image')
    .eq('id', afterSale.order_item_id)
    .single()

  // Get user info
  const { data: profile } = await db
    .from('profiles')
    .select('username, phone')
    .eq('id', afterSale.user_id)
    .single()

  return success(c, {
    ...afterSale,
    order_no: order?.order_no ?? '',
    total_amount: order?.total_amount ?? 0,
    shipping_fee: order?.shipping_fee ?? 0,
    product_name: orderItem?.product_name ?? '',
    sku_name: orderItem?.sku_name ?? '',
    price: orderItem?.price ?? 0,
    quantity: orderItem?.quantity ?? 0,
    image: orderItem?.main_image ?? '',
    username: profile?.username ?? '',
    phone: profile?.phone ?? '',
  })
})

// POST /:id/approve - Approve after-sale
afterSales.post('/:id/approve', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: afterSale, error: afterSaleError } = await db
    .from('after_sales')
    .select('status, type')
    .eq('id', id)
    .single()

  if (afterSaleError || !afterSale) {
    return error(c, 404, '售后记录不存在')
  }

  if (afterSale.status !== 'pending') {
    return error(c, 400, '当前状态不允许审批')
  }

  if (afterSale.type === 'refund') {
    // Refund only: approve then immediately complete (simulated refund)
    const { error: dbError } = await db
      .from('after_sales')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (dbError) {
      return error(c, 500, '审批失败: ' + dbError.message)
    }
  } else if (afterSale.type === 'return_refund') {
    // Return + refund: set to processing (waiting for return)
    const { error: dbError } = await db
      .from('after_sales')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (dbError) {
      return error(c, 500, '审批失败: ' + dbError.message)
    }
  }

  return success(c, null)
})

// POST /:id/reject - Reject after-sale
afterSales.post(
  '/:id/reject',
  zValidator(
    'json',
    z.object({
      reject_reason: z.string().min(1),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const { reject_reason } = c.req.valid('json')

    const { data: afterSale, error: afterSaleError } = await db
      .from('after_sales')
      .select('status')
      .eq('id', id)
      .single()

    if (afterSaleError || !afterSale) {
      return error(c, 404, '售后记录不存在')
    }

    if (afterSale.status !== 'pending') {
      return error(c, 400, '当前状态不允许拒绝')
    }

    const { error: dbError } = await db
      .from('after_sales')
      .update({
        status: 'rejected',
        reject_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (dbError) {
      return error(c, 500, '拒绝失败: ' + dbError.message)
    }

    return success(c, null)
  },
)

// POST /:id/confirm-return - Confirm return receipt
afterSales.post('/:id/confirm-return', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: afterSale, error: afterSaleError } = await db
    .from('after_sales')
    .select('status, type')
    .eq('id', id)
    .single()

  if (afterSaleError || !afterSale) {
    return error(c, 404, '售后记录不存在')
  }

  if (afterSale.type !== 'return_refund') {
    return error(c, 400, '仅退货退款类型可确认收货')
  }

  if (afterSale.status !== 'processing') {
    return error(c, 400, '当前状态不允许确认收货')
  }

  const { error: dbError } = await db
    .from('after_sales')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (dbError) {
    return error(c, 500, '确认收货失败: ' + dbError.message)
  }

  return success(c, null)
})

export default afterSales
