import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function FamilyLoginPage() {
  const { authError, isSyncing, loginFamilyUser } = useAppState()
  const [qrCode, setQrCode] = useState('')
  const [pin, setPin] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qrToken = searchParams.get('qr_token') ?? ''
  const hasQrToken = qrToken.length > 0

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader
        title="Acceso familiar"
        subtitle={hasQrToken ? 'Ingresa tu PIN para ver tu estatus.' : 'Ingresa tu código QR y PIN para continuar.'}
      />
      <Card className="space-y-4">
        {!hasQrToken && (
          <Input label="Código QR" value={qrCode} onChange={(event) => setQrCode(event.target.value)} />
        )}
        <Input label="PIN" type="password" value={pin} onChange={(event) => setPin(event.target.value)} />
        {authError ? <p className="text-sm font-semibold text-red-700">{authError}</p> : null}
        <Button
          fullWidth
          isLoading={isSyncing}
          onClick={async () => {
            try {
              await loginFamilyUser(hasQrToken ? qrToken : qrCode, pin)
              navigate('/family/status')
            } catch {
              // authError is set by loginFamilyUser
            }
          }}
        >
          Ver mi estatus
        </Button>
      </Card>
    </div>
  )
}
