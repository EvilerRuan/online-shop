import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, error } from '../../utils/response'

const home = new Hono<Env>()

home.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const [bannersRes, iconsRes, homeProductsRes] = await Promise.all([
    db
      .from('retail_banners')
      .select('id, image_url, link_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    db
      .from('retail_quick_icons')
      .select('id, name, icon_url, link_url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    db
      .from('retail_home_products')
      .select(
        'sort_order, product:products!inner(id, name, main_image, sales_count, status, sales_channel)',
      )
      .order('sort_order', { ascending: true }),
  ])

  if (bannersRes.error || iconsRes.error || homeProductsRes.error) {
    return error(c, 500, '获取首页数据失败', 500)
  }

  const banners = bannersRes.data ?? []
  const quick_icons = iconsRes.data ?? []

  // Filter: active products with sales_channel in ('retail', 'both')
  const rawProducts = (homeProductsRes.data ?? []).filter(
    (row: any) =>
      row.product?.status === 'active' &&
      ['retail', 'both'].includes(row.product?.sales_channel),
  )

  const productIds = rawProducts.map((row: any) => row.product.id)

  // Fetch min price for each product
  let priceMap: Record<number, number> = {}
  if (productIds.length > 0) {
    const { data: skus } = await db
      .from('product_skus')
      .select('product_id, price')
      .in('product_id', productIds)

    if (skus) {
      for (const sku of skus) {
        const pid = sku.product_id as number
        const price = Number(sku.price)
        if (priceMap[pid] === undefined || price < priceMap[pid]) {
          priceMap[pid] = price
        }
      }
    }
  }

  const hot_products = rawProducts.map((row: any) => ({
    id: row.product.id,
    name: row.product.name,
    main_image: row.product.main_image,
    min_price: priceMap[row.product.id] ?? 0,
    sales_count: row.product.sales_count,
  }))

  return success(c, { banners, quick_icons, hot_products })
})

export default home
