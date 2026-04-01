import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function FamilyStatusPage() {
  const { currentFamily, requests, trips } = useAppState()
  const family = currentFamily
  const ownRequests = requests.filter((item) => item.familyId === family?.id)
  const ownTrips = trips.filter((item) => item.familyId === family?.id)

  return (
    <div className="space-y-5">
      <SectionHeader title="Mi estatus" subtitle="Solo informacion operativa visible para familia." />
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">{family?.caregiverName} {family?.familyLastName}</h2>
        <p className="text-warm-700">Habitacion {family?.room}</p>
        {family ? <StatusChip status={family.admissionStatus} /> : null}
      </Card>
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Solicitudes</h2>
        {ownRequests.map((request) => (
          <div key={request.id} className="flex items-center justify-between rounded-2xl bg-warm-50 p-4">
            <p className="font-semibold text-warm-800">{request.title}</p>
            <StatusChip status={request.status} />
          </div>
        ))}
      </Card>
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Viajes</h2>
        {ownTrips.map((trip) => (
          <div key={trip.id} className="flex items-center justify-between rounded-2xl bg-warm-50 p-4">
            <p className="font-semibold text-warm-800">{trip.destination}</p>
            <StatusChip status={trip.status} />
          </div>
        ))}
      </Card>
    </div>
  )
}
