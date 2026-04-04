export function calculatePriority({ urgency, waitingMinutes = 0, requestType, optionalWindow }) {
  const urgencyWeight = { baja: 15, media: 35, alta: 55 }
  const typeWeight = { transporte: 20, kit: 12, alimento: 10, recepcion: 8 }
  const waitingScore = Math.min(25, Math.round(Number(waitingMinutes || 0) / 6))
  const windowScore = optionalWindow ? 8 : 0
  const score = Math.min(100, urgencyWeight[urgency] + typeWeight[requestType] + waitingScore + windowScore)
  const label = score >= 70 ? 'alta' : score >= 40 ? 'media' : 'baja'
  const reason = `${urgency} urgencia, ${waitingMinutes} min esperando${optionalWindow ? `, ventana ${optionalWindow}` : ''}`
  return { score, label, reason }
}
