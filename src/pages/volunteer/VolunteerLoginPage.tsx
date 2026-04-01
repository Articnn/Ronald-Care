import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function VolunteerLoginPage() {
  const { setRole } = useAppState()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader title="Login volunteer" subtitle="Permisos limitados para solicitudes y viajes." />
      <Card className="space-y-4">
        <Input label="Usuario" placeholder="volunteer@ronaldcare.org" />
        <Input label="Contrasena" type="password" placeholder="********" />
        <Button
          fullWidth
          onClick={() => {
            setRole('volunteer')
            navigate('/volunteer/requests')
          }}
        >
          Entrar
        </Button>
      </Card>
    </div>
  )
}
