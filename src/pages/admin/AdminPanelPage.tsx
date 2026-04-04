import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

const userRoles = ['admin', 'staff', 'volunteer'] as const

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
  const [generatedAccess, setGeneratedAccess] = useState<string | null>(null)

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
        <Button
          onClick={async () => {
            await createInternalUser({ fullName, email, role, siteId, password })
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
