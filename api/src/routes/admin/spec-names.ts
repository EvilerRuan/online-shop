import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const specNames = new Hono<Env>()

// GET / - List all spec names
specNames.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const { data, error: dbError } = await db
    .from('spec_names')
    .select('*')
    .order('sort_order', { ascending: true })

  if (dbError) {
    return error(c, 500, dbError.message)
  }

  return success(c, data ?? [])
})

// POST / - Create spec name
specNames.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      sort_order: z.number().int().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const body = c.req.valid('json')

    const { data, error: insertError } = await db
      .from('spec_names')
      .insert({
        name: body.name,
        sort_order: body.sort_order ?? 0,
      })
      .select('id')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return error(c, 409, '规格名称已存在', 409)
      }
      return error(c, 500, '创建规格名称失败: ' + insertError.message)
    }

    return success(c, { id: data.id })
  },
)

// PUT /:id - Update spec name
specNames.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      sort_order: z.number().int().optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')

    const updateData: Record<string, unknown> = {
      name: body.name,
    }
    if (body.sort_order !== undefined) {
      updateData.sort_order = body.sort_order
    }

    const { error: updateError } = await db
      .from('spec_names')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      if (updateError.code === '23505') {
        return error(c, 409, '规格名称已存在', 409)
      }
      return error(c, 500, '更新规格名称失败: ' + updateError.message)
    }

    return success(c, null)
  },
)

// DELETE /:id - Delete spec name
specNames.delete('/:id', async (c) => {
  const db = createAdminClient(c.env)
  const id = Number(c.req.param('id'))

  const { error: deleteError } = await db.from('spec_names').delete().eq('id', id)

  if (deleteError) {
    return error(c, 500, '删除规格名称失败: ' + deleteError.message)
  }

  return success(c, null)
})

export default specNames
