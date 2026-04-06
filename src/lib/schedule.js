export function calculateHoursBetween(startTime, endTime) {
  const [startHour, startMinute] = String(startTime || '08:00').split(':').map(Number)
  const [endHour, endMinute] = String(endTime || '14:00').split(':').map(Number)

  const startTotal = (Number.isFinite(startHour) ? startHour : 8) * 60 + (Number.isFinite(startMinute) ? startMinute : 0)
  let endTotal = (Number.isFinite(endHour) ? endHour : 14) * 60 + (Number.isFinite(endMinute) ? endMinute : 0)

  if (endTotal <= startTotal) {
    endTotal += 24 * 60
  }

  return Math.round(((endTotal - startTotal) / 60) * 100) / 100
}

export function inferShiftLabel(startTime) {
  const hour = Number(String(startTime || '08:00').split(':')[0] || 8)
  if (hour >= 18 || hour < 6) return 'noche'
  if (hour >= 13) return 'tarde'
  return 'manana'
}

export function inferShiftPeriod(startTime) {
  return inferShiftLabel(startTime) === 'manana' ? 'AM' : 'PM'
}

export function inferAvailabilityFromHours(hours) {
  if (hours <= 0) return 'no_disponible'
  if (hours < 4) return 'cupo_limitado'
  return 'disponible'
}
