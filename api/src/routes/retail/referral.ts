import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, paginate, error } from '../../utils/response'

const app = new Hono<Env>()

// GET /info - 推荐信息
app.get('/info', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  // 查询用户积分余额
  const { data: profile } = await db
    .from('profiles')
    .select('points_balance')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return error(c, 404, '用户不存在', 404)
  }

  // 查询推荐总数
  const { count } = await db
    .from('user_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', user.id)

  return success(c, {
    referral_code: user.id,
    points_balance: profile.points_balance,
    total_referrals: count || 0,
  })
})

// GET /history - 推荐历史
app.get('/history', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size')) || 10))

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error: queryErr, count } = await db
    .from('user_referrals')
    .select('id, referred_id, points_awarded, created_at, profiles!user_referrals_referred_id_fkey(phone)', { count: 'exact' })
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (queryErr) {
    return error(c, 500, '查询推荐历史失败', 500)
  }

  // 脱敏手机号
  const list = (data || []).map((item: any) => {
    const phone = item.profiles?.phone || ''
    const maskedPhone = phone.length >= 7
      ? phone.slice(0, 3) + '****' + phone.slice(-4)
      : phone.replace(/.(?=.{2})/g, '*')

    return {
      id: item.id,
      referred_id: item.referred_id,
      referred_phone: maskedPhone,
      points_awarded: item.points_awarded,
      created_at: item.created_at,
    }
  })

  return paginate(c, list, count || 0, page, pageSize)
})

export default app
