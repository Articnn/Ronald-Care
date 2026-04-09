import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
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
      <SectionHeader
        title="Lista de Espera"
        subtitle="Familias aprobadas sin habitación asignada. La prioridad se conserva por orden de antigüedad."
      />

      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{success}</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <Card className="space-y-4">
        <div className="grid gap-4">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_160px_220px] gap-4 rounded-2xl bg-warm-50 px-4 py-3 text-sm font-bold text-warm-900 lg:grid">
            <span>Nombre de la familia</span>
            <span>Fecha de aceptación</span>
            <span>Sede asignada</span>
            <span>Días en espera</span>
            <span>Acción</span>
          </div>

          {loading ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">Cargando lista de espera...</div> : null}

          {!loading && records.map((item) => {
            const waitingFrom = item.WaitlistEnteredAt || item.ApprovedAt || item.CreatedAt
            const availableRooms = roomsBySite[item.AssignedSiteId || item.SiteId] || []
            const isPriorityOne = records[0]?.ReferralId === item.ReferralId

            return (
              <div key={item.ReferralId} className={`rounded-2xl border p-4 shadow-soft ${isPriorityOne ? 'border-gold-300 bg-gold-50/40' : 'border-warm-200 bg-white'}`}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_160px_220px] lg:items-center">
                  <div>
                    <p className="font-bold text-warm-900">{item.CaregiverName} {item.FamilyLastName}</p>
                    <p className="text-sm text-warm-600">
                      Referencia {item.ReferralCode}
                      {item.ChildName ? ` · menor ${item.ChildName}` : ''}
                      {item.OriginHospital ? ` · ${item.OriginHospital}` : ''}
                    </p>
                  </div>
                  <div className="text-sm text-warm-700">{formatDate(item.ApprovedAt || item.WaitlistEnteredAt || item.CreatedAt)}</div>
                  <div className="text-sm text-warm-700">{item.AssignedSiteName || item.SiteName || 'Pendiente'}</div>
                  <div className="text-sm font-semibold text-warm-900">
                    {diffDays(waitingFrom)} días
                    {isPriorityOne ? <span className="ml-2 inline-flex rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-warm-900">Prioridad 1</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setOpenReferralId((current) => (current === item.ReferralId ? null : item.ReferralId))}
                    >
                      Asignar habitación
                    </Button>
                  </div>
                </div>

                {openReferralId === item.ReferralId ? (
                  <div className="mt-4 rounded-2xl bg-warm-50 p-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
                      <label className="block space-y-2">
                        <span className="text-sm font-semibold text-warm-900">Habitaciones disponibles en la sede</span>
                        <select
                          className="w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-base text-warm-900"
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
                        <Button
                          className="w-full"
                          isLoading={busyId === item.ReferralId}
                          disabled={!selectedRoomByReferral[item.ReferralId]}
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
                          Confirmar asignación
                        </Button>
                      </div>
                    </div>
                    {availableRooms.length === 0 ? (
                      <p className="mt-3 text-sm font-semibold text-red-700">No hay habitaciones disponibles en esta sede en este momento.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}

          {!loading && records.length === 0 ? (
            <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">
              No hay familias en lista de espera para la sede seleccionada.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
