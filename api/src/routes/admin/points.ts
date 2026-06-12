import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const points = new Hono<Env>()

// GET /config - Get points config
points.get('/config', async (c) => {
  const db = createAdminClient(c.env)

  const { data, error: dbError } = await db.from('points_config').select('key, value')

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  const config: Record<string, number> = {}
  for (const row of data ?? []) {
    config[row.key] = parseInt(row.value, 10) || 0
  }

  return success(c, {
    register_points: config.register_points ?? 0,
    referral_points: config.referral_points ?? 0,
    first_purchase_points: config.first_purchase_points ?? 0,
  })
})

// PUT /config - Update points config
points.put(
  '/config',
  zValidator(
    'json',
    z.object({
      register_points: z.number().int().min(0).optional(),
      referral_points: z.number().int().min(0).optional(),
      first_purchase_points: z.number().int().min(0).optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const entries = Object.entries(body).filter(
      ([, v]) => v !== undefined,
    ) as [string, number][]

    for (const [key, value] of entries) {
      const { error: upsertError } = await db.from('points_config').upsert(
        { key, value: String(value) },
        { onConflict: 'key' },
      )

      if (upsertError) {
        return error(c, 500, `更新积分配置 ${key} 失败: ` + upsertError.message)
      }
    }

    return success(c, null)
  },
)

// GET /products - List points products
points.get('/products', async (c) => {
  const db = createAdminClient(c.env)

  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db.from('points_products').select('*', { count: 'exact' })
  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * page_size
  const to = from + page_size - 1
  query = query.range(from, to)

  const { data, count, error: dbError } = await query

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  return paginate(c, data ?? [], count ?? 0, page, page_size)
})

// POST /products - Create points product
points.post(
  '/products',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      image: z.string().optional(),
      points_cost: z.number().int().min(1),
      stock: z.number().int().min(0),
      is_active: z.boolean().optional().default(true),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: dbError } = await db
      .from('points_products')
      .insert({
        name: body.name,
        image: body.image ?? null,
        points_cost: body.points_cost,
        stock: body.stock,
        is_active: body.is_active,
      })
      .select('id')
      .single()

    if (dbError) {
      return error(c, 500, '创建积分商品失败: ' + dbError.message)
    }

    return success(c, { id: data.id })
  },
)

// PUT /products/:id - Update points product
points.put(
  '/products/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      image: z.string().optional(),
      points_cost: z.number().int().min(1),
      stock: z.number().int().min(0),
      is_active: z.boolean().optional().default(true),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const { error: dbError } = await db
      .from('points_products')
      .update({
        name: body.name,
        image: body.image ?? null,
        points_cost: body.points_cost,
        stock: body.stock,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (dbError) {
      return error(c, 500, '更新积分商品失败: ' + dbError.message)
    }

    return success(c, null)
  },
)

// DELETE /products/:id - Delete points product
points.delete('/products/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { error: dbError } = await db.from('points_products').delete().eq('id', id)

  if (dbError) {
    return error(c, 500, '删除积分商品失败: ' + dbError.message)
  }

  return success(c, null)
})

// GET /redeem - List redeem orders
points.get('/redeem', async (c) => {
  const db = createAdminClient(c.env)

  const status = c.req.query('status')
  const user_id = c.req.query('user_id')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db.from('points_redeem_orders').select('*', { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }
  if (user_id) {
    query = query.eq('user_id', user_id)
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
    username: userMap[r.user_id as string]?.username ?? '',
    phone: userMap[r.user_id as string]?.phone ?? '',
  }))

  return paginate(c, list, count ?? 0, page, page_size)
})

// PATCH /redeem/:id/ship - Ship redeem order
points.patch('/redeem/:id/ship', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: order, error: orderError } = await db
    .from('points_redeem_orders')
    .select('status')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return error(c, 404, '兑换订单不存在')
  }

  if (order.status !== 'pending') {
    return error(c, 400, '当前状态不允许发货')
  }

  const { error: dbError } = await db
    .from('points_redeem_orders')
    .update({
      status: 'shipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (dbError) {
    return error(c, 500, '发货失败: ' + dbError.message)
  }

  return success(c, null)
})

// GET /ledger - Points ledger list
points.get('/ledger', async (c) => {
  const db = createAdminClient(c.env)

  const user_id = c.req.query('user_id')
  const type = c.req.query('type')
  const reason = c.req.query('reason')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db.from('points_ledger').select('*', { count: 'exact' })

  if (user_id) {
    query = query.eq('user_id', user_id)
  }
  if (type) {
    query = query.eq('type', type)
  }
  if (reason) {
    query = query.eq('reason', reason)
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
    username: userMap[r.user_id as string]?.username ?? '',
    phone: userMap[r.user_id as string]?.phone ?? '',
  }))

  return paginate(c, list, count ?? 0, page, page_size)
})

export default points
