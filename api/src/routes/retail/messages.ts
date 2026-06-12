import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, paginate, error } from '../../utils/response'

const app = new Hono<Env>()

// POST / - 发送客服消息
app.post(
  '/',
  zValidator(
    'json',
    z.object({
      content: z.string().min(1),
      message_type: z.enum(['text', 'image']).optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { content, message_type } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 插入用户消息
    const { data: message, error: insertErr } = await db
      .from('customer_messages')
      .insert({
        user_id: user.id,
        sender_type: 'user',
        content,
        message_type: message_type || 'text',
      })
      .select('*')
      .single()

    if (insertErr) {
      return error(c, 500, '发送消息失败', 500)
    }

    // 检查是否为用户近 5 分钟内的首条消息，若是则自动回复
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { count } = await db
      .from('customer_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('sender_type', 'user')
      .gte('created_at', fiveMinutesAgo)
      .neq('id', message.id)

    // 如果近 5 分钟内没有其他用户消息（即这是首条），触发自动回复
    if (!count || count === 0) {
      const { data: autoReply } = await db
        .from('system_settings')
        .select('value')
        .eq('key', 'customer_service_auto_reply')
        .maybeSingle()

      if (autoReply && autoReply.value) {
        await db.from('customer_messages').insert({
          user_id: user.id,
          sender_type: 'admin',
          content: autoReply.value,
          message_type: 'text',
        })
      }
    }

    return success(c, message)
  },
)

// GET / - 消息列表
app.get('/', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size')) || 10))

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error: queryErr, count } = await db
    .from('customer_messages')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (queryErr) {
    return error(c, 500, '查询消息列表失败', 500)
  }

  return paginate(c, data || [], count || 0, page, pageSize)
})

export default app
