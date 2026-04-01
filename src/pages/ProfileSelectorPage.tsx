import { Building2, HandHeart, ShieldCheck, Ticket, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppState } from '../context/AppContext'
import type { Role } from '../types'

const roles: Array<{ role: Role; title: string; description: string; route: string; icon: ReactNode }> = [
  { role: 'hospital', title: 'Hospital / Trabajo Social', description: 'Captura referencias logisticas no clinicas.', route: '/hospital/login', icon: <Building2 className="h-8 w-8" /> },
  { role: 'staff', title: 'Staff / Operacion', description: 'Recepcion, check-in, habitaciones, solicitudes y analitica.', route: '/staff/login', icon: <ShieldCheck className="h-8 w-8" /> },
  { role: 'volunteer', title: 'Voluntariado', description: 'Seguimiento operativo de solicitudes y viajes asignados.', route: '/volunteer/login', icon: <Users className="h-8 w-8" /> },
  { role: 'family', title: 'Familia / Ayuda Asistida', description: 'Solo consulta de estatus, viajes y admision.', route: '/kiosk', icon: <Ticket className="h-8 w-8" /> },
  { role: 'donor', title: 'Donante / Transparencia', description: 'Impacto agregado, historias anonimas y enlace oficial de donacion.', route: '/donor/home', icon: <HandHeart className="h-8 w-8" /> },
]

export function ProfileSelectorPage() {
  const { setRole, setSite, availableSites } = useAppState()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="No clinico"
        title="Selecciona tu rol operativo"
        subtitle="Este prototipo solo gestiona logistica, recepcion, viajes, inventario y transparencia. No guarda diagnosticos, tratamientos ni expedientes."
      />

      <Card className="max-w-sm">
        <label className="block space-y-2">
          <span className="text-base font-semibold text-warm-900">Sede activa</span>
          <select
            className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg text-warm-900"
            defaultValue={availableSites[0]}
            onChange={(event) => setSite(event.target.value)}
          >
            {availableSites.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((item) => (
          <button
            key={item.title}
            className="text-left"
            onClick={() => {
              setRole(item.role)
              navigate(item.route)
            }}
          >
            <Card className="flex h-full flex-col gap-4 border border-warm-100 transition hover:-translate-y-1">
              <div className="flex items-center gap-3 text-warm-800">
                {item.icon}
                <h2 className="text-2xl font-bold">{item.title}</h2>
              </div>
              <p className="text-lg text-warm-700">{item.description}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
