import { defineStore } from 'pinia'
import type { UserSession } from 'shared/types/api'
import request from '@/utils/request'

const SESSION_KEY = 'h5_session'

interface SessionData {
  access_token: string
  refresh_token: string
}

interface AuthState {
  session: SessionData | null
  user: UserSession | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    session: null,
    user: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.session?.access_token,
  },

  actions: {
    async login(phone: string, password: string) {
      const res = await request.post('/auth/login', { phone, password })
      const { access_token, refresh_token, user } = res.data.data

      this.session = { access_token, refresh_token }
      this.user = user

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ access_token, refresh_token })
      )
    },

    logout() {
      this.session = null
      this.user = null
      localStorage.removeItem(SESSION_KEY)
    },

    restoreSession() {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return

      try {
        const data: SessionData = JSON.parse(raw)
        if (data.access_token) {
          this.session = data
        }
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    },

    async refreshToken() {
      if (!this.session?.refresh_token) return false

      try {
        const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL
        const res = await fetch(`${VITE_API_BASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({ refresh_token: this.session.refresh_token }),
        })

        if (!res.ok) return false

        const data = await res.json()
        if (data.access_token) {
          this.session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || this.session.refresh_token,
          }
          localStorage.setItem(SESSION_KEY, JSON.stringify(this.session))
          return true
        }
        return false
      } catch {
        return false
      }
    },
  },
})
