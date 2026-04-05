import { ClipboardList, MapPin, Route } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { RequestStatus, TripStatus } from '../../types'

const BRAND = '#950606'

const REQUEST_BADGE: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  'Nueva':      { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Nueva' },
  'Asignada':   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Asignada' },
  'En proceso': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En proceso' },
  'Resuelta':   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Resuelta' },
}

const TRIP_BADGE: Record<TripStatus, { bg: string; text: string; label: string }> = {
  'Pendiente':  { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
  'En curso':   { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'En curso' },
  'Finalizado': { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Finalizado' },
}

function Badge({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function FamilyStatusPage() {
  const { currentFamily, requests, trips } = useAppState()
  const family = currentFamily
  const ownRequests = requests.filter((item) => item.familyId === family?.id)
  const ownTrips = trips.filter((item) => item.familyId === family?.id)

  return (
    <div className="space-y-5">
      <SectionHeader title="Mi estatus" />

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-warm-900">
              {family?.caregiverName} {family?.familyLastName}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-warm-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND }} />
              <span>Habitación {family?.room}</span>
            </div>
          </div>
          {family?.admissionStatus && (
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              {family.admissionStatus}
            </span>
          )}
        </div>
        <p className="text-lg text-warm-400">{family?.site}</p>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
          <h2 className="text-lg font-bold text-warm-900">
            Solicitudes
            <span className="ml-2 text-sm font-normal text-warm-500">({ownRequests.length})</span>
          </h2>
        </div>

        {ownRequests.length === 0 ? (
          <p className="text-1xl text-warm-500 py-2">Sin solicitudes registradas.</p>
        ) : (
          <div className="space-y-2">
            {ownRequests.map((req) => {
              const badge = REQUEST_BADGE[req.status]
              return (
                <div
                  key={req.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-warm-50 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-warm-900 truncate">{req.title}</p>
                    <p className="mt-0.5 text-xs text-warm-500">
                      {req.type} · {formatDate(req.createdAt)}
                    </p>
                  </div>
                  {badge && <Badge {...badge} />}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
          <h2 className="text-lg font-bold text-warm-900">
            Viajes
            <span className="ml-2 text-sm font-normal text-warm-500">({ownTrips.length})</span>
          </h2>
        </div>

        {ownTrips.length === 0 ? (
          <p className="text-1xl text-warm-500 py-2">Sin viajes registrados.</p>
        ) : (
          <div className="space-y-2">
            {ownTrips.map((trip) => {
              const badge = TRIP_BADGE[trip.status]
              return (
                <div
                  key={trip.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-warm-50 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-warm-900 truncate">{trip.destination}</p>
                    <p className="mt-0.5 text-xs text-warm-500">
                      Turno {trip.shift}
                      {trip.startedAt ? ` · ${formatDate(trip.startedAt)}` : ''}
                    </p>
                  </div>
                  {badge && <Badge {...badge} />}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
