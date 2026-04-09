import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
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
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [activatingReferralId, setActivatingReferralId] = useState<string | null>(null)
  const [familyActionId, setFamilyActionId] = useState<string | null>(null)
  const [siteDrafts, setSiteDrafts] = useState<Record<string, number>>({})
  const [selectedAlertTypeByUser, setSelectedAlertTypeByUser] = useState<Record<number, (typeof staffAlertOptions)[number]['value']>>({})
  const [stayDaysByReferral, setStayDaysByReferral] = useState<Record<string, number>>({})
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([])
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryRecord[]>([])
  const [departureReminders, setDepartureReminders] = useState<DepartureReminderRecord[]>([])
  const [admissionBusyId, setAdmissionBusyId] = useState<string | null>(null)
  const [originHospitalByReferral, setOriginHospitalByReferral] = useState<Record<number, string>>({})
  const [clinicalNoteByFamily, setClinicalNoteByFamily] = useState<Record<number, string>>({})
  const [clinicalDateByFamily, setClinicalDateByFamily] = useState<Record<number, string>>({})
  const [userSearch, setUserSearch] = useState('')
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
    if (familyIds.length === 0) {
      setClinicalHistory([])
      return
    }

    const historyChunks = await Promise.all(familyIds.map((familyId) => getClinicalHistory(authToken, { familyId, siteId: selectedSiteId })))
    setClinicalHistory(historyChunks.flat())
  }

  useEffect(() => {
    setShiftLabel(inferShiftLabel(startTime))
  }, [startTime])

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
        if (familyIds.length === 0) {
          setClinicalHistory([])
          return
        }

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

    return () => {
      active = false
    }
  }, [authToken, selectedSiteId])

  const staffUsers = useMemo(() => internalUsers.filter((user) => user.role === 'Staff'), [internalUsers])
  const executiveUsers = useMemo(() => internalUsers.filter((user) => user.role === 'Admin'), [internalUsers])
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    if (!query) return internalUsers
    return internalUsers.filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(query))
  }, [internalUsers, userSearch])
  const filteredFamiliesForClinical = useMemo(() => {
    const query = clinicalSearch.trim().toLowerCase()
    if (!query) return families
    return families.filter((family) => `${family.caregiverName} ${family.familyLastName}`.toLowerCase().includes(query))
  }, [clinicalSearch, families])

  return (
    <div className="space-y-6">
      <SectionHeader title="Panel ejecutivo" subtitle={`Usuarios internos, activacion familiar y control operativo por sede. Vista filtrada en: ${site}.`} />

      <Card className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-warm-900">Crear usuario interno</h2>
          <p className="text-sm text-warm-700">Organizamos la captura por bloques para que la alta de usuarios sea más clara y menos saturada.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl border border-warm-200 bg-warm-50/70 p-5">
            <div className="border-b border-warm-200 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Información personal</p>
              <h3 className="text-lg font-bold text-warm-900">Datos básicos</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <Input label="Contraseña inicial" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-warm-200 bg-white p-5">
            <div className="border-b border-warm-200 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Sede asignada</p>
              <h3 className="text-lg font-bold text-warm-900">Rol y ubicación</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Rol</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={role} onChange={(event) => setRole(event.target.value as (typeof userRoles)[number])}>
                  {userRoles.map((item) => (
                    <option key={item} value={item}>
                      {item === 'admin' ? 'Gerente de Sede' : 'Staff / Operación'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Sede</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={siteId} onChange={(event) => setSiteId(Number(event.target.value))}>
                  {seedSites.map((item, index) => (
                    <option key={item} value={index + 1}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {role === 'staff' ? (
          <div className="space-y-5 rounded-2xl border border-warm-200 bg-warm-50 p-5">
            <div className="border-b border-warm-200 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Horario laboral</p>
              <h3 className="text-lg font-bold text-warm-900">Perfil operativo</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Area de trabajo</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={staffWorkArea} onChange={(event) => setStaffWorkArea(event.target.value as (typeof staffWorkAreas)[number])}>
                  {staffWorkAreas.map((item) => (
                    <option key={item} value={item}>
                      {formatArea(item)}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Hora de inicio" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              <Input label="Hora de fin" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Turno</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={shiftLabel} onChange={(event) => setShiftLabel(event.target.value as 'manana' | 'tarde' | 'noche')}>
                  <option value="manana">Manana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
              </label>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/80 p-4">
              <p className="text-base font-semibold text-warm-900">Dias de trabajo</p>
              <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
                {weekDays.map((day) => (
                  <label key={day} className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-semibold text-warm-800">
                    <input
                      type="checkbox"
                      checked={selectedWorkDays.includes(day)}
                      onChange={(event) => {
                        setSelectedWorkDays((current) => (event.target.checked ? [...current, day] : current.filter((item) => item !== day)))
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-warm-700">Horas registradas automaticas</p>
                <p className="text-2xl font-extrabold text-warm-900">{derivedHours} hrs</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-warm-700">Disponibilidad automatica</p>
                <p className="text-2xl font-extrabold text-warm-900">{derivedAvailability}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-warm-700">Turno sugerido</p>
                <p className="text-2xl font-extrabold text-warm-900">{shiftLabel}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            isLoading={isCreatingUser}
            onClick={async () => {
              setIsCreatingUser(true)
              try {
                await createInternalUser({
                  fullName,
                  email,
                  role,
                  siteId,
                  password,
                  volunteerShift: undefined,
                  staffProfile:
                    role === 'staff'
                      ? {
                          workArea: staffWorkArea,
                          workDays: selectedWorkDays,
                          startTime,
                          endTime,
                          shiftLabel,
                        }
                      : undefined,
                })
                setFullName('')
                setEmail('')
                setPassword('Demo123!')
                pushToast({ type: 'success', message: 'Usuario interno creado con éxito.' })
              } finally {
                setIsCreatingUser(false)
              }
            }}
          >
            Crear usuario
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Usuarios por sede</h2>
        <p className="text-sm text-warm-700">Desde aqui puedes pausar, eliminar o trasladar usuarios a otra sede. La lista respeta la sede seleccionada en el header.</p>
        <div className="rounded-2xl bg-warm-50 p-3">
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Buscar staff por nombre o correo"
            className="w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-warm-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-warm-50 text-left text-warm-900">
              <tr>
                <th className="px-4 py-3 font-bold">Nombre</th>
                <th className="px-4 py-3 font-bold">Correo</th>
                <th className="px-4 py-3 font-bold">Rol</th>
                <th className="px-4 py-3 font-bold">Sede</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Traslado</th>
                <th className="px-4 py-3 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-warm-100 align-top">
                  <td className="px-4 py-4 font-semibold text-warm-900">{user.fullName}</td>
                  <td className="px-4 py-4 text-warm-700">{user.email}</td>
                  <td className="px-4 py-4 text-warm-700">{user.role}</td>
                  <td className="px-4 py-4 text-warm-700">{user.site || 'Global'}</td>
                  <td className="px-4 py-4 text-warm-700">{user.isActive ? 'Activo' : 'Pausado'}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <select
                        className="w-full rounded-2xl border border-warm-200 px-3 py-2 text-sm"
                        value={siteDrafts[user.id] || user.siteId || 1}
                        onChange={(event) => setSiteDrafts((current) => ({ ...current, [user.id]: Number(event.target.value) }))}
                      >
                        {seedSites.map((item, index) => (
                          <option key={`${user.id}-${item}`} value={index + 1}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        isLoading={loadingUserId === `move-${user.id}`}
                        disabled={(siteDrafts[user.id] || user.siteId || 1) === (user.siteId || 1)}
                        onClick={async () => {
                          setLoadingUserId(`move-${user.id}`)
                          try {
                            await updateInternalUser({ userId: Number(user.id), siteId: siteDrafts[user.id] || user.siteId || 1 })
                            pushToast({ type: 'success', message: `Usuario trasladado a ${seedSites[(siteDrafts[user.id] || user.siteId || 1) - 1]}.` })
                          } finally {
                            setLoadingUserId(null)
                          }
                        }}
                      >
                        Guardar
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        isLoading={loadingUserId === user.id}
                        onClick={async () => {
                          setLoadingUserId(user.id)
                          try {
                            await updateInternalUser({ userId: Number(user.id), isActive: !user.isActive })
                            pushToast({ type: 'info', message: user.isActive ? 'Cuenta pausada.' : 'Cuenta reactivada.' })
                          } finally {
                            setLoadingUserId(null)
                          }
                        }}
                      >
                        {user.isActive ? 'Pausar' : 'Reactivar'}
                      </Button>
                      <Button
                        variant="secondary"
                        isLoading={loadingUserId === `del-${user.id}`}
                        onClick={async () => {
                          setLoadingUserId(`del-${user.id}`)
                          try {
                            await deleteInternalUser(Number(user.id))
                            pushToast({ type: 'success', message: 'Usuario eliminado.' })
                          } finally {
                            setLoadingUserId(null)
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">No hay usuarios que coincidan con la búsqueda actual.</div> : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-warm-900">Staff operativo</h2>
          <p className="text-sm text-warm-700">Carga actual y alertas operativas para staff de la sede filtrada.</p>
          <div className="grid gap-3">
            {staffRoster.map((staff) => {
              const workload = workloadMeta(staff.currentLoad)
              return (
                <div key={staff.userId} className="rounded-2xl bg-warm-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-warm-900">{staff.fullName}</p>
                      <p className="text-sm text-warm-700">{staff.site} · {staff.workArea}</p>
                      <p className="text-sm text-warm-700">{staff.workDays.join(', ') || 'Sin dias'} · {staff.startTime} - {staff.endTime}</p>
                      <p className="text-sm font-semibold text-warm-600">{staff.shiftLabel} · {staff.availability}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${workload.className}`}>{workload.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-warm-700">Carga activa: {staff.currentLoad}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-sm"
                      value={selectedAlertTypeByUser[staff.userId] || 'incoming_families'}
                      onChange={(event) =>
                        setSelectedAlertTypeByUser((current) => ({
                          ...current,
                          [staff.userId]: event.target.value as (typeof staffAlertOptions)[number]['value'],
                        }))
                      }
                    >
                      {staffAlertOptions.map((option) => (
                        <option key={`${staff.userId}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      isLoading={loadingUserId === `staff-alert-${staff.userId}`}
                      onClick={async () => {
                        setLoadingUserId(`staff-alert-${staff.userId}`)
                      try {
                        await sendStaffAlertToUser(staff.userId, selectedAlertTypeByUser[staff.userId] || 'incoming_families')
                        pushToast({ type: 'info', message: `Notificación enviada a ${staff.fullName}.` })
                      } finally {
                        setLoadingUserId(null)
                      }
                      }}
                    >
                      Enviar alerta
                    </Button>
                  </div>
                </div>
              )
            })}
            {staffRoster.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay staff operativo cargado para la sede seleccionada.</div> : null}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Resumen rapido por rol</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="text-sm font-semibold text-warm-700">Dirección Ejecutiva</p>
              <p className="text-3xl font-extrabold text-warm-900">{executiveUsers.length}</p>
            </div>
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="text-sm font-semibold text-warm-700">Staff visibles</p>
              <p className="text-3xl font-extrabold text-warm-900">{staffUsers.length}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">
            Esta vista respeta la sede activa del header. Si eliges otra sede o "Todas las sedes", veras la distribucion real que llega desde backend.
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Referencias pendientes de activar</h2>
        <div className="grid gap-3">
          {pendingReferrals.map((referral) => (
            <div key={referral.id} className="rounded-2xl bg-warm-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-warm-900">{referral.caregiverName} {referral.familyLastName}</p>
                  <p className="text-sm text-warm-700">{referral.site} · llegada {referral.arrivalDate}</p>
                </div>
                <StatusChip status={referral.status} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[180px_auto]">
                <Input
                  label="Dias de estancia"
                  type="number"
                  min="1"
                  value={String(stayDaysByReferral[referral.id] || 3)}
                  onChange={(event) =>
                    setStayDaysByReferral((current) => ({ ...current, [referral.id]: Number(event.target.value || 3) }))
                  }
                />
                <div className="flex items-end">
                  <Button
                    isLoading={activatingReferralId === referral.id}
                    onClick={async () => {
                      setActivatingReferralId(referral.id)
                      try {
                        const result = await activateReferralFamily(Number(referral.id), stayDaysByReferral[referral.id] || 3)
                        pushToast({
                          type: 'success',
                          message: `Familia activada: ${result.access.TicketCode} · ${result.access.QrCode} · PIN ${result.generatedPin}${result.automation ? ` · ${result.automation.Message}` : ''}`,
                        })
                      } finally {
                        setActivatingReferralId(null)
                      }
                    }}
                  >
                    Activar familia
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Automatizacion de estancias</h2>
        <p className="text-sm text-warm-700">Buscando habitaciones disponibles, validando el tiempo acordado de residencia y liberando automaticamente cuando termina la estancia si no hubo prorroga.</p>
        <div className="grid gap-3">
          {familyStayAutomation.map((item) => (
            <div key={item.familyId} className="rounded-2xl bg-warm-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-warm-900">{item.caregiverName} {item.familyLastName}</p>
                  <p className="text-sm text-warm-700">{item.site} · llegada {item.arrivalDate} · estancia {item.stayDays} dias</p>
                  <p className="text-sm text-warm-700">Salida prevista: {item.plannedCheckoutDate || 'Pendiente'} · Habitacion: {item.plannedRoomCode || 'Por asignar'}</p>
                </div>
                <StatusChip status={item.automationStatus} />
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-warm-700">
                {item.message}
                {item.assignedVolunteerName ? <p className="mt-2 font-semibold text-warm-900">Voluntario asignado: {item.assignedVolunteerName}</p> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  isLoading={loadingUserId === `extend-1-${item.familyId}`}
                  onClick={async () => {
                    setLoadingUserId(`extend-1-${item.familyId}`)
                    try {
                      await extendFamilyStay(item.familyId, 1)
                      pushToast({ type: 'success', message: 'Estancia prorrogada un día.' })
                    } finally {
                      setLoadingUserId(null)
                    }
                  }}
                >
                  Prorrogar 1 dia
                </Button>
                <Button
                  variant="ghost"
                  isLoading={loadingUserId === `extend-3-${item.familyId}`}
                  onClick={async () => {
                    setLoadingUserId(`extend-3-${item.familyId}`)
                    try {
                      await extendFamilyStay(item.familyId, 3)
                      pushToast({ type: 'success', message: 'Estancia prorrogada tres días.' })
                    } finally {
                      setLoadingUserId(null)
                    }
                  }}
                >
                  Prorrogar 3 dias
                </Button>
              </div>
            </div>
          ))}
          {familyStayAutomation.length === 0 ? (
            <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">
              No hay automatizaciones de estancia activas para la sede seleccionada.
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <button
            type="button"
            onClick={() => setIsStayTrackingOpen((current) => !current)}
            className="flex w-full items-start justify-between gap-4 text-left"
          >
            <div>
              <h2 className="text-xl font-bold text-warm-900">Seguimiento de Estancia</h2>
              <p className="text-sm text-warm-700">Cada actualización de estancia queda guardada con la nueva fecha estimada de salida para no perder el contexto operativo del caso.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-warm-50 px-4 py-2 text-sm font-semibold text-warm-800">
              {isStayTrackingOpen ? 'Ocultar' : 'Mostrar'}
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isStayTrackingOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <div className={`grid overflow-hidden transition-all duration-300 ease-out ${isStayTrackingOpen ? 'max-h-[2600px] gap-4 opacity-100' : 'max-h-0 gap-0 opacity-0'}`}>
            <div className="rounded-2xl bg-warm-50 p-3">
              <input
                value={clinicalSearch}
                onChange={(event) => setClinicalSearch(event.target.value)}
                placeholder="Buscar familia para seguimiento de estancia"
                className="w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
              />
            </div>
            <div className="space-y-4">
            {filteredFamiliesForClinical.map((family) => {
              const familyId = Number(family.id)
              const relatedReferral = admissions.find((item) => item.FamilyId === familyId || item.ReferralId === Number(family.referralId || 0))
              const familyHistory = clinicalHistory.filter((item) => item.FamilyId === familyId).slice(0, 3)

              return (
                <div key={`clinical-${family.id}`} className="rounded-2xl bg-warm-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-warm-900">{family.caregiverName} {family.familyLastName}</p>
                      <p className="text-sm text-warm-700">Salida estimada: {formatReadableDate(family.plannedCheckoutDate)} · estancia {family.stayDays || 3} dias</p>
                    </div>
                    <StatusChip status={family.automationStatus || 'Pendiente'} />
                  </div>

                  <div className="mt-3 grid gap-3">
                    <Input
                      label="Nueva fecha estimada de salida"
                      type="date"
                      value={clinicalDateByFamily[familyId] || ''}
                      onChange={(event) => setClinicalDateByFamily((current) => ({ ...current, [familyId]: event.target.value }))}
                    />
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-warm-900">Actualización de estancia</span>
                      <textarea
                        className="min-h-[100px] w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-base text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                        value={clinicalNoteByFamily[familyId] || ''}
                        onChange={(event) => setClinicalNoteByFamily((current) => ({ ...current, [familyId]: event.target.value }))}
                        placeholder="Ejemplo: la estancia se extiende 2 dias mas por seguimiento operativo."
                      />
                    </label>
                    <Button
                      variant="ghost"
                      isLoading={admissionBusyId === `feedback-${familyId}`}
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
                          setClinicalNoteByFamily((current) => ({ ...current, [familyId]: '' }))
                          pushToast({ type: 'success', message: `Seguimiento actualizado para ${family.caregiverName}.` })
                          await refreshConnectedData()
                          await reloadAdmissions()
                        } finally {
                          setAdmissionBusyId(null)
                        }
                      }}
                    >
                      Registrar actualización
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {familyHistory.length > 0 ? (
                      familyHistory.map((entry) => (
                        <div key={entry.FollowUpId} className="rounded-2xl bg-white p-3 text-sm text-warm-700">
                          <p className="font-semibold text-warm-900">{entry.ClinicName || 'Seguimiento de estancia'} · {formatReadableDate(entry.RecordedAt)}</p>
                          <p>{entry.FeedbackMessage}</p>
                          <p className="mt-1 text-warm-600">Salida previa: {formatReadableDate(entry.PreviousCheckoutDate)} · nueva estimada: {formatReadableDate(entry.EstimatedCheckoutDate)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-white p-3 text-sm text-warm-700">Aun no hay movimientos registrados para esta estancia.</div>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredFamiliesForClinical.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">No hay familias que coincidan con la búsqueda actual.</div> : null}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-warm-900">Salida / recordatorios</h2>
          <p className="text-sm text-warm-700">Servicio listo para detectar partidas proximas y dejar preparado el disparo del recordatorio a familia cuando se integre mensajeria.</p>
          <div className="grid gap-3">
            {departureReminders.map((reminder) => (
              <div key={`departure-${reminder.FamilyId}`} className="rounded-2xl bg-warm-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-warm-900">{reminder.CaregiverName} {reminder.FamilyLastName}</p>
                    <p className="text-sm text-warm-700">{reminder.SiteName} · salida estimada {formatReadableDate(reminder.PlannedCheckoutDate)} · habitacion {reminder.RoomCode || 'Por asignar'}</p>
                  </div>
                  <StatusChip status={reminder.DepartureReminderSentAt ? 'Enviado' : 'Por salir'} />
                </div>
                <div className="mt-2 rounded-2xl bg-white p-3 text-sm text-warm-700">{reminder.ReminderMessage}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    isLoading={admissionBusyId === `reminder-${reminder.FamilyId}`}
                    onClick={async () => {
                      if (!authToken) return
                      setAdmissionBusyId(`reminder-${reminder.FamilyId}`)
                      try {
                        await markDepartureReminderPreparedApi(authToken, reminder.FamilyId)
                        pushToast({ type: 'info', message: 'Recordatorio preparado.' })
                        await reloadAdmissions()
                      } finally {
                        setAdmissionBusyId(null)
                      }
                    }}
                  >
                    Preparar recordatorio
                  </Button>
                </div>
              </div>
            ))}
            {departureReminders.length === 0 ? (
              <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">No hay salidas proximas registradas para la sede seleccionada.</div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Cuentas familiares activas</h2>
        <div className="grid gap-3">
          {families.map((family) => (
            <div key={family.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
              <div>
                <p className="font-bold text-warm-900">{family.caregiverName} {family.familyLastName}</p>
                <p className="text-sm text-warm-700">{family.site} · ticket {family.kioskCode || 'pendiente'} · QR {family.qrCode || 'pendiente'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  isLoading={familyActionId === `pause-${family.id}`}
                  onClick={async () => {
                    setFamilyActionId(`pause-${family.id}`)
                    try {
                      await setFamilyAccessState(Number(family.id), family.isActive === false ? 'reactivate' : 'pause')
                      pushToast({ type: 'info', message: family.isActive === false ? 'Cuenta familiar reactivada.' : 'Cuenta familiar pausada.' })
                    } finally {
                      setFamilyActionId(null)
                    }
                  }}
                >
                  {family.isActive === false ? 'Reactivar' : 'Pausar'}
                </Button>
                <Button
                  variant="secondary"
                  isLoading={familyActionId === `reset-${family.id}`}
                  onClick={async () => {
                    setFamilyActionId(`reset-${family.id}`)
                    try {
                      const result = await setFamilyAccessState(Number(family.id), 'reset-pin')
                      pushToast({ type: 'success', message: `Nuevo PIN temporal para ${family.caregiverName}: ${result.newPin || 'generado'}` })
                    } finally {
                      setFamilyActionId(null)
                    }
                  }}
                >
                  Resetear PIN
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

