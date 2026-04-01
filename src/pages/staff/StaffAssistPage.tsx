import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function StaffAssistPage() {
  const { families, referrals, requests, trips } = useAppState()
  const [code, setCode] = useState('TKT-3481')

  const family = useMemo(() => families.find((item) => item.kioskCode === code), [code, families])
  const referral = referrals.find((item) => item.ticketCode === code)
  const familyRequests = requests.filter((item) => item.familyId === family?.id)
  const familyTrips = trips.filter((item) => item.familyId === family?.id)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Ayuda asistida para familias"
        subtitle="Consulta asistida por codigo en menos de 30 segundos para admision, solicitudes y transporte."
      />
      <Card className="space-y-4">
        <Input label="Codigo familia o ticket" value={code} onChange={(event) => setCode(event.target.value)} />
        <div className="rounded-2xl bg-warm-50 p-4">
          <p className="mb-2 font-bold text-warm-900">Admision</p>
          {family ? <StatusChip status={family.admissionStatus} /> : referral ? <StatusChip status="Pendiente" /> : <p className="text-warm-700">Codigo no encontrado.</p>}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Solicitudes</h2>
          {familyRequests.length === 0 ? <p className="text-warm-700">Sin solicitudes visibles.</p> : null}
          {familyRequests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
              <p className="font-semibold text-warm-800">{request.title}</p>
              <StatusChip status={request.status} />
            </div>
          ))}
        </Card>
        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-warm-900">Transporte</h2>
          {familyTrips.length === 0 ? <p className="text-warm-700">Sin viajes visibles.</p> : null}
          {familyTrips.map((trip) => (
            <div key={trip.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
              <div>
                <p className="font-semibold text-warm-800">{trip.destination}</p>
                <p className="text-sm text-warm-600">Turno {trip.shift}</p>
              </div>
              <StatusChip status={trip.status} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
