import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function HospitalLoginPage() {
  const { authError, isSyncing, loginInternalUser } = useAppState()
  const [email, setEmail] = useState('hospital@ronaldcare.demo')
  const [password, setPassword] = useState('Demo123!')
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader title="Acceso Trabajo Social" subtitle="Solo captura y seguimiento de referencias logísticas." />
      <Card className="space-y-4">
        <Input label="Usuario" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="trabajo.social@hospital.org" />
        <Input label="Contrasena" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" />
        {authError ? <p className="text-sm font-semibold text-red-700">{authError}</p> : null}
        <Button
          fullWidth
          disabled={isSyncing}
          onClick={async () => {
            const nextRole = await loginInternalUser(email, password)
            navigate(nextRole === 'admin' || nextRole === 'superadmin' ? '/admin/panel' : '/hospital/referrals')
          }}
        >
          {isSyncing ? 'Entrando...' : 'Entrar'}
        </Button>
      </Card>
    </div>
  )
}
