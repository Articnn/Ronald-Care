import { useMemo, useState, useEffect } from 'react'
import { BedDouble, DoorOpen, MapPin, Users, Clock3, ShieldAlert, Sparkles, UserCheck, LogOut } from 'lucide-react'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAppState } from '../../context/AppContext'
import { getRooms, updateRoom, assignRoomToFamily, releaseRoomFromFamily } from '../../lib/api'
import type { Room } from '../../lib/api'

function isRoomInMaintenance(room: Room) {
  return room.RoomStatus === 'mantenimiento'
}

function isRoomOccupied(room: Room) {
  return room.OccupiedCount > 0 || isRoomInMaintenance(room)
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
  if (!room.assignedfamilies && room.OccupiedCount === 0) {
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
  const occupied = rooms.filter((r) => isRoomOccupied(r)).length
  const available = total - occupied
  const pct = total > 0 ? (occupied / total) * 100 : 0

  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft space-y-3">
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

interface Family {
  FamilyId: number
  CaregiverName: string
  FamilyLastName: string
  AdmissionStatus: 'pendiente' | 'checkin_completado'
  RoomId: number | null
  RoomCode: string | null
  SiteId: number
  SiteName: string
  CheckInCompletedAt: string | null
}

function RoomCard({
  room,
  isSelected,
  onSelect,
}: {
  room: Room
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} className={`overflow-hidden rounded-2xl bg-white text-left shadow-soft transition ${isSelected ? 'ring-2 ring-[#950606]' : 'hover:-translate-y-0.5'}`}>
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
          {room.assignedfamilies ? <span>{room.assignedfamilies}</span> : <span className="italic text-warm-400">Sin familia asignada</span>}
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
  )
}

export function StaffRoomsPage() {
  const { authToken, currentUser, volunteerRoster, createVolunteerTaskForUser } = useAppState()
  const [rooms, setRooms] = useState<Room[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [availableInMinutes, setAvailableInMinutes] = useState('60')
  const [roomIssue, setRoomIssue] = useState<'limpieza' | 'accidente' | 'mantenimiento'>('limpieza')
  const [roomNote, setRoomNote] = useState('')
  const [selectedVolunteerUserId, setSelectedVolunteerUserId] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [roomStatusEdit, setRoomStatusEdit] = useState<'disponible' | 'mantenimiento'>('disponible')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  const loadRooms = async () => {
    if (!authToken) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getRooms(authToken, currentUser?.siteId ?? null)
      setRooms(data)
      if (!selectedRoomId && data[0]) setSelectedRoomId(data[0].RoomId)
    } catch {
      setError('error')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFamilies = async () => {
    if (!authToken) return
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787/api'}/families?siteId=${currentUser?.siteId ?? ''}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const data = await response.json()
      if (data.success) {
        setFamilies(data.data)
      }
    } catch {
      // Silently fail, families will just not be shown
    }
  }

  useEffect(() => {
    void loadRooms()
    void loadFamilies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, currentUser?.siteId])

  const selectedRoom = useMemo(() => rooms.find((room) => room.RoomId === selectedRoomId) || null, [rooms, selectedRoomId])

  useEffect(() => {
    if (!selectedRoom) return
    setRoomNote(selectedRoom.RoomNote || '')
    setAvailableInMinutes(diffMinutesFromNow(selectedRoom.AvailableAt))
    setRoomStatusEdit(selectedRoom.RoomStatus === 'mantenimiento' ? 'mantenimiento' : 'disponible')
  }, [selectedRoom])

  const availableFamilies = useMemo(() => {
    return families
      .filter(f => f.AdmissionStatus === 'checkin_completado' && (f.RoomId === null || f.RoomId === undefined))
      .sort((a, b) => {
        const dateA = a.CheckInCompletedAt ? new Date(a.CheckInCompletedAt).getTime() : 0
        const dateB = b.CheckInCompletedAt ? new Date(b.CheckInCompletedAt).getTime() : 0
        return dateA - dateB
      })
  }, [families])

  const handleAssignRoom = async () => {
    if (!authToken || !selectedFamilyId || !selectedRoom) return
    setAssignError(null)
    setIsSaving(true)
    try {
      await assignRoomToFamily(authToken, { familyId: selectedFamilyId, roomId: selectedRoom.RoomId })
      await loadRooms()
      await loadFamilies()
      setShowAssignModal(false)
      setSelectedFamilyId(null)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Error al asignar habitación')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReleaseRoom = async () => {
    if (!authToken || !selectedRoom) return
    const familyInRoom = families.find(f => f.RoomId === selectedRoom.RoomId)
    if (!familyInRoom) return

    if (!window.confirm(`¿Liberar habitación ${selectedRoom.RoomCode}? La familia ${familyInRoom.CaregiverName} ${familyInRoom.FamilyLastName} perderá su asignación.`)) {
      return
    }

    setIsSaving(true)
    try {
      await releaseRoomFromFamily(authToken, { familyId: familyInRoom.FamilyId })
      await loadRooms()
      await loadFamilies()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al liberar habitación')
    } finally {
      setIsSaving(false)
    }
  }

  const cleaningVolunteers = useMemo(
    () =>
      volunteerRoster.filter(
        (volunteer) =>
          volunteer.role === 'Limpieza' &&
          (!selectedRoom || volunteer.site === selectedRoom.SiteName),
      ),
    [volunteerRoster, selectedRoom],
  )

  useEffect(() => {
    if (!selectedVolunteerUserId && cleaningVolunteers[0]) {
      setSelectedVolunteerUserId(cleaningVolunteers[0].userId)
    }
  }, [cleaningVolunteers, selectedVolunteerUserId])

  return (
    <div className="space-y-6">
      <SectionHeader title="Room planning" subtitle="Habitaciones, ocupacion y disponibilidad por sede." />

      {!isLoading && !error && rooms.length > 0 ? <OccupancyMeter rooms={rooms} /> : null}

      {!isLoading && !error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard key={room.RoomId} room={room} isSelected={room.RoomId === selectedRoomId} onSelect={() => setSelectedRoomId(room.RoomId)} />
          ))}
        </div>
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

            {selectedRoom.assignedfamilies && (
              <div className="rounded-xl bg-warm-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-warm-700">
                  <Users className="h-4 w-4" />
                  <span>Familias ocupando: {selectedRoom.assignedfamilies}</span>
                </div>
              </div>
            )}

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
                <span className="text-base font-semibold text-warm-900">Estado de la habitación</span>
                <select
                  className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg"
                  value={roomStatusEdit}
                  onChange={(event) => setRoomStatusEdit(event.target.value as 'disponible' | 'mantenimiento')}
                  disabled={selectedRoom.RoomStatus === 'ocupada'}
                >
                  <option value="disponible">Disponible</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
                {selectedRoom.RoomStatus === 'ocupada' && (
                  <p className="text-xs text-warm-500">Libera la habitación primero para cambiar su estado.</p>
                )}
              </label>
            </div>

            <Input
              label="Nota de la habitacion"
              value={roomNote}
              onChange={(event) => setRoomNote(event.target.value)}
              placeholder="Ej. limpieza profunda, cambio de sabanas, incidente menor..."
            />

            <div className="flex gap-3">
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
                      roomStatus: roomStatusEdit,
                    })
                    await loadRooms()
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                Guardar estado de la habitacion
              </Button>

              {selectedRoom.RoomStatus === 'ocupada' && (
                <Button variant="secondary" onClick={handleReleaseRoom} disabled={isSaving}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Liberar habitación
                </Button>
              )}
            </div>

            {selectedRoom.RoomStatus === 'disponible' && availableFamilies.length > 0 && (
              <div className="rounded-xl border-2 border-dashed border-[#950606] bg-[#950606]/5 p-4">
                <div className="flex items-center gap-2 text-[#950606]">
                  <UserCheck className="h-5 w-5" />
                  <p className="font-semibold">Habitación disponible para asignar</p>
                </div>
                <p className="mt-1 text-sm text-warm-600">Hay {availableFamilies.length} familia(s) con check-in completado sin habitación asignada.</p>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setShowAssignModal(true)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Asignar familia a esta habitación
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#950606]" />
              <h2 className="text-xl font-bold text-warm-900">Asignar apoyo a voluntariado</h2>
            </div>
            <p className="text-sm text-warm-600">Si la habitacion requiere limpieza o atencion por incidente, puedes mandar la tarea a voluntariado de la misma sede. La alerta le llega automaticamente al asignar la tarea.</p>

            <label className="block space-y-2">
              <span className="text-base font-semibold text-warm-900">Tipo de incidencia</span>
              <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={roomIssue} onChange={(event) => setRoomIssue(event.target.value as 'limpieza' | 'accidente' | 'mantenimiento')}>
                <option value="limpieza">Limpieza</option>
                <option value="accidente">Accidente</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-base font-semibold text-warm-900">Voluntario de apoyo</span>
              <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={selectedVolunteerUserId} onChange={(event) => setSelectedVolunteerUserId(Number(event.target.value))}>
                {cleaningVolunteers.length === 0 ? <option value={0}>No hay voluntarios disponibles</option> : null}
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
              <p className="mt-2 text-xs text-warm-600">El voluntario debe pertenecer a esta misma sede y recibira su notificacion dentro de la app.</p>
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
                  await loadRooms()
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              Asignar tarea a voluntario
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

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-[#950606]" />
              <h3 className="text-xl font-bold text-warm-900">Asignar familia a {selectedRoom?.RoomCode}</h3>
            </div>

            {assignError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {assignError}
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-base font-semibold text-warm-900">Seleccionar familia</span>
              <select
                className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg"
                value={selectedFamilyId ?? ''}
                onChange={(e) => setSelectedFamilyId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Seleccione una familia --</option>
                {availableFamilies.map((family) => {
                  const since = family.CheckInCompletedAt
                    ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(family.CheckInCompletedAt))
                    : null
                  return (
                    <option key={family.FamilyId} value={family.FamilyId}>
                      {`${family.CaregiverName} ${family.FamilyLastName}${since ? ` · check-in ${since}` : ''}`}
                    </option>
                  )
                })}
              </select>
            </label>

            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedFamilyId(null)
                  setAssignError(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssignRoom}
                disabled={!selectedFamilyId}
                isLoading={isSaving}
              >
                Confirmar asignación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

