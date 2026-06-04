import { Hono } from 'hono'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success } from '../utils/response'

const categories = new Hono<Env>()

categories.get('/', async (c) => {
  const db = createAdminClient(c.env)

  const { data, error } = await db
    .from('categories')
    .select('id, name, parent_id, sort_order')
    .eq('show_in_client', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return success(c, [])
  }

  const rows = data ?? []

  // Build two-level tree
  const parents = rows.filter((r: any) => r.parent_id === null)
  const tree = parents.map((parent: any) => ({
    id: parent.id,
    name: parent.name,
    children: rows
      .filter((r: any) => r.parent_id === parent.id)
      .map((child: any) => ({ id: child.id, name: child.name })),
  }))

  return success(c, tree)
})

export default categories
