/**
 * 创建管理员账号脚本
 * 用法: node scripts/create-admin.js [phone] [password] [username]
 * 默认: phone=13800000000, password=admin123456, username=管理员
 */
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://zremusafurpmyhjhldze.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZW11c2FmdXJwbXloamhsZHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI4NDU1MiwiZXhwIjoyMDk1ODYwNTUyfQ._EjPCqo3JiuahYQcfLPcpa5jWUZKi7vqyHMZaTLpW6A'

const phone = process.argv[2] || '13800000000'
const password = process.argv[3] || 'admin123456'
const username = process.argv[4] || '管理员'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = `${phone}@shop.local`
  console.log(`创建管理员: phone=${phone}, email=${email}, username=${username}`)

  // 1. Create user in Supabase Auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone, username },
  })

  if (userError) {
    console.error('创建 Auth 用户失败:', userError.message)
    // If user already exists, try to find them
    if (userError.message.includes('already') || userError.message.includes('exists')) {
      console.log('用户已存在，查找已有用户...')
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === email)
      if (existing) {
        console.log('找到已有用户:', existing.id)
        // Update profile to admin
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: 'admin', status: 'active', username })
          .eq('id', existing.id)
        if (updateErr) {
          console.error('更新 profile 失败:', updateErr.message)
        } else {
          console.log('已将用户更新为管理员')
        }
        return
      }
    }
    process.exit(1)
  }

  const userId = userData.user.id
  console.log('Auth 用户创建成功:', userId)

  // 2. Insert profile with admin role
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    username,
    phone,
    role: 'admin',
    status: 'active',
  })

  if (profileError) {
    console.error('创建 Profile 失败:', profileError.message)
    process.exit(1)
  }

  console.log('管理员账号创建成功!')
  console.log(`  手机号: ${phone}`)
  console.log(`  密码: ${password}`)
}

main().catch(console.error)
