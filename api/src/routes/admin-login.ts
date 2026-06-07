import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { success, error } from '../utils/response'
import { createAdminClient } from '../utils/supabase'

const adminLogin = new Hono<Env>()

// POST / - Admin login
adminLogin.post(
  '/',
  zValidator(
    'json',
    z.object({
      phone: z.string().min(1),
      password: z.string().min(1),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const { phone, password } = c.req.valid('json')

    // Login with email (phone + @shop.local)
    const { data: authData, error: authError } = await db.auth.signInWithPassword({
      email: phone + '@shop.local',
      password,
    })

    if (authError || !authData.user) {
      return error(c, 401, '手机号或密码错误', 401)
    }

    // Check profile role
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, user_no, username, phone, role, status')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      return error(c, 401, '用户信息不存在', 401)
    }

    if (profile.role !== 'admin') {
      return error(c, 403, '无权限登录管理后台', 403)
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
  },
)

export default adminLogin
