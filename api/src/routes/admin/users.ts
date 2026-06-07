import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const users = new Hono<Env>()

// GET / - User list
users.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const phone = c.req.query('phone')
  const keyword = c.req.query('keyword')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'user')

  if (phone) {
    query = query.ilike('phone', `%${phone}%`)
  }

  if (keyword) {
    query = query.or(`user_no.eq.${keyword},username.ilike.%${keyword}%`)
  }

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

// POST / - Create user
users.post(
  '/',
  zValidator(
    'json',
    z.object({
      username: z.string().min(1),
      phone: z.string().min(1),
      password: z.string().min(6),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    // Check phone uniqueness
    const { data: existing } = await db
      .from('profiles')
      .select('id')
      .eq('phone', body.phone)
      .maybeSingle()

    if (existing) {
      return error(c, 409, '手机号已被注册', 409)
    }

    // Create auth user
    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email: body.phone + '@shop.local',
      password: body.password,
      phone: body.phone,
      email_confirm: true,
      user_metadata: {
        username: body.username,
        phone: body.phone,
      },
    })

    if (authError || !authUser.user) {
      return error(c, 500, '创建用户失败: ' + (authError?.message ?? '未知错误'))
    }

    // Insert profile with last_password for display
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .insert({
        id: authUser.user.id,
        username: body.username,
        phone: body.phone,
        role: 'user',
        status: 'active',
        last_password: body.password,
      })
      .select('id')
      .single()

    if (profileError) {
      return error(c, 500, '创建用户资料失败: ' + profileError.message)
    }

    return success(c, { id: profile.id })
  },
)

// PATCH /:id/status - Toggle user status
users.patch(
  '/:id/status',
  zValidator(
    'json',
    z.object({
      status: z.enum(['active', 'disabled']),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = c.req.param('id')
    const { status: newStatus } = c.req.valid('json')

    const { error: updateError } = await db
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return error(c, 500, '更新状态失败: ' + updateError.message)
    }

    return success(c, null)
  },
)

// POST /:id/reset-password - Reset password
users.post(
  '/:id/reset-password',
  zValidator(
    'json',
    z.object({
      password: z.string().min(6),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = c.req.param('id')
    const { password } = c.req.valid('json')

    const { error: updateError } = await db.auth.admin.updateUserById(id, {
      password,
    })

    if (updateError) {
      return error(c, 500, '重置密码失败: ' + updateError.message)
    }

    // Save last_password to profile for display
    await db
      .from('profiles')
      .update({ last_password: password, updated_at: new Date().toISOString() })
      .eq('id', id)

    return success(c, null)
  },
)

export default users
