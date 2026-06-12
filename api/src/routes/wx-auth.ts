import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, error } from '../utils/response'
import { signRetailJwt } from '../utils/jwt'
import { awardRegisterPoints } from '../services/points'
import { handleReferral } from '../services/referral'

const wxAuth = new Hono<Env>()

// ============================================================
// POST /wx-login — 微信登录
// ============================================================
const wxLoginSchema = z.object({
  code: z.string().min(1, 'code 不能为空'),
  ref: z.string().optional(),
})

wxAuth.post('/wx-login', zValidator('json', wxLoginSchema), async (c) => {
  const { code, ref } = c.req.valid('json')
  const db = createAdminClient(c.env)

  // 调用微信 code2session 接口
  const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${c.env.WX_APPID}&secret=${c.env.WX_SECRET}&js_code=${code}&grant_type=authorization_code`
  const wxRes = await fetch(wxUrl)
  const wxData = await wxRes.json() as {
    openid?: string
    unionid?: string
    session_key?: string
    errcode?: number
    errmsg?: string
  }

  if (!wxData.openid) {
    return error(c, 400, wxData.errmsg || '微信登录失败', 400)
  }

  // 查找用户
  const { data: existingUser } = await db
    .from('profiles')
    .select('*')
    .eq('openid', wxData.openid)
    .eq('channel', 'retail')
    .single()

  let userId: string
  let isNewUser = false

  if (existingUser) {
    userId = existingUser.id
  } else {
    // 创建新用户
    const phone = `wx_${wxData.openid.slice(0, 12)}`
    const email = `${phone}@retail.shop.local`
    const username = `零售用户${Date.now().toString(36).slice(-6)}`

    // 先在 Supabase Auth 中创建用户
    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email,
      password: `retail_${wxData.openid.slice(0, 16)}`,
      email_confirm: true,
      user_metadata: { username, phone },
    })

    if (authError || !authUser.user) {
      return error(c, 500, '创建用户失败', 500)
    }

    userId = authUser.user.id

    // 创建 profiles 记录
    await db.from('profiles').insert({
      id: userId,
      username,
      phone,
      role: 'user',
      status: 'active',
      channel: 'retail',
      openid: wxData.openid,
      unionid: wxData.unionid || null,
    })

    isNewUser = true
  }

  // 新用户赠送注册积分
  if (isNewUser) {
    await awardRegisterPoints(db, userId)
  }

  // 处理推荐关系
  if (ref && isNewUser) {
    const { data: referrer } = await db
      .from('profiles')
      .select('id')
      .eq('id', ref)
      .eq('channel', 'retail')
      .single()

    if (referrer && referrer.id !== userId) {
      await handleReferral(db, referrer.id, userId)
    }
  }

  // 签发 JWT
  const token = await signRetailJwt(c.env.JWT_SECRET, userId)

  // 查询完整用户信息
  const { data: profile } = await db
    .from('profiles')
    .select('id, user_no, username, phone, role, status, channel, openid, avatar_url, referrer_id, points_balance')
    .eq('id', userId)
    .single()

  return success(c, { token, user: profile })
})

// ============================================================
// POST /send-code — 发送验证码（模拟，固定 123456）
// ============================================================
const sendCodeSchema = z.object({
  phone: z.string().min(1, '手机号不能为空'),
})

wxAuth.post('/send-code', zValidator('json', sendCodeSchema), async (c) => {
  const { phone } = c.req.valid('json')

  // 模拟验证码发送，固定 123456
  // 生产环境可对接真实短信服务商
  console.log(`[SMS Mock] phone: ${phone}, code: 123456`)

  return success(c, { message: '验证码已发送' })
})

// ============================================================
// POST /sms-login — 验证码登录
// ============================================================
const smsLoginSchema = z.object({
  phone: z.string().min(1, '手机号不能为空'),
  code: z.string().min(1, '验证码不能为空'),
  ref: z.string().optional(),
})

wxAuth.post('/sms-login', zValidator('json', smsLoginSchema), async (c) => {
  const { phone, code, ref } = c.req.valid('json')
  const db = createAdminClient(c.env)

  // 校验验证码（模拟，固定 123456）
  if (code !== '123456') {
    return error(c, 400, '验证码错误', 400)
  }

  // 查找零售用户
  const { data: existingUser } = await db
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .eq('channel', 'retail')
    .maybeSingle()

  let userId: string
  let isNewUser = false

  if (existingUser) {
    userId = existingUser.id
  } else {
    // 创建新用户
    const email = `${phone}@retail.shop.local`
    const username = `零售用户${Date.now().toString(36).slice(-6)}`

    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email,
      password: `retail_sms_${Date.now()}`,
      email_confirm: true,
      user_metadata: { username, phone },
    })

    if (authError || !authUser.user) {
      // Auth 用户可能已存在（残留），删除后重试
      if (authError?.message?.includes('already been registered')) {
        const { data: authUsers } = await db.auth.admin.listUsers()
        const existing = authUsers?.users.find(u => u.email === email)
        if (existing) {
          await db.auth.admin.deleteUser(existing.id)
        }
        const retry = await db.auth.admin.createUser({
          email,
          password: `retail_sms_${Date.now()}`,
          email_confirm: true,
          user_metadata: { username, phone },
        })
        if (retry.error || !retry.data.user) {
          return error(c, 500, '创建用户失败', 500)
        }
        userId = retry.data.user.id
      } else {
        return error(c, 500, '创建用户失败', 500)
      }
    } else {
      userId = authUser.user.id
    }

    await db.from('profiles').insert({
      id: userId,
      username,
      phone,
      role: 'user',
      status: 'active',
      channel: 'retail',
    })

    isNewUser = true
  }

  // 新用户赠送注册积分
  if (isNewUser) {
    await awardRegisterPoints(db, userId)
  }

  // 处理推荐关系
  if (ref && isNewUser) {
    const { data: referrer } = await db
      .from('profiles')
      .select('id')
      .eq('id', ref)
      .eq('channel', 'retail')
      .single()

    if (referrer && referrer.id !== userId) {
      await handleReferral(db, referrer.id, userId)
    }
  }

  // 签发 JWT
  const token = await signRetailJwt(c.env.JWT_SECRET, userId)

  // 查询完整用户信息
  const { data: profile } = await db
    .from('profiles')
    .select('id, user_no, username, phone, role, status, channel, openid, avatar_url, referrer_id, points_balance')
    .eq('id', userId)
    .single()

  return success(c, { token, user: profile })
})

export default wxAuth
