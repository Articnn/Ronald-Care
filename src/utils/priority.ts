import type { PriorityScore, SupportRequest } from '../types'

const urgencyWeight = {
  Baja: 15,
  Media: 35,
  Alta: 55,
}

const typeWeight = {
  Transporte: 20,
  Kit: 12,
  Alimento: 10,
  Recepcion: 8,
  Recepción: 8,
}

export function calculatePriority(request: Pick<SupportRequest, 'urgency' | 'waitingMinutes' | 'type' | 'optionalWindow'>): PriorityScore {
  const waitingScore = Math.min(25, Math.round(request.waitingMinutes / 6))
  const windowScore = request.optionalWindow ? 8 : 0
  const score = Math.min(100, urgencyWeight[request.urgency] + typeWeight[request.type] + waitingScore + windowScore)
  const label: PriorityScore['label'] = score >= 70 ? 'Alta' : score >= 40 ? 'Media' : 'Baja'
  const reason = `${request.urgency} urgencia, ${request.waitingMinutes} min esperando${request.optionalWindow ? `, ventana ${request.optionalWindow}` : ''}`

  return { score, label, reason }
}
