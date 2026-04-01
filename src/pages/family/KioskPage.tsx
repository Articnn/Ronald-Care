import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function KioskPage() {
  const { easyRead, families, referrals, requests, trips, toggleEasyRead, setCurrentFamily, setRole } = useAppState()
  const [code, setCode] = useState('TKT-3481')
  const family = useMemo(() => families.find((item) => item.kioskCode === code), [code, families])
  const referral = referrals.find((item) => item.ticketCode === code)
  const familyRequests = requests.filter((item) => item.familyId === family?.id)
  const familyTrips = trips.filter((item) => item.familyId === family?.id)

  return (
    <div className={`mx-auto max-w-3xl space-y-5 ${easyRead ? 'text-xl' : ''}`}>
      <SectionHeader title="Kiosko familiar" subtitle="Consulta minima de admision, solicitudes y viajes. Sin datos clinicos." />
      <div className="flex flex-wrap gap-3">
        <button className="rounded-2xl bg-gold-300 px-4 py-2 font-bold text-warm-900" onClick={toggleEasyRead}>
          {easyRead ? 'Vista normal' : 'Lectura facil'}
        </button>
        <button
          className="rounded-2xl bg-warm-700 px-4 py-2 font-bold text-white"
          onClick={() => {
            if (family) {
              setCurrentFamily(family)
              setRole('family')
            }
          }}
        >
          Continuar como Familia
        </button>
        <Link to="/family/login" className="rounded-2xl border border-warm-300 px-4 py-2 font-bold text-warm-800">
          Entrar con QR + PIN
        </Link>
      </div>
      <Card className="space-y-4">
        <Input label="Codigo familia/ticket" value={code} onChange={(event) => setCode(event.target.value)} />
        <div className="rounded-2xl bg-warm-50 p-4">
          <p className="font-bold text-warm-900">Admision</p>
          {family ? <StatusChip status={family.admissionStatus} /> : referral ? <StatusChip status="Pendiente" /> : <p className="text-warm-700">Codigo no encontrado.</p>}
        </div>
      </Card>

      {family ? (
        <>
          <Card className="space-y-3">
            <h2 className="text-xl font-bold text-warm-900">Solicitudes</h2>
            {familyRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
                <p className="font-semibold text-warm-800">{request.title}</p>
                <StatusChip status={request.status} />
              </div>
            ))}
          </Card>
          <Card className="space-y-3">
            <h2 className="text-xl font-bold text-warm-900">Viajes</h2>
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
        </>
      ) : null}
    </div>
  )
}
