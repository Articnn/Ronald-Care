import { HeartHandshake, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function DonorHomePage() {
  const { referrals, requests, trips } = useAppState()

  const sites = [
    {
      name: 'Casa Ronald McDonald Ciudad de Mexico',
      referrals: referrals.filter((item) => item.site === 'Casa Ronald McDonald Ciudad de Mexico').length,
    },
    { name: 'Puebla', referrals: referrals.filter((item) => item.site === 'Puebla').length },
    { name: 'Tlalnepantla', referrals: referrals.filter((item) => item.site === 'Tlalnepantla').length },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Impacto agregado por sede" subtitle="Latidos reales como metas operativas del dia, sin PII." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Solicitudes resueltas" value={`${requests.filter((item) => item.status === 'Resuelta').length}`} caption="Resoluciones agregadas hoy." icon={<HeartHandshake className="h-5 w-5" />} />
        <MetricCard title="Viajes finalizados" value={`${trips.filter((item) => item.status === 'Finalizado').length}`} caption="Movilidad completada." icon={<MapPinned className="h-5 w-5" />} />
        <MetricCard title="Referencias aceptadas" value={`${referrals.filter((item) => item.status === 'Aceptada').length}`} caption="Capacidad operativa confirmada." icon={<HeartHandshake className="h-5 w-5" />} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sites.map((item) => (
          <Card key={item.name} className="space-y-2">
            <h2 className="text-xl font-bold text-warm-900">{item.name}</h2>
            <p className="text-3xl font-extrabold text-warm-800">{item.referrals}</p>
            <p className="text-warm-700">Latidos operativos del dia</p>
          </Card>
        ))}
      </div>
      <Link className="inline-flex rounded-2xl bg-warm-700 px-5 py-3 text-lg font-bold text-white" to="/donor/donate">
        Ver enlace oficial de donacion
      </Link>
    </div>
  )
}
