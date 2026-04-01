import { Card } from '../../components/ui/Card'
import { PriorityChip } from '../../components/ui/PriorityChip'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import { calculatePriority } from '../../utils/priority'

export function VolunteerRequestsPage() {
  const { requests, updateRequestStatus } = useAppState()
  const assigned = requests
    .filter((item) => item.assignedRole === 'volunteer' && item.status !== 'Resuelta')
    .map((item) => ({ ...item, priority: calculatePriority(item) }))

  return (
    <div className="space-y-5">
      <SectionHeader title="Solicitudes asignadas" subtitle="Vista limitada para voluntariado." />
      <div className="grid gap-4">
        {assigned.map((request) => (
          <Card key={request.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-warm-900">{request.title}</h2>
              <div className="flex gap-2">
                <PriorityChip label={request.priority.label} score={request.priority.score} />
                <StatusChip status={request.status} />
              </div>
            </div>
            <p className="text-warm-700">{request.priority.reason}</p>
            <div className="flex gap-2">
              {request.status === 'Nueva' || request.status === 'Asignada' ? (
                <button className="rounded-xl bg-gold-300 px-4 py-2 font-semibold text-warm-900" onClick={async () => updateRequestStatus(request.id, 'En proceso')}>
                  Tomar solicitud
                </button>
              ) : null}
              <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={async () => updateRequestStatus(request.id, 'Resuelta')}>
                Marcar resuelta
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
