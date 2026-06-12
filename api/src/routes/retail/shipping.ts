import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, error } from '../../utils/response'
import { calculateShippingFee } from '../../services/shipping'

const app = new Hono<Env>()

// GET /calculate - 计算运费
app.get(
  '/calculate',
  zValidator(
    'query',
    z.object({
      province: z.string().min(1),
      city: z.string().min(1),
      order_amount: z.string().transform((v) => Number(v)),
    }),
  ),
  async (c) => {
    const { province, city, order_amount } = c.req.valid('query')
    const db = createAdminClient(c.env)

    if (isNaN(order_amount) || order_amount < 0) {
      return error(c, 400, 'order_amount 必须为非负数字', 400)
    }

    const result = await calculateShippingFee(db, province, city, order_amount)

    return success(c, result)
  },
)

export default app
