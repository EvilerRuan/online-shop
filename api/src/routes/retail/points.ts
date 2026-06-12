import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, paginate, error } from '../../utils/response'
import { spendPoints } from '../../services/points'

const app = new Hono<Env>()

// GET /balance - 积分余额
app.get('/balance', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const { data: profile } = await db
    .from('profiles')
    .select('points_balance')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return error(c, 404, '用户不存在', 404)
  }

  return success(c, { points_balance: profile.points_balance })
})

// GET /ledger - 积分流水
app.get('/ledger', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size')) || 10))

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error: queryErr, count } = await db
    .from('points_ledger')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (queryErr) {
    return error(c, 500, '查询积分流水失败', 500)
  }

  return paginate(c, data || [], count || 0, page, pageSize)
})

// GET /products - 积分商品列表
app.get('/products', async (c) => {
  const db = createAdminClient(c.env)

  const { data, error: queryErr } = await db
    .from('points_products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (queryErr) {
    return error(c, 500, '查询积分商品列表失败', 500)
  }

  return success(c, data || [])
})

// GET /products/:id - 积分商品详情
app.get('/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: product } = await db
    .from('points_products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (!product) {
    return error(c, 404, '积分商品不存在', 404)
  }

  return success(c, product)
})

// POST /redeem - 兑换积分商品
app.post(
  '/redeem',
  zValidator(
    'json',
    z.object({
      points_product_id: z.number().int().positive(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { points_product_id } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 查询商品
    const { data: product } = await db
      .from('points_products')
      .select('*')
      .eq('id', points_product_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!product) {
      return error(c, 404, '积分商品不存在', 404)
    }

    if (product.stock <= 0) {
      return error(c, 400, '商品库存不足', 400)
    }

    // 查询用户积分余额
    const { data: profile } = await db
      .from('profiles')
      .select('points_balance')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return error(c, 404, '用户不存在', 404)
    }

    if (profile.points_balance < product.points_cost) {
      return error(c, 400, '积分余额不足', 400)
    }

    // 消耗积分
    const ok = await spendPoints(db, user.id, 'redeem', product.points_cost, `兑换：${product.name}`)
    if (!ok) {
      return error(c, 400, '积分扣减失败', 400)
    }

    // 扣减库存
    const { error: stockErr } = await db
      .from('points_products')
      .update({ stock: product.stock - 1 })
      .eq('id', points_product_id)

    if (stockErr) {
      return error(c, 500, '扣减库存失败', 500)
    }

    // 创建兑换订单
    const { data: redeemOrder, error: redeemErr } = await db
      .from('points_redeem_orders')
      .insert({
        user_id: user.id,
        points_product_id,
        product_name: product.name,
        product_image: product.image || '',
        points_used: product.points_cost,
        status: 'pending',
      })
      .select('*')
      .single()

    if (redeemErr) {
      return error(c, 500, '创建兑换订单失败', 500)
    }

    return success(c, redeemOrder)
  },
)

export default app
