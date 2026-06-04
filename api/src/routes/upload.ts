import { Hono } from 'hono'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, error } from '../utils/response'

const app = new Hono<Env>()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// POST / - 上传文件
app.post('/', async (c) => {
  const formData = await c.req.parseBody()
  const file = formData['file']

  if (!file || !(file instanceof File)) {
    return error(c, 400, '请选择要上传的文件', 400)
  }

  // 验证文件类型
  if (!ALLOWED_TYPES.includes(file.type)) {
    return error(c, 400, '仅支持 JPG、PNG、WebP 格式的图片', 400)
  }

  // 验证文件大小
  if (file.size > MAX_SIZE) {
    return error(c, 400, '文件大小不能超过 5MB', 400)
  }

  // 生成唯一文件名
  const ext = file.name.split('.').pop() || 'jpg'
  const uuid = crypto.randomUUID()
  const filename = `${uuid}.${ext}`

  // 上传到 Supabase Storage
  const db = createAdminClient(c.env)
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await db.storage
    .from('uploads')
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    return error(c, 500, '上传文件失败', 500)
  }

  // 获取公开 URL
  const { data: urlData } = db.storage.from('uploads').getPublicUrl(filename)

  return success(c, { url: urlData.publicUrl })
})

export default app
