import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BedDouble, ClipboardList, HeartHandshake, Route, ShieldCheck, Users, UserCircle2, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { getRooms, type Room } from '../../lib/api'

type ExpandedPanel = 'requests' | 'volunteers' | 'inventory' | 'kiosk' | 'profile' | null

const weekdayMap = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as const

function urgencyMeta(urgency: 'Alta' | 'Media' | 'Baja') {
  if (urgency === 'Alta') return { className: 'bg-red-100 text-red-700', order: 3 }
  if (urgency === 'Media') return { className: 'bg-amber-100 text-amber-700', order: 2 }
  return { className: 'bg-emerald-100 text-emerald-700', order: 1 }
}

function workloadMeta(taskCount: number) {
  if (taskCount >= 4) return { label: 'Muy ocupado', className: 'bg-red-100 text-red-700' }
  if (taskCount >= 2) return { label: 'Ocupado', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700' }
}

function roomCounts(rooms: Room[]) {
  const occupied = rooms.filter((room) => room.OccupiedCount > 0 || room.RoomStatus === 'mantenimiento').length
  return {
    occupied,
    available: Math.max(0, rooms.length - occupied),
  }
}

function DashboardMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]">{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">{label}</p>
      </div>
      <p className="text-4xl font-black text-warm-900">{value}</p>
      <p className="text-sm text-warm-600">{detail}</p>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl bg-white/80 shadow-soft" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="h-80 animate-pulse rounded-3xl bg-white/80 shadow-soft" />
        <div className="h-80 animate-pulse rounded-3xl bg-white/80 shadow-soft" />
      </div>
    </div>
  )
}

export function StaffDashboardPage() {
  const {
    authToken,
    currentUser,
    site,
    isSyncing,
    requests,
    volunteerRoster,
    families,
    staffDashboard,
  } = useAppState()
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState<string | null>(null)

  useEffect(() => {
    if (!authToken) return
    let active = true
    setRoomsLoading(true)
    setRoomsError(null)
    void getRooms(authToken, currentUser?.siteId ?? null)
      .then((data) => {
        if (!active) return
        setRooms(data)
      })
      .catch(() => {
        if (!active) return
        setRoomsError('No pudimos cargar las habitaciones en este momento.')
      })
      .finally(() => {
        if (!active) return
        setRoomsLoading(false)
      })
    return () => {
      active = false
    }
  }, [authToken, currentUser?.siteId])

  const todayName = weekdayMap[new Date().getDay()]
  const roomSummary = useMemo(() => roomCounts(rooms), [rooms])
  const urgentRequests = useMemo(
    () =>
      [...requests]
        .filter((request) => request.status !== 'Resuelta')
        .sort((a, b) => {
          const urgencyDiff = urgencyMeta(b.urgency).order - urgencyMeta(a.urgency).order
          if (urgencyDiff !== 0) return urgencyDiff
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        .slice(0, 5),
    [requests],
  )
  const volunteersToday = useMemo(
    () => volunteerRoster.filter((volunteer) => volunteer.workDays.includes(todayName)),
    [todayName, volunteerRoster],
  )

  const isLoading = isSyncing || roomsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Centro de control staff" subtitle={`Cargando resumen operativo real para ${site}.`} />
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Centro de control staff" subtitle={`Vista principal operativa para ${site}. Todo lo que ves viene de datos reales de la sede.`} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardMetric
          icon={<ClipboardList className="h-5 w-5" />}
          label="Solicitudes pendientes"
          value={String(staffDashboard.pendingRequestsToday)}
          detail={`${urgentRequests.length} urgentes visibles para hoy`}
        />
        <DashboardMetric
          icon={<Users className="h-5 w-5" />}
          label="Voluntarios disponibles hoy"
          value={String(volunteersToday.filter((volunteer) => volunteer.currentTasks <= 1).length)}
          detail={`${volunteersToday.length} con turno ${todayName.toLowerCase()}`}
        />
        <DashboardMetric
          icon={<HeartHandshake className="h-5 w-5" />}
          label="Familias en la sede"
          value={String(families.length)}
          detail="Familias activas y visibles para staff"
        />
        <DashboardMetric
          icon={<BedDouble className="h-5 w-5" />}
          label="Habitaciones ocupadas"
          value={`${roomSummary.occupied}/${rooms.length || 0}`}
          detail={`${roomSummary.available} disponibles o listas para admisión`}
        />
      </div>

      {roomsError ? <div className="rounded-2xl bg-white p-4 text-sm font-semibold text-red-700 shadow-soft">{roomsError}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-warm-900">Solicitudes activas</h2>
              <p className="text-sm text-warm-600">Top 5 solicitudes más urgentes del día con prioridad visual.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setExpandedPanel((value) => (value === 'requests' ? null : 'requests'))}>
                Ver todas
              </Button>
              <Link to="/staff/requests">
                <Button variant="secondary">Ir a solicitudes</Button>
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {urgentRequests.length > 0 ? (
              urgentRequests.map((request) => {
                const urgency = urgencyMeta(request.urgency)
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setExpandedPanel((value) => (value === 'requests' ? null : 'requests'))}
                    className="w-full rounded-2xl bg-warm-50 p-4 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-warm-900">{request.title}</p>
                        <p className="text-sm text-warm-700">{request.type} · {request.assignedTo}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${urgency.className}`}>{request.urgency}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay solicitudes urgentes registradas por ahora.</div>
            )}
          </div>

          {expandedPanel === 'requests' ? (
            <div className="rounded-2xl border border-warm-200 bg-white p-4">
              <p className="mb-3 text-base font-semibold text-warm-900">Resumen ampliado</p>
              <div className="grid gap-3 md:grid-cols-2">
                {requests
                  .filter((request) => request.status !== 'Resuelta')
                  .slice(0, 8)
                  .map((request) => (
                    <div key={`expanded-${request.id}`} className="rounded-2xl bg-warm-50 p-4">
                      <p className="font-bold text-warm-900">{request.title}</p>
                      <p className="text-sm text-warm-700">{request.type} · {request.status}</p>
                      <p className="text-sm text-warm-600">{request.assignedTo}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-warm-900">Voluntarios de hoy</h2>
              <p className="text-sm text-warm-600">Disponibilidad real según carga de tareas activas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setExpandedPanel((value) => (value === 'volunteers' ? null : 'volunteers'))}>
                Gestionar
              </Button>
              <Link to="/staff/volunteers">
                <Button variant="secondary">Ir a voluntarios</Button>
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {volunteersToday.length > 0 ? (
              volunteersToday.slice(0, 5).map((volunteer) => {
                const workload = workloadMeta(volunteer.currentTasks)
                return (
                  <button
                    key={volunteer.userId}
                    type="button"
                    onClick={() => setExpandedPanel((value) => (value === 'volunteers' ? null : 'volunteers'))}
                    className="w-full rounded-2xl bg-warm-50 p-4 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-warm-900">{volunteer.fullName}</p>
                        <p className="text-sm text-warm-700">{volunteer.role} · {volunteer.startTime} - {volunteer.endTime}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${workload.className}`}>{workload.label}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay voluntarios con turno registrado para hoy.</div>
            )}
          </div>

          {expandedPanel === 'volunteers' ? (
            <div className="rounded-2xl border border-warm-200 bg-white p-4">
              <p className="mb-3 text-base font-semibold text-warm-900">Cobertura del día</p>
              <div className="space-y-3">
                {volunteersToday.map((volunteer) => {
                  const workload = workloadMeta(volunteer.currentTasks)
                  return (
                    <div key={`detail-${volunteer.userId}`} className="rounded-2xl bg-warm-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-warm-900">{volunteer.fullName}</p>
                          <p className="text-sm text-warm-700">{volunteer.role} · {volunteer.workDays.join(', ')}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${workload.className}`}>{workload.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-warm-900">Accesos operativos</h2>
          <p className="text-sm text-warm-600">Las herramientas principales de staff viven aquí para mantener el header limpio y el flujo mejor organizado.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Link to="/staff/reception" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606] shadow-soft">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-warm-900">Recepción</p>
                <p className="text-sm text-warm-600">Ingreso y seguimiento inicial</p>
              </div>
            </div>
          </Link>

          <Link to="/staff/rooms" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606] shadow-soft">
                <BedDouble className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-warm-900">Habitaciones</p>
                <p className="text-sm text-warm-600">Capacidad, mantenimiento y tiempos</p>
              </div>
            </div>
          </Link>

          <Link to="/staff/trips" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606] shadow-soft">
                <Route className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-warm-900">Viajes</p>
                <p className="text-sm text-warm-600">Traslados del día y seguimiento</p>
              </div>
            </div>
          </Link>

          <Link to="/staff/analytics" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606] shadow-soft">
                <Warehouse className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-warm-900">Analítica</p>
                <p className="text-sm text-warm-600">KPIs y lectura operativa</p>
              </div>
            </div>
          </Link>

          <Link to="/account" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#950606] shadow-soft">
                <UserCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-warm-900">Perfil</p>
                <p className="text-sm text-warm-600">Cuenta y seguridad</p>
              </div>
            </div>
          </Link>
        </div>
      </Card>

      <div className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#950606]" />
          <p className="text-lg font-bold text-warm-900">Centro de control activo</p>
        </div>
        <p className="mt-2 text-sm text-warm-600">
          Este dashboard ya concentra solicitudes, voluntarios, familias, habitaciones e inventario con datos reales del backend. Desde aquí puedes abrir cada módulo completo cuando necesites operar más a detalle.
        </p>
      </div>
    </div>
  )
}
