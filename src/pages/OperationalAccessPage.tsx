import { ArrowRight, ShieldCheck, UserCog } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'

const accessCards = [
  {
    title: 'Superadmin / Admin',
    description: 'Coordinación, alta de usuarios, activación familiar y visión transversal por sede.',
    route: '/admin/login',
    icon: <UserCog className="h-8 w-8" />,
  },
  {
    title: 'Staff / Operación',
    description: 'Recepción, entradas, ayuda asistida, habitaciones, solicitudes e inventario.',
    route: '/staff/login',
    icon: <ShieldCheck className="h-8 w-8" />,
  },
]

export function OperationalAccessPage() {
  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Login" title="Acceso operativo" subtitle="Inicia sesión para entrar al flujo interno de RonaldCare." />

      <div className="grid gap-6 md:grid-cols-2">
        {accessCards.map((item) => (
          <Link key={item.title} className="text-left" to={item.route}>
            <Card className="flex h-full flex-col gap-4 border border-warm-100 transition hover:-translate-y-1">
              <div className="flex items-center gap-3 text-warm-800">
                {item.icon}
                <h2 className="text-2xl font-bold">{item.title}</h2>
              </div>
              <p className="text-lg text-warm-700">{item.description}</p>
              <div className="mt-auto inline-flex items-center gap-2 font-semibold text-warm-700">
                Ir al login
                <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
