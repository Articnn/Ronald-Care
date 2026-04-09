import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppState } from '../../context/AppContext'
import type { Role } from '../../types'
import { getDefaultRouteForRole, normalizeRoleValue } from '../../lib/roleRouting'

export function RequireRole({ allowed, children }: { allowed: Role[]; children: ReactElement }) {
  const { role } = useAppState()
  const normalizedRole = normalizeRoleValue(role)
  if (!normalizedRole) {
    return <Navigate to="/login" replace />
  }
  if (!allowed.map(normalizeRoleValue).includes(normalizedRole)) {
    return <Navigate to={getDefaultRouteForRole(normalizedRole)} replace />
  }
  return children
}
