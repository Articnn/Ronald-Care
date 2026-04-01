import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function StaffTripsPage() {
  const { site, families, trips, createTrip, startTrip, finishTrip } = useAppState()
  const [familyId, setFamilyId] = useState(families[0]?.id || '')
  const [destination, setDestination] = useState('Hospital Infantil')
  const [assignedTo, setAssignedTo] = useState('Carlos R.')
  const [shift, setShift] = useState<'AM' | 'PM'>('AM')

  return (
    <div className="space-y-6">
      <SectionHeader title="Trip Tracker" subtitle="Crear viaje, iniciar, finalizar y calcular duracion." />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Familia</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={familyId} onChange={(event) => setFamilyId(event.target.value)}>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.caregiverName} {family.familyLastName}
                </option>
              ))}
            </select>
          </label>
          <Input label="Destino" value={destination} onChange={(event) => setDestination(event.target.value)} />
          <Input label="Asignado a" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className={`rounded-2xl px-4 py-2 font-bold ${shift === 'AM' ? 'bg-gold-500 text-warm-900' : 'bg-gold-100 text-warm-800'}`} onClick={() => setShift('AM')}>
            Turno AM
          </button>
          <button className={`rounded-2xl px-4 py-2 font-bold ${shift === 'PM' ? 'bg-gold-500 text-warm-900' : 'bg-gold-100 text-warm-800'}`} onClick={() => setShift('PM')}>
            Turno PM
          </button>
        </div>
        <Button onClick={() => createTrip({ site, familyId, destination, assignedTo, shift })}>Crear viaje</Button>
      </Card>
      <div className="grid gap-4">
        {trips.map((trip) => (
          <Card key={trip.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-warm-900">{trip.destination}</h2>
                <p className="text-warm-700">{trip.assignedTo} · {trip.site} · turno {trip.shift}</p>
              </div>
              <StatusChip status={trip.status} />
            </div>
            <p className="text-warm-700">Duracion: {trip.durationMinutes ? `${trip.durationMinutes} min` : 'Sin finalizar'}</p>
            <div className="flex flex-wrap gap-2">
              {trip.status === 'Pendiente' ? <Button variant="ghost" onClick={() => startTrip(trip.id)}>Iniciar viaje</Button> : null}
              {trip.status === 'En curso' ? <Button variant="secondary" onClick={() => finishTrip(trip.id)}>Finalizar viaje</Button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
