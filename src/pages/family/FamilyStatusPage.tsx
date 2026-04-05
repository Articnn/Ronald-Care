import { ChevronDown, ClipboardList, MapPin, Route } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { RequestStatus, TripStatus } from '../../types'

const now = new Date().toISOString()

const MOCK_REQUESTS: Array<{ id: string; title: string; type: string; status: RequestStatus; createdAt: string }> = [
  { id: 'mock-req-1', title: 'Traslado a Hospital Infantil', type: 'Transporte', status: 'Nueva',      createdAt: now },
  { id: 'mock-req-2', title: 'Kit de bienvenida',            type: 'Kit',        status: 'Asignada',   createdAt: now },
  { id: 'mock-req-3', title: 'Apoyo de recepción',           type: 'Recepción',  status: 'En proceso', createdAt: now },
]

const MOCK_TRIPS: Array<{ id: string; destination: string; shift: string; status: TripStatus; startedAt: string | null }> = [
  { id: 'mock-trip-1', destination: 'Hospital Infantil', shift: 'AM', status: 'Pendiente',  startedAt: null },
  { id: 'mock-trip-2', destination: 'Terminal Norte',    shift: 'PM', status: 'Finalizado', startedAt: now  },
]

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
  const filtered = requests.filter((item) => item.familyId === family?.id)
  const filteredTrips = trips.filter((item) => item.familyId === family?.id)
  const ownRequests = filtered.length > 0 ? filtered : MOCK_REQUESTS
  const ownTrips = filteredTrips.length > 0 ? filteredTrips : MOCK_TRIPS

  const [requestsOpen, setRequestsOpen] = useState(true)
  const [tripsOpen, setTripsOpen] = useState(true)

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

      <Card className="overflow-hidden p-0">
        <button
          onClick={() => setRequestsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left transition-colors hover:bg-warm-50"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
            <h2 className="text-lg font-bold text-warm-900">
              Solicitudes
              <span className="ml-2 text-sm font-normal text-warm-500">({ownRequests.length})</span>
            </h2>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-warm-400 transition-transform duration-200 ${requestsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${requestsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className={`space-y-2 overflow-y-auto px-5 pb-4 max-h-72 border-t border-warm-100 pt-3 transition-opacity duration-300 ${requestsOpen ? 'opacity-100' : 'opacity-0'}`}>
              {ownRequests.length === 0 ? (
                <p className="text-sm text-warm-500 py-2">Sin solicitudes registradas.</p>
              ) : (
                ownRequests.map((req) => {
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
                })
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <button
          onClick={() => setTripsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left transition-colors hover:bg-warm-50"
        >
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
            <h2 className="text-lg font-bold text-warm-900">
              Viajes
              <span className="ml-2 text-sm font-normal text-warm-500">({ownTrips.length})</span>
            </h2>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-warm-400 transition-transform duration-200 ${tripsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${tripsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className={`space-y-2 overflow-y-auto px-5 pb-4 max-h-72 border-t border-warm-100 pt-3 transition-opacity duration-300 ${tripsOpen ? 'opacity-100' : 'opacity-0'}`}>
              {ownTrips.length === 0 ? (
                <p className="text-sm text-warm-500 py-2">Sin viajes registrados.</p>
              ) : (
                ownTrips.map((trip) => {
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
                })
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
