import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ApiError } from './errors.js'

export function hashPassword(value) {
  return bcrypt.hashSync(value, 10)
}

export async function comparePassword(value, hash) {
  return bcrypt.compare(value, hash)
}

export function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' })
}

export function verifyJwt(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw new ApiError(401, 'Token invalido o expirado')
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization
  if (!header) return null
  const [scheme, token] = String(header).split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}
