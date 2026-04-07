import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { VolunteerTaskType } from '../../types'

const taskTypes: VolunteerTaskType[] = ['Cocina', 'Lavanderia', 'Traslados', 'Acompanamiento', 'Recepcion', 'Limpieza', 'Inventario']

function formatDisplayDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const safeDate = new Date(`${value}T00:00:00`)
    if (Number.isNaN(safeDate.getTime())) return value
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(safeDate)
  }
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function workloadMeta(taskCount: number) {
  if (taskCount >= 4) return { label: 'Muy ocupado', className: 'bg-red-100 text-red-700' }
  if (taskCount >= 2) return { label: 'Ocupado', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700' }
}

export function StaffVolunteersPage() {
  const {
    volunteerRoster,
    volunteerTasks,
    volunteerChangeRequests,
    createVolunteerTaskForUser,
    updateVolunteerTaskForUser,
    reviewVolunteerChange,
    refreshConnectedData,
  } = useAppState()

  const volunteerOptions = useMemo(
    () =>
      volunteerRoster.map((user) => ({
        userId: user.userId,
        name: user.fullName,
        label: `${user.fullName} · ${user.role} · ${user.availability}`,
      })),
    [volunteerRoster],
  )

  useEffect(() => {
    void refreshConnectedData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [volunteerUserId, setVolunteerUserId] = useState<number>(volunteerOptions[0]?.userId || 0)
  const [title, setTitle] = useState('Apoyo en recepcion')
  const [taskType, setTaskType] = useState<VolunteerTaskType>('Recepcion')
  const [taskDay, setTaskDay] = useState(new Intl.DateTimeFormat('sv-SE').format(new Date()))
  const [shiftPeriod, setShiftPeriod] = useState<'AM' | 'PM'>('AM')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [changingRequestId, setChangingRequestId] = useState<string | null>(null)
  const [showActiveVolunteers, setShowActiveVolunteers] = useState(true)
  const [showAssignedTasks, setShowAssignedTasks] = useState(true)

  useEffect(() => {
    if (volunteerOptions.length === 0) {
      setVolunteerUserId(0)
      return
    }
    if (!volunteerOptions.some((item) => item.userId === volunteerUserId)) {
      setVolunteerUserId(volunteerOptions[0].userId)
    }
  }, [volunteerOptions, volunteerUserId])

  return (
    <div className="space-y-5">
      <SectionHeader title="Voluntariado" subtitle="Disponibilidad, tareas activas, reasignación y solicitudes de cambio." />

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Asignar tarea a voluntario</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Voluntario</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={volunteerUserId} onChange={(event) => setVolunteerUserId(Number(event.target.value))}>
              {volunteerOptions.length === 0 ? <option value={0}>Sin voluntarios activos</option> : null}
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
          isLoading={isCreatingTask}
          disabled={!volunteerUserId}
          onClick={async () => {
            setIsCreatingTask(true)
            try {
              await createVolunteerTaskForUser({
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
            } finally {
              setIsCreatingTask(false)
            }
          }}
        >
          Crear tarea
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <button type="button" onClick={() => setShowActiveVolunteers((value) => !value)} className="flex w-full items-center justify-between rounded-2xl bg-warm-50 px-4 py-3 text-left">
            <h2 className="text-xl font-bold text-warm-900">Voluntarios activos</h2>
            <ChevronDown className={`h-5 w-5 text-warm-600 transition-transform ${showActiveVolunteers ? 'rotate-180' : ''}`} />
          </button>
          {showActiveVolunteers ? (
            volunteerRoster.length > 0 ? (
              volunteerRoster.map((volunteer) => {
                const workload = workloadMeta(volunteer.currentTasks)
                return (
                  <div key={volunteer.userId} className="rounded-2xl bg-warm-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-warm-900">{volunteer.fullName}</p>
                        <p className="text-warm-700">{`${volunteer.role} · ${volunteer.workDays.join(', ') || 'Sin dias'} · ${volunteer.startTime} - ${volunteer.endTime}`}</p>
                        <p className="text-sm font-semibold text-warm-600">{`${volunteer.shiftLabel} · ${volunteer.availability}`}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${workload.className}`}>{workload.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-warm-700">Tareas activas: {volunteer.currentTasks}</p>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay voluntarios activos cargados para la sede seleccionada.</div>
            )
          ) : null}
        </Card>

        <Card className="space-y-3">
          <button type="button" onClick={() => setShowAssignedTasks((value) => !value)} className="flex w-full items-center justify-between rounded-2xl bg-warm-50 px-4 py-3 text-left">
            <h2 className="text-xl font-bold text-warm-900">Tareas asignadas</h2>
            <ChevronDown className={`h-5 w-5 text-warm-600 transition-transform ${showAssignedTasks ? 'rotate-180' : ''}`} />
          </button>
          {showAssignedTasks ? (
            volunteerTasks.length > 0 ? (
              volunteerTasks.map((task) => (
                <div key={task.id} className="space-y-3 rounded-2xl bg-warm-50 p-4">
                  <div>
                    <p className="font-bold text-warm-900">{task.title}</p>
                    <p className="text-warm-700">{`${task.volunteerName} · ${task.type} · ${formatDisplayDate(task.day)} · turno ${task.shift}`}</p>
                    <p className="text-sm font-semibold text-warm-600">{task.status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-warm-900">Reasignar a</span>
                      <select
                        className="w-full rounded-2xl border border-warm-200 px-4 py-2 text-sm"
                        defaultValue={String(task.volunteerUserId)}
                        onChange={async (event) => {
                          const nextUserId = Number(event.target.value)
                          if (nextUserId !== task.volunteerUserId) {
                            await updateVolunteerTaskForUser({ volunteerTaskId: Number(task.id), volunteerUserId: nextUserId })
                          }
                        }}
                      >
                        {volunteerOptions.map((item) => (
                          <option key={`${task.id}-${item.userId}`} value={item.userId}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay tareas asignadas para la sede seleccionada.</div>
            )
          ) : null}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Solicitudes de cambio</h2>
        {volunteerChangeRequests.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
            <div>
              <p className="font-bold text-warm-900">{item.volunteerName}</p>
              <p className="text-warm-700">{`Turno: ${item.requestedShift || 'sin cambio'} · Tarea: ${item.requestedTask || 'sin cambio'}`}</p>
              <p className="text-sm text-warm-600">{item.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-warm-100 px-3 py-1 text-sm font-bold text-warm-800">{item.status}</span>
              {item.status === 'Pendiente' ? (
                <>
                  <Button variant="ghost" isLoading={changingRequestId === item.id} onClick={async () => { setChangingRequestId(item.id); try { await reviewVolunteerChange(Number(item.id), 'aprobada') } finally { setChangingRequestId(null) } }}>
                    Aprobar
                  </Button>
                  <Button variant="secondary" isLoading={changingRequestId === item.id} onClick={async () => { setChangingRequestId(item.id); try { await reviewVolunteerChange(Number(item.id), 'rechazada') } finally { setChangingRequestId(null) } }}>
                    Rechazar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
