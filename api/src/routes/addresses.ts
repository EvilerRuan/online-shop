import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, error } from '../utils/response'

const app = new Hono<Env>()

const addressSchema = z.object({
  recipient_name: z.string().min(1),
  phone: z.string().min(1),
  province: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  detail: z.string().min(1),
  is_default: z.boolean(),
})

// GET / - 地址列表
app.get('/', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const { data, error: queryErr } = await db
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (queryErr) {
    return error(c, 500, '查询地址列表失败', 500)
  }

  return success(c, data || [])
})

// POST / - 创建地址
app.post('/', zValidator('json', addressSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const db = createAdminClient(c.env)

  // 如果设为默认，先取消其他默认
  if (body.is_default) {
    await db
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
  }

  const { data, error: insertErr } = await db
    .from('addresses')
    .insert({
      user_id: user.id,
      ...body,
    })
    .select('id')
    .single()

  if (insertErr) {
    return error(c, 500, '创建地址失败', 500)
  }

  return success(c, { id: data.id })
})

// PUT /:id - 更新地址
app.put('/:id', zValidator('json', addressSchema), async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const body = c.req.valid('json')
  const db = createAdminClient(c.env)

  // 验证属于当前用户
  const { data: existing } = await db
    .from('addresses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    return error(c, 404, '地址不存在', 404)
  }

  // 如果设为默认，先取消其他默认
  if (body.is_default) {
    await db
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
  }

  const { error: updateErr } = await db
    .from('addresses')
    .update(body)
    .eq('id', id)

  if (updateErr) {
    return error(c, 500, '更新地址失败', 500)
  }

  return success(c, null, '更新成功')
})

// DELETE /:id - 删除地址
app.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  // 验证属于当前用户
  const { data: existing } = await db
    .from('addresses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    return error(c, 404, '地址不存在', 404)
  }

  const { error: deleteErr } = await db
    .from('addresses')
    .delete()
    .eq('id', id)

  if (deleteErr) {
    return error(c, 500, '删除地址失败', 500)
  }

  return success(c, null, '删除成功')
})

// PATCH /:id/default - 设为默认地址
app.patch('/:id/default', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  // 验证属于当前用户
  const { data: existing } = await db
    .from('addresses')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    return error(c, 404, '地址不存在', 404)
  }

  // 取消其他默认
  await db
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', user.id)
    .eq('is_default', true)

  // 设为默认
  const { error: updateErr } = await db
    .from('addresses')
    .update({ is_default: true })
    .eq('id', id)

  if (updateErr) {
    return error(c, 500, '设置默认地址失败', 500)
  }

  return success(c, null, '设置成功')
})

export default app
