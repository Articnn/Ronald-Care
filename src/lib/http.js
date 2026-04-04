import { applyCors } from './cors.js'
import { ApiError } from './errors.js'
import { fail, ok } from './response.js'
import { sanitizeDeep } from './sanitize.js'
import { getBearerToken, verifyJwt } from './security.js'

async function getBody(req) {
  if (req.body && typeof req.body === 'object') return sanitizeDeep(req.body)
  if (typeof req.body === 'string') return sanitizeDeep(JSON.parse(req.body || '{}'))
  if (req.method === 'GET' || req.method === 'DELETE') return {}

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return sanitizeDeep(raw ? JSON.parse(raw) : {})
}

function getQuery(req) {
  if (req.query) return req.query
  const url = new URL(req.url, 'http://localhost')
  return Object.fromEntries(url.searchParams.entries())
}

function ensureRole(auth, allowedRoles) {
  if (!allowedRoles || !allowedRoles.length) return
  if (!auth) throw new ApiError(401, 'Autenticacion requerida')
  if (!allowedRoles.includes(auth.role)) throw new ApiError(403, 'No autorizado para este recurso')
}

function parseAuth(req) {
  const token = getBearerToken(req)
  if (!token) return null
  return verifyJwt(token)
}

export function withApi(options, handler) {
  const { methods = ['GET'], roles = null, authOptional = false } = options

  return async (req, res) => {
    try {
      if (applyCors(req, res)) return
      if (!methods.includes(req.method)) throw new ApiError(405, `Metodo no permitido: ${req.method}`)

      req.query = getQuery(req)
      req.body = await getBody(req)
      req.auth = authOptional || roles ? parseAuth(req) : null

      ensureRole(req.auth, roles)

      const data = await handler(req, res)
      if (!res.writableEnded) return ok(res, data)
    } catch (error) {
      const status = error.statusCode || 500
      const message = error.message || 'Error interno'
      const details = error.details || (status === 500 ? String(error.stack || error) : null)
      return fail(res, status, message, details)
    }
  }
}
