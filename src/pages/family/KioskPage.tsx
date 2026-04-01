import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function KioskPage() {
  const {
    authError,
    clearKioskStatus,
    easyRead,
    isSyncing,
    kioskStatus,
    lookupFamilyStatus,
    toggleEasyRead,
    setCurrentFamily,
    setRole,
  } = useAppState()
  const [code, setCode] = useState('TKT-3481')
  const navigate = useNavigate()
  const family = kioskStatus?.family || null
  const familyRequests = kioskStatus?.requests || []
  const familyTrips = kioskStatus?.trips || []

  return (
    <div className={`mx-auto max-w-3xl space-y-5 ${easyRead ? 'text-xl' : ''}`}>
      <SectionHeader title="Kiosko familiar" subtitle="Consulta minima de admision, solicitudes y viajes. Sin datos clinicos." />
      <div className="flex flex-wrap gap-3">
        <button className="rounded-2xl bg-gold-300 px-4 py-2 font-bold text-warm-900" onClick={toggleEasyRead}>
          {easyRead ? 'Vista normal' : 'Lectura facil'}
        </button>
        <button
          disabled={!family}
          className="rounded-2xl bg-warm-700 px-4 py-2 font-bold text-white"
          onClick={() => {
            if (family) {
              setCurrentFamily(family)
              setRole('family')
              navigate('/family/status')
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
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isSyncing}
            onClick={async () => {
              await lookupFamilyStatus(code)
            }}
          >
            {isSyncing ? 'Consultando...' : 'Consultar codigo'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearKioskStatus()
              setCode('')
            }}
          >
            Limpiar
          </Button>
        </div>
        {authError ? <p className="text-sm font-semibold text-red-700">{authError}</p> : null}
        <div className="rounded-2xl bg-warm-50 p-4">
          <p className="font-bold text-warm-900">Admision</p>
          {family ? <StatusChip status={family.admissionStatus} /> : <p className="text-warm-700">Ingresa un codigo para consultar.</p>}
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
