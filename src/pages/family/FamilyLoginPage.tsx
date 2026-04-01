import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function FamilyLoginPage() {
  const { authError, isSyncing, loginFamilyUser } = useAppState()
  const [qrCode, setQrCode] = useState('QR-FAM-3481')
  const [pin, setPin] = useState('Family3481!')
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader title="Login familia" subtitle="Acceso opcional desde dispositivo propio." />
      <Card className="space-y-4">
        <Input label="QR" value={qrCode} onChange={(event) => setQrCode(event.target.value)} />
        <Input label="PIN" value={pin} onChange={(event) => setPin(event.target.value)} />
        {authError ? <p className="text-sm font-semibold text-red-700">{authError}</p> : null}
        <Button
          fullWidth
          disabled={isSyncing}
          onClick={async () => {
            await loginFamilyUser(qrCode, pin)
            navigate('/family/status')
          }}
        >
          {isSyncing ? 'Validando...' : 'Ver mi estatus'}
        </Button>
      </Card>
    </div>
  )
}
