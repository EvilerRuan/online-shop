import { create } from 'zustand'
import type { UserSession, LoginResponse, ApiResponse } from 'shared/types/api'
import request from '@/utils/request'

interface AuthState {
  token: string | null
  user: UserSession | null
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  user: (() => {
    try {
      const raw = localStorage.getItem('admin_user')
      return raw ? (JSON.parse(raw) as UserSession) : null
    } catch {
      return null
    }
  })(),

  login: async (phone: string, password: string) => {
    const res = await request.post<ApiResponse<LoginResponse>>('/admin/login', {
      phone,
      password,
    })
    const { access_token, user } = res.data.data
    localStorage.setItem('admin_token', access_token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ token: access_token, user })
  },

  logout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ token: null, user: null })
  },
}))
