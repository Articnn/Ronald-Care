import { ApiError } from './errors.js'

export function isGlobalRole(role) {
  return role === 'superadmin' || role === 'admin'
}

export function canManageInternalUser(actorRole, targetRole) {
  if (actorRole === 'superadmin') return ['admin', 'hospital', 'staff', 'volunteer'].includes(targetRole)
  if (actorRole === 'admin') return ['staff', 'volunteer'].includes(targetRole)
  if (actorRole === 'staff') return targetRole === 'volunteer'
  return false
}

export function resolveScopedSiteId(req, explicitSiteId = null) {
  if (isGlobalRole(req.auth?.role)) {
    return explicitSiteId ? Number(explicitSiteId) : null
  }

  if (!req.auth?.siteId) {
    throw new ApiError(403, 'No hay sede asignada para este usuario')
  }

  return Number(req.auth.siteId)
}

export function ensureSameOrGlobalSite(req, siteId) {
  if (isGlobalRole(req.auth?.role)) return
  if (Number(req.auth?.siteId) !== Number(siteId)) {
    throw new ApiError(403, 'No autorizado para operar sobre otra sede')
  }
}
