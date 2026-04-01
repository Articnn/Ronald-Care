import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function HospitalLoginPage() {
  const { setRole } = useAppState()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader title="Acceso Trabajo Social" subtitle="Solo captura y seguimiento de referencias logisticas." />
      <Card className="space-y-4">
        <Input label="Usuario" placeholder="trabajo.social@hospital.org" />
        <Input label="Contrasena" type="password" placeholder="********" />
        <Button
          fullWidth
          onClick={() => {
            setRole('hospital')
            navigate('/hospital/referrals')
          }}
        >
          Entrar
        </Button>
      </Card>
    </div>
  )
}
