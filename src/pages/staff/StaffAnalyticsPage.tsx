import { BarChart3, Clock3, Route, TimerReset } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { calculatePriority } from '../../utils/priority'

export function StaffAnalyticsPage() {
  const { requests, trips, volunteerShifts } = useAppState()
  const avgAssignment = Math.round(
    requests.reduce((total, item) => total + Math.max(8, Math.round(item.waitingMinutes * 0.35)), 0) / requests.length,
  )
  const urgentInSla = requests.filter((item) => item.urgency === 'Alta' && calculatePriority(item).score >= 70).length
  const urgentTotal = requests.filter((item) => item.urgency === 'Alta').length || 1
  const slaPct = Math.round((urgentInSla / urgentTotal) * 100)
  const backlogData = [
    { day: 'Lun', value: 4 },
    { day: 'Mar', value: 6 },
    { day: 'Mie', value: 5 },
    { day: 'Jue', value: 3 },
    { day: 'Vie', value: 4 },
  ]
  const tripData = trips.map((trip) => ({ destination: trip.destination, duration: trip.durationMinutes || 12 }))
  const pieData = [
    { name: 'Urgentes dentro SLA', value: slaPct },
    { name: 'Fuera SLA', value: 100 - slaPct },
  ]
  const shiftCoverage = Math.round(
    (volunteerShifts.filter((item) => item.availability === 'Disponible').length / (volunteerShifts.length || 1)) * 100,
  )
  const amPmData = [
    {
      name: 'AM',
      duration: Math.round(
        trips.filter((trip) => trip.shift === 'AM').reduce((acc, trip) => acc + (trip.durationMinutes || 15), 0) /
          (trips.filter((trip) => trip.shift === 'AM').length || 1),
      ),
    },
    {
      name: 'PM',
      duration: Math.round(
        trips.filter((trip) => trip.shift === 'PM').reduce((acc, trip) => acc + (trip.durationMinutes || 15), 0) /
          (trips.filter((trip) => trip.shift === 'PM').length || 1),
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics operativo" subtitle="Graficas mock derivadas de solicitudes y viajes." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Tiempo promedio asignación" value={`${avgAssignment} min`} caption="Tiempo desde creación hasta toma operativa." icon={<Clock3 className="h-5 w-5" />} />
        <MetricCard title="Backlog activo" value={`${requests.filter((item) => item.status !== 'Resuelta').length}`} caption="Solicitudes no resueltas." icon={<BarChart3 className="h-5 w-5" />} />
        <MetricCard title="Viajes registrados" value={`${trips.length}`} caption="Pendientes, en curso y finalizados." icon={<Route className="h-5 w-5" />} />
        <MetricCard title="% SLA urgentes" value={`${slaPct}%`} caption="Meta operativa de urgentes." icon={<TimerReset className="h-5 w-5" />} />
        <MetricCard title="Cobertura voluntariado" value={`${shiftCoverage}%`} caption="Turnos disponibles vs total." icon={<Clock3 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-80">
          <h2 className="mb-4 text-xl font-bold text-warm-900">Tiempo promedio a asignación</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requests.map((item) => ({ name: item.type, mins: Math.max(8, Math.round(item.waitingMinutes * 0.35)) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="mins" fill="#b93a1f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-80">
          <h2 className="mb-4 text-xl font-bold text-warm-900">Backlog por dia</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={backlogData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f7b733" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-80">
          <h2 className="mb-4 text-xl font-bold text-warm-900">Duracion de viajes por destino</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tripData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="destination" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="duration" fill="#d94f26" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-80">
          <h2 className="mb-4 text-xl font-bold text-warm-900">Comparativa transporte AM vs PM</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={amPmData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="duration" fill="#ca830d" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-80">
          <h2 className="mb-4 text-xl font-bold text-warm-900">% urgentes dentro de SLA</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={index === 0 ? '#b93a1f' : '#ffd86a'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
