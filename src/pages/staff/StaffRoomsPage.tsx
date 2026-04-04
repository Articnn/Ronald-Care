import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function StaffRoomsPage() {
  const { rooms, referrals } = useAppState()
  const expected = referrals.filter((referral) => referral.status === 'Aceptada')

  return (
    <div className="space-y-6">
      <SectionHeader title="Room planning" subtitle="Habitaciones, ocupacion y familias esperadas por referencias aceptadas." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rooms.map((room) => (
          <Card key={room.id} className="space-y-3">
            <h2 className="text-xl font-bold text-warm-900">{room.label}</h2>
            <p className="text-warm-700">{room.site}</p>
            <div className="h-3 rounded-full bg-warm-100">
              <div className="h-3 rounded-full bg-warm-700" style={{ width: `${(room.occupied / room.capacity) * 100}%` }} />
            </div>
            <p className="text-lg font-semibold text-warm-800">{room.occupied}/{room.capacity} ocupadas</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Ingresos esperados</h2>
        {expected.map((referral) => (
          <div key={referral.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
            <p className="font-semibold text-warm-800">{referral.id} · {referral.site} · {referral.arrivalDate}</p>
            <StatusChip status={referral.status} />
          </div>
        ))}
      </Card>
    </div>
  )
}
