export function makeCode(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`
}
