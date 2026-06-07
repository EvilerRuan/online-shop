import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const settings = new Hono<Env>()

// GET / - Get all settings
settings.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const { data, error: dbError } = await db.from('system_settings').select('key, value')

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  const result: Record<string, string> = {}
  for (const row of data ?? []) {
    result[row.key] = row.value
  }

  return success(c, result)
})

// PUT / - Update settings
settings.put(
  '/',
  zValidator(
    'json',
    z.object({
      merchant_intro: z.string().optional(),
      merchant_notice: z.string().optional(),
      buyer_notice: z.string().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const entries = Object.entries(body).filter(
      ([, v]) => v !== undefined,
    ) as [string, string][]

    for (const [key, value] of entries) {
      const { error: upsertError } = await db.from('system_settings').upsert(
        { key, value },
        { onConflict: 'key' },
      )

      if (upsertError) {
        return error(c, 500, `更新设置 ${key} 失败: ` + upsertError.message)
      }
    }

    return success(c, null)
  },
)

export default settings
