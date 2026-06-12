import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, paginate, error } from '../../utils/response'

const products = new Hono<Env>()

const listQuerySchema = z.object({
  category_id: z.string().optional(),
  keyword: z.string().optional(),
  sort: z.enum(['default', 'price_asc', 'price_desc', 'sales_desc']).optional().default('default'),
  page: z.string().optional().default('1'),
  page_size: z.string().optional().default('20'),
})

products.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { category_id, keyword, sort, page: pageStr, page_size: pageSizeStr } = c.req.valid('query')
  const page = Math.max(1, Number(pageStr))
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeStr)))
  const offset = (page - 1) * pageSize

  const db = createAdminClient(c.env)

  let query = db
    .from('products')
    .select('id, name, main_image, price, stock, sales_count', { count: 'exact' })
    .eq('status', 'active')
    .in('sales_channel', ['retail', 'both'])

  if (category_id) {
    query = query.eq('category_id', Number(category_id))
  }

  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,barcode.ilike.%${keyword}%`)
  }

  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else if (sort === 'sales_desc') {
    query = query.order('sales_count', { ascending: false })
  } else {
    query = query.order('id', { ascending: false })
  }

  const { data, error: queryError, count } = await query.range(offset, offset + pageSize - 1)

  if (queryError) {
    return paginate(c, [], 0, page, pageSize)
  }

  const list = (data ?? []).map((product: Record<string, unknown>) => ({
    id: product.id,
    name: product.name,
    main_image: product.main_image,
    price: product.price,
    stock: product.stock,
    sales_count: product.sales_count,
  }))

  return paginate(c, list, count ?? 0, page, pageSize)
})

products.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: product, error: productError } = await db
    .from('products')
    .select('*, category:categories(id, name)')
    .eq('id', id)
    .eq('status', 'active')
    .in('sales_channel', ['retail', 'both'])
    .single()

  if (productError || !product) {
    return error(c, 404, '商品不存在', 404)
  }

  const { data: skus } = await db
    .from('product_skus')
    .select('id, sku_name, quantity, sort_order')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })

  return success(c, {
    ...product,
    skus: skus ?? [],
  })
})

export default products
