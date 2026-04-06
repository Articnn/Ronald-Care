import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

const userRoles = ['admin', 'staff', 'volunteer'] as const
const volunteerTypes = ['individual', 'escolar', 'empresarial'] as const
const volunteerRoleOptions = ['traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia', 'limpieza'] as const
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

export function AdminPanelPage() {
  const {
    site,
    internalUsers,
    pendingReferrals,
    families,
    staffRoster,
    availableSites,
    createInternalUser,
    updateInternalUser,
    deleteInternalUser,
    activateReferralFamily,
    setFamilyAccessState,
    sendStaffAlertToUser,
  } = useAppState()

  const seedSites = useMemo(() => availableSites.filter((item) => item !== 'Todas las sedes'), [availableSites])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('Demo123!')
  const [role, setRole] = useState<(typeof userRoles)[number]>('staff')
  const [siteId, setSiteId] = useState(1)
  const [selectedWorkDays, setSelectedWorkDays] = useState<string[]>(['Lunes', 'Miercoles', 'Viernes'])
  const [volunteerType, setVolunteerType] = useState<(typeof volunteerTypes)[number]>('individual')
  const [volunteerRole, setVolunteerRole] = useState<(typeof volunteerRoleOptions)[number]>('recepcion')
  const [staffWorkArea, setStaffWorkArea] = useState<(typeof staffWorkAreas)[number]>('recepcion')
  const [profileDay, setProfileDay] = useState('2026-04-06')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('16:00')
  const [shiftLabel, setShiftLabel] = useState<'manana' | 'tarde' | 'noche'>('manana')
  const [generatedAccess, setGeneratedAccess] = useState<string | null>(null)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [activatingReferralId, setActivatingReferralId] = useState<string | null>(null)
  const [familyActionId, setFamilyActionId] = useState<string | null>(null)
  const [siteDrafts, setSiteDrafts] = useState<Record<string, number>>({})
  const [selectedAlertTypeByUser, setSelectedAlertTypeByUser] = useState<Record<number, (typeof staffAlertOptions)[number]['value']>>({})

  const derivedHours = useMemo(() => calculateHours(startTime, endTime), [startTime, endTime])
  const derivedAvailability = useMemo(() => inferAvailability(derivedHours), [derivedHours])

  useEffect(() => {
    setShiftLabel(inferShiftLabel(startTime))
  }, [startTime])

  useEffect(() => {
    const nextDrafts = Object.fromEntries(internalUsers.map((user) => [user.id, user.siteId || 1]))
    setSiteDrafts(nextDrafts)
  }, [internalUsers])

  const staffUsers = useMemo(() => internalUsers.filter((user) => user.role === 'Staff'), [internalUsers])
  const volunteerUsers = useMemo(() => internalUsers.filter((user) => user.role === 'Voluntario'), [internalUsers])

  return (
    <div className="space-y-6">
      <SectionHeader title="Panel de admin" subtitle={`Usuarios internos, activacion familiar y control operativo por sede. Vista filtrada en: ${site}.`} />

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Crear usuario interno</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input label="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Contrasena inicial" value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Rol</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={role} onChange={(event) => setRole(event.target.value as (typeof userRoles)[number])}>
              {userRoles.map((item) => (
                <option key={item} value={item}>
                  {item}
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

        {role === 'staff' || role === 'volunteer' ? (
          <div className="space-y-4 rounded-2xl bg-warm-50 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {role === 'volunteer' ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-warm-900">Tipo de voluntariado</span>
                    <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={volunteerType} onChange={(event) => setVolunteerType(event.target.value as (typeof volunteerTypes)[number])}>
                      {volunteerTypes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-warm-900">Rol de trabajo</span>
                    <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={volunteerRole} onChange={(event) => setVolunteerRole(event.target.value as (typeof volunteerRoleOptions)[number])}>
                      {volunteerRoleOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
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
              )}
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
              {role === 'volunteer' ? <Input label="Dia base de captura" type="date" value={profileDay} onChange={(event) => setProfileDay(event.target.value)} /> : null}
            </div>

            <div className="space-y-2">
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

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-warm-700">Horas registradas automáticas</p>
                <p className="text-2xl font-extrabold text-warm-900">{derivedHours} hrs</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-warm-700">Disponibilidad automática</p>
                <p className="text-2xl font-extrabold text-warm-900">{derivedAvailability}</p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-warm-700">Turno sugerido</p>
                <p className="text-2xl font-extrabold text-warm-900">{shiftLabel}</p>
              </div>
            </div>
          </div>
        ) : null}

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
                volunteerShift:
                  role === 'volunteer'
                    ? {
                        volunteerType,
                        roleName: volunteerRole,
                        shiftDay: profileDay,
                        workDays: selectedWorkDays,
                        startTime,
                        endTime,
                        shiftPeriod: shiftLabel === 'manana' ? 'AM' : 'PM',
                        shiftLabel,
                        availabilityStatus: derivedAvailability === 'Disponible' ? 'disponible' : derivedAvailability === 'Cupo limitado' ? 'cupo_limitado' : 'no_disponible',
                        hoursLogged: derivedHours,
                      }
                    : undefined,
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
            } finally {
              setIsCreatingUser(false)
            }
          }}
        >
          Crear usuario
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Usuarios por sede</h2>
        <p className="text-sm text-warm-700">Desde aqui puedes pausar, eliminar o trasladar usuarios a otra sede. La lista respeta la sede seleccionada en el header.</p>
        <div className="grid gap-3">
          {internalUsers.map((user) => (
            <div key={user.id} className="rounded-2xl bg-warm-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-warm-900">{user.fullName}</p>
                  <p className="text-sm text-warm-700">{user.email} · {user.role} · {user.site || 'Global'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    isLoading={loadingUserId === user.id}
                    onClick={async () => {
                      setLoadingUserId(user.id)
                      try {
                        await updateInternalUser({ userId: Number(user.id), isActive: !user.isActive })
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
                      } finally {
                        setLoadingUserId(null)
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-warm-900">Trasladar a sede</span>
                  <select
                    className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-base"
                    value={siteDrafts[user.id] || user.siteId || 1}
                    onChange={(event) => setSiteDrafts((current) => ({ ...current, [user.id]: Number(event.target.value) }))}
                  >
                    {seedSites.map((item, index) => (
                      <option key={`${user.id}-${item}`} value={index + 1}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    isLoading={loadingUserId === `move-${user.id}`}
                    disabled={(siteDrafts[user.id] || user.siteId || 1) === (user.siteId || 1)}
                    onClick={async () => {
                      setLoadingUserId(`move-${user.id}`)
                      try {
                        await updateInternalUser({ userId: Number(user.id), siteId: siteDrafts[user.id] || user.siteId || 1 })
                      } finally {
                        setLoadingUserId(null)
                      }
                    }}
                  >
                    Guardar sede
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
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

        <Card className="space-y-4">
          <h2 className="text-xl font-bold text-warm-900">Resumen rapido por rol</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="text-sm font-semibold text-warm-700">Staff visibles</p>
              <p className="text-3xl font-extrabold text-warm-900">{staffUsers.length}</p>
            </div>
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="text-sm font-semibold text-warm-700">Voluntarios visibles</p>
              <p className="text-3xl font-extrabold text-warm-900">{volunteerUsers.length}</p>
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
              <div className="mt-3">
                <Button
                  isLoading={activatingReferralId === referral.id}
                  onClick={async () => {
                    setActivatingReferralId(referral.id)
                    try {
                      const result = await activateReferralFamily(Number(referral.id))
                      setGeneratedAccess(`Familia activada: ${result.access.TicketCode} · ${result.access.QrCode} · PIN ${result.generatedPin}`)
                    } finally {
                      setActivatingReferralId(null)
                    }
                  }}
                >
                  Activar familia
                </Button>
              </div>
            </div>
          ))}
        </div>
        {generatedAccess ? <p className="rounded-2xl bg-gold-100 p-4 font-semibold text-warm-900">{generatedAccess}</p> : null}
      </Card>

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
                      setGeneratedAccess(`Nuevo PIN temporal para ${family.caregiverName}: ${result.newPin || 'generado'}`)
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
