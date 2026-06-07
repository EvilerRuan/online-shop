import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const products = new Hono<Env>()

// GET / - Admin product list
products.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const name = c.req.query('name')
  const product_no = c.req.query('product_no')
  const category_id = c.req.query('category_id')
  const status = c.req.query('status')
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  let query = db
    .from('products')
    .select('*', { count: 'exact' })

  if (name) {
    query = query.ilike('name', `%${name}%`)
  }
  if (product_no) {
    query = query.eq('product_no', product_no)
  }
  if (category_id) {
    query = query.eq('category_id', Number(category_id))
  }
  if (status) {
    query = query.eq('status', status)
  }

  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * page_size
  const to = from + page_size - 1
  query = query.range(from, to)

  const { data, count, error: dbError } = await query

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  const total = count ?? 0
  const rows = data ?? []

  // Get all category ids to build category paths
  const categoryIds = [...new Set(rows.map((r: Record<string, unknown>) => r.category_id as number))]
  let categoryMap: Record<number, { id: number; name: string; parent_id: number | null }> = {}

  if (categoryIds.length > 0) {
    const { data: cats } = await db
      .from('categories')
      .select('id, name, parent_id')
      .in('id', categoryIds)

    if (cats) {
      categoryMap = Object.fromEntries(
        cats.map((cat: { id: number; name: string; parent_id: number | null }) => [cat.id, cat]),
      )
    }
  }

  // Get parent categories for path building
  const parentIds = [
    ...new Set(
      Object.values(categoryMap)
        .filter((cat) => cat.parent_id !== null)
        .map((cat) => cat.parent_id as number),
    ),
  ]
  let parentMap: Record<number, { name: string }> = {}
  if (parentIds.length > 0) {
    const { data: parents } = await db
      .from('categories')
      .select('id, name')
      .in('id', parentIds)

    if (parents) {
      parentMap = Object.fromEntries(
        parents.map((p: { id: number; name: string }) => [p.id, p]),
      )
    }
  }

  const list = rows.map((row: Record<string, unknown>) => {
    const catId = row.category_id as number
    const cat = categoryMap[catId]
    let category_path = ''
    if (cat) {
      if (cat.parent_id !== null && parentMap[cat.parent_id]) {
        category_path = `${parentMap[cat.parent_id].name} / ${cat.name}`
      } else {
        category_path = cat.name
      }
    }

    return {
      id: row.id,
      name: row.name,
      product_no: row.product_no,
      barcode: row.barcode,
      category_id: row.category_id,
      category_path,
      main_image: row.main_image,
      description: row.description,
      price: row.price,
      stock: row.stock,
      min_order_qty: row.min_order_qty,
      sales_count: row.sales_count,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })

  return paginate(c, list, total, page, page_size)
})

// GET /:id - Admin product detail with skus
products.get('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { data: product, error: productError } = await db
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (productError || !product) {
    return error(c, 404, '商品不存在')
  }

  const { data: skus } = await db
    .from('product_skus')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })

  return success(c, { ...product, skus: skus ?? [] })
})

// POST / - Create product
products.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      barcode: z.string().optional(),
      category_id: z.number(),
      main_image: z.string().optional(),
      description: z.string().optional(),
      price: z.number().min(0),
      stock: z.number().int().min(0),
      min_order_qty: z.number().int().min(1),
      skus: z
        .array(
          z.object({
            sku_name: z.string().min(1),
            quantity: z.number().int().min(0),
          }),
        )
        .min(1),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    // Generate product_no
    const { data: noData, error: noError } = await db.rpc('generate_product_no')
    if (noError) {
      return error(c, 500, '生成商品编号失败: ' + noError.message)
    }

    const { data: product, error: productError } = await db
      .from('products')
      .insert({
        name: body.name,
        product_no: noData as string,
        barcode: body.barcode ?? null,
        category_id: body.category_id,
        main_image: body.main_image ?? null,
        description: body.description ?? '',
        price: body.price,
        stock: body.stock,
        min_order_qty: body.min_order_qty,
        status: 'active',
      })
      .select('id, product_no')
      .single()

    if (productError) {
      return error(c, 500, '创建商品失败: ' + productError.message)
    }

    const skuRows = body.skus.map((sku, i) => ({
      product_id: product.id,
      sku_name: sku.sku_name,
      quantity: sku.quantity,
      sort_order: i,
    }))

    const { error: skuError } = await db.from('product_skus').insert(skuRows)
    if (skuError) {
      return error(c, 500, '创建商品规格失败: ' + skuError.message)
    }

    return success(c, { id: product.id, product_no: product.product_no })
  },
)

// PUT /:id - Update product
products.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      barcode: z.string().optional(),
      category_id: z.number(),
      main_image: z.string().optional(),
      description: z.string().optional(),
      price: z.number().min(0),
      stock: z.number().int().min(0),
      min_order_qty: z.number().int().min(1),
      skus: z
        .array(
          z.object({
            sku_name: z.string().min(1),
            quantity: z.number().int().min(0),
          }),
        )
        .min(1),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const { error: updateError } = await db
      .from('products')
      .update({
        name: body.name,
        barcode: body.barcode ?? null,
        category_id: body.category_id,
        main_image: body.main_image ?? null,
        description: body.description ?? '',
        price: body.price,
        stock: body.stock,
        min_order_qty: body.min_order_qty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return error(c, 500, '更新商品失败: ' + updateError.message)
    }

    // Delete all existing skus and re-insert (simpler approach for this use case)
    await db.from('product_skus').delete().eq('product_id', id)

    const skuRows = body.skus.map((sku, i) => ({
      product_id: id,
      sku_name: sku.sku_name,
      quantity: sku.quantity,
      sort_order: i,
    }))

    if (skuRows.length > 0) {
      const { error: skuError } = await db.from('product_skus').insert(skuRows)
      if (skuError) {
        return error(c, 500, '更新商品规格失败: ' + skuError.message)
      }
    }

    return success(c, null)
  },
)

// DELETE /:id - Delete product
products.delete('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  // Delete skus first (in case cascade is not set)
  await db.from('product_skus').delete().eq('product_id', id)

  const { error: deleteError } = await db.from('products').delete().eq('id', id)

  if (deleteError) {
    return error(c, 500, '删除商品失败: ' + deleteError.message)
  }

  return success(c, null)
})

// PATCH /:id/status - Toggle product status
products.patch(
  '/:id/status',
  zValidator(
    'json',
    z.object({
      status: z.enum(['active', 'inactive']),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const { status: newStatus } = c.req.valid('json')

    const { error: updateError } = await db
      .from('products')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return error(c, 500, '更新状态失败: ' + updateError.message)
    }

    return success(c, null)
  },
)

export default products
