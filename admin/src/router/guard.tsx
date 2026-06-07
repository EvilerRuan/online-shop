import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

interface AdminRouteProps {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  if (user && user.role !== 'admin') {
    logout()
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
