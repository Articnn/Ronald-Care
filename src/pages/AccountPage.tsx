import { KeyRound, Mail, MapPin, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppState } from '../context/AppContext'

const BRAND = '#950606'

function getInitials(name: string) {
  return name.trim().split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function AccountPage() {
  const { role, currentUser, currentFamily, changeOwnPassword, changeOwnPin, isSyncing } = useAppState()
  const [currentSecret, setCurrentSecret] = useState('')
  const [nextSecret, setNextSecret] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const isFamily = role === 'family'

  const displayName = isFamily
    ? `${currentFamily?.caregiverName ?? ''} ${currentFamily?.familyLastName ?? ''}`.trim()
    : (currentUser?.fullName ?? '')

  const site = currentUser?.siteName ?? currentFamily?.site ?? ''

  async function handleSubmit() {
    if (isFamily) await changeOwnPin(currentSecret, nextSecret)
    else await changeOwnPassword(currentSecret, nextSecret)
    setMessage(isFamily ? 'PIN actualizado correctamente.' : 'Contraseña actualizada correctamente.')
    setCurrentSecret('')
    setNextSecret('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeader
        title="Mi perfil"
        subtitle={
          isFamily
            ? 'Desde aquí puedes cambiar tu PIN confirmando el actual.'
            : 'Desde aquí puedes cambiar tu contraseña confirmando la actual.'
        }
      />

      {/* Tarjeta de perfil */}
      <Card className="overflow-hidden p-0">
        {/* Banda de color superior */}
        <div className="h-2 w-full" style={{ backgroundColor: BRAND }} />

        <div className="flex flex-wrap items-center gap-4 p-5">
          {/* Avatar con iniciales */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm"
            style={{ backgroundColor: BRAND }}
          >
            {getInitials(displayName) || <User className="h-6 w-6" />}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="truncate text-2xl font-bold text-warm-900">{displayName || '—'}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {!isFamily && currentUser?.email && (
                <span className="flex items-center gap-1.5 text-sm text-warm-600">
                  <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND }} />
                  {currentUser.email}
                </span>
              )}
              {site && (
                <span className="flex items-center gap-1.5 text-sm text-warm-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND }} />
                  {site}
                </span>
              )}
              {role && (
                <span className="flex items-center gap-1.5 text-sm text-warm-600">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND }} />
                  {role}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Formulario cambio de contraseña / PIN */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
          <p className="text-base font-bold text-warm-900">
            {isFamily ? 'Cambiar PIN' : 'Cambiar contraseña'}
          </p>
        </div>

        <Input
          label={isFamily ? 'PIN actual' : 'Contraseña actual'}
          type="password"
          value={currentSecret}
          onChange={(e) => { setCurrentSecret(e.target.value); setMessage(null) }}
        />
        <Input
          label={isFamily ? 'Nuevo PIN' : 'Nueva contraseña'}
          type="password"
          value={nextSecret}
          onChange={(e) => { setNextSecret(e.target.value); setMessage(null) }}
        />

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        <Button
          disabled={isSyncing || !currentSecret || !nextSecret}
          onClick={handleSubmit}
        >
          {isSyncing ? 'Guardando...' : isFamily ? 'Actualizar PIN' : 'Actualizar contraseña'}
        </Button>
      </Card>
    </div>
  )
}
