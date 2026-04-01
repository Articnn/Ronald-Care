import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function FamilyLoginPage() {
  const { families, setCurrentFamily, setRole } = useAppState()
  const [qrCode, setQrCode] = useState('QR-FAM-3481')
  const [pin, setPin] = useState('3481')
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader title="Login familia" subtitle="Acceso opcional desde dispositivo propio." />
      <Card className="space-y-4">
        <Input label="QR" value={qrCode} onChange={(event) => setQrCode(event.target.value)} />
        <Input label="PIN" value={pin} onChange={(event) => setPin(event.target.value)} />
        <Button
          fullWidth
          onClick={() => {
            const match = families.find((item) => item.qrCode === qrCode && item.pin === pin)
            if (match) {
              setCurrentFamily(match)
              setRole('family')
              navigate('/family/status')
            }
          }}
        >
          Ver mi estatus
        </Button>
      </Card>
    </div>
  )
}
