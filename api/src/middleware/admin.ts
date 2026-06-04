import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../types/env'

export const adminMiddleware = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header('Authorization')

  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ code: 401, message: '未提供认证令牌', data: null }, 401)
  }

  const token = header.slice(7)

  // Create client with user's token so RLS policies can use auth.uid()
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ code: 401, message: '认证令牌无效或已过期', data: null }, 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_no, role, status')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    return c.json({ code: 401, message: '用户信息不存在', data: null }, 401)
  }

  if (profile.role !== 'admin') {
    return c.json({ code: 403, message: '需要管理员权限', data: null }, 403)
  }

  if (profile.status === 'disabled') {
    return c.json({ code: 403, message: '账号已被禁用', data: null }, 403)
  }

  c.set('user', {
    id: data.user.id,
    role: profile.role,
    user_no: profile.user_no,
  })

  await next()
})
