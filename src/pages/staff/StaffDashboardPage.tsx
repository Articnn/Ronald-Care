import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

const cards = [
  { key: 'pendingRequestsToday', label: 'Solicitudes pendientes del dia' },
  { key: 'availableVolunteersNow', label: 'Voluntarios disponibles ahora' },
  { key: 'familiesInHouse', label: 'Familias en la sede' },
  { key: 'unassignedTasks', label: 'Tareas sin asignar' },
] as const

export function StaffDashboardPage() {
  const { site, staffDashboard } = useAppState()

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard staff" subtitle={`Resumen operativo en tiempo real para ${site}.`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key} className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-warm-500">{card.label}</p>
            <p className="text-4xl font-black text-warm-900">{staffDashboard[card.key]}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
