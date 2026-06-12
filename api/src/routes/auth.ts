import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, error } from '../utils/response'

const auth = new Hono<Env>()

const loginSchema = z.object({
  phone: z.string().min(1, '手机号不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

// 批发端登录（手机号 + 密码，仅 channel=wholesale）
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { phone, password } = c.req.valid('json')
  const db = createAdminClient(c.env)

  const email = `${phone}@shop.local`
  const { data: authData, error: authError } = await db.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    return error(c, 401, '手机号或密码错误', 401)
  }

  // 查询 profile，验证 channel=wholesale 且 role=user
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id, user_no, username, phone, role, status, channel')
    .eq('id', authData.user.id)
    .single()

  if (profileError || !profile) {
    return error(c, 404, '账号不存在', 404)
  }

  if (profile.channel !== 'wholesale') {
    return error(c, 403, '该账号不属于批发端', 403)
  }

  if (profile.status === 'disabled') {
    return error(c, 403, '账号已被禁用', 403)
  }

  return success(c, {
    access_token: authData.session?.access_token ?? '',
    refresh_token: authData.session?.refresh_token ?? '',
    user: {
      id: profile.id,
      user_no: profile.user_no,
      username: profile.username,
      phone: profile.phone,
      role: profile.role,
    },
  })
})

export default auth
