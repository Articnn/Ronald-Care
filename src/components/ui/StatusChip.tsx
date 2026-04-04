import type { ReferralStatus, RequestStatus, TripStatus } from '../../types'

type Status = ReferralStatus | RequestStatus | TripStatus | 'Pendiente' | 'Check-in completado' | 'Borrador' | 'Enviado'

const styles: Record<Status, string> = {
  Enviada: 'bg-blue-100 text-blue-800',
  'En revision': 'bg-amber-100 text-amber-800',
  Aceptada: 'bg-emerald-100 text-emerald-800',
  Nueva: 'bg-blue-100 text-blue-800',
  Asignada: 'bg-amber-100 text-amber-800',
  'En proceso': 'bg-purple-100 text-purple-800',
  Resuelta: 'bg-emerald-100 text-emerald-800',
  Pendiente: 'bg-slate-100 text-slate-800',
  Borrador: 'bg-slate-100 text-slate-800',
  Enviado: 'bg-blue-100 text-blue-800',
  'En curso': 'bg-orange-100 text-orange-800',
  Finalizado: 'bg-emerald-100 text-emerald-800',
  'Check-in completado': 'bg-emerald-100 text-emerald-800',
}

export function StatusChip({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${styles[status]}`}>{status}</span>
}
