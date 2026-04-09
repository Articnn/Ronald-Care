import type { Role } from '../types'

export function normalizeRoleValue(role: unknown): Role {
  const raw = String(role || '').trim().toLowerCase()
  if (raw === 'superadmin' || raw === 'direccion ejecutiva' || raw === 'dirección ejecutiva') return 'superadmin'
  if (raw === 'admin' || raw === 'gerente de sede') return 'admin'
  if (raw === 'staff' || raw === 'staff / operación' || raw === 'staff / operacion') return 'staff'
  if (raw === 'volunteer' || raw === 'voluntario') return 'volunteer'
  if (raw === 'hospital') return 'hospital'
  if (raw === 'family' || raw === 'familia') return 'family'
  return null
}

export function getDefaultRouteForRole(role: Role) {
  const normalizedRole = normalizeRoleValue(role)
  if (normalizedRole === 'superadmin') return '/admin/dashboard'
  if (normalizedRole === 'admin') return '/gerente/dashboard'
  if (normalizedRole === 'staff') return '/staff/home'
  return '/login'
}
