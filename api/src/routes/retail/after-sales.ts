import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, paginate, error } from '../../utils/response'

const app = new Hono<Env>()

// POST / - 申请售后
app.post(
  '/',
  zValidator(
    'json',
    z.object({
      order_id: z.number().int().positive(),
      order_item_id: z.number().int().positive(),
      type: z.enum(['refund', 'return_refund']),
      reason: z.string().min(1),
      refund_amount: z.number().positive(),
      evidence_images: z.array(z.string()).optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { order_id, order_item_id, type, reason, refund_amount, evidence_images } =
      c.req.valid('json')
    const db = createAdminClient(c.env)

    // 验证订单属于当前用户且渠道为零售
    const { data: order } = await db
      .from('orders')
      .select('id, channel')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!order) {
      return error(c, 404, '订单不存在', 404)
    }

    if (order.channel !== 'retail') {
      return error(c, 400, '仅零售订单可申请售后', 400)
    }

    // 验证订单项属于该订单
    const { data: orderItem } = await db
      .from('order_items')
      .select('id')
      .eq('id', order_item_id)
      .eq('order_id', order_id)
      .maybeSingle()

    if (!orderItem) {
      return error(c, 404, '订单项不存在', 404)
    }

    // 检查是否已有该订单项的售后记录
    const { data: existing } = await db
      .from('after_sales')
      .select('id')
      .eq('order_item_id', order_item_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return error(c, 400, '该订单项已申请售后', 400)
    }

    // 插入售后记录
    const { data: afterSale, error: insertErr } = await db
      .from('after_sales')
      .insert({
        order_id,
        order_item_id,
        user_id: user.id,
        type,
        status: 'pending',
        reason,
        refund_amount,
        evidence_images: evidence_images || [],
      })
      .select('*')
      .single()

    if (insertErr) {
      return error(c, 500, '创建售后申请失败', 500)
    }

    return success(c, afterSale)
  },
)

// GET / - 售后列表
app.get('/', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size')) || 10))

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error: queryErr, count } = await db
    .from('after_sales')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (queryErr) {
    return error(c, 500, '查询售后列表失败', 500)
  }

  return paginate(c, data || [], count || 0, page, pageSize)
})

// GET /:id - 售后详情
app.get('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: afterSale } = await db
    .from('after_sales')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!afterSale) {
    return error(c, 404, '售后记录不存在', 404)
  }

  return success(c, afterSale)
})

// PUT /:id/return-shipping - 填写退货快递单号
app.put(
  '/:id/return-shipping',
  zValidator(
    'json',
    z.object({
      return_shipping_no: z.string().min(1),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const { return_shipping_no } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 验证售后记录属于当前用户
    const { data: afterSale } = await db
      .from('after_sales')
      .select('id, status, type')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!afterSale) {
      return error(c, 404, '售后记录不存在', 404)
    }

    if (afterSale.status !== 'processing') {
      return error(c, 400, '当前状态不允许填写退货快递单号', 400)
    }

    if (afterSale.type !== 'return_refund') {
      return error(c, 400, '仅退货退款类型可填写快递单号', 400)
    }

    const { error: updateErr } = await db
      .from('after_sales')
      .update({ return_shipping_no })
      .eq('id', id)

    if (updateErr) {
      return error(c, 500, '更新退货快递单号失败', 500)
    }

    return success(c, null, '更新成功')
  },
)

export default app
