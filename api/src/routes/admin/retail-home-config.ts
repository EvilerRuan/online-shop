import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const retailHomeConfig = new Hono<Env>()

/* ═══════════════════════════════════════════════
   Banners (零售端轮播图)
   ═══════════════════════════════════════════════ */

// GET /banners
retailHomeConfig.get('/banners', async (c) => {
  const db = createAdminClient(c.env)
  const { data, error: dbErr } = await db
    .from('retail_banners')
    .select('*')
    .order('sort_order', { ascending: true })

  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, data ?? [])
})

// POST /banners
retailHomeConfig.post(
  '/banners',
  zValidator(
    'json',
    z.object({
      image_url: z.string().min(1),
      title: z.string().optional(),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: dbErr } = await db
      .from('retail_banners')
      .insert({
        image_url: body.image_url,
        title: body.title ?? '',
        link_url: body.link_url ?? '',
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      })
      .select('id')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, { id: data.id })
  },
)

// PUT /banners/:id
retailHomeConfig.put(
  '/banners/:id',
  zValidator(
    'json',
    z.object({
      image_url: z.string().optional(),
      title: z.string().optional(),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const updateData: Record<string, unknown> = {}
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.title !== undefined) updateData.title = body.title
    if (body.link_url !== undefined) updateData.link_url = body.link_url
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { error: dbErr } = await db.from('retail_banners').update(updateData).eq('id', id)
    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, null)
  },
)

// DELETE /banners/:id
retailHomeConfig.delete('/banners/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))
  const { error: dbErr } = await db.from('retail_banners').delete().eq('id', id)
  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, null)
})

/* ═══════════════════════════════════════════════
   Quick Icons (零售端快捷入口)
   ═══════════════════════════════════════════════ */

// GET /quick-icons
retailHomeConfig.get('/quick-icons', async (c) => {
  const db = createAdminClient(c.env)
  const { data, error: dbErr } = await db
    .from('retail_quick_icons')
    .select('*')
    .order('sort_order', { ascending: true })

  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, data ?? [])
})

// POST /quick-icons
retailHomeConfig.post(
  '/quick-icons',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      icon_url: z.string().min(1),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: dbErr } = await db
      .from('retail_quick_icons')
      .insert({
        name: body.name,
        icon_url: body.icon_url,
        link_url: body.link_url ?? '',
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      })
      .select('id')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, { id: data.id })
  },
)

// PUT /quick-icons/:id
retailHomeConfig.put(
  '/quick-icons/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().optional(),
      icon_url: z.string().optional(),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.icon_url !== undefined) updateData.icon_url = body.icon_url
    if (body.link_url !== undefined) updateData.link_url = body.link_url
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { error: dbErr } = await db.from('retail_quick_icons').update(updateData).eq('id', id)
    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, null)
  },
)

// DELETE /quick-icons/:id
retailHomeConfig.delete('/quick-icons/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))
  const { error: dbErr } = await db.from('retail_quick_icons').delete().eq('id', id)
  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, null)
})

/* ═══════════════════════════════════════════════
   Retail Home Products (零售端首页商品)
   ═══════════════════════════════════════════════ */

// GET /products
retailHomeConfig.get('/products', async (c) => {
  const db = createAdminClient(c.env)
  const { data, error: dbErr } = await db
    .from('retail_home_products')
    .select('id, product_id, sort_order, products(name, main_image)')
    .order('sort_order', { ascending: true })

  if (dbErr) return error(c, 500, dbErr.message)

  const list = (data ?? []).map((item: Record<string, unknown>) => {
    const prod = item.products as { name: string; main_image: string | null } | null
    return {
      id: item.id as number,
      product_id: item.product_id as number,
      sort_order: item.sort_order as number,
      product_name: prod?.name ?? '',
      product_image: prod?.main_image ?? null,
    }
  })

  return success(c, list)
})

// POST /products
retailHomeConfig.post(
  '/products',
  zValidator(
    'json',
    z.object({
      product_id: z.number().int().positive(),
      sort_order: z.number().int().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const { product_id, sort_order } = c.req.valid('json')

    // Check if already exists
    const { data: existing } = await db
      .from('retail_home_products')
      .select('id')
      .eq('product_id', product_id)
      .maybeSingle()

    if (existing) {
      return error(c, 400, '该商品已在零售首页列表中')
    }

    let finalSort = sort_order
    if (finalSort === undefined) {
      const { data: maxRow } = await db
        .from('retail_home_products')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      finalSort = ((maxRow?.sort_order as number) ?? -1) + 1
    }

    const { data, error: dbErr } = await db
      .from('retail_home_products')
      .insert({ product_id, sort_order: finalSort })
      .select('id')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, { id: data.id })
  },
)

// PUT /products/:id
retailHomeConfig.put(
  '/products/:id',
  zValidator(
    'json',
    z.object({
      sort_order: z.number().int(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const { sort_order } = c.req.valid('json')

    const { error: dbErr } = await db
      .from('retail_home_products')
      .update({ sort_order })
      .eq('id', id)

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, null)
  },
)

// DELETE /products/:id
retailHomeConfig.delete('/products/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))
  const { error: dbErr } = await db.from('retail_home_products').delete().eq('id', id)
  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, null)
})

export default retailHomeConfig
