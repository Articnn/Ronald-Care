import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function StaffLoginPage() {
  const { setRole } = useAppState()
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <SectionHeader title="Login staff" subtitle="Recepcion, operacion, inventario y analytics." />
      <Card className="space-y-4">
        <Input label="Usuario" placeholder="staff@ronaldcare.org" />
        <Input label="Contrasena" type="password" placeholder="********" />
        <Button
          fullWidth
          onClick={() => {
            setRole('staff')
            navigate('/staff/reception')
          }}
        >
          Entrar
        </Button>
      </Card>
    </div>
  )
}
