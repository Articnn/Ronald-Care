import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PriorityChip } from '../../components/ui/PriorityChip'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import type { VolunteerTaskType } from '../../types'
import { calculatePriority } from '../../utils/priority'

export function VolunteerRequestsPage() {
  const { requests, volunteerTasks, requestVolunteerChange, updateRequestStatus } = useAppState()
  const [requestedShift, setRequestedShift] = useState<'AM' | 'PM'>('AM')
  const [requestedTask, setRequestedTask] = useState<VolunteerTaskType>('Traslados')
  const [reason, setReason] = useState('Cambio de disponibilidad')
  const assigned = requests
    .filter((item) => item.assignedRole === 'volunteer' && item.status !== 'Resuelta')
    .map((item) => ({ ...item, priority: calculatePriority(item) }))

  return (
    <div className="space-y-5">
      <SectionHeader title="Solicitudes asignadas" subtitle="Vista limitada para voluntariado." />
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Tareas del día</h2>
        {volunteerTasks.map((task) => (
          <div key={task.id} className="rounded-2xl bg-warm-50 p-4">
            <p className="font-bold text-warm-900">{task.title}</p>
            <p className="text-warm-700">{task.type} · {task.shift} · {task.day}</p>
            <StatusChip status={task.status} />
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Solicitar cambio de horario o tarea</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Turno</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={requestedShift} onChange={(event) => setRequestedShift(event.target.value as 'AM' | 'PM')}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Tarea</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={requestedTask} onChange={(event) => setRequestedTask(event.target.value as VolunteerTaskType)}>
              {['Cocina', 'Lavanderia', 'Traslados', 'Acompanamiento', 'Recepcion', 'Limpieza', 'Inventario'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Input label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <Button
          onClick={async () =>
            requestVolunteerChange({
              requestedShiftPeriod: requestedShift,
              requestedTaskType:
                requestedTask === 'Cocina'
                  ? 'cocina'
                  : requestedTask === 'Lavanderia'
                    ? 'lavanderia'
                    : requestedTask === 'Traslados'
                      ? 'traslados'
                      : requestedTask === 'Acompanamiento'
                        ? 'acompanamiento'
                        : requestedTask === 'Recepcion'
                          ? 'recepcion'
                          : requestedTask === 'Limpieza'
                            ? 'limpieza'
                            : 'inventario',
              reason,
            })
          }
        >
          Enviar solicitud
        </Button>
      </Card>

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
