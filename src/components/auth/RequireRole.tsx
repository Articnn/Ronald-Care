import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'
import type { Role } from '../../types'

export function RequireRole({ allowed, children }: { allowed: Role[]; children: ReactElement }) {
  const { role } = useAppState()
  if (!role || !allowed.includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
}
