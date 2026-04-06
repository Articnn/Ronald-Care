import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { Button } from '../../components/ui/Button'
import { useAppState } from '../../context/AppContext'

export function VolunteerTripsPage() {
  const { currentUser, trips, startTrip, finishTrip } = useAppState()
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null)
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
              {trip.status === 'Pendiente' ? <Button variant="ghost" isLoading={loadingTripId === trip.id} onClick={async () => { setLoadingTripId(trip.id); try { await startTrip(trip.id) } finally { setLoadingTripId(null) } }}>Iniciar</Button> : null}
              {trip.status === 'En curso' ? <Button variant="secondary" isLoading={loadingTripId === trip.id} onClick={async () => { setLoadingTripId(trip.id); try { await finishTrip(trip.id) } finally { setLoadingTripId(null) } }}>Finalizar</Button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
