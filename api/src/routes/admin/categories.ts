import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const categories = new Hono<Env>()

// GET / - Full category tree
categories.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const { data, error: dbError } = await db
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  const allCategories = data ?? []

  // Build tree
  const map = new Map<number, Record<string, unknown>>()
  const roots: Record<string, unknown>[] = []

  for (const cat of allCategories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of allCategories) {
    const node = map.get(cat.id)!
    if (cat.parent_id === null) {
      roots.push(node)
    } else {
      const parent = map.get(cat.parent_id)
      if (parent) {
        ;(parent.children as Record<string, unknown>[]).push(node)
      } else {
        roots.push(node)
      }
    }
  }

  return success(c, roots)
})

// POST / - Create category
categories.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      parent_id: z.number().int().nullable().optional(),
      sort_order: z.number().int(),
      show_in_client: z.boolean(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: insertError } = await db
      .from('categories')
      .insert({
        name: body.name,
        parent_id: body.parent_id ?? null,
        sort_order: body.sort_order,
        show_in_client: body.show_in_client,
      })
      .select('id')
      .single()

    if (insertError) {
      return error(c, 500, '创建分类失败: ' + insertError.message)
    }

    return success(c, { id: data.id })
  },
)

// PUT /:id - Update category
categories.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      parent_id: z.number().int().nullable().optional(),
      sort_order: z.number().int(),
      show_in_client: z.boolean(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const { error: updateError } = await db
      .from('categories')
      .update({
        name: body.name,
        parent_id: body.parent_id ?? null,
        sort_order: body.sort_order,
        show_in_client: body.show_in_client,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return error(c, 500, '更新分类失败: ' + updateError.message)
    }

    return success(c, null)
  },
)

// DELETE /:id - Delete category
categories.delete('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  // Check if has children
  const { count } = await db
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)

  if (count && count > 0) {
    return error(c, 409, '存在子分类，无法删除', 409)
  }

  const { error: deleteError } = await db.from('categories').delete().eq('id', id)

  if (deleteError) {
    return error(c, 500, '删除分类失败: ' + deleteError.message)
  }

  return success(c, null)
})

export default categories
