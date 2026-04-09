import { useEffect, useMemo, useState } from 'react'
import { Clock, Users } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import { getAdmissions, getRooms, updateAdmissionRecord, type AdmissionRecord, type Room } from '../../lib/api'

function formatDate(value?: string | null) {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX')
}

function diffDays(value?: string | null) {
  if (!value) return 0
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 0
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)))
}

export function StaffWaitlistPage() {
  const { authToken, currentUser, site, availableSites } = useAppState()
  const [records, setRecords] = useState<AdmissionRecord[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openReferralId, setOpenReferralId] = useState<number | null>(null)
  const [selectedRoomByReferral, setSelectedRoomByReferral] = useState<Record<number, number>>({})
  const [busyId, setBusyId] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedSiteId =
    currentUser?.role === 'admin' || currentUser?.role === 'superadmin'
      ? site === 'Todas las sedes'
        ? null
        : availableSites.findIndex((item) => item === site) + 1 || null
      : currentUser?.siteId || null

  const loadData = async () => {
    if (!authToken) return
    setLoading(true)
    setError(null)
    try {
      const [waitlistAdmissions, roomList] = await Promise.all([
        getAdmissions(authToken, { siteId: selectedSiteId, stage: 'lista_espera' }),
        getRooms(authToken, selectedSiteId),
      ])
      setRecords(
        [...waitlistAdmissions].sort((a, b) => {
          const aTime = new Date(a.WaitlistEnteredAt || a.ApprovedAt || a.CreatedAt).getTime()
          const bTime = new Date(b.WaitlistEnteredAt || b.ApprovedAt || b.CreatedAt).getTime()
          return aTime - bTime
        }),
      )
      setRooms(roomList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la lista de espera.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [authToken, selectedSiteId])

  const roomsBySite = useMemo(() => {
    return rooms.reduce<Record<number, Room[]>>((acc, room) => {
      if (room.RoomStatus !== 'disponible') return acc
      if (!acc[room.SiteId]) acc[room.SiteId] = []
      acc[room.SiteId].push(room)
      return acc
    }, {})
  }, [rooms])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Lista de Espera</h1>
        <p className="mt-1 text-sm text-gray-500">
          Familias aprobadas sin habitación asignada. La prioridad se conserva por orden de antigüedad.
        </p>
      </div>

      {/* Feedback banners */}
      {success && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="hidden border-b border-gray-100 bg-gray-50 px-6 py-3 lg:grid lg:grid-cols-[minmax(0,1.4fr)_160px_minmax(0,1fr)_140px_200px] lg:gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Nombre de la familia</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Fecha de aceptación</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Sede asignada</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Días en espera</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Acción</span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 px-6 py-8 text-sm text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-warm-600" />
            Cargando lista de espera...
          </div>
        )}

        {/* Rows */}
        {!loading && (
          <div className="divide-y divide-gray-100">
            {records.map((item, index) => {
              const waitingFrom = item.WaitlistEnteredAt || item.ApprovedAt || item.CreatedAt
              const availableRooms = roomsBySite[item.AssignedSiteId || item.SiteId] || []
              const isPriorityOne = index === 0

              return (
                <div key={item.ReferralId} className={isPriorityOne ? 'bg-amber-50/60' : 'bg-white'}>
                  <div className="grid gap-3 px-6 py-4 lg:grid-cols-[minmax(0,1.4fr)_160px_minmax(0,1fr)_140px_200px] lg:items-center lg:gap-4">
                    {/* Family name */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm-100 text-xs font-bold text-warm-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.CaregiverName} {item.FamilyLastName}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Ref. {item.ReferralCode}
                          {item.ChildName ? ` · ${item.ChildName}` : ''}
                          {item.OriginHospital ? ` · ${item.OriginHospital}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Acceptance date */}
                    <div className="text-sm text-gray-600">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:hidden">Aceptación · </span>
                      {formatDate(item.ApprovedAt || item.WaitlistEnteredAt || item.CreatedAt)}
                    </div>

                    {/* Site */}
                    <div className="text-sm text-gray-600">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:hidden">Sede · </span>
                      {item.AssignedSiteName || item.SiteName || 'Pendiente'}
                    </div>

                    {/* Days waiting */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">
                        {diffDays(waitingFrom)} días
                      </span>
                      {isPriorityOne && (
                        <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          P1
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <div>
                      <button
                        onClick={() => setOpenReferralId((current) => (current === item.ReferralId ? null : item.ReferralId))}
                        className={`rounded-md border px-3.5 py-2 text-xs font-medium transition ${
                          openReferralId === item.ReferralId
                            ? 'border-warm-300 bg-warm-50 text-warm-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {openReferralId === item.ReferralId ? 'Cancelar' : 'Asignar habitación'}
                      </button>
                    </div>
                  </div>

                  {/* Room assignment panel */}
                  {openReferralId === item.ReferralId && (
                    <div className="mx-6 mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-warm-500">Asignación de habitación</p>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-gray-700">Habitaciones disponibles en la sede</span>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
                            value={selectedRoomByReferral[item.ReferralId] || ''}
                            onChange={(event) =>
                              setSelectedRoomByReferral((current) => ({
                                ...current,
                                [item.ReferralId]: Number(event.target.value),
                              }))
                            }
                          >
                            <option value="">Selecciona una habitación</option>
                            {availableRooms.map((room) => (
                              <option key={room.RoomId} value={room.RoomId}>
                                {room.RoomCode} · capacidad {room.Capacity}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-end">
                          <button
                            disabled={busyId === item.ReferralId || !selectedRoomByReferral[item.ReferralId]}
                            className="w-full rounded-md bg-warm-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-warm-800 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={async () => {
                              if (!authToken || !selectedRoomByReferral[item.ReferralId]) return
                              setBusyId(item.ReferralId)
                              setSuccess(null)
                              try {
                                const result = await updateAdmissionRecord(authToken, {
                                  referralId: item.ReferralId,
                                  action: 'assign-waitlist-room',
                                  roomId: selectedRoomByReferral[item.ReferralId],
                                })
                                setSuccess((result as AdmissionRecord).Message || 'Habitación asignada correctamente.')
                                setOpenReferralId(null)
                                await loadData()
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'No se pudo asignar la habitación.')
                              } finally {
                                setBusyId(null)
                              }
                            }}
                          >
                            {busyId === item.ReferralId ? 'Guardando...' : 'Confirmar asignación'}
                          </button>
                        </div>
                      </div>
                      {availableRooms.length === 0 && (
                        <p className="mt-3 text-xs font-medium text-red-600">
                          No hay habitaciones disponibles en esta sede en este momento.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Empty state */}
            {records.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">No hay familias en lista de espera para la sede seleccionada.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
