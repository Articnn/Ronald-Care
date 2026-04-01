import { ArrowRight, HandHeart, ShieldCheck, Smartphone, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useAppState } from '../context/AppContext'

const entryPoints = [
  {
    title: 'Acceso operativo',
    description: 'Entrada para hospital, staff y voluntariado. Cada rol ve solo sus módulos internos.',
    route: '/access',
    icon: <ShieldCheck className="h-8 w-8" />,
    badge: 'Interno',
  },
  {
    title: 'Kiosko familiar',
    description: 'Consulta rápida por código familia/ticket para admisión, solicitudes y viajes sin datos clínicos.',
    route: '/kiosk',
    icon: <Ticket className="h-8 w-8" />,
    badge: 'Público asistido',
  },
  {
    title: 'Donantes y transparencia',
    description: 'Impacto agregado, historias anónimas y enlace oficial de donación sin necesidad de login.',
    route: '/donor/home',
    icon: <HandHeart className="h-8 w-8" />,
    badge: 'Público',
  },
]

export function ProfileSelectorPage() {
  const { setRole, setSite, availableSites } = useAppState()

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="No clinico"
        title="RonaldCare Ops Suite"
        subtitle="Plataforma operativa no clínica para recepción, alojamiento, viajes, inventario y transparencia. No guarda diagnósticos, tratamientos ni expedientes."
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

      <div className="grid gap-4 xl:grid-cols-3">
        {entryPoints.map((item) => (
          <Link key={item.title} className="text-left" to={item.route} onClick={() => setRole(null)}>
            <Card className="flex h-full flex-col gap-4 border border-warm-100 transition hover:-translate-y-1">
              <div className="flex items-center gap-3 text-warm-800">
                {item.icon}
                <h2 className="text-2xl font-bold">{item.title}</h2>
              </div>
              <span className="w-fit rounded-full bg-warm-100 px-3 py-1 text-sm font-bold uppercase tracking-[0.14em] text-warm-700">
                {item.badge}
              </span>
              <p className="text-lg text-warm-700">{item.description}</p>
              <div className="mt-auto inline-flex items-center gap-2 font-semibold text-warm-700">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="space-y-3">
          <h2 className="text-2xl font-bold text-warm-900">Cómo se entra a la app</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">Hospital / Staff / Voluntariado</p>
              <p className="mt-2 text-warm-700">Ingresan por acceso operativo con login interno y menú restringido por rol.</p>
            </div>
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">Familias</p>
              <p className="mt-2 text-warm-700">Usan kiosko por ticket o QR + PIN desde su celular cuando tienen dispositivo.</p>
            </div>
            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="font-bold text-warm-900">Donantes</p>
              <p className="mt-2 text-warm-700">Ven transparencia pública sin registro ni datos personales identificables.</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3 text-warm-800">
            <Smartphone className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Portal familiar opcional</h2>
          </div>
          <p className="text-lg text-warm-700">
            Si la familia sí cuenta con teléfono, puede entrar desde su QR + PIN sin depender del kiosko.
          </p>
          <Link
            to="/family/login"
            onClick={() => setRole(null)}
            className="inline-flex items-center gap-2 rounded-2xl bg-warm-700 px-5 py-3 text-lg font-bold text-white"
          >
            Entrar como familia
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  )
}
