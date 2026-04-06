import { useState, useEffect } from 'react'
import { BedDouble, DoorOpen, MapPin, Users } from 'lucide-react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { getRooms } from '../../lib/api'
import type { Room } from '../../lib/api'

function StatusBadge({ assignedfamilies }: { assignedfamilies: string | null }) {
  if (!assignedfamilies) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-800">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Disponible
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-800">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Llena
    </span>
  )
}

function OccupancyMeter({ rooms }: { rooms: Room[] }) {
  const total = rooms.length
  const occupied = rooms.filter((r) => r.OccupiedCount > 0).length
  const available = total - occupied
  const pct = total > 0 ? (occupied / total) * 100 : 0

  return (
    <div className="rounded-2xl bg-white shadow-soft p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-warm-700">Ocupación general de la sede</p>
        <p className="text-sm font-bold text-warm-900">
          {occupied} <span className="font-normal text-warm-500">de {total} habitaciones ocupadas</span>
        </p>
      </div>
      <div className="h-3 rounded-full bg-warm-100 overflow-hidden">
        <div
          className="h-3 rounded-full bg-[#950606] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-warm-500">
        <span>{available} disponibles</span>
        <span>{Math.round(pct)}% ocupado</span>
      </div>
    </div>
  )
}

function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft animate-pulse">
      <div className="p-5 space-y-3 border-b border-warm-100">
        <div className="h-7 w-1/3 rounded bg-warm-100" />
        <div className="h-4 w-1/2 rounded bg-warm-100" />
        <div className="h-4 w-2/3 rounded bg-warm-100" />
      </div>
      <div className="p-4 flex flex-col items-center gap-2 border-b border-warm-100">
        <div className="h-5 w-5 rounded bg-warm-100" />
        <div className="h-8 w-10 rounded bg-warm-100" />
        <div className="h-3 w-14 rounded bg-warm-100" />
      </div>
      <div className="p-4 flex justify-center">
        <div className="h-8 w-36 rounded-full bg-warm-100" />
      </div>
    </div>
  )
}

function RoomsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] bg-warm-50 py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-warm-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
      <p className="mt-4 text-base font-semibold text-warm-700">Sin habitaciones configuradas</p>
      <p className="mt-1 text-sm text-warm-500">No hay habitaciones configuradas para esta sede.</p>
    </div>
  )
}

function RoomsErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] bg-warm-50 py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-warm-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="mt-4 text-base font-semibold text-warm-700">No pudimos cargar las habitaciones</p>
      <p className="mt-1 text-sm text-warm-500">Intenta de nuevo más tarde.</p>
    </div>
  )
}

function RoomCard({ room }: { room: Room }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft flex flex-col">
      {/* Bloque 1 – Identidad */}
      <div className="p-5 space-y-2 border-b border-warm-100">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 shrink-0 text-[#950606]" />
          <h2 className="text-2xl font-bold text-warm-900 truncate">{room.RoomCode}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-warm-500">
          <MapPin className="h-4 w-4 shrink-0 text-[#950606]" />
          <span className="truncate">{room.SiteName}</span>
        </div>
        <div className="flex items-start gap-1.5 text-sm text-warm-600">
          <Users className="h-4 w-4 shrink-0 mt-0.5 text-[#950606]" />
          {room.assignedfamilies ? (
            <span>{room.assignedfamilies}</span>
          ) : (
            <span className="italic text-warm-400">Sin familia asignada</span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col items-center gap-1 border-b border-warm-100">
        <BedDouble className="h-5 w-5 text-warm-400" />
        <p className="text-3xl font-extrabold text-warm-900">{room.Capacity}</p>
        <p className="text-xs text-warm-400 uppercase tracking-wide">Capacidad</p>
      </div>

      <div className="p-4 flex justify-center">
        <StatusBadge assignedfamilies={room.assignedfamilies} />
      </div>
    </div>
  )
}

export function StaffRoomsPage() {
  const { authToken, currentUser } = useAppState()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authToken) return
    setIsLoading(true)
    setError(null)
    getRooms(authToken, currentUser?.siteId ?? null)
      .then(setRooms)
      .catch(() => setError('error'))
      .finally(() => setIsLoading(false))
  }, [authToken, currentUser?.siteId])

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Room planning"
        subtitle="Habitaciones, ocupación y disponibilidad por sede."
      />

      {!isLoading && !error && rooms.length > 0 && <OccupancyMeter rooms={rooms} />}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RoomCardSkeleton />
          <RoomCardSkeleton />
          <RoomCardSkeleton />
          <RoomCardSkeleton />
          <RoomCardSkeleton />
          <RoomCardSkeleton />
        </div>
      )}

      {!isLoading && error && <RoomsErrorState />}

      {!isLoading && !error && rooms.length === 0 && <RoomsEmptyState />}

      {!isLoading && !error && rooms.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.RoomId} room={room} />
          ))}
        </div>
      )}
    </div>
  )
}
