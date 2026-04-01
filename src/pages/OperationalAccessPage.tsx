import { ArrowRight, Building2, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppState } from '../context/AppContext'
import type { Role } from '../types'

const operationalRoles: Array<{
  role: Role
  title: string
  description: string
  route: string
  icon: ReactNode
}> = [
  {
    role: 'hospital',
    title: 'Hospital / Trabajo Social',
    description: 'Captura referencias logísticas no clínicas y da seguimiento al estado de admisión.',
    route: '/hospital/login',
    icon: <Building2 className="h-8 w-8" />,
  },
  {
    role: 'staff',
    title: 'Staff / Operación',
    description: 'Gestiona recepción, check-in, habitaciones, solicitudes, viajes, inventario y ayuda asistida.',
    route: '/staff/login',
    icon: <ShieldCheck className="h-8 w-8" />,
  },
  {
    role: 'volunteer',
    title: 'Voluntariado',
    description: 'Consulta solicitudes y viajes asignados con permisos operativos limitados.',
    route: '/volunteer/login',
    icon: <Users className="h-8 w-8" />,
  },
]

export function OperationalAccessPage() {
  const { setRole } = useAppState()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Acceso operativo"
        title="Selecciona tu tipo de acceso interno"
        subtitle="Solo personal autorizado puede entrar a hospital, staff y voluntariado. Donantes y familias usan accesos separados."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {operationalRoles.map((item) => (
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
              <div className="mt-auto inline-flex items-center gap-2 font-semibold text-warm-700">
                Ir al acceso
                <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
