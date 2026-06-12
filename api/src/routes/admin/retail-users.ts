import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'
import { addPoints, spendPoints } from '../../services/points'

const retailUsers = new Hono<Env>()

// GET / - Retail user list
retailUsers.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const keyword = c.req.query('keyword')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('channel', 'retail')
    .eq('role', 'user')

  if (keyword) {
    query = query.or(`username.ilike.%${keyword}%,phone.ilike.%${keyword}%`)
  }

  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * page_size
  const to = from + page_size - 1
  query = query.range(from, to)

  const { data, count, error: dbErr } = await query

  if (dbErr) return error(c, 500, dbErr.message)

  // Count referrals for each user
  const users = data ?? []
  if (users.length > 0) {
    const userIds = users.map((u: Record<string, unknown>) => u.id as string)
    const { data: referrals } = await db
      .from('user_referrals')
      .select('referrer_id')
      .in('referrer_id', userIds)

    const referralCount = new Map<string, number>()
    for (const r of referrals ?? []) {
      const referrerId = r.referrer_id as string
      referralCount.set(referrerId, (referralCount.get(referrerId) ?? 0) + 1)
    }

    for (const u of users) {
      const record = u as Record<string, unknown>
      record.referral_count = referralCount.get(record.id as string) ?? 0
    }
  }

  return paginate(c, users, count ?? 0, page, page_size)
})

// POST /:id/adjust-points - Adjust user points
retailUsers.post(
  '/:id/adjust-points',
  zValidator(
    'json',
    z.object({
      type: z.enum(['add', 'deduct']),
      amount: z.number().positive(),
      reason: z.string().min(1),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const userId = c.req.param('id')
    const { type, amount, reason } = c.req.valid('json')

    try {
      if (type === 'add') {
        await addPoints(db, userId, 'admin_adjust', amount, reason)
      } else {
        const ok = await spendPoints(db, userId, 'admin_adjust', amount, reason)
        if (!ok) {
          return error(c, 400, '积分不足，扣减失败')
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '积分操作失败'
      return error(c, 500, message)
    }

    // Return updated balance
    const { data: profile } = await db
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single()

    return success(c, { points_balance: (profile as Record<string, unknown>)?.points_balance ?? 0 })
  },
)

export default retailUsers
