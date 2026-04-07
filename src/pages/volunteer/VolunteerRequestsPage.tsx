import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PriorityChip } from '../../components/ui/PriorityChip'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import type { VolunteerTaskType } from '../../types'
import { calculatePriority } from '../../utils/priority'

const weekDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const
const coworkerAlerts = [
  { value: 'need_help', label: 'Necesito apoyo' },
  { value: 'running_late', label: 'Voy tarde' },
  { value: 'task_completed', label: 'Tarea completada' },
  { value: 'cover_me', label: 'Puedes cubrirme?' },
] as const

function inventoryCategoryForRole(role?: string | null) {
  if (role === 'Recepcion') return 'recepcion' as const
  if (role === 'Cocina') return 'cocina' as const
  if (role === 'Limpieza') return 'limpieza' as const
  if (role === 'Lavanderia') return 'lavanderia' as const
  return null
}

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

export function VolunteerRequestsPage() {
  const {
    currentUser,
    requests,
    volunteerTasks,
    volunteerRoster,
    inventoryReports,
    createInventoryNeedReport,
    requestVolunteerChange,
    updateRequestStatus,
    updateVolunteerTaskForUser,
    refreshConnectedData,
    sendVolunteerAlertToPeer,
  } = useAppState()

  const [requestedShift, setRequestedShift] = useState<'AM' | 'PM'>('AM')
  const [requestedTask, setRequestedTask] = useState<VolunteerTaskType>('Traslados')
  const [requestedRole, setRequestedRole] = useState<'traslados' | 'recepcion' | 'acompanamiento' | 'cocina' | 'lavanderia' | 'limpieza'>('traslados')
  const [requestedStartTime, setRequestedStartTime] = useState('08:00')
  const [requestedEndTime, setRequestedEndTime] = useState('14:00')
  const [requestedShiftLabel, setRequestedShiftLabel] = useState<'manana' | 'tarde' | 'noche'>('manana')
  const [requestedWorkDays, setRequestedWorkDays] = useState<string[]>(['Lunes', 'Miercoles'])
  const [reason, setReason] = useState('Cambio de disponibilidad')
  const [selectedCoworkerId, setSelectedCoworkerId] = useState<number>(0)
  const [selectedAlertType, setSelectedAlertType] = useState<(typeof coworkerAlerts)[number]['value']>('need_help')
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  const [isSendingAlert, setIsSendingAlert] = useState(false)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [loadingRequestId, setLoadingRequestId] = useState<string | null>(null)
  const [inventoryNeedTitle, setInventoryNeedTitle] = useState('')
  const [inventoryNeedDetail, setInventoryNeedDetail] = useState('')
  const [isSavingInventoryNeed, setIsSavingInventoryNeed] = useState(false)
  const [isChangeMenuOpen, setIsChangeMenuOpen] = useState(false)

  useEffect(() => {
    void refreshConnectedData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assigned = requests
    .filter((item) => item.assignedRole === 'volunteer' && item.status !== 'Resuelta')
    .map((item) => ({ ...item, priority: calculatePriority(item) }))

  const myProfile = useMemo(
    () => volunteerRoster.find((item) => item.userId === currentUser?.userId) || null,
    [volunteerRoster, currentUser],
  )

  const coworkers = useMemo(
    () => volunteerRoster.filter((item) => item.userId !== currentUser?.userId),
    [volunteerRoster, currentUser],
  )

  useEffect(() => {
    if (!selectedCoworkerId && coworkers[0]) {
      setSelectedCoworkerId(coworkers[0].userId)
    }
  }, [coworkers, selectedCoworkerId])

  const orderedTasks = useMemo(
    () => [...volunteerTasks].sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime()),
    [volunteerTasks],
  )
  const todayLabel = new Intl.DateTimeFormat('sv-SE').format(new Date())
  const todayTasks = orderedTasks.filter((task) => task.day.slice(0, 10) === todayLabel)
  const historyTasks = orderedTasks
  const inventoryCategory = inventoryCategoryForRole(myProfile?.role)

  return (
    <div className="space-y-5">
      <SectionHeader title="Solicitudes asignadas" subtitle="Vista limitada para voluntariado." />

      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Tareas del día</h2>
        {todayTasks.length > 0 ? (
          todayTasks.map((task) => (
            <div key={task.id} className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">{task.title}</p>
              <p className="text-warm-700">{task.type} · {formatDisplayDate(task.day)} · turno {task.shift}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusChip status={task.status} />
                {task.status === 'Pendiente' ? (
                  <Button variant="ghost" isLoading={loadingTaskId === task.id} onClick={async () => { setLoadingTaskId(task.id); try { await updateVolunteerTaskForUser({ volunteerTaskId: Number(task.id), status: 'en_proceso' }) } finally { setLoadingTaskId(null) } }}>
                    Marcar en proceso
                  </Button>
                ) : null}
                {task.status !== 'Completada' ? (
                  <Button variant="secondary" isLoading={loadingTaskId === task.id} onClick={async () => { setLoadingTaskId(task.id); try { await updateVolunteerTaskForUser({ volunteerTaskId: Number(task.id), status: 'completada' }) } finally { setLoadingTaskId(null) } }}>
                    Marcar como completada
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No tienes tareas asignadas para hoy.</div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Mi horario</h2>
          {myProfile ? (
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">{myProfile.role}</p>
              <p className="text-warm-700">Dias: {myProfile.workDays.join(', ') || 'Sin dias registrados'}</p>
              <p className="text-warm-700">Horario: {myProfile.startTime} - {myProfile.endTime}</p>
              <p className="text-sm font-semibold text-warm-600">Turno: {myProfile.shiftLabel} · {myProfile.availability}</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">Aún no tenemos tu horario registrado.</div>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Mis compañeros</h2>
          {coworkers.length > 0 ? (
            coworkers.map((coworker) => {
              const workload = workloadMeta(coworker.currentTasks)
              return (
                <div key={coworker.userId} className="rounded-2xl bg-warm-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-warm-900">{coworker.fullName}</p>
                      <p className="text-warm-700">{coworker.role} · {coworker.startTime} - {coworker.endTime}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${workload.className}`}>{workload.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-warm-700">Tareas activas: {coworker.currentTasks}</p>
                </div>
              )
            })
          ) : (
            <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay compañeros cargados en tu sede.</div>
          )}

          {coworkers.length > 0 ? (
            <div className="space-y-3 rounded-2xl border border-warm-200 bg-white p-4">
              <p className="font-bold text-warm-900">Enviar alerta a un compañero</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-warm-900">Compañero</span>
                  <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={selectedCoworkerId} onChange={(event) => setSelectedCoworkerId(Number(event.target.value))}>
                    {coworkers.map((coworker) => (
                      <option key={coworker.userId} value={coworker.userId}>
                        {coworker.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-warm-900">Alerta</span>
                  <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={selectedAlertType} onChange={(event) => setSelectedAlertType(event.target.value as (typeof coworkerAlerts)[number]['value'])}>
                    {coworkerAlerts.map((alert) => (
                      <option key={alert.value} value={alert.value}>
                        {alert.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button variant="secondary" isLoading={isSendingAlert} onClick={async () => { setIsSendingAlert(true); try { await sendVolunteerAlertToPeer(selectedCoworkerId, selectedAlertType) } finally { setIsSendingAlert(false) } }}>
                Enviar alerta
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      {inventoryCategory ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-warm-900">Faltantes de mi área</h2>
          <p className="text-sm text-warm-600">
            Reporta lo que hace falta en {myProfile?.role?.toLowerCase() || 'tu área'} para que staff lo vea directo en inventario de tu sede.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Qué hace falta" value={inventoryNeedTitle} onChange={(event) => setInventoryNeedTitle(event.target.value)} placeholder="Ej. Kits de bienvenida, detergente, toallas..." />
            <Input label="Detalle operativo" value={inventoryNeedDetail} onChange={(event) => setInventoryNeedDetail(event.target.value)} placeholder="Ej. Solo quedan 2 unidades y mañana llega una familia nueva." />
          </div>
          <Button
            isLoading={isSavingInventoryNeed}
            onClick={async () => {
              if (!inventoryNeedTitle.trim() || !inventoryNeedDetail.trim() || !inventoryCategory) return
              setIsSavingInventoryNeed(true)
              try {
                await createInventoryNeedReport({
                  itemCategory: inventoryCategory,
                  title: inventoryNeedTitle.trim(),
                  detail: inventoryNeedDetail.trim(),
                })
                setInventoryNeedTitle('')
                setInventoryNeedDetail('')
              } finally {
                setIsSavingInventoryNeed(false)
              }
            }}
          >
            Reportar faltante
          </Button>

          <div className="space-y-3">
            <p className="text-base font-semibold text-warm-900">Mis reportes recientes</p>
            {inventoryReports.length > 0 ? (
              inventoryReports.map((report) => (
                <div key={report.id} className="rounded-2xl bg-warm-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-warm-900">{report.title}</p>
                      <p className="text-sm text-warm-700">{report.category} · {formatDisplayDate(report.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${report.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-warm-700">{report.detail}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">Todavía no has reportado faltantes para tu área.</div>
            )}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Historial de tareas</h2>
        {historyTasks.length > 0 ? (
          historyTasks.map((task) => (
            <div key={`history-${task.id}`} className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">{task.title}</p>
              <p className="text-warm-700">{task.type} · {formatDisplayDate(task.day)} · turno {task.shift}</p>
              <p className="text-sm font-semibold text-warm-600">{task.status}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">Aún no tienes historial de tareas.</div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-warm-900">Solicitar cambio</h2>
            <p className="text-sm text-warm-600">Abre el menú cuando necesites pedir ajuste de horario o tarea.</p>
          </div>
          <Button variant="ghost" onClick={() => setIsChangeMenuOpen((value) => !value)}>
            {isChangeMenuOpen ? 'Ocultar menú' : 'Abrir menú'}
          </Button>
        </div>

        {isChangeMenuOpen ? (
          <div className="space-y-4 rounded-2xl bg-warm-50 p-4">
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
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Rol deseado</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={requestedRole} onChange={(event) => setRequestedRole(event.target.value as typeof requestedRole)}>
                  <option value="traslados">traslados</option>
                  <option value="recepcion">recepcion</option>
                  <option value="acompanamiento">acompanamiento</option>
                  <option value="cocina">cocina</option>
                  <option value="lavanderia">lavanderia</option>
                  <option value="limpieza">limpieza</option>
                </select>
              </label>
              <Input label="Hora inicio" type="time" value={requestedStartTime} onChange={(event) => setRequestedStartTime(event.target.value)} />
              <Input label="Hora fin" type="time" value={requestedEndTime} onChange={(event) => setRequestedEndTime(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Franja</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={requestedShiftLabel} onChange={(event) => setRequestedShiftLabel(event.target.value as 'manana' | 'tarde' | 'noche')}>
                  <option value="manana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
              </label>
              <Input label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-warm-900">Dias deseados</p>
              <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
                {weekDays.map((day) => (
                  <label key={day} className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-semibold text-warm-800">
                    <input
                      type="checkbox"
                      checked={requestedWorkDays.includes(day)}
                      onChange={(event) => setRequestedWorkDays((current) => (event.target.checked ? [...current, day] : current.filter((item) => item !== day)))}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <Button
              isLoading={isSendingRequest}
              onClick={async () => {
                setIsSendingRequest(true)
                try {
                  await requestVolunteerChange({
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
                    requestedRoleName: requestedRole,
                    requestedWorkDays,
                    requestedStartTime,
                    requestedEndTime,
                    requestedShiftLabel,
                    reason,
                  })
                } finally {
                  setIsSendingRequest(false)
                }
              }}
            >
              Enviar solicitud
            </Button>
          </div>
        ) : null}
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
                <Button variant="ghost" isLoading={loadingRequestId === request.id} onClick={async () => { setLoadingRequestId(request.id); try { await updateRequestStatus(request.id, 'En proceso') } finally { setLoadingRequestId(null) } }}>
                  Tomar solicitud
                </Button>
              ) : null}
              <Button variant="secondary" isLoading={loadingRequestId === request.id} onClick={async () => { setLoadingRequestId(request.id); try { await updateRequestStatus(request.id, 'Resuelta') } finally { setLoadingRequestId(null) } }}>
                Marcar resuelta
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
