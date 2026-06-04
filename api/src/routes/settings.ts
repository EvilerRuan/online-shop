import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, error } from '../utils/response'

const app = new Hono<Env>()

// GET / - 根据 key 获取系统设置
app.get(
  '/',
  zValidator(
    'query',
    z.object({
      key: z.enum(['merchant_intro', 'merchant_notice', 'buyer_notice']),
    }),
  ),
  async (c) => {
    const { key } = c.req.valid('query')
    const db = createAdminClient(c.env)

    const { data, error: queryErr } = await db
      .from('system_settings')
      .select('key, value')
      .eq('key', key)
      .maybeSingle()

    if (queryErr) {
      return error(c, 500, '查询系统设置失败', 500)
    }

    if (!data) {
      return error(c, 404, '设置项不存在', 404)
    }

    return success(c, { key: data.key, value: data.value })
  },
)

export default app
