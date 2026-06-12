export interface Bindings {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  // 微信小程序配置
  WX_APPID: string
  WX_SECRET: string
  // 零售端 JWT 密钥
  JWT_SECRET: string
}

export interface ContextUser {
  id: string
  role: 'user' | 'admin'
  user_no: number
  channel?: string
}

export type Env = {
  Bindings: Bindings
  Variables: {
    user: ContextUser
  }
}
