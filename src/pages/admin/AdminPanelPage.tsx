import { ChevronDown, MoreVertical, Plus, Search, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import {
  getAdmissions,
  getClinicalHistory,
  getDepartureReminders,
  markDepartureReminderPreparedApi,
  updateAdmissionRecord,
  type AdmissionRecord,
  type ClinicalHistoryRecord,
  type DepartureReminderRecord,
} from '../../lib/api'

const userRoles = ['admin', 'staff'] as const
const staffWorkAreas = ['recepcion', 'checkin', 'habitaciones', 'inventario', 'coordinacion', 'analitica', 'apoyo_familiar'] as const
const weekDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const
const staffAlertOptions = [
  { value: 'incoming_families', label: 'Llegan familias nuevas' },
  { value: 'prepare_kits', label: 'Se ocupan mas kits' },
  { value: 'reception_help', label: 'Recepcion necesita apoyo' },
  { value: 'checkin_pending', label: 'Hay check-ins pendientes' },
] as const

function calculateHours(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const startTotal = startHour * 60 + startMinute
  let endTotal = endHour * 60 + endMinute
  if (endTotal <= startTotal) endTotal += 24 * 60
  return Math.round((((endTotal - startTotal) / 60) * 100)) / 100
}

function inferShiftLabel(startTime: string) {
  const hour = Number(startTime.split(':')[0] || 8)
  if (hour >= 18 || hour < 6) return 'noche' as const
  if (hour >= 13) return 'tarde' as const
  return 'manana' as const
}

function inferAvailability(hours: number) {
  if (hours <= 0) return 'No disponible'
  if (hours < 4) return 'Cupo limitado'
  return 'Disponible'
}

function workloadMeta(taskCount: number) {
  if (taskCount >= 4) return { label: 'Muy ocupado', className: 'bg-red-100 text-red-700' }
  if (taskCount >= 2) return { label: 'Ocupado', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700' }
}

function formatArea(area: (typeof staffWorkAreas)[number]) {
  const map: Record<(typeof staffWorkAreas)[number], string> = {
    recepcion: 'Recepcion',
    checkin: 'Check-in',
    habitaciones: 'Habitaciones',
    inventario: 'Inventario',
    coordinacion: 'Coordinacion',
    analitica: 'Analitica',
    apoyo_familiar: 'Apoyo familiar',
  }
  return map[area]
}

function formatReadableDate(value?: string | null) {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX')
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

const avatarColors = [
  'bg-warm-700 text-white',
  'bg-sky-600 text-white',
  'bg-emerald-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
]

function avatarColor(id: string | number) {
  const n = typeof id === 'string' ? id.charCodeAt(0) : id
  return avatarColors[n % avatarColors.length] ?? avatarColors[0]
}

// ─── Reusable section card ────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }: {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── KPI stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

// ─── Action dropdown for table rows ───────────────────────────────────────────
function RowActions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-20 min-w-[160px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({ onClick, danger, children, disabled }: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdminPanelPage() {
  const {
    authToken,
    currentUser,
    site,
    internalUsers,
    pendingReferrals,
    families,
    familyStayAutomation,
    staffRoster,
    availableSites,
    createInternalUser,
    updateInternalUser,
    deleteInternalUser,
    activateReferralFamily,
    extendFamilyStay,
    refreshConnectedData,
    setFamilyAccessState,
    sendStaffAlertToUser,
    pushToast,
  } = useAppState()

  const seedSites = useMemo(() => availableSites.filter((item) => item !== 'Todas las sedes'), [availableSites])

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('Demo123!')
  const [role, setRole] = useState<(typeof userRoles)[number]>('staff')
  const [siteId, setSiteId] = useState(1)
  const [selectedWorkDays, setSelectedWorkDays] = useState<string[]>(['Lunes', 'Miercoles', 'Viernes'])
  const [staffWorkArea, setStaffWorkArea] = useState<(typeof staffWorkAreas)[number]>('recepcion')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('16:00')
  const [shiftLabel, setShiftLabel] = useState<'manana' | 'tarde' | 'noche'>('manana')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  // Table state
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [siteDrafts, setSiteDrafts] = useState<Record<string, number>>({})
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Other operations state
  const [activatingReferralId, setActivatingReferralId] = useState<string | null>(null)
  const [familyActionId, setFamilyActionId] = useState<string | null>(null)
  const [selectedAlertTypeByUser, setSelectedAlertTypeByUser] = useState<Record<number, (typeof staffAlertOptions)[number]['value']>>({})
  const [stayDaysByReferral, setStayDaysByReferral] = useState<Record<string, number>>({})
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([])
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryRecord[]>([])
  const [departureReminders, setDepartureReminders] = useState<DepartureReminderRecord[]>([])
  const [admissionBusyId, setAdmissionBusyId] = useState<string | null>(null)
  const [originHospitalByReferral, setOriginHospitalByReferral] = useState<Record<number, string>>({})
  const [clinicalNoteByFamily, setClinicalNoteByFamily] = useState<Record<number, string>>({})
  const [clinicalDateByFamily, setClinicalDateByFamily] = useState<Record<number, string>>({})
  const [clinicalSearch, setClinicalSearch] = useState('')
  const [isStayTrackingOpen, setIsStayTrackingOpen] = useState(false)

  const derivedHours = useMemo(() => calculateHours(startTime, endTime), [startTime, endTime])
  const derivedAvailability = useMemo(() => inferAvailability(derivedHours), [derivedHours])

  const reloadAdmissions = async () => {
    if (!authToken) return
    const [admissionsData, remindersData] = await Promise.all([
      getAdmissions(authToken, { siteId: selectedSiteId }),
      getDepartureReminders(authToken, selectedSiteId),
    ])
    setAdmissions(admissionsData)
    setDepartureReminders(remindersData)
    const familyIds = Array.from(new Set(admissionsData.map((item) => item.FamilyId).filter(Boolean))) as number[]
    if (familyIds.length === 0) { setClinicalHistory([]); return }
    const historyChunks = await Promise.all(familyIds.map((familyId) => getClinicalHistory(authToken, { familyId, siteId: selectedSiteId })))
    setClinicalHistory(historyChunks.flat())
  }

  useEffect(() => { setShiftLabel(inferShiftLabel(startTime)) }, [startTime])

  useEffect(() => {
    const nextDrafts = Object.fromEntries(internalUsers.map((user) => [user.id, user.siteId || 1]))
    setSiteDrafts(nextDrafts)
  }, [internalUsers])

  useEffect(() => {
    setStayDaysByReferral((current) => {
      const next = { ...current }
      for (const referral of pendingReferrals) {
        if (!next[referral.id]) next[referral.id] = 3
      }
      return next
    })
  }, [pendingReferrals])

  useEffect(() => {
    setOriginHospitalByReferral((current) => {
      const next = { ...current }
      for (const admission of admissions) {
        if (next[admission.ReferralId] === undefined) next[admission.ReferralId] = admission.OriginHospital || ''
      }
      return next
    })
  }, [admissions])

  const selectedSiteId =
    currentUser?.role === 'admin' || currentUser?.role === 'superadmin'
      ? site === 'Todas las sedes'
        ? null
        : seedSites.findIndex((item) => item === site) + 1 || null
      : currentUser?.siteId || null

  useEffect(() => {
    if (!authToken) return
    let active = true
    void Promise.all([
      getAdmissions(authToken, { siteId: selectedSiteId }),
      getDepartureReminders(authToken, selectedSiteId),
    ])
      .then(async ([admissionsData, remindersData]) => {
        if (!active) return
        setAdmissions(admissionsData)
        setDepartureReminders(remindersData)
        const familyIds = Array.from(new Set(admissionsData.map((item) => item.FamilyId).filter(Boolean))) as number[]
        if (familyIds.length === 0) { setClinicalHistory([]); return }
        const historyChunks = await Promise.all(familyIds.map((familyId) => getClinicalHistory(authToken, { familyId, siteId: selectedSiteId })))
        if (!active) return
        setClinicalHistory(historyChunks.flat())
      })
      .catch(() => {
        if (!active) return
        setAdmissions([])
        setClinicalHistory([])
        setDepartureReminders([])
      })
    return () => { active = false }
  }, [authToken, selectedSiteId])

  const staffUsers = useMemo(() => internalUsers.filter((user) => user.role === 'Staff'), [internalUsers])
  const executiveUsers = useMemo(() => internalUsers.filter((user) => user.role === 'Admin'), [internalUsers])

  const filteredUsers = useMemo(() => {
    let list = internalUsers
    const query = userSearch.trim().toLowerCase()
    if (query) list = list.filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(query))
    if (roleFilter !== 'all') list = list.filter((user) => user.role.toLowerCase() === roleFilter)
    if (statusFilter !== 'all') list = list.filter((user) => statusFilter === 'active' ? user.isActive : !user.isActive)
    return list
  }, [internalUsers, userSearch, roleFilter, statusFilter])

  const filteredFamiliesForClinical = useMemo(() => {
    const query = clinicalSearch.trim().toLowerCase()
    if (!query) return families
    return families.filter((family) => `${family.caregiverName} ${family.familyLastName}`.toLowerCase().includes(query))
  }, [clinicalSearch, families])

  // ── SELECT style ──────────────────────────────────────────────────────────
  const selectCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100'

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel ejecutivo</h1>
          <p className="mt-0.5 text-sm text-gray-500">Usuarios internos, activación familiar y control operativo · {site}</p>
        </div>
        <button
          onClick={() => setIsFormOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-warm-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-warm-800 transition"
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancelar' : 'Nuevo usuario'}
        </button>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuarios totales" value={internalUsers.length} sub={`${site}`} />
        <StatCard label="Staff operativo" value={staffUsers.length} sub="Área operativa" />
        <StatCard label="Dirección ejecutiva" value={executiveUsers.length} sub="Gerentes y admins" />
      </div>

      {/* ── New user form (toggle) ───────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Crear usuario interno</h2>
            <p className="mt-0.5 text-sm text-gray-500">Captura por bloques para que el alta sea clara y rápida.</p>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid gap-5 xl:grid-cols-2">
              {/* Personal */}
              <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="border-b border-gray-200 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Información personal</p>
                  <p className="text-sm font-semibold text-gray-800">Datos básicos</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input label="Contraseña inicial" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              {/* Role & site */}
              <div className="space-y-4 rounded-lg border border-gray-100 bg-white p-4">
                <div className="border-b border-gray-200 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Sede asignada</p>
                  <p className="text-sm font-semibold text-gray-800">Rol y ubicación</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-gray-700">Rol</span>
                    <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value as (typeof userRoles)[number])}>
                      {userRoles.map((item) => (
                        <option key={item} value={item}>{item === 'admin' ? 'Gerente de Sede' : 'Staff / Operación'}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-gray-700">Sede</span>
                    <select className={selectCls} value={siteId} onChange={(e) => setSiteId(Number(e.target.value))}>
                      {seedSites.map((item, index) => (
                        <option key={item} value={index + 1}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Staff schedule */}
            {role === 'staff' && (
              <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="border-b border-gray-200 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Horario laboral</p>
                  <p className="text-sm font-semibold text-gray-800">Perfil operativo</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-gray-700">Área de trabajo</span>
                    <select className={selectCls} value={staffWorkArea} onChange={(e) => setStaffWorkArea(e.target.value as (typeof staffWorkAreas)[number])}>
                      {staffWorkAreas.map((item) => <option key={item} value={item}>{formatArea(item)}</option>)}
                    </select>
                  </label>
                  <Input label="Hora de inicio" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <Input label="Hora de fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  <label className="block space-y-1">
                    <span className="text-sm font-semibold text-gray-700">Turno</span>
                    <select className={selectCls} value={shiftLabel} onChange={(e) => setShiftLabel(e.target.value as 'manana' | 'tarde' | 'noche')}>
                      <option value="manana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                    </select>
                  </label>
                </div>
                <div className="space-y-2 rounded-lg bg-white p-3">
                  <p className="text-sm font-semibold text-gray-700">Días de trabajo</p>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <label key={day} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                        selectedWorkDays.includes(day)
                          ? 'border-warm-600 bg-warm-50 text-warm-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedWorkDays.includes(day)}
                          onChange={(e) => setSelectedWorkDays((curr) => e.target.checked ? [...curr, day] : curr.filter((d) => d !== day))}
                        />
                        {day.slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: 'Horas registradas', value: `${derivedHours} hrs` },
                    { label: 'Disponibilidad', value: derivedAvailability },
                    { label: 'Turno sugerido', value: shiftLabel },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-gray-100 bg-white p-3">
                      <p className="text-xs font-medium text-gray-400">{item.label}</p>
                      <p className="text-lg font-bold text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button
                isLoading={isCreatingUser}
                onClick={async () => {
                  setIsCreatingUser(true)
                  try {
                    await createInternalUser({
                      fullName, email, role, siteId, password,
                      volunteerShift: undefined,
                      staffProfile: role === 'staff' ? { workArea: staffWorkArea, workDays: selectedWorkDays, startTime, endTime, shiftLabel } : undefined,
                    })
                    setFullName(''); setEmail(''); setPassword('Demo123!')
                    setIsFormOpen(false)
                    pushToast({ type: 'success', message: 'Usuario interno creado con éxito.' })
                  } finally {
                    setIsCreatingUser(false)
                  }
                }}
              >
                Crear usuario
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Users table ─────────────────────────────────────────────────────── */}
      <SectionCard
        title="Usuarios por sede"
        subtitle="Pausa, elimina o traslada usuarios. Respeta la sede seleccionada."
        action={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>{filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}</span>
          </div>
        }
      >
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Gerente</option>
            <option value="staff">Staff</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="paused">Pausados</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Traslado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(user.id)}`}>
                        {getInitials(user.fullName)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-400">{user.site || 'Global'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.role === 'Admin' ? 'bg-warm-100 text-warm-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {user.role === 'Admin' ? 'Gerente' : 'Staff'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {user.isActive ? 'Activo' : 'Pausado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none"
                        value={siteDrafts[user.id] || user.siteId || 1}
                        onChange={(e) => setSiteDrafts((curr) => ({ ...curr, [user.id]: Number(e.target.value) }))}
                      >
                        {seedSites.map((item, index) => (
                          <option key={`${user.id}-${item}`} value={index + 1}>{item}</option>
                        ))}
                      </select>
                      <button
                        disabled={(siteDrafts[user.id] || user.siteId || 1) === (user.siteId || 1) || loadingUserId === `move-${user.id}`}
                        onClick={async () => {
                          setLoadingUserId(`move-${user.id}`)
                          try {
                            await updateInternalUser({ userId: Number(user.id), siteId: siteDrafts[user.id] || user.siteId || 1 })
                            pushToast({ type: 'success', message: `Usuario trasladado a ${seedSites[(siteDrafts[user.id] || user.siteId || 1) - 1]}.` })
                          } finally { setLoadingUserId(null) }
                        }}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        Guardar
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions>
                      <DropdownItem
                        disabled={loadingUserId === user.id}
                        onClick={async () => {
                          setLoadingUserId(user.id)
                          try {
                            await updateInternalUser({ userId: Number(user.id), isActive: !user.isActive })
                            pushToast({ type: 'info', message: user.isActive ? 'Cuenta pausada.' : 'Cuenta reactivada.' })
                          } finally { setLoadingUserId(null) }
                        }}
                      >
                        {user.isActive ? 'Pausar cuenta' : 'Reactivar cuenta'}
                      </DropdownItem>
                      <DropdownItem
                        danger
                        disabled={loadingUserId === `del-${user.id}`}
                        onClick={async () => {
                          setLoadingUserId(`del-${user.id}`)
                          try {
                            await deleteInternalUser(Number(user.id))
                            pushToast({ type: 'success', message: 'Usuario eliminado.' })
                          } finally { setLoadingUserId(null) }
                        }}
                      >
                        Eliminar usuario
                      </DropdownItem>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No hay usuarios que coincidan con los filtros actuales.
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Staff operativo + Resumen por rol ────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Staff operativo" subtitle="Carga actual y alertas operativas para la sede filtrada.">
          <div className="space-y-3">
            {staffRoster.map((staff) => {
              const workload = workloadMeta(staff.currentLoad)
              return (
                <div key={staff.userId} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{staff.fullName}</p>
                      <p className="text-xs text-gray-500">{staff.site} · {staff.workArea}</p>
                      <p className="text-xs text-gray-500">{staff.workDays.join(', ') || 'Sin días'} · {staff.startTime} – {staff.endTime}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${workload.className}`}>{workload.label}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">Carga activa: {staff.currentLoad}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      className={selectCls}
                      value={selectedAlertTypeByUser[staff.userId] || 'incoming_families'}
                      onChange={(e) => setSelectedAlertTypeByUser((curr) => ({ ...curr, [staff.userId]: e.target.value as (typeof staffAlertOptions)[number]['value'] }))}
                    >
                      {staffAlertOptions.map((opt) => <option key={`${staff.userId}-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <button
                      disabled={loadingUserId === `staff-alert-${staff.userId}`}
                      onClick={async () => {
                        setLoadingUserId(`staff-alert-${staff.userId}`)
                        try {
                          await sendStaffAlertToUser(staff.userId, selectedAlertTypeByUser[staff.userId] || 'incoming_families')
                          pushToast({ type: 'info', message: `Notificación enviada a ${staff.fullName}.` })
                        } finally { setLoadingUserId(null) }
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      Enviar alerta
                    </button>
                  </div>
                </div>
              )
            })}
            {staffRoster.length === 0 && <p className="text-sm text-gray-400">No hay staff operativo para la sede seleccionada.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Resumen por rol" subtitle="Distribución de usuarios según la sede activa.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dirección Ejecutiva</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{executiveUsers.length}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Staff visibles</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{staffUsers.length}</p>
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
            Esta vista respeta la sede activa del sidebar. Si eliges otra sede o "Todas las sedes", verás la distribución real del backend.
          </p>
        </SectionCard>
      </div>

      {/* ── Pending referrals ────────────────────────────────────────────────── */}
      <SectionCard title="Referencias pendientes de activar" subtitle="Activa familias referidas y asígnales una estancia.">
        <div className="space-y-3">
          {pendingReferrals.map((referral) => (
            <div key={referral.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{referral.caregiverName} {referral.familyLastName}</p>
                  <p className="text-xs text-gray-500">{referral.site} · llegada {referral.arrivalDate}</p>
                </div>
                <StatusChip status={referral.status} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[180px_auto]">
                <Input label="Días de estancia" type="number" min="1"
                  value={String(stayDaysByReferral[referral.id] || 3)}
                  onChange={(e) => setStayDaysByReferral((curr) => ({ ...curr, [referral.id]: Number(e.target.value || 3) }))}
                />
                <div className="flex items-end">
                  <Button
                    isLoading={activatingReferralId === referral.id}
                    onClick={async () => {
                      setActivatingReferralId(referral.id)
                      try {
                        const result = await activateReferralFamily(Number(referral.id), stayDaysByReferral[referral.id] || 3)
                        pushToast({ type: 'success', message: `Familia activada: ${result.access.TicketCode} · ${result.access.QrCode} · PIN ${result.generatedPin}${result.automation ? ` · ${result.automation.Message}` : ''}` })
                      } finally { setActivatingReferralId(null) }
                    }}
                  >
                    Activar familia
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {pendingReferrals.length === 0 && <p className="text-sm text-gray-400">No hay referencias pendientes para la sede seleccionada.</p>}
        </div>
      </SectionCard>

      {/* ── Stay automation ──────────────────────────────────────────────────── */}
      <SectionCard title="Automatización de estancias" subtitle="Control de habitaciones, tiempos de residencia y liberación automática.">
        <div className="space-y-3">
          {familyStayAutomation.map((item) => (
            <div key={item.familyId} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{item.caregiverName} {item.familyLastName}</p>
                  <p className="text-xs text-gray-500">{item.site} · llegada {item.arrivalDate} · estancia {item.stayDays} días</p>
                  <p className="text-xs text-gray-500">Salida prevista: {item.plannedCheckoutDate || 'Pendiente'} · Habitación: {item.plannedRoomCode || 'Por asignar'}</p>
                </div>
                <StatusChip status={item.automationStatus} />
              </div>
              <div className="mt-3 rounded-lg bg-white px-4 py-3 text-sm text-gray-600">
                {item.message}
                {item.assignedVolunteerName && <p className="mt-1.5 font-semibold text-gray-800">Voluntario asignado: {item.assignedVolunteerName}</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 3].map((days) => (
                  <button
                    key={days}
                    disabled={loadingUserId === `extend-${days}-${item.familyId}`}
                    onClick={async () => {
                      setLoadingUserId(`extend-${days}-${item.familyId}`)
                      try {
                        await extendFamilyStay(item.familyId, days)
                        pushToast({ type: 'success', message: `Estancia prorrogada ${days} día${days > 1 ? 's' : ''}.` })
                      } finally { setLoadingUserId(null) }
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    Prorrogar {days} día{days > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {familyStayAutomation.length === 0 && <p className="text-sm text-gray-400">No hay automatizaciones activas para la sede seleccionada.</p>}
        </div>
      </SectionCard>

      {/* ── Stay tracking + Departure reminders ─────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setIsStayTrackingOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 text-left"
          >
            <div>
              <h2 className="text-base font-semibold text-gray-900">Seguimiento de estancia</h2>
              <p className="mt-0.5 text-sm text-gray-500">Cada actualización queda guardada con la nueva fecha estimada de salida.</p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isStayTrackingOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStayTrackingOpen && (
            <div className="space-y-4 p-5">
              <input
                value={clinicalSearch}
                onChange={(e) => setClinicalSearch(e.target.value)}
                placeholder="Buscar familia..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
              />
              <div className="space-y-4">
                {filteredFamiliesForClinical.map((family) => {
                  const familyId = Number(family.id)
                  const relatedReferral = admissions.find((a) => a.FamilyId === familyId || a.ReferralId === Number(family.referralId || 0))
                  const familyHistory = clinicalHistory.filter((h) => h.FamilyId === familyId).slice(0, 3)
                  return (
                    <div key={`clinical-${family.id}`} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{family.caregiverName} {family.familyLastName}</p>
                          <p className="text-xs text-gray-500">Salida estimada: {formatReadableDate(family.plannedCheckoutDate)} · estancia {family.stayDays || 3} días</p>
                        </div>
                        <StatusChip status={family.automationStatus || 'Pendiente'} />
                      </div>
                      <div className="mt-3 space-y-3">
                        <Input label="Nueva fecha estimada de salida" type="date"
                          value={clinicalDateByFamily[familyId] || ''}
                          onChange={(e) => setClinicalDateByFamily((curr) => ({ ...curr, [familyId]: e.target.value }))}
                        />
                        <label className="block space-y-1">
                          <span className="text-sm font-semibold text-gray-700">Actualización de estancia</span>
                          <textarea
                            className="min-h-[80px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
                            value={clinicalNoteByFamily[familyId] || ''}
                            onChange={(e) => setClinicalNoteByFamily((curr) => ({ ...curr, [familyId]: e.target.value }))}
                            placeholder="Ejemplo: la estancia se extiende 2 días más por seguimiento operativo."
                          />
                        </label>
                        <button
                          disabled={admissionBusyId === `feedback-${familyId}`}
                          onClick={async () => {
                            if (!authToken || !relatedReferral) return
                            setAdmissionBusyId(`feedback-${familyId}`)
                            try {
                              await updateAdmissionRecord(authToken, {
                                referralId: relatedReferral.ReferralId,
                                action: 'clinical-feedback',
                                familyId,
                                clinicName: originHospitalByReferral[relatedReferral.ReferralId] || relatedReferral.OriginHospital || '',
                                feedbackMessage: clinicalNoteByFamily[familyId] || 'Seguimiento de estancia actualizado.',
                                estimatedCheckoutDate: clinicalDateByFamily[familyId] || null,
                              })
                              setClinicalNoteByFamily((curr) => ({ ...curr, [familyId]: '' }))
                              pushToast({ type: 'success', message: `Seguimiento actualizado para ${family.caregiverName}.` })
                              await refreshConnectedData()
                              await reloadAdmissions()
                            } finally { setAdmissionBusyId(null) }
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                        >
                          Registrar actualización
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {familyHistory.length > 0 ? familyHistory.map((entry) => (
                          <div key={entry.FollowUpId} className="rounded-lg bg-white p-3 text-xs text-gray-600">
                            <p className="font-semibold text-gray-800">{entry.ClinicName || 'Seguimiento'} · {formatReadableDate(entry.RecordedAt)}</p>
                            <p className="mt-0.5">{entry.FeedbackMessage}</p>
                            <p className="mt-1 text-gray-400">Salida previa: {formatReadableDate(entry.PreviousCheckoutDate)} · nueva: {formatReadableDate(entry.EstimatedCheckoutDate)}</p>
                          </div>
                        )) : (
                          <p className="text-xs text-gray-400">Sin movimientos registrados para esta estancia.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredFamiliesForClinical.length === 0 && <p className="text-sm text-gray-400">No hay familias que coincidan con la búsqueda.</p>}
              </div>
            </div>
          )}
        </div>

        <SectionCard title="Salida / recordatorios" subtitle="Detecta partidas próximas y prepara recordatorios para las familias.">
          <div className="space-y-3">
            {departureReminders.map((reminder) => (
              <div key={`departure-${reminder.FamilyId}`} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{reminder.CaregiverName} {reminder.FamilyLastName}</p>
                    <p className="text-xs text-gray-500">{reminder.SiteName} · salida {formatReadableDate(reminder.PlannedCheckoutDate)} · habitación {reminder.RoomCode || 'Por asignar'}</p>
                  </div>
                  <StatusChip status={reminder.DepartureReminderSentAt ? 'Enviado' : 'Por salir'} />
                </div>
                <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-600">{reminder.ReminderMessage}</div>
                <div className="mt-3">
                  <button
                    disabled={admissionBusyId === `reminder-${reminder.FamilyId}`}
                    onClick={async () => {
                      if (!authToken) return
                      setAdmissionBusyId(`reminder-${reminder.FamilyId}`)
                      try {
                        await markDepartureReminderPreparedApi(authToken, reminder.FamilyId)
                        pushToast({ type: 'info', message: 'Recordatorio preparado.' })
                        await reloadAdmissions()
                      } finally { setAdmissionBusyId(null) }
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    Preparar recordatorio
                  </button>
                </div>
              </div>
            ))}
            {departureReminders.length === 0 && <p className="text-sm text-gray-400">No hay salidas próximas para la sede seleccionada.</p>}
          </div>
        </SectionCard>
      </div>

      {/* ── Active family accounts ───────────────────────────────────────────── */}
      <SectionCard title="Cuentas familiares activas" subtitle="Gestión de acceso, PIN y estado de cada familia registrada.">
        <div className="space-y-3">
          {families.map((family) => (
            <div key={family.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(family.id)}`}>
                  {getInitials(`${family.caregiverName} ${family.familyLastName}`)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{family.caregiverName} {family.familyLastName}</p>
                  <p className="text-xs text-gray-500">{family.site} · ticket {family.kioskCode || 'pendiente'} · QR {family.qrCode || 'pendiente'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={familyActionId === `pause-${family.id}`}
                  onClick={async () => {
                    setFamilyActionId(`pause-${family.id}`)
                    try {
                      await setFamilyAccessState(Number(family.id), family.isActive === false ? 'reactivate' : 'pause')
                      pushToast({ type: 'info', message: family.isActive === false ? 'Cuenta familiar reactivada.' : 'Cuenta familiar pausada.' })
                    } finally { setFamilyActionId(null) }
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  {family.isActive === false ? 'Reactivar' : 'Pausar'}
                </button>
                <button
                  disabled={familyActionId === `reset-${family.id}`}
                  onClick={async () => {
                    setFamilyActionId(`reset-${family.id}`)
                    try {
                      const result = await setFamilyAccessState(Number(family.id), 'reset-pin')
                      pushToast({ type: 'success', message: `Nuevo PIN temporal para ${family.caregiverName}: ${result.newPin || 'generado'}` })
                    } finally { setFamilyActionId(null) }
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  Resetear PIN
                </button>
              </div>
            </div>
          ))}
          {families.length === 0 && <p className="text-sm text-gray-400">No hay cuentas familiares activas para la sede seleccionada.</p>}
        </div>
      </SectionCard>
    </div>
  )
}
