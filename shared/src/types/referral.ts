// 推荐相关类型

// 推荐关系
export interface UserReferral {
  id: number
  referrer_id: string
  referred_id: string
  points_awarded: number
  created_at: string
}

// 推荐信息响应
export interface ReferralInfoResponse {
  referral_code: string
  points_balance: number
  total_referrals: number
}

// 推荐历史项
export interface ReferralHistoryItem {
  id: number
  referred_id: string
  referred_phone: string
  points_awarded: number
  created_at: string
}
