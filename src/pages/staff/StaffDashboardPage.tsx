import { useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronDown, ClipboardList, HeartHandshake, LayoutDashboard, MapPinned, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
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

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">{label}</p>
      <p className="text-3xl font-black text-warm-900">{value}</p>
      <p className="text-sm text-warm-600">{detail}</p>
    </Card>
  )
}

function isWithinHours(dateValue: string | null | undefined, hours: number) {
  if (!dateValue) return false
  const target = new Date(dateValue)
  if (Number.isNaN(target.getTime())) return false
  const now = new Date()
  const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffHours >= 0 && diffHours <= hours
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
        <SectionHeader title="Centro de control staff" subtitle={`Preparando bandeja priorizada para ${site}.`} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
          <div className="h-[420px] animate-pulse rounded-[28px] bg-white/80 shadow-soft" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-[28px] bg-white/80 shadow-soft" />
            <div className="h-32 animate-pulse rounded-[28px] bg-white/80 shadow-soft" />
            <div className="h-32 animate-pulse rounded-[28px] bg-white/80 shadow-soft" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader title="Centro de control staff" subtitle={`Bandeja operativa limpia para ${site}. Expedientes, aprobaciones, onboarding y seguimiento en un solo lugar.`} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Solicitudes pendientes" value={String(staffDashboard.pendingRequestsToday)} detail="Solicitudes operativas que siguen activas hoy" />
        <MetricCard label="Expedientes por completar" value={String(socioeconomicInbox.length)} detail="Referencias que aún necesitan enriquecimiento socioeconómico" />
        <MetricCard label="Expedientes listos para aprobar" value={String(approverInbox.length)} detail="Casos completos listos para asignar casa y onboarding" />
        <MetricCard label="Habitaciones disponibles" value={`${roomSummary.available}`} detail={`${roomSummary.occupied} ocupadas o en mantenimiento`} />
      </div>

      {error ? <div className="rounded-2xl bg-white p-4 text-sm font-semibold text-red-700 shadow-soft">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 space-y-4 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Bandeja priorizada</p>
              <h2 className="text-2xl font-bold text-warm-900">Bandeja de Entrada de Casos</h2>
              <p className="text-sm text-warm-600">Por defecto muestra los registros de hoy. Puedes plegarla, buscar por familia y abrir fechas anteriores cuando lo necesites.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsInboxOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-2xl bg-warm-50 px-4 py-2 text-sm font-semibold text-warm-800 transition hover:bg-warm-100"
            >
              {isInboxOpen ? 'Ocultar bandeja' : 'Mostrar bandeja'}
              <ChevronDown className={`h-4 w-4 transition duration-300 ${isInboxOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warm-50 p-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
              <input
                value={inboxSearch}
                onChange={(event) => setInboxSearch(event.target.value)}
                placeholder="Buscar por nombre de familia"
                className="w-full rounded-2xl border border-warm-200 bg-white py-2 pl-10 pr-4 text-sm text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/80 p-2">
              <input
                type="date"
                value={inboxDate}
                onChange={(event) => setInboxDate(event.target.value)}
                className="rounded-2xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
              />
              <Button variant="ghost" onClick={() => setInboxDate('')}>
                Ver todas las fechas
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 rounded-2xl bg-white/80 p-2">
              {inboxViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setInboxView(view.id)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${inboxView === view.id ? 'bg-warm-700 text-white' : 'text-warm-700 hover:bg-warm-50'}`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid overflow-hidden transition-all duration-300 ease-out ${isInboxOpen ? 'max-h-[1800px] gap-4 pt-1 opacity-100' : 'max-h-0 gap-0 pt-0 opacity-0'}`}>
            {filteredInbox.map((admission) => (
              <div key={admission.ReferralId} className="min-w-0 rounded-[24px] bg-warm-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-warm-900" title={admission.ChildName || `${admission.CaregiverName} ${admission.FamilyLastName}`}>
                      {cleanLatinText(admission.ChildName || `${admission.CaregiverName} ${admission.FamilyLastName}`)}
                    </p>
                    <p className="truncate text-sm text-warm-700" title={`${admission.OriginHospital || 'Hospital pendiente'} · llegada ${formatReadableDate(admission.ArrivalDate)}`}>
                      {cleanLatinText(admission.OriginHospital || 'Hospital pendiente')} · llegada {formatReadableDate(admission.ArrivalDate)}
                    </p>
                    <p className="truncate text-sm text-warm-600">Motivo de estancia: Apoyo logístico</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip status={mapStageLabel(admission.AdmissionStage)} />
                    <StatusChip status={admission.Status === 'aceptada' ? 'Aceptada' : admission.Status === 'en_revision' ? 'En revision' : 'Enviada'} />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0 rounded-2xl bg-white p-4 text-sm text-warm-700">
                    <p className="font-semibold text-warm-900">Contexto del caso</p>
                    <p className="mt-2 break-words">{cleanLatinText(admission.DossierSummary || admission.Message || 'Aún falta completar el expediente y validar información extra.')}</p>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="min-w-0 rounded-2xl bg-white p-4 text-sm text-warm-700">
                      <p className="font-semibold text-warm-900">Casa objetivo</p>
                      <p className="mt-1 truncate" title={admission.AssignedSiteName || admission.SiteName || 'Se calculará al aprobar'}>
                        {cleanLatinText(admission.AssignedSiteName || admission.SiteName || 'Se calculará al aprobar')}
                      </p>
                    </div>
                    <Link to="/admin/panel" className="block">
                      <Button variant="secondary" className="w-full">Abrir expediente</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {filteredInbox.length === 0 ? (
              <div className="rounded-[24px] bg-warm-50 p-6 text-warm-700">No hay casos en esta bandeja con los filtros actuales.</div>
            ) : null}
          </div>

          {!isInboxOpen ? (
            <div className="rounded-[24px] bg-warm-50 p-4 text-sm text-warm-700">
              Bandeja colapsada. Ábrela solo cuando estés procesando expedientes.
            </div>
          ) : null}
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]"><ClipboardList className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-warm-900">{currentUser?.role === 'staff' ? 'Mis tareas asignadas' : 'Onboarding de sede'}</h3>
                <p className="text-sm text-warm-600">
                  {currentUser?.role === 'staff'
                    ? 'Tareas operativas que te asignó Dirección Ejecutiva o Gerencia de Sede.'
                    : 'Tareas automáticas y operativas que se disparan al aprobar expedientes.'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {(currentUser?.role === 'staff' ? ownTasks : onboardingTasks).map((task) => (
                <div key={task.StaffTaskId} className="min-w-0 rounded-2xl bg-warm-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-warm-900" title={cleanLatinText(task.Title)}>{cleanLatinText(task.Title)}</p>
                      <p
                        className="truncate text-sm text-warm-700"
                        title={
                          currentUser?.role === 'staff'
                            ? `Vence ${formatReadableDate(task.DueDate || task.CreatedAt)} · prioridad ${cleanLatinText(task.Priority)}`
                            : cleanLatinText(`${task.CaregiverName} ${task.FamilyLastName} · habitación ${task.SuggestedRoomCode || task.RoomCode || 'por definir'}`)
                        }
                      >
                        {currentUser?.role === 'staff'
                          ? `Vence ${formatReadableDate(task.DueDate || task.CreatedAt)} · prioridad ${cleanLatinText(task.Priority)}`
                          : cleanLatinText(`${task.CaregiverName} ${task.FamilyLastName} · habitación ${task.SuggestedRoomCode || task.RoomCode || 'por definir'}`)}
                      </p>
                    </div>
                    <StatusChip status={task.Priority === 'alta' ? 'Ocupada' : task.Priority === 'media' ? 'Preparacion' : 'Pendiente'} />
                  </div>
                  <p className="mt-3 break-words text-sm text-warm-700">{cleanLatinText(task.Instructions)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentUser?.role === 'staff' ? (
                      <>
                        {task.Status !== 'en_proceso' ? (
                          <Button variant="ghost" onClick={() => void updateOwnTaskStatus(task.StaffTaskId, 'en_proceso')}>Marcar en curso</Button>
                        ) : null}
                        <Button variant="secondary" onClick={() => void updateOwnTaskStatus(task.StaffTaskId, 'completada')}>Marcar completada</Button>
                      </>
                    ) : (
                      <Link to="/staff/reception"><Button variant="ghost">Instrucciones de bienvenida</Button></Link>
                    )}
                  </div>
                </div>
              ))}
              {(currentUser?.role === 'staff' ? ownTasks.length === 0 : onboardingTasks.length === 0) ? (
                <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">
                  {currentUser?.role === 'staff' ? 'No tienes tareas asignadas pendientes.' : 'No hay tareas de onboarding pendientes.'}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]"><BellRing className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-warm-900">Próximas salidas</h3>
                <p className="text-sm text-warm-600">Indicadores discretos hasta que falten menos de 48 horas.</p>
              </div>
            </div>
            <div className="space-y-3">
              {imminentDepartures.map((reminder) => {
                const urgent = isWithinHours(reminder.PlannedCheckoutDate, 48)
                return (
                  <div key={reminder.FamilyId} className="min-w-0 rounded-2xl bg-warm-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-warm-900" title={`${reminder.CaregiverName} ${reminder.FamilyLastName}`}>
                          {cleanLatinText(`${reminder.CaregiverName} ${reminder.FamilyLastName}`)}
                        </p>
                        <p className="truncate text-sm text-warm-700" title={`Habitación ${reminder.RoomCode || 'Por asignar'} · salida ${formatReadableDate(reminder.PlannedCheckoutDate)}`}>
                          Habitación {reminder.RoomCode || 'Por asignar'} · salida {formatReadableDate(reminder.PlannedCheckoutDate)}
                        </p>
                      </div>
                      <span className={`inline-flex h-3 w-3 rounded-full ${urgent ? 'bg-red-500' : 'bg-orange-400'}`} />
                    </div>
                  </div>
                )
              })}
              {imminentDepartures.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">No hay salidas próximas pendientes.</div> : null}
            </div>
          </Card>

          <Card className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]"><ShieldCheck className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-warm-900">Bitácora de Estancia</h3>
                <p className="text-sm text-warm-600">Seguimiento acumulado para ajustar estancia y salida sin exponer datos sensibles.</p>
              </div>
            </div>
            <div className="space-y-3">
              {clinicalHistory.map((entry) => (
                <div key={entry.FollowUpId} className="min-w-0 rounded-2xl bg-warm-50 p-4">
                  <p className="truncate font-bold text-warm-900" title={entry.ClinicName || 'Clínica de seguimiento'}>
                    {cleanLatinText(entry.ClinicName || 'Clínica de seguimiento')}
                  </p>
                  <p className="mt-1 break-words text-sm text-warm-700">{cleanLatinText(entry.FeedbackMessage)}</p>
                  <p className="mt-2 break-words text-xs font-semibold uppercase tracking-[0.18em] text-warm-500">Nueva salida estimada: {formatReadableDate(entry.EstimatedCheckoutDate)} · {formatReadableDate(entry.RecordedAt)}</p>
                </div>
              ))}
              {clinicalHistory.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">Aún no hay feedback clínico registrado para esta sede.</div> : null}
            </div>
          </Card>

          <Card className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-[#950606]"><LayoutDashboard className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-warm-900">Atajos operativos</h3>
                <p className="text-sm text-warm-600">Accesos rápidos a lo esencial sin saturar el home.</p>
              </div>
            </div>
            <div className="grid gap-3">
              <Link to="/staff/reception" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center gap-3"><HeartHandshake className="h-5 w-5 text-[#950606]" /><span className="font-bold text-warm-900">Recepción y ayuda asistida</span></div>
              </Link>
              <Link to="/staff/rooms" className="rounded-2xl bg-warm-50 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center gap-3"><MapPinned className="h-5 w-5 text-[#950606]" /><span className="font-bold text-warm-900">Habitaciones</span></div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
