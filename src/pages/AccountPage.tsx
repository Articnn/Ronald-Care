import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppState } from '../context/AppContext'

export function AccountPage() {
  const { role, currentUser, currentFamily, changeOwnPassword, changeOwnPin, isSyncing } = useAppState()
  const [currentSecret, setCurrentSecret] = useState('')
  const [nextSecret, setNextSecret] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const isFamily = role === 'family'

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <SectionHeader
        title="Mi perfil"
        subtitle={isFamily ? 'Desde aquí puedes cambiar tu PIN confirmando el actual. ¡Asegúrate de recordarlo!' : 'Desde aquí puedes cambiar tu contraseña confirmando la actual. No lo olvides!'}
      />

      <Card className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-warm-600">Cuenta actual</p>
        <h2 className="text-2xl font-bold text-warm-900">
          {isFamily ? `${currentFamily?.caregiverName || ''} ${currentFamily?.familyLastName || ''}`.trim() : currentUser?.fullName}
        </h2>
        {!isFamily ? <p className="text-warm-700">{currentUser?.email}</p> : null}
        <p className="text-warm-700">Sede: {currentUser?.siteName || currentFamily?.site}</p>
      </Card>

      <Card className="space-y-4">
        <Input
          label={isFamily ? 'PIN actual' : 'Contrasenia actual'}
          type="password"
          value={currentSecret}
          onChange={(event) => setCurrentSecret(event.target.value)}
        />
        <Input
          label={isFamily ? 'Nuevo PIN' : 'Nueva contrasenia'}
          type="password"
          value={nextSecret}
          onChange={(event) => setNextSecret(event.target.value)}
        />
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
        <Button
          disabled={isSyncing || !currentSecret || !nextSecret}
          onClick={async () => {
            if (isFamily) await changeOwnPin(currentSecret, nextSecret)
            else await changeOwnPassword(currentSecret, nextSecret)
            setMessage(isFamily ? 'PIN actualizado correctamente.' : 'Contrasena actualizada correctamente.')
            setCurrentSecret('')
            setNextSecret('')
          }}
        >
          {isFamily ? 'Cambiar PIN' : 'Cambiar contrasenia'}
        </Button>
      </Card>
    </div>
  )
}
