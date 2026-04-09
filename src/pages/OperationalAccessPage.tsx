import { ArrowRight, BarChart3, Building2, ClipboardList, ShieldCheck, UserCog, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const accessCards = [
  {
    title: 'Dirección Ejecutiva / Gerente de Sede',
    description: 'Gestión centralizada, alta de usuarios, activación familiar y visión transversal por sede.',
    route: '/admin/login',
    icon: UserCog,
    features: ['Alta de usuarios internos', 'Activación familiar', 'Panel ejecutivo', 'Control por sede'],
    featureIcons: [Users, UserCog, BarChart3, Building2],
    accent: 'border-warm-700',
    iconBg: 'bg-warm-700',
    badge: 'Acceso ejecutivo',
  },
  {
    title: 'Staff',
    subtitle: 'Operación',
    description: 'Recepción, admisiones, ayuda asistida, habitaciones, solicitudes e inventario.',
    route: '/staff/login',
    icon: ShieldCheck,
    features: ['Recepción e inventario', 'Admisiones y espera', 'Solicitudes asistidas', 'Habitaciones'],
    featureIcons: [ClipboardList, Building2, Users, ClipboardList],
    accent: 'border-sky-600',
    iconBg: 'bg-sky-600',
    badge: 'Acceso operativo',
  },
]

export function OperationalAccessPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col justify-center">
      {/* Header */}
      <div className="mb-10 text-center">
        <span className="inline-flex items-center rounded-full border border-warm-200 bg-warm-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-warm-700">
          Acceso interno
        </span>
        <h1 className="mt-3 text-3xl font-bold text-warm-900">Selecciona tu perfil</h1>
        <p className="mt-2 text-base text-warm-600">Inicia sesión para entrar al flujo interno de RonaldCare.</p>
      </div>

      {/* Cards */}
      <div className="mx-auto grid w-full max-w-3xl gap-5 md:grid-cols-2">
        {accessCards.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.title} to={item.route} className="group block">
              <div className={`flex h-full flex-col rounded-xl border-t-4 bg-white p-6 shadow-sm ring-1 ring-gray-200 transition duration-200 group-hover:shadow-md group-hover:ring-warm-200 ${item.accent}`}>
                {/* Icon + badge row */}
                <div className="mb-5 flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.iconBg}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                    {item.badge}
                  </span>
                </div>

                {/* Title */}
                <div className="mb-3">
                  <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
                  <p className="text-sm font-medium text-gray-400">{item.subtitle}</p>
                </div>

                {/* Description */}
                <p className="mb-5 text-sm text-gray-600 leading-relaxed">{item.description}</p>

                {/* Feature list */}
                <ul className="mb-6 space-y-2">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-warm-600 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm font-semibold text-warm-700">Ir al login</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-warm-200 bg-warm-50 text-warm-700 transition group-hover:bg-warm-700 group-hover:text-white group-hover:border-warm-700">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-center text-xs text-warm-400">
        RonaldCare · Sistema interno de operación y gestión de sedes
      </p>
    </div>
  )
}
