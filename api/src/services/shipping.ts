import type { SupabaseClient } from '@supabase/supabase-js'

// 运费计算：精确匹配省+市 → 省级 → 默认运费
export async function calculateShippingFee(
  db: SupabaseClient,
  province: string,
  city: string,
  orderAmount: number,
): Promise<{ shipping_fee: number; free_threshold: number; is_free: boolean }> {
  // 1. 精确匹配省+市
  const { data: exactMatch } = await db
    .from('shipping_fees')
    .select('fee_type, base_fee, free_threshold')
    .eq('province', province)
    .eq('city', city)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (exactMatch) {
    return resolveFee(exactMatch, orderAmount)
  }

  // 2. 省级匹配（city 为空）
  const { data: provinceMatch } = await db
    .from('shipping_fees')
    .select('fee_type, base_fee, free_threshold')
    .eq('province', province)
    .eq('city', '')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (provinceMatch) {
    return resolveFee(provinceMatch, orderAmount)
  }

  // 3. 默认运费
  const { data: defaultFee } = await db
    .from('system_settings')
    .select('value')
    .eq('key', 'default_shipping_fee')
    .single()

  const fee = parseFloat(defaultFee?.value ?? '0')
  return { shipping_fee: fee, free_threshold: 0, is_free: fee === 0 }
}

function resolveFee(
  config: { fee_type: string; base_fee: number; free_threshold: number },
  orderAmount: number,
): { shipping_fee: number; free_threshold: number; is_free: boolean } {
  if (config.fee_type === 'free') {
    return { shipping_fee: 0, free_threshold: 0, is_free: true }
  }

  if (config.fee_type === 'free_threshold' && orderAmount >= config.free_threshold) {
    return { shipping_fee: 0, free_threshold: config.free_threshold, is_free: true }
  }

  return {
    shipping_fee: config.base_fee,
    free_threshold: config.fee_type === 'free_threshold' ? config.free_threshold : 0,
    is_free: false,
  }
}
