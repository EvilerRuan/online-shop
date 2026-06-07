import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const homeConfig = new Hono<Env>()

/* ═══════════════════════════════════════════════
   Banners
   ═══════════════════════════════════════════════ */

// GET /banners
homeConfig.get('/banners', async (c) => {
  const db = createAdminClient(c.env)
  const { data, error: dbErr } = await db
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true })

  if (dbErr) return error(c, 500, dbErr.message)

  const list = (data ?? []).map((b: Record<string, unknown>) => ({
    id: b.id as number,
    image_url: b.image_url as string,
    title: (b.title as string) ?? '',
    link_url: (b.link_url as string) ?? '',
    sort_order: b.sort_order as number,
    is_enabled: b.is_active as boolean,
  }))

  return success(c, list)
})

// POST /banners
homeConfig.post(
  '/banners',
  zValidator(
    'json',
    z.object({
      image_url: z.string().min(1),
      title: z.string().optional(),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_enabled: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: dbErr } = await db
      .from('banners')
      .insert({
        image_url: body.image_url,
        title: body.title ?? '',
        link_url: body.link_url ?? '',
        sort_order: body.sort_order ?? 0,
        is_active: body.is_enabled ?? true,
      })
      .select('id')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, { id: data.id })
  },
)

// PUT /banners/:id
homeConfig.put(
  '/banners/:id',
  zValidator(
    'json',
    z.object({
      image_url: z.string().optional(),
      title: z.string().optional(),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_enabled: z.boolean().optional(),
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
    if (body.is_enabled !== undefined) updateData.is_active = body.is_enabled

    const { error: dbErr } = await db.from('banners').update(updateData).eq('id', id)
    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, null)
  },
)

// DELETE /banners/:id
homeConfig.delete('/banners/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))
  const { error: dbErr } = await db.from('banners').delete().eq('id', id)
  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, null)
})

/* ═══════════════════════════════════════════════
   Quick Icons
   ═══════════════════════════════════════════════ */

// GET /quick-icons
homeConfig.get('/quick-icons', async (c) => {
  const db = createAdminClient(c.env)
  const { data, error: dbErr } = await db
    .from('quick_icons')
    .select('*')
    .order('sort_order', { ascending: true })

  if (dbErr) return error(c, 500, dbErr.message)

  const list = (data ?? []).map((i: Record<string, unknown>) => ({
    id: i.id as number,
    icon_url: i.icon_url as string,
    name: i.name as string,
    link_url: (i.link_url as string) ?? '',
    sort_order: i.sort_order as number,
    is_enabled: i.is_active as boolean,
  }))

  return success(c, list)
})

// POST /quick-icons
homeConfig.post(
  '/quick-icons',
  zValidator(
    'json',
    z.object({
      icon_url: z.string().min(1),
      name: z.string().min(1),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_enabled: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: dbErr } = await db
      .from('quick_icons')
      .insert({
        icon_url: body.icon_url,
        name: body.name,
        link_url: body.link_url ?? '',
        sort_order: body.sort_order ?? 0,
        is_active: body.is_enabled ?? true,
      })
      .select('id')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, { id: data.id })
  },
)

// PUT /quick-icons/:id
homeConfig.put(
  '/quick-icons/:id',
  zValidator(
    'json',
    z.object({
      icon_url: z.string().optional(),
      name: z.string().optional(),
      link_url: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_enabled: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const updateData: Record<string, unknown> = {}
    if (body.icon_url !== undefined) updateData.icon_url = body.icon_url
    if (body.name !== undefined) updateData.name = body.name
    if (body.link_url !== undefined) updateData.link_url = body.link_url
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.is_enabled !== undefined) updateData.is_active = body.is_enabled

    const { error: dbErr } = await db.from('quick_icons').update(updateData).eq('id', id)
    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, null)
  },
)

// DELETE /quick-icons/:id
homeConfig.delete('/quick-icons/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))
  const { error: dbErr } = await db.from('quick_icons').delete().eq('id', id)
  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, null)
})

/* ═══════════════════════════════════════════════
   Home Products (热销商品)
   ═══════════════════════════════════════════════ */

// GET /products
homeConfig.get('/products', async (c) => {
  const db = createAdminClient(c.env)
  const { data, error: dbErr } = await db
    .from('home_products')
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

// POST /products - Add a single hot product
homeConfig.post(
  '/products',
  zValidator(
    'json',
    z.object({
      product_id: z.number().int().positive(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const { product_id } = c.req.valid('json')

    // Check if already exists
    const { data: existing } = await db
      .from('home_products')
      .select('id')
      .eq('product_id', product_id)
      .maybeSingle()

    if (existing) {
      return error(c, 400, '该商品已在热销列表中')
    }

    // Get max sort_order
    const { data: maxRow } = await db
      .from('home_products')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSort = ((maxRow?.sort_order as number) ?? -1) + 1

    const { data, error: dbErr } = await db
      .from('home_products')
      .insert({ product_id, sort_order: nextSort })
      .select('id')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, { id: data.id })
  },
)

// DELETE /products/:id
homeConfig.delete('/products/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))
  const { error: dbErr } = await db.from('home_products').delete().eq('id', id)
  if (dbErr) return error(c, 500, dbErr.message)
  return success(c, null)
})

export default homeConfig
