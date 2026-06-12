import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { success, paginate, error } from '../../utils/response'
import { createAdminClient } from '../../utils/supabase'

const customerService = new Hono<Env>()

/* ═══════════════════════════════════════════════
   Chat Users (聊天用户列表)
   ═══════════════════════════════════════════════ */

// GET /users - Chat user list
customerService.get('/users', async (c) => {
  const db = createAdminClient(c.env)

  // Get distinct users with latest message info
  const { data: messages, error: msgErr } = await db
    .from('customer_messages')
    .select('user_id, content, message_type, created_at, is_read, sender_type')
    .order('created_at', { ascending: false })

  if (msgErr) return error(c, 500, msgErr.message)

  // Aggregate per user: latest message preview, last_message_at, unread_count
  const userMap = new Map<
    string,
    { last_message: string; last_message_at: string; unread_count: number }
  >()

  for (const msg of messages ?? []) {
    const userId = msg.user_id as string
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        last_message: (msg.content as string) ?? '',
        last_message_at: msg.created_at as string,
        unread_count: 0,
      })
    }
    if (msg.sender_type === 'user' && msg.is_read === false) {
      userMap.get(userId)!.unread_count++
    }
  }

  if (userMap.size === 0) {
    return success(c, [])
  }

  // Fetch profiles for these users
  const userIds = Array.from(userMap.keys())
  const { data: profiles, error: profErr } = await db
    .from('profiles')
    .select('id, username, phone, avatar_url')
    .in('id', userIds)

  if (profErr) return error(c, 500, profErr.message)

  const profileMap = new Map<string, Record<string, unknown>>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id as string, p as Record<string, unknown>)
  }

  // Build result sorted by last_message_at DESC
  const list = userIds
    .map((userId) => {
      const info = userMap.get(userId)!
      const profile = profileMap.get(userId)
      return {
        user_id: userId,
        username: (profile?.username as string) ?? '',
        phone: (profile?.phone as string) ?? '',
        avatar_url: (profile?.avatar_url as string) ?? null,
        last_message: info.last_message,
        last_message_at: info.last_message_at,
        unread_count: info.unread_count,
      }
    })
    .sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    )

  return success(c, list)
})

/* ═══════════════════════════════════════════════
   Messages (聊天消息)
   ═══════════════════════════════════════════════ */

// GET /messages/:userId - Chat messages for specific user
customerService.get('/messages/:userId', async (c) => {
  const db = createAdminClient(c.env)
  const userId = c.req.param('userId')

  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const page_size = Math.min(100, Math.max(1, Number(c.req.query('page_size') ?? '20')))

  const from = (page - 1) * page_size
  const to = from + page_size - 1

  const { data, count, error: dbErr } = await db
    .from('customer_messages')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (dbErr) return error(c, 500, dbErr.message)

  // Mark unread messages from this user as read
  await db
    .from('customer_messages')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('sender_type', 'user')
    .eq('is_read', false)

  return paginate(c, data ?? [], count ?? 0, page, page_size)
})

// POST /messages/:userId - Send admin reply
customerService.post(
  '/messages/:userId',
  zValidator(
    'json',
    z.object({
      content: z.string().min(1),
      message_type: z.enum(['text', 'image']).optional(),
    }),
  ),
  async (c) => {
    const db = createAdminClient(c.env)
    const userId = c.req.param('userId')
    const body = c.req.valid('json')

    const { data, error: dbErr } = await db
      .from('customer_messages')
      .insert({
        user_id: userId,
        sender_type: 'admin',
        content: body.content,
        message_type: body.message_type ?? 'text',
      })
      .select('*')
      .single()

    if (dbErr) return error(c, 500, dbErr.message)
    return success(c, data)
  },
)

export default customerService
