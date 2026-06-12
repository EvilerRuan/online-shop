import type { SupabaseClient } from '@supabase/supabase-js'

// 通过 RPC 调用增加积分（并发安全）
export async function addPoints(
  db: SupabaseClient,
  userId: string,
  reason: string,
  amount: number,
  remark = '',
): Promise<void> {
  const { error } = await db.rpc('add_points', {
    p_user_id: userId,
    p_reason: reason,
    p_amount: amount,
    p_remark: remark,
  })
  if (error) throw error
}

// 通过 RPC 调用消耗积分（并发安全）
export async function spendPoints(
  db: SupabaseClient,
  userId: string,
  reason: string,
  amount: number,
  remark = '',
): Promise<boolean> {
  const { data, error } = await db.rpc('spend_points', {
    p_user_id: userId,
    p_reason: reason,
    p_amount: amount,
    p_remark: remark,
  })
  if (error) throw error
  return data as boolean
}

// 检查用户是否有首次确认收货积分记录
export async function hasFirstPurchasePoints(
  db: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await db
    .from('points_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'first_purchase')
    .eq('type', 'earn')
    .limit(1)

  return (data && data.length > 0) ?? false
}

// 获取积分配置
export async function getPointsConfig(
  db: SupabaseClient,
): Promise<{ register_points: number; referral_points: number; first_purchase_points: number }> {
  const { data } = await db.from('points_config').select('key, value')
  const config: Record<string, number> = {}
  for (const row of data ?? []) {
    config[row.key] = parseInt(row.value, 10) || 0
  }
  return {
    register_points: config.register_points ?? 100,
    referral_points: config.referral_points ?? 200,
    first_purchase_points: config.first_purchase_points ?? 100,
  }
}

// 注册赠送积分
export async function awardRegisterPoints(
  db: SupabaseClient,
  userId: string,
): Promise<void> {
  const config = await getPointsConfig(db)
  if (config.register_points > 0) {
    await addPoints(db, userId, 'register', config.register_points, '注册赠送')
  }
}

// 推荐新人赠送积分
export async function awardReferralPoints(
  db: SupabaseClient,
  referrerId: string,
): Promise<void> {
  const config = await getPointsConfig(db)
  if (config.referral_points > 0) {
    await addPoints(db, referrerId, 'referral', config.referral_points, '推荐新人奖励')
  }
}

// 首次确认收货赠送积分
export async function awardFirstPurchasePoints(
  db: SupabaseClient,
  userId: string,
): Promise<void> {
  const alreadyAwarded = await hasFirstPurchasePoints(db, userId)
  if (alreadyAwarded) return

  const config = await getPointsConfig(db)
  if (config.first_purchase_points > 0) {
    await addPoints(db, userId, 'first_purchase', config.first_purchase_points, '首次确认收货奖励')
  }
}
