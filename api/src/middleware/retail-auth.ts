import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { createAdminClient } from '../utils/supabase'
import type { Env } from '../types/env'

// 零售端认证中间件：验证自签发 JWT + 校验 channel=retail
export const retailAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header('Authorization')

  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ code: 401, message: '未提供认证令牌', data: null }, 401)
  }

  const token = header.slice(7)

  let payload: { sub: string; channel: string }

  try {
    payload = await verify(token, c.env.JWT_SECRET, 'HS256') as { sub: string; channel: string }
  } catch {
    return c.json({ code: 401, message: '认证令牌无效或已过期', data: null }, 401)
  }

  if (payload.channel !== 'retail') {
    return c.json({ code: 403, message: '无权限访问零售端', data: null }, 403)
  }

  // 查询用户信息
  const db = createAdminClient(c.env)
  const { data: profile } = await db
    .from('profiles')
    .select('user_no, role, status')
    .eq('id', payload.sub)
    .single()

  if (!profile) {
    return c.json({ code: 401, message: '用户信息不存在', data: null }, 401)
  }

  if (profile.status === 'disabled') {
    return c.json({ code: 403, message: '账号已被禁用', data: null }, 403)
  }

  c.set('user', {
    id: payload.sub,
    role: profile.role,
    user_no: profile.user_no,
    channel: 'retail',
  })

  await next()
})
