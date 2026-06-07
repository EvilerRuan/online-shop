export interface Bindings {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export interface ContextUser {
  id: string
  role: 'user' | 'admin'
  user_no: number
}

export type Env = {
  Bindings: Bindings
  Variables: {
    user: ContextUser
  }
}
