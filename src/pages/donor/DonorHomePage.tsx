import { HeartHandshake, MapPinned } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function DonorHomePage() {
  const { donorImpactBySite } = useAppState()
  const totals = donorImpactBySite.reduce(
    (acc, item) => {
      acc.events += item.impactEvents
      acc.families += item.familiesSupported
      acc.trips += item.totalTrips
      acc.requests += item.totalRequests
      return acc
    },
    { events: 0, families: 0, trips: 0, requests: 0 },
  )

  return (
    <div className="space-y-6">
      <SectionHeader title="Impacto agregado por sede" subtitle="Latidos reales como metas operativas del dia, sin PII." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Eventos de impacto" value={`${totals.events}`} caption="Eventos públicos agregados." icon={<HeartHandshake className="h-5 w-5" />} />
        <MetricCard title="Viajes registrados" value={`${totals.trips}`} caption="Movilidad completada o en curso." icon={<MapPinned className="h-5 w-5" />} />
        <MetricCard title="Solicitudes visibles" value={`${totals.requests}`} caption="Panorama operativo agregado." icon={<HeartHandshake className="h-5 w-5" />} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {donorImpactBySite.map((item) => (
          <Card key={item.name} className="space-y-2">
            <h2 className="text-xl font-bold text-warm-900">{item.name}</h2>
            <p className="text-3xl font-extrabold text-warm-800">{item.familiesSupported}</p>
            <p className="text-warm-700">Familias atendidas en agregado</p>
          </Card>
        ))}
      </div>
      <Link className="inline-flex rounded-2xl bg-warm-700 px-5 py-3 text-lg font-bold text-white" to="/donor/donate">
        Ver enlace oficial de donacion
      </Link>
    </div>
  )
}
