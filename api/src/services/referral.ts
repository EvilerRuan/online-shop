import type { SupabaseClient } from '@supabase/supabase-js'
import { awardReferralPoints } from './points'

// 处理推荐关系：创建推荐记录 + 奖励推荐人积分
export async function handleReferral(
  db: SupabaseClient,
  referrerId: string,
  referredId: string,
): Promise<void> {
  // 检查是否已存在推荐关系
  const { data: existing } = await db
    .from('user_referrals')
    .select('id')
    .eq('referred_id', referredId)
    .limit(1)
    .single()

  if (existing) return

  // 获取推荐积分配置
  const { data: configData } = await db
    .from('points_config')
    .select('value')
    .eq('key', 'referral_points')
    .single()

  const pointsAwarded = parseInt(configData?.value ?? '200', 10)

  // 创建推荐关系
  await db.from('user_referrals').insert({
    referrer_id: referrerId,
    referred_id: referredId,
    points_awarded: pointsAwarded,
  })

  // 奖励推荐人积分
  await awardReferralPoints(db, referrerId)
}
