export function makeCode(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`
}

export function makeFamilyTicket(familyCode) {
  return `TKT-${familyCode.replace(/^FAM-/, '')}`
}

export function makeFamilyQr(familyCode) {
  return `QR-${familyCode}`
}

export function makeNumericPin(length = 6) {
  let value = ''
  for (let i = 0; i < length; i += 1) {
    value += Math.floor(Math.random() * 10).toString()
  }
  return value
}
