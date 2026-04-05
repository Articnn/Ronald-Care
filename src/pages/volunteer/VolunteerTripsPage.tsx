import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function VolunteerTripsPage() {
  const { currentUser, trips, startTrip, finishTrip } = useAppState()
  const assignedTrips = trips.filter((trip) => trip.assignedTo === currentUser?.fullName)

  return (
    <div className="space-y-5">
      <SectionHeader title="Viajes asignados" subtitle="Solo viajes visibles para voluntariado." />
      <div className="grid gap-4">
        {assignedTrips.map((trip) => (
          <Card key={trip.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-warm-900">{trip.destination}</h2>
              <StatusChip status={trip.status} />
            </div>
            <p className="text-warm-700">Turno {trip.shift} · duracion: {trip.durationMinutes ? `${trip.durationMinutes} min` : 'Sin finalizar'}</p>
            <div className="flex gap-2">
              {trip.status === 'Pendiente' ? <button className="rounded-xl bg-gold-300 px-4 py-2 font-semibold text-warm-900" onClick={async () => startTrip(trip.id)}>Iniciar</button> : null}
              {trip.status === 'En curso' ? <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={async () => finishTrip(trip.id)}>Finalizar</button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
