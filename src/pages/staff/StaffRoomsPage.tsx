import { useMemo, useState, useEffect } from 'react'
import {
  BedDouble,
  CheckCircle2,
  Clock3,
  DoorOpen,
  LoaderCircle,
  MapPin,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAppState } from '../../context/AppContext'
import { confirmRoomArrivalAssignment, getRoomArrivalFlow, getRooms, releaseRoom, updateRoom } from '../../lib/api'
import type { Room, RoomArrivalFlow } from '../../lib/api'

function isRoomInMaintenance(room: Room) {
  return room.RoomStatus === 'mantenimiento'
}

function isRoomReserved(room: Room) {
  return room.RoomStatus === 'reservada'
}

function isRoomOccupied(room: Room) {
  return room.RoomStatus === 'ocupada' || room.RoomStatus === 'reservada' || isRoomInMaintenance(room) || room.OccupiedCount > 0
}

function StatusBadge({ room }: { room: Room }) {
  if (isRoomInMaintenance(room)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Mantenimiento
      </span>
    )
  }
  if (isRoomReserved(room)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-semibold text-yellow-800">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Reservada
      </span>
    )
  }
  if (room.RoomStatus === 'ocupada') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-800">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Ocupada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-800">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Disponible
    </span>
  )
}

function OccupancyMeter({ rooms }: { rooms: Room[] }) {
  const total = rooms.length
  const occupied = rooms.filter((r) => isRoomOccupied(r)).length
  const available = total - occupied
  const pct = total > 0 ? (occupied / total) * 100 : 0

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-warm-700">Ocupacion general de la sede</p>
        <p className="text-sm font-bold text-warm-900">
          {occupied} <span className="font-normal text-warm-500">de {total} habitaciones ocupadas</span>
        </p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-warm-100">
        <div className="h-3 rounded-full bg-[#950606] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-warm-500">
        <span>{available} disponibles</span>
        <span>{Math.round(pct)}% ocupado</span>
      </div>
    </div>
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin tiempo estimado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function buildAvailableAt(minutes: string) {
  const parsed = Number(minutes || 0)
  if (!parsed || parsed < 0) return null
  const date = new Date()
  date.setMinutes(date.getMinutes() + parsed)
  return date.toISOString()
}

function diffMinutesFromNow(value?: string | null) {
  if (!value) return '60'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '60'
  return String(Math.max(0, Math.round((date.getTime() - Date.now()) / 60000)))
}

function roomTypeLabel(room: Room) {
  return room.RoomType === 'especial' ? 'Especial' : 'Normal'
}

function roomTypeIcon(room: Room) {
  return room.RoomType === 'especial' ? <Sparkles className="h-4 w-4 text-gold-500" /> : <BedDouble className="h-4 w-4 text-warm-400" />
}

function FlowBadge({ flow }: { flow: RoomArrivalFlow }) {
  if (flow.FlowStatus === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
        <CheckCircle2 className="h-4 w-4" />
        Lista para asignar
      </span>
    )
  }

  if (flow.FlowStatus === 'preparing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
        <LoaderCircle className="h-4 w-4" />
        En preparación
      </span>
    )
  }

  if (flow.FlowStatus === 'assigned' || flow.FlowStatus === 'reserved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
        <CheckCircle2 className="h-4 w-4" />
        Asignada
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-100 px-3 py-1 text-sm font-semibold text-warm-700">
      <Search className="h-4 w-4" />
      Seguimiento
    </span>
  )
}

function RoomCard({
  room,
  isSelected,
  onSelect,
  onRelease,
  isReleasing,
}: {
  room: Room
  isSelected: boolean
  onSelect: () => void
  onRelease: () => void
  isReleasing: boolean
}) {
  const familyName = room.assignedfamilies
  const familyLabel = room.AssignedFamilyLastName ? `Habitación de familia ${room.AssignedFamilyLastName}` : null
  const canRelease = room.RoomStatus === 'ocupada' && room.AssignedFamilyAdmissionStatus === 'checkin_completado'

  return (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-soft transition ${isSelected ? 'ring-2 ring-[#950606]' : 'hover:-translate-y-0.5'}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="space-y-2 border-b border-warm-100 p-5">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 shrink-0 text-[#950606]" />
            <h2 className="truncate text-2xl font-bold text-warm-900">{room.RoomCode}</h2>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-warm-500">
            <MapPin className="h-4 w-4 shrink-0 text-[#950606]" />
            <span className="truncate">{room.SiteName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-warm-700">
            {roomTypeIcon(room)}
            <span>{roomTypeLabel(room)}</span>
          </div>
          <div className="flex items-start gap-1.5 text-sm text-warm-600">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#950606]" />
            {familyName ? (
              <div className="space-y-0.5">
                <p className="font-semibold text-warm-800">{familyName}</p>
                <p>{familyLabel || 'Habitación con familia asignada'}</p>
              </div>
            ) : (
              <span className="italic text-warm-400">Sin familia asignada</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 border-b border-warm-100 p-4">
          <BedDouble className="h-5 w-5 text-warm-400" />
          <p className="text-3xl font-extrabold text-warm-900">{room.Capacity}</p>
          <p className="text-xs uppercase tracking-wide text-warm-400">Capacidad</p>
        </div>

        <div className="flex justify-center p-4">
          <StatusBadge room={room} />
        </div>
      </button>

      {canRelease ? (
        <div className="border-t border-warm-100 px-4 pb-4">
          <Button variant="secondary" className="mt-4 w-full" isLoading={isReleasing} onClick={onRelease}>
            Familia se fue
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function StaffRoomsPage() {
  const { authToken, currentUser, site, availableSites, volunteerRoster, createVolunteerTaskForUser } = useAppState()
  const [rooms, setRooms] = useState<Room[]>([])
  const [arrivalFlows, setArrivalFlows] = useState<RoomArrivalFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [availableInMinutes, setAvailableInMinutes] = useState('60')
  const [roomIssue, setRoomIssue] = useState<'limpieza' | 'accidente' | 'mantenimiento'>('limpieza')
  const [roomNote, setRoomNote] = useState('')
  const [selectedVolunteerUserId, setSelectedVolunteerUserId] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingFlows, setIsLoadingFlows] = useState(false)
  const [assigningFamilyId, setAssigningFamilyId] = useState<number | null>(null)
  const [releasingRoomId, setReleasingRoomId] = useState<number | null>(null)

  const selectedSiteId =
    currentUser?.role === 'admin' || currentUser?.role === 'superadmin'
      ? site === 'Todas las sedes'
        ? null
        : availableSites.findIndex((item) => item === site) + 1 || null
      : currentUser?.siteId || null

  const loadRooms = async () => {
    if (!authToken) return
    const data = await getRooms(authToken, selectedSiteId)
    setRooms(data)
    if (!data.some((room) => room.RoomId === selectedRoomId)) {
      setSelectedRoomId(data[0]?.RoomId ?? null)
    }
  }

  const loadArrivalFlows = async () => {
    if (!authToken) return
    setIsLoadingFlows(true)
    try {
      const data = await getRoomArrivalFlow(authToken, selectedSiteId)
      setArrivalFlows(data)
    } finally {
      setIsLoadingFlows(false)
    }
  }

  const loadData = async () => {
    if (!authToken) return
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([loadRooms(), loadArrivalFlows()])
    } catch {
      setError('error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, selectedSiteId])

  const selectedRoom = useMemo(() => rooms.find((room) => room.RoomId === selectedRoomId) || null, [rooms, selectedRoomId])

  useEffect(() => {
    if (!selectedRoom) return
    setRoomNote(selectedRoom.RoomNote || '')
    setAvailableInMinutes(diffMinutesFromNow(selectedRoom.AvailableAt))
  }, [selectedRoom])

  const cleaningVolunteers = useMemo(
    () =>
      volunteerRoster.filter(
        (volunteer) => volunteer.role === 'Limpieza' && (!selectedRoom || volunteer.site === selectedRoom.SiteName),
      ),
    [volunteerRoster, selectedRoom],
  )

  const groupedRooms = useMemo(
    () =>
      rooms.reduce<Record<string, Room[]>>((acc, room) => {
        const group = room.SiteName || 'Sin sede'
        if (!acc[group]) acc[group] = []
        acc[group].push(room)
        return acc
      }, {}),
    [rooms],
  )

  const groupedArrivalFlows = useMemo(
    () =>
      arrivalFlows.reduce<Record<string, RoomArrivalFlow[]>>((acc, flow) => {
        const group = flow.SiteName || 'Sin sede'
        if (!acc[group]) acc[group] = []
        acc[group].push(flow)
        return acc
      }, {}),
    [arrivalFlows],
  )

  useEffect(() => {
    if (!selectedVolunteerUserId && cleaningVolunteers[0]) {
      setSelectedVolunteerUserId(cleaningVolunteers[0].userId)
    }
  }, [cleaningVolunteers, selectedVolunteerUserId])

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Room planning"
        subtitle={selectedSiteId === null ? 'Vista global con habitaciones agrupadas por sede.' : `Habitaciones, ocupacion y disponibilidad para ${site}.`}
      />

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-bold text-warm-900">Flujo automático de llegadas</p>
            <p className="text-sm text-warm-600">
              {selectedSiteId === null
                ? 'Seguimiento automático para familias que llegan mañana en todas las sedes.'
                : 'Seguimiento automático para familias que llegan mañana en esta sede.'}
            </p>
          </div>
          {isLoadingFlows ? <LoaderCircle className="h-5 w-5 animate-spin text-[#950606]" /> : null}
        </div>

        {arrivalFlows.length > 0 ? (
          <div className="space-y-5">
            {Object.entries(groupedArrivalFlows).map(([groupName, flows]) => (
              <div key={groupName} className="space-y-4">
                {selectedSiteId === null ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-warm-500">{groupName}</p> : null}
                <div className="grid gap-4 xl:grid-cols-2">
                  {flows.map((flow) => (
                    <div key={flow.FamilyId} className="space-y-3 rounded-2xl bg-warm-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold text-warm-900">{`${flow.CaregiverName} ${flow.FamilyLastName}`}</p>
                          <p className="text-sm text-warm-600">Llega el {formatDate(flow.ArrivalDate)} · capacidad inicial {flow.RequiredCapacity}</p>
                        </div>
                        <FlowBadge flow={flow} />
                      </div>

                      <div className="rounded-2xl border border-dashed border-warm-200 bg-white p-4 text-sm text-warm-700">
                        <p className="font-semibold text-warm-900">Buscando habitación disponible para la familia {flow.CaregiverName} que llega el {formatDate(flow.ArrivalDate)}...</p>
                        <p className="mt-2">{flow.Message}</p>
                        {flow.AssignedVolunteerName ? (
                          <p className="mt-2 text-sm font-semibold text-warm-800">Tarea asignada a {flow.AssignedVolunteerName} para preparar la habitación.</p>
                        ) : null}
                      </div>

                      {flow.FlowStatus === 'ready' && flow.SuggestedRoomId && flow.SuggestedRoomCode ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-semibold text-green-700">✅ Habitación {flow.SuggestedRoomCode} encontrada y lista</p>
                          <Button
                            isLoading={assigningFamilyId === flow.FamilyId}
                            onClick={async () => {
                              if (!authToken || !flow.SuggestedRoomId) return
                              setAssigningFamilyId(flow.FamilyId)
                              try {
                                await confirmRoomArrivalAssignment(authToken, { familyId: flow.FamilyId, roomId: flow.SuggestedRoomId })
                                await loadData()
                              } finally {
                                setAssigningFamilyId(null)
                              }
                            }}
                          >
                            Confirmar y asignar a familia
                          </Button>
                        </div>
                      ) : null}

                      {flow.FlowStatus === 'preparing' ? (
                        <p className="text-sm font-semibold text-amber-700">🔍 Habitación encontrada pero necesita preparación</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoadingFlows ? (
          <div className="rounded-2xl bg-warm-50 p-6 text-sm text-warm-700">
            No hay familias registradas con llegada para mañana en la sede seleccionada.
          </div>
        ) : null}
      </div>

      {!isLoading && !error && rooms.length > 0 ? <OccupancyMeter rooms={rooms} /> : null}

      {!isLoading && !error ? (
        selectedSiteId === null ? (
          <div className="space-y-6">
            {Object.entries(groupedRooms).map(([groupName, groupRooms]) => (
              <div key={groupName} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-warm-500">{groupName}</p>
                  <p className="text-sm font-semibold text-warm-700">{groupRooms.length} habitaciones</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {groupRooms.map((room) => (
                    <RoomCard
                      key={room.RoomId}
                      room={room}
                      isSelected={room.RoomId === selectedRoomId}
                      onSelect={() => setSelectedRoomId(room.RoomId)}
                      isReleasing={releasingRoomId === room.RoomId}
                      onRelease={async () => {
                        if (!authToken) return
                        setReleasingRoomId(room.RoomId)
                        try {
                          await releaseRoom(authToken, room.RoomId)
                          await loadData()
                        } finally {
                          setReleasingRoomId(null)
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rooms.map((room) => (
              <RoomCard
                key={room.RoomId}
                room={room}
                isSelected={room.RoomId === selectedRoomId}
                onSelect={() => setSelectedRoomId(room.RoomId)}
                isReleasing={releasingRoomId === room.RoomId}
                onRelease={async () => {
                  if (!authToken) return
                  setReleasingRoomId(room.RoomId)
                  try {
                    await releaseRoom(authToken, room.RoomId)
                    await loadData()
                  } finally {
                    setReleasingRoomId(null)
                  }
                }}
              />
            ))}
          </div>
        )
      ) : null}

      {selectedRoom ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-warm-900">{selectedRoom.RoomCode}</p>
                <p className="text-sm text-warm-600">{`${selectedRoom.SiteName} · ${roomTypeLabel(selectedRoom)} · capacidad ${selectedRoom.Capacity}`}</p>
              </div>
              <StatusBadge room={selectedRoom} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-warm-50 p-4">
                <p className="text-sm font-semibold text-warm-700">Tiempo estimado para liberarse</p>
                <p className="mt-1 text-lg font-bold text-warm-900">{formatDateTime(selectedRoom.AvailableAt)}</p>
              </div>
              <div className="rounded-2xl bg-warm-50 p-4">
                <p className="text-sm font-semibold text-warm-700">Nota operativa</p>
                <p className="mt-1 text-sm text-warm-900">{selectedRoom.RoomNote || 'Sin incidencias registradas'}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Disponible en minutos" type="number" min="0" value={availableInMinutes} onChange={(event) => setAvailableInMinutes(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Tipo de incidencia</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={roomIssue} onChange={(event) => setRoomIssue(event.target.value as 'limpieza' | 'accidente' | 'mantenimiento')}>
                  <option value="limpieza">Limpieza</option>
                  <option value="accidente">Accidente</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </label>
            </div>

            <Input
              label="Nota de la habitacion"
              value={roomNote}
              onChange={(event) => setRoomNote(event.target.value)}
              placeholder="Ej. limpieza profunda, cambio de sabanas, incidente menor..."
            />

            <Button
              isLoading={isSaving}
              onClick={async () => {
                if (!authToken) return
                setIsSaving(true)
                try {
                  await updateRoom(authToken, {
                    roomId: selectedRoom.RoomId,
                    availableAt: buildAvailableAt(availableInMinutes),
                    roomNote,
                    roomStatus: 'mantenimiento',
                  })
                  await loadData()
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              Guardar estado de la habitacion
            </Button>
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#950606]" />
              <h2 className="text-xl font-bold text-warm-900">Asignar apoyo a staff</h2>
            </div>
            <p className="text-sm text-warm-600">Si la habitacion requiere limpieza o atencion por incidente, puedes mandar la tarea al staff de la misma sede. La alerta le llega automaticamente al asignar la tarea.</p>

            <label className="block space-y-2">
              <span className="text-base font-semibold text-warm-900">Staff de apoyo</span>
              <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={selectedVolunteerUserId} onChange={(event) => setSelectedVolunteerUserId(Number(event.target.value))}>
                {cleaningVolunteers.length === 0 ? <option value={0}>No hay staff disponible</option> : null}
                {cleaningVolunteers.map((volunteer) => (
                  <option key={volunteer.userId} value={volunteer.userId}>
                    {`${volunteer.fullName} · ${volunteer.role}`}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl bg-warm-50 p-4">
              <p className="text-sm font-semibold text-warm-700">Se creara una tarea real</p>
              <p className="mt-1 text-sm text-warm-900">
                {roomIssue === 'limpieza' ? 'Limpieza requerida' : roomIssue === 'accidente' ? 'Atencion por accidente' : 'Revision por mantenimiento'} en {selectedRoom.RoomCode}
              </p>
              <p className="mt-2 text-xs text-warm-600">El staff asignado debe pertenecer a esta misma sede y recibira su notificacion dentro de la app.</p>
            </div>

            <Button
              variant="secondary"
              isLoading={isSaving}
              disabled={!selectedVolunteerUserId}
              onClick={async () => {
                setIsSaving(true)
                try {
                  await createVolunteerTaskForUser({
                    volunteerUserId: selectedVolunteerUserId,
                    title: `${roomIssue === 'limpieza' ? 'Limpieza' : roomIssue === 'accidente' ? 'Atender incidente' : 'Revisar habitacion'} ${selectedRoom.RoomCode}`,
                    taskType: roomIssue === 'limpieza' ? 'limpieza' : 'inventario',
                    shiftPeriod: 'AM',
                    taskDay: new Date().toISOString().slice(0, 10),
                    notes: roomNote || `Apoyo solicitado para ${selectedRoom.RoomCode}`,
                    relatedRoomId: selectedRoom.RoomId,
                  })
                  if (authToken) {
                    await updateRoom(authToken, {
                      roomId: selectedRoom.RoomId,
                      availableAt: buildAvailableAt(availableInMinutes),
                      roomNote,
                      roomStatus: 'mantenimiento',
                    })
                  }
                  await loadData()
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              Asignar tarea a staff
            </Button>

            <div className="rounded-2xl border border-dashed border-warm-200 p-4 text-sm text-warm-600">
              <Clock3 className="mb-2 h-4 w-4 text-warm-500" />
              Las habitaciones normales se muestran con capacidad 2 y las especiales con capacidad 4.
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? <div className="rounded-2xl bg-warm-50 p-8 text-center text-warm-700">Cargando habitaciones...</div> : null}
      {!isLoading && error ? <div className="rounded-2xl bg-warm-50 p-8 text-center text-warm-700">No pudimos cargar las habitaciones.</div> : null}
      {!isLoading && !error && rooms.length === 0 ? <div className="rounded-2xl bg-warm-50 p-8 text-center text-warm-700">No hay habitaciones configuradas para esta sede.</div> : null}
    </div>
  )
}
