function cleanString(value) {
  return value.replace(/<[^>]*>/g, '').replace(/[^\S\r\n]+/g, ' ').trim()
}

export function sanitizeDeep(input) {
  if (input === null || input === undefined) return input
  if (typeof input === 'string') return cleanString(input)
  if (Array.isArray(input)) return input.map(sanitizeDeep)
  if (typeof input === 'object') {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, sanitizeDeep(value)]))
  }
  return input
}
