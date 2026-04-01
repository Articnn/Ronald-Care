import type { RequestPriorityLabel } from '../../types'

const styles: Record<RequestPriorityLabel, string> = {
  Alta: 'bg-red-100 text-red-800',
  Media: 'bg-amber-100 text-amber-800',
  Baja: 'bg-emerald-100 text-emerald-800',
}

export function PriorityChip({ label, score }: { label: RequestPriorityLabel; score: number }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${styles[label]}`}>Prioridad {label} {score}</span>
}
