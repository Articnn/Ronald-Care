import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

const userRoles = ['admin', 'staff', 'volunteer'] as const
const volunteerTypes = ['individual', 'escolar', 'empresarial'] as const
const volunteerRoleOptions = ['traslados', 'recepcion', 'acompanamiento', 'cocina', 'lavanderia'] as const
const volunteerAvailabilityOptions = ['disponible', 'cupo_limitado', 'no_disponible'] as const
const weekDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'] as const

function inferShiftLabel(startTime: string) {
  const hour = Number(startTime.split(':')[0] || 8)
  if (hour >= 18) return 'noche' as const
  if (hour >= 13) return 'tarde' as const
  return 'manana' as const
}

export function AdminPanelPage() {
  const {
    internalUsers,
    pendingReferrals,
    families,
    availableSites,
    createInternalUser,
    updateInternalUser,
    deleteInternalUser,
    activateReferralFamily,
    setFamilyAccessState,
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
  const [volunteerShiftDay, setVolunteerShiftDay] = useState('2026-04-04')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('14:00')
  const [volunteerShiftPeriod, setVolunteerShiftPeriod] = useState<'AM' | 'PM'>('AM')
  const [shiftLabel, setShiftLabel] = useState<'manana' | 'tarde' | 'noche'>('manana')
  const [volunteerAvailability, setVolunteerAvailability] = useState<(typeof volunteerAvailabilityOptions)[number]>('disponible')
  const [volunteerHours, setVolunteerHours] = useState('6')
  const [generatedAccess, setGeneratedAccess] = useState<string | null>(null)

  useEffect(() => {
    const inferred = inferShiftLabel(startTime)
    setShiftLabel(inferred)
    setVolunteerShiftPeriod(inferred === 'manana' ? 'AM' : 'PM')
  }, [startTime])

  return (
    <div className="space-y-6">
      <SectionHeader title="Panel de admin" subtitle="Usuarios internos, activación familiar y control operativo por sede." />

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

        {role === 'volunteer' ? (
          <div className="space-y-4 rounded-2xl bg-warm-50 p-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              <Input label="Hora de inicio" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              <Input label="Hora de fin" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Turno</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={shiftLabel} onChange={(event) => setShiftLabel(event.target.value as 'manana' | 'tarde' | 'noche')}>
                  <option value="manana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
              </label>
              <Input label="Dia base de captura" type="date" value={volunteerShiftDay} onChange={(event) => setVolunteerShiftDay(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Disponibilidad</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={volunteerAvailability} onChange={(event) => setVolunteerAvailability(event.target.value as (typeof volunteerAvailabilityOptions)[number])}>
                  {volunteerAvailabilityOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Horas registradas" type="number" min="0" step="0.5" value={volunteerHours} onChange={(event) => setVolunteerHours(event.target.value)} />
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
                        setSelectedWorkDays((current) =>
                          event.target.checked ? [...current, day] : current.filter((item) => item !== day),
                        )
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <Button
          onClick={async () => {
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
                      shiftDay: volunteerShiftDay,
                      workDays: selectedWorkDays,
                      startTime,
                      endTime,
                      shiftPeriod: volunteerShiftPeriod,
                      shiftLabel,
                      availabilityStatus: volunteerAvailability,
                      hoursLogged: Number(volunteerHours || 0),
                    }
                  : undefined,
            })
            setFullName('')
            setEmail('')
            setPassword('Demo123!')
          }}
        >
          Crear usuario
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Usuarios por sede</h2>
        <div className="grid gap-3">
          {internalUsers.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
              <div>
                <p className="font-bold text-warm-900">{user.fullName}</p>
                <p className="text-sm text-warm-700">{user.email} · {user.role} · {user.site || 'Global'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={async () => updateInternalUser({ userId: Number(user.id), isActive: !user.isActive })}>
                  {user.isActive ? 'Pausar' : 'Reactivar'}
                </Button>
                <Button variant="secondary" onClick={async () => deleteInternalUser(Number(user.id))}>Eliminar</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
                  onClick={async () => {
                    const result = await activateReferralFamily(Number(referral.id))
                    setGeneratedAccess(`Familia activada: ${result.access.TicketCode} · ${result.access.QrCode} · PIN ${result.generatedPin}`)
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
                <Button variant="ghost" onClick={async () => setFamilyAccessState(Number(family.id), family.isActive === false ? 'reactivate' : 'pause')}>
                  {family.isActive === false ? 'Reactivar' : 'Pausar'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const result = await setFamilyAccessState(Number(family.id), 'reset-pin')
                    setGeneratedAccess(`Nuevo PIN temporal para ${family.caregiverName}: ${result.newPin || 'generado'}`)
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
