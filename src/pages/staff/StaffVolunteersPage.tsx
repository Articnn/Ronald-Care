import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { VolunteerTaskType } from '../../types'

const taskTypes: VolunteerTaskType[] = ['Cocina', 'Lavanderia', 'Traslados', 'Acompanamiento', 'Recepcion', 'Limpieza', 'Inventario']

export function StaffVolunteersPage() {
  const { volunteerShifts, volunteerTasks, volunteerChangeRequests, createVolunteerTaskForUser, reviewVolunteerChange } = useAppState()
  const volunteerOptions = useMemo(
    () =>
      volunteerShifts
        .filter((shift) => shift.volunteerUserId)
        .map((shift) => ({
          userId: shift.volunteerUserId as number,
          label: `${shift.volunteerName} · ${shift.role} · ${shift.availability}`,
        })),
    [volunteerShifts],
  )

  const [volunteerUserId, setVolunteerUserId] = useState<number>(volunteerOptions[0]?.userId || 0)
  const [title, setTitle] = useState('Apoyo en recepcion')
  const [taskType, setTaskType] = useState<VolunteerTaskType>('Recepcion')
  const [taskDay, setTaskDay] = useState('2026-04-04')
  const [shiftPeriod, setShiftPeriod] = useState<'AM' | 'PM'>('AM')

  return (
    <div className="space-y-5">
      <SectionHeader title="Voluntariado" subtitle="Disponibilidad, tareas activas, reasignación y solicitudes de cambio." />

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Asignar tarea a voluntario</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Voluntario</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={volunteerUserId} onChange={(event) => setVolunteerUserId(Number(event.target.value))}>
              {volunteerOptions.map((item) => (
                <option key={item.userId} value={item.userId}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Input label="Titulo" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Tipo de tarea</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={taskType} onChange={(event) => setTaskType(event.target.value as VolunteerTaskType)}>
              {taskTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Input label="Dia" type="date" value={taskDay} onChange={(event) => setTaskDay(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Turno</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={shiftPeriod} onChange={(event) => setShiftPeriod(event.target.value as 'AM' | 'PM')}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </label>
        </div>
        <Button
          disabled={!volunteerUserId}
          onClick={async () =>
            createVolunteerTaskForUser({
              volunteerUserId,
              title,
              taskType:
                taskType === 'Cocina'
                  ? 'cocina'
                  : taskType === 'Lavanderia'
                    ? 'lavanderia'
                    : taskType === 'Traslados'
                      ? 'traslados'
                      : taskType === 'Acompanamiento'
                        ? 'acompanamiento'
                        : taskType === 'Recepcion'
                          ? 'recepcion'
                          : taskType === 'Limpieza'
                            ? 'limpieza'
                            : 'inventario',
              taskDay,
              shiftPeriod,
            })
          }
        >
          Crear tarea
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Voluntarios activos</h2>
          {volunteerShifts.map((shift) => (
            <div key={shift.id} className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">{shift.volunteerName}</p>
              <p className="text-warm-700">{shift.role} · {shift.day} · {shift.hours} hrs</p>
              <p className="text-sm font-semibold text-warm-600">{shift.availability}</p>
              <p className="mt-2 text-sm text-warm-700">
                Tareas actuales: {volunteerTasks.filter((task) => task.volunteerUserId === shift.volunteerUserId && task.status !== 'Completada').length}
              </p>
            </div>
          ))}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Tareas asignadas</h2>
          {volunteerTasks.map((task) => (
            <div key={task.id} className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">{task.title}</p>
              <p className="text-warm-700">{task.volunteerName} · {task.type} · {task.shift} · {task.day}</p>
              <p className="text-sm font-semibold text-warm-600">{task.status}</p>
            </div>
          ))}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Solicitudes de cambio</h2>
        {volunteerChangeRequests.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
            <div>
              <p className="font-bold text-warm-900">{item.volunteerName}</p>
              <p className="text-warm-700">Turno: {item.requestedShift || 'sin cambio'} · Tarea: {item.requestedTask || 'sin cambio'}</p>
              <p className="text-sm text-warm-600">{item.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-warm-100 px-3 py-1 text-sm font-bold text-warm-800">{item.status}</span>
              {item.status === 'Pendiente' ? (
                <>
                  <Button variant="ghost" onClick={async () => reviewVolunteerChange(Number(item.id), 'aprobada')}>Aprobar</Button>
                  <Button variant="secondary" onClick={async () => reviewVolunteerChange(Number(item.id), 'rechazada')}>Rechazar</Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
