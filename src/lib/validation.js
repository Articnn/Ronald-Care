import { ApiError } from './errors.js'

export function required(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '')
  if (missing.length) throw new ApiError(400, `Campos requeridos faltantes: ${missing.join(', ')}`)
}

export function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new ApiError(400, `${label} invalido. Permitidos: ${allowed.join(', ')}`)
}

export function email(value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')) throw new ApiError(400, 'Email invalido')
}

export function toInt(value, label) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) throw new ApiError(400, `${label} debe ser entero`)
  return parsed
}
