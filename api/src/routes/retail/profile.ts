import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, error } from '../../utils/response'

const app = new Hono<Env>()

// PUT / - 更新个人资料
app.put(
  '/',
  zValidator(
    'json',
    z.object({
      username: z.string().min(1).optional(),
      avatar_url: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    const db = createAdminClient(c.env)

    const updateData: Record<string, string> = {}
    if (body.username !== undefined) updateData.username = body.username
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url

    if (Object.keys(updateData).length === 0) {
      return error(c, 400, '没有可更新的字段', 400)
    }

    const { data: profile, error: updateErr } = await db
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single()

    if (updateErr) {
      return error(c, 500, '更新个人资料失败', 500)
    }

    return success(c, profile)
  },
)

export default app
