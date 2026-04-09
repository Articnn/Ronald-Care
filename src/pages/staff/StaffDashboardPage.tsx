import { useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronDown, ClipboardCheck, ClipboardList, HeartHandshake, LayoutDashboard, MapPinned, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import {
  getAdmissions,
  getClinicalHistory,
  getDepartureReminders,
  getRooms,
  getStaffTasks,
  updateStaffTask,
  type AdmissionRecord,
  type ClinicalHistoryRecord,
  type DepartureReminderRecord,
  type Room,
  type StaffTaskRecord,
} from '../../lib/api'

const inboxViews = [
  { id: 'socioeconomico', label: 'Socioeconómico' },
  { id: 'aprobador', label: 'Aprobador' },
] as const

type InboxView = (typeof inboxViews)[number]['id']

function cleanLatinText(value: string) {
  return value
    .replace(/\u00c3\u0081/g, 'Á')
    .replace(/\u00c3\u0089/g, 'É')
    .replace(/\u00c3\u008d/g, 'Í')
    .replace(/\u00c3\u0093/g, 'Ó')
    .replace(/\u00c3\u009a/g, 'Ú')
    .replace(/\u00c3\u0091/g, 'Ñ')
    .replace(/\u00c3\u00a1/g, 'á')
    .replace(/\u00c3\u00a9/g, 'é')
    .replace(/\u00c3\u00ad/g, 'í')
    .replace(/\u00c3\u00b3/g, 'ó')
    .replace(/\u00c3\u00ba/g, 'ú')
    .replace(/\u00c3\u00b1/g, 'ñ')
    .replace(/\u00e2\u0080\u0093/g, '–')
    .replace(/\u00e2\u0080\u00a2/g, '•')
    .replace(/\u00c2/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatReadableDate(value?: string | null) {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function mapStageLabel(stage?: AdmissionRecord['AdmissionStage']) {
  if (stage === 'borrador_extraido') return 'Referencia'
  if (stage === 'expediente_armado') return 'Expediente armado'
  if (stage === 'aprobada') return 'Aprobada'
  if (stage === 'lista_espera') return 'Lista de espera'
  return 'Referencia'
}

function roomCounts(rooms: Room[]) {
  const occupied = rooms.filter((room) => room.OccupiedCount > 0 || room.RoomStatus === 'mantenimiento').length
  return {
    occupied,
    available: Math.max(0, rooms.length - occupied),
  }
}

function isWithinHours(dateValue: string | null | undefined, hours: number) {
  if (!dateValue) return false
  const target = new Date(dateValue)
  if (Number.isNaN(target.getTime())) return false
  const now = new Date()
  const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours >= 0 && diffHours <= hours
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-warm-700">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function StaffDashboardPage() {
  const { authToken, currentUser, site, availableSites, isSyncing, staffDashboard, pushToast } = useAppState()
  const [inboxView, setInboxView] = useState<InboxView>('socioeconomico')
  const [inboxSearch, setInboxSearch] = useState('')
  const [inboxDate, setInboxDate] = useState(() => toDateInputValue(new Date().toISOString()))
  const [isInboxOpen, setIsInboxOpen] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([])
  const [staffTasks, setStaffTasks] = useState<StaffTaskRecord[]>([])
  const [departureReminders, setDepartureReminders] = useState<DepartureReminderRecord[]>([])
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedSiteId =
    currentUser?.role === 'admin' || currentUser?.role === 'superadmin'
      ? site === 'Todas las sedes'
        ? null
        : availableSites.findIndex((item) => item === site) + 1 || null
      : currentUser?.siteId || null

  useEffect(() => {
    if (!authToken) return
    let active = true
    setIsLoading(true)
    setError(null)

    void Promise.all([
      getRooms(authToken, selectedSiteId),
      getAdmissions(authToken, { siteId: selectedSiteId }),
      getStaffTasks(authToken, { siteId: selectedSiteId }),
      getDepartureReminders(authToken, selectedSiteId),
    ])
      .then(async ([roomsData, admissionsData, tasksData, remindersData]) => {
        if (!active) return
        setRooms(roomsData)
        setAdmissions(admissionsData)
        setStaffTasks(tasksData)
        setDepartureReminders(remindersData)

        const familyIds = Array.from(new Set(admissionsData.map((item) => item.FamilyId).filter(Boolean))) as number[]
        if (familyIds.length === 0) {
          setClinicalHistory([])
          return
        }

        const historyChunks = await Promise.all(
          familyIds.map((familyId) => getClinicalHistory(authToken, { familyId, siteId: selectedSiteId })),
        )
        if (!active) return
        setClinicalHistory(historyChunks.flat().slice(0, 5))
      })
      .catch(() => {
        if (!active) return
        setError('No pudimos cargar la bandeja operativa en este momento.')
      })
      .finally(() => {
        if (!active) return
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [authToken, selectedSiteId])

  const roomSummary = useMemo(() => roomCounts(rooms), [rooms])
  const socioeconomicInbox = useMemo(
    () => admissions.filter((item) => item.AdmissionStage === 'referencia' || item.AdmissionStage === 'borrador_extraido'),
    [admissions],
  )
  const approverInbox = useMemo(() => admissions.filter((item) => item.AdmissionStage === 'expediente_armado'), [admissions])
  const visibleInbox = inboxView === 'socioeconomico' ? socioeconomicInbox : approverInbox
  const filteredInbox = useMemo(() => {
    const query = inboxSearch.trim().toLowerCase()
    return visibleInbox.filter((admission) => {
      const familyText = `${admission.ChildName || ''} ${admission.CaregiverName || ''} ${admission.FamilyLastName || ''}`.toLowerCase()
      const createdDate = toDateInputValue(admission.CreatedAt || admission.ArrivalDate || '')
      const matchesQuery = !query || familyText.includes(query)
      const matchesDate = !inboxDate || createdDate === inboxDate
      return matchesQuery && matchesDate
    })
  }, [inboxDate, inboxSearch, visibleInbox])
  const onboardingTasks = useMemo(() => staffTasks.filter((task) => task.Status !== 'completada').slice(0, 5), [staffTasks])
  const imminentDepartures = useMemo(() => departureReminders.filter((item) => !item.DepartureReminderSentAt).slice(0, 4), [departureReminders])
  const ownTasks = useMemo(
    () =>
      currentUser?.role === 'staff'
        ? staffTasks.filter((task) => task.AssignedUserId === currentUser.userId && task.Status !== 'completada')
        : [],
    [currentUser, staffTasks],
  )

  const updateOwnTaskStatus = async (staffTaskId: number, status: 'en_proceso' | 'completada') => {
    if (!authToken) return
    try {
      await updateStaffTask(authToken, { staffTaskId, status })
      const tasksData = await getStaffTasks(authToken, { siteId: selectedSiteId })
      setStaffTasks(tasksData)
      pushToast({
        type: 'success',
        message: status === 'completada' ? 'Tarea marcada como completada' : 'Tarea marcada en curso',
      })
    } catch (taskError) {
      pushToast({
        type: 'error',
        message: taskError instanceof Error ? taskError.message : 'No pudimos actualizar la tarea',
      })
    }
  }

  if (isLoading || isSyncing) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-1.5 h-3.5 w-72 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Centro de control staff</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bandeja operativa para <span className="font-medium text-gray-700">{site}</span>. Expedientes, aprobaciones, onboarding y seguimiento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Solicitudes pendientes"
          value={String(staffDashboard.pendingRequestsToday)}
          detail="Solicitudes operativas activas hoy"
        />
        <StatCard
          label="Expedientes por completar"
          value={String(socioeconomicInbox.length)}
          detail="Necesitan enriquecimiento socioeconómico"
        />
        <StatCard
          label="Listos para aprobar"
          value={String(approverInbox.length)}
          detail="Casos completos para asignar y onboarding"
        />
        <StatCard
          label="Habitaciones disponibles"
          value={String(roomSummary.available)}
          detail={`${roomSummary.occupied} ocupadas o en mantenimiento`}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Bandeja priorizada</p>
              <h2 className="mt-0.5 text-sm font-semibold text-gray-900">Bandeja de entrada de casos</h2>
              <p className="mt-0.5 text-xs text-gray-500">Registros de hoy por defecto. Filtra por familia o fecha según necesites.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsInboxOpen((current) => !current)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {isInboxOpen ? 'Colapsar' : 'Expandir'}
              <ChevronDown className={`h-3.5 w-3.5 transition duration-300 ${isInboxOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={inboxSearch}
                onChange={(event) => setInboxSearch(event.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
              />
            </div>
            <input
              type="date"
              value={inboxDate}
              onChange={(event) => setInboxDate(event.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
            />
            <button
              onClick={() => setInboxDate('')}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Todas las fechas
            </button>
            <div className="flex rounded-md border border-gray-300 bg-white overflow-hidden">
              {inboxViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setInboxView(view.id)}
                  className={`px-3 py-2 text-xs font-medium transition ${
                    inboxView === view.id ? 'bg-warm-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-out ${isInboxOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="divide-y divide-gray-100">
              {filteredInbox.map((admission) => (
                <div key={admission.ReferralId} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900" title={admission.ChildName || `${admission.CaregiverName} ${admission.FamilyLastName}`}>
                        {cleanLatinText(admission.ChildName || `${admission.CaregiverName} ${admission.FamilyLastName}`)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {cleanLatinText(admission.OriginHospital || 'Hospital pendiente')} · llegada {formatReadableDate(admission.ArrivalDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusChip status={mapStageLabel(admission.AdmissionStage)} />
                      <StatusChip status={admission.Status === 'aceptada' ? 'Aceptada' : admission.Status === 'en_revision' ? 'En revision' : 'Enviada'} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                      <p className="font-medium text-gray-800">Contexto del caso</p>
                      <p className="mt-1 break-words">{cleanLatinText(admission.DossierSummary || admission.Message || 'Aún falta completar el expediente y validar información extra.')}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                        <p className="font-medium text-gray-800">Casa objetivo</p>
                        <p className="mt-1 truncate">{cleanLatinText(admission.AssignedSiteName || admission.SiteName || 'Se calculará al aprobar')}</p>
                      </div>
                      <Link to="/admin/panel">
                        <button className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
                          Abrir expediente
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {filteredInbox.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No hay casos en esta bandeja con los filtros actuales.
                </div>
              )}
            </div>
          </div>

          {!isInboxOpen && (
            <div className="px-5 py-4 text-xs text-gray-400">
              Bandeja colapsada. Ábrela cuando estés procesando expedientes.
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <SectionCard
            icon={<ClipboardList className="h-4 w-4" />}
            title={currentUser?.role === 'staff' ? 'Mis tareas asignadas' : 'Onboarding de sede'}
            subtitle={
              currentUser?.role === 'staff'
                ? 'Tareas operativas asignadas por Dirección o Gerencia.'
                : 'Tareas automáticas al aprobar expedientes.'
            }
          >
            <div className="space-y-2">
              {(currentUser?.role === 'staff' ? ownTasks : onboardingTasks).map((task) => (
                <div key={task.StaffTaskId} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">{cleanLatinText(task.Title)}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {currentUser?.role === 'staff'
                          ? `Vence ${formatReadableDate(task.DueDate || task.CreatedAt)} · ${cleanLatinText(task.Priority)}`
                          : cleanLatinText(`${task.CaregiverName} ${task.FamilyLastName} · hab. ${task.SuggestedRoomCode || task.RoomCode || 'por definir'}`)}
                      </p>
                    </div>
                    <StatusChip status={task.Priority === 'alta' ? 'Ocupada' : task.Priority === 'media' ? 'Preparacion' : 'Pendiente'} />
                  </div>
                  <p className="mt-2 break-words text-xs text-gray-500">{cleanLatinText(task.Instructions)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {currentUser?.role === 'staff' ? (
                      <>
                        {task.Status !== 'en_proceso' && (
                          <button
                            onClick={() => void updateOwnTaskStatus(task.StaffTaskId, 'en_proceso')}
                            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                          >
                            Marcar en curso
                          </button>
                        )}
                        <button
                          onClick={() => void updateOwnTaskStatus(task.StaffTaskId, 'completada')}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Completada
                        </button>
                      </>
                    ) : (
                      <Link to="/staff/reception">
                        <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
                          Instrucciones de bienvenida
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {(currentUser?.role === 'staff' ? ownTasks.length === 0 : onboardingTasks.length === 0) && (
                <p className="py-2 text-center text-xs text-gray-400">
                  {currentUser?.role === 'staff' ? 'No tienes tareas asignadas pendientes.' : 'No hay tareas de onboarding pendientes.'}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<BellRing className="h-4 w-4" />}
            title="Próximas salidas"
            subtitle="Indicadores discretos para salidas en menos de 48 horas."
          >
            <div className="space-y-2">
              {imminentDepartures.map((reminder) => {
                const urgent = isWithinHours(reminder.PlannedCheckoutDate, 48)
                return (
                  <div key={reminder.FamilyId} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {cleanLatinText(`${reminder.CaregiverName} ${reminder.FamilyLastName}`)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        Hab. {reminder.RoomCode || '—'} · salida {formatReadableDate(reminder.PlannedCheckoutDate)}
                      </p>
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${urgent ? 'bg-red-500' : 'bg-orange-400'}`} />
                  </div>
                )
              })}
              {imminentDepartures.length === 0 && (
                <p className="py-2 text-center text-xs text-gray-400">No hay salidas próximas pendientes.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Bitácora de estancia"
            subtitle="Seguimiento acumulado para ajustar estancia sin exponer datos sensibles."
          >
            <div className="space-y-2">
              {clinicalHistory.map((entry) => (
                <div key={entry.FollowUpId} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="truncate text-xs font-semibold text-gray-900">{cleanLatinText(entry.ClinicName || 'Clínica de seguimiento')}</p>
                  <p className="mt-1 break-words text-xs text-gray-500">{cleanLatinText(entry.FeedbackMessage)}</p>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-warm-500">
                    Salida estimada: {formatReadableDate(entry.EstimatedCheckoutDate)} · {formatReadableDate(entry.RecordedAt)}
                  </p>
                </div>
              ))}
              {clinicalHistory.length === 0 && (
                <p className="py-2 text-center text-xs text-gray-400">Aún no hay feedback clínico registrado.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<LayoutDashboard className="h-4 w-4" />}
            title="Atajos operativos"
            subtitle="Accesos rápidos a lo esencial."
          >
            <div className="space-y-2">
              <Link to="/staff/reception" className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 hover:border-warm-200">
                <HeartHandshake className="h-4 w-4 shrink-0 text-warm-600" />
                Recepción y ayuda asistida
              </Link>
              <Link to="/staff/rooms" className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 hover:border-warm-200">
                <MapPinned className="h-4 w-4 shrink-0 text-warm-600" />
                Habitaciones
              </Link>
              <Link to="/tasks" className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 hover:border-warm-200">
                <ClipboardCheck className="h-4 w-4 shrink-0 text-warm-600" />
                Gestión de tareas
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
