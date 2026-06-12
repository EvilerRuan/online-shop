import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const shippingFees = new Hono<Env>()

// GET / - List all shipping fees
shippingFees.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const province = c.req.query('province')
  const is_active = c.req.query('is_active')

  let query = db.from('shipping_fees').select('*')

  if (province) {
    query = query.ilike('province', `%${province}%`)
  }
  if (is_active !== undefined && is_active !== '') {
    query = query.eq('is_active', is_active === 'true')
  }

  query = query.order('province', { ascending: true }).order('city', { ascending: true })

  const { data, error: dbError } = await query

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  return success(c, data ?? [])
})

// POST / - Create shipping fee
shippingFees.post(
  '/',
  zValidator(
    'json',
    z.object({
      province: z.string().min(1),
      city: z.string().min(1),
      fee_type: z.string().min(1),
      base_fee: z.number().min(0),
      free_threshold: z.number().min(0).nullable().optional(),
      is_active: z.boolean().optional().default(true),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: dbError } = await db
      .from('shipping_fees')
      .insert({
        province: body.province,
        city: body.city,
        fee_type: body.fee_type,
        base_fee: body.base_fee,
        free_threshold: body.free_threshold ?? null,
        is_active: body.is_active,
      })
      .select('id')
      .single()

    if (dbError) {
      return error(c, 500, '创建运费失败: ' + dbError.message)
    }

    return success(c, { id: data.id })
  },
)

// PUT /:id - Update shipping fee
shippingFees.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      province: z.string().min(1),
      city: z.string().min(1),
      fee_type: z.string().min(1),
      base_fee: z.number().min(0),
      free_threshold: z.number().min(0).nullable().optional(),
      is_active: z.boolean().optional().default(true),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const { error: dbError } = await db
      .from('shipping_fees')
      .update({
        province: body.province,
        city: body.city,
        fee_type: body.fee_type,
        base_fee: body.base_fee,
        free_threshold: body.free_threshold ?? null,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (dbError) {
      return error(c, 500, '更新运费失败: ' + dbError.message)
    }

    return success(c, null)
  },
)

// DELETE /:id - Delete shipping fee
shippingFees.delete('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { error: dbError } = await db.from('shipping_fees').delete().eq('id', id)

  if (dbError) {
    return error(c, 500, '删除运费失败: ' + dbError.message)
  }

  return success(c, null)
})

export default shippingFees
