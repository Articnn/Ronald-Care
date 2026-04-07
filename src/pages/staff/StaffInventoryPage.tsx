import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, ChevronDown, ClipboardList, Package2, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { InventoryItem, VolunteerRosterItem } from '../../types'

function formatDate(value: string | null) {
  if (!value) return 'Sin caducidad registrada'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  }
  const safeDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(safeDate.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(safeDate)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function categoryIcon(category: InventoryItem['category']) {
  if (category === 'Cocina') return <Sparkles className="h-4 w-4 text-amber-600" />
  if (category === 'Limpieza') return <ClipboardList className="h-4 w-4 text-sky-600" />
  return <Package2 className="h-4 w-4 text-[#950606]" />
}

function categoryDescription(category: InventoryItem['category']) {
  if (category === 'Cocina') return 'Comida y abastecimiento de cocina'
  if (category === 'Limpieza') return 'Instrumentos e insumos de limpieza'
  if (category === 'Kit') return 'Kits de bienvenida e higiene'
  return 'Insumo operativo'
}

function movementReasonForItem(item: InventoryItem, movementType: 'in' | 'out') {
  if (item.category === 'Kit') return movementType === 'out' ? 'Entrega de kit de bienvenida' : 'Reposicion de kits de bienvenida'
  if (item.category === 'Cocina') return movementType === 'out' ? 'Salida para cocina del dia' : 'Reposicion de cocina'
  if (item.category === 'Limpieza') return movementType === 'out' ? 'Salida de insumo de limpieza' : 'Reposicion de limpieza'
  return movementType === 'out' ? 'Salida de inventario' : 'Entrada de inventario'
}

function eligibleVolunteers(item: InventoryItem, roster: VolunteerRosterItem[]) {
  if (item.category === 'Kit') return roster.filter((volunteer) => volunteer.role === 'Recepcion')
  if (item.category === 'Cocina') return roster.filter((volunteer) => volunteer.role === 'Cocina')
  if (item.category === 'Limpieza') return roster.filter((volunteer) => volunteer.role === 'Limpieza' || volunteer.role === 'Lavanderia')
  return roster
}

function InventoryCard({
  item,
  onSelect,
  isSelected,
}: {
  item: InventoryItem
  onSelect: () => void
  isSelected: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl bg-white p-5 text-left shadow-soft transition ${isSelected ? 'ring-2 ring-[#950606]' : 'hover:-translate-y-0.5'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-warm-700">
            {categoryIcon(item.category)}
            <span>{item.category}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-warm-900">{item.name}</h2>
          <p className="text-sm text-warm-600">{categoryDescription(item.category)}</p>
        </div>
        <p className="text-3xl font-extrabold text-warm-900">{item.stock}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-warm-100 px-3 py-1 text-warm-700">Minimo {item.minStock}</span>
        <span className="rounded-full bg-warm-100 px-3 py-1 text-warm-700">{item.unit}</span>
        {item.lowStock ? <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Stock bajo</span> : null}
        {item.expiringSoon ? <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Caduca pronto</span> : null}
      </div>

      <p className="mt-4 text-sm text-warm-600">{item.lastMovement}</p>
    </button>
  )
}

export function StaffInventoryPage() {
  const { inventory, inventoryReports, updateInventory, resolveInventoryNeedReport, volunteerRoster, createVolunteerTaskForUser } = useAppState()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(inventory[0]?.id || null)
  const [quantity, setQuantity] = useState('1')
  const [movementType, setMovementType] = useState<'in' | 'out'>('out')
  const [customReason, setCustomReason] = useState('')
  const [taskDay, setTaskDay] = useState(new Intl.DateTimeFormat('sv-SE').format(new Date()))
  const [shiftPeriod, setShiftPeriod] = useState<'AM' | 'PM'>('AM')
  const [selectedVolunteerUserId, setSelectedVolunteerUserId] = useState<number>(0)
  const [isSavingMovement, setIsSavingMovement] = useState(false)
  const [isAssigningTask, setIsAssigningTask] = useState(false)
  const [showKits, setShowKits] = useState(true)
  const [showCocina, setShowCocina] = useState(true)
  const [showLimpieza, setShowLimpieza] = useState(true)

  const selectedItem = useMemo(
    () => inventory.find((item) => item.id === selectedItemId) || inventory[0] || null,
    [inventory, selectedItemId],
  )

  const groupedInventory = useMemo(
    () => ({
      kits: inventory.filter((item) => item.category === 'Kit'),
      cocina: inventory.filter((item) => item.category === 'Cocina'),
      limpieza: inventory.filter((item) => item.category === 'Limpieza'),
    }),
    [inventory],
  )

  const expiringItems = useMemo(
    () => inventory.filter((item) => item.expiringSoon).sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || '')),
    [inventory],
  )

  const itemVolunteers = useMemo(
    () => (selectedItem ? eligibleVolunteers(selectedItem, volunteerRoster) : []),
    [selectedItem, volunteerRoster],
  )

  useEffect(() => {
    if (itemVolunteers.length === 0) {
      setSelectedVolunteerUserId(0)
      return
    }
    if (!itemVolunteers.some((volunteer) => volunteer.userId === selectedVolunteerUserId)) {
      setSelectedVolunteerUserId(itemVolunteers[0].userId)
    }
  }, [itemVolunteers, selectedVolunteerUserId])

  const lowStockCount = inventory.filter((item) => item.lowStock).length
  const availableWelcomeKits = groupedInventory.kits.find((item) => item.name.toLowerCase().includes('kit bienvenida'))?.stock || 0
  const pendingReports = inventoryReports.filter((report) => report.status === 'Pendiente')

  return (
    <div className="space-y-5">
      <SectionHeader title="Inventario de sede" subtitle="Stock real por sede, alertas de reposicion y asignacion de apoyo a voluntariado." />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-warm-700">Kits de bienvenida disponibles</p>
          <p className="text-3xl font-extrabold text-warm-900">{availableWelcomeKits}</p>
          <p className="text-sm text-warm-600">Datos reales de la sede seleccionada.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-warm-700">Alertas de stock bajo</p>
          <p className="text-3xl font-extrabold text-red-700">{lowStockCount}</p>
          <p className="text-sm text-warm-600">Items en o debajo del minimo operativo.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-warm-700">Proximas caducidades</p>
          <p className="text-3xl font-extrabold text-amber-700">{expiringItems.length}</p>
          <p className="text-sm text-warm-600">Alimentos que vencen en 7 dias o menos.</p>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-warm-700">Voluntarios elegibles</p>
          <p className="text-3xl font-extrabold text-warm-900">{itemVolunteers.length}</p>
          <p className="text-sm text-warm-600">Segun el insumo seleccionado y la sede actual.</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-warm-900">{selectedItem?.name || 'Selecciona un insumo'}</h2>
              <p className="text-sm text-warm-600">{selectedItem ? `${selectedItem.category} · ${selectedItem.itemCode}` : 'Elige un item para operar el inventario.'}</p>
            </div>
            {selectedItem?.lowStock ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Stock bajo
              </span>
            ) : null}
          </div>

          {selectedItem ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-warm-50 p-4">
                  <p className="text-sm font-semibold text-warm-700">Stock actual</p>
                  <p className="text-2xl font-extrabold text-warm-900">{selectedItem.stock} {selectedItem.unit}</p>
                </div>
                <div className="rounded-2xl bg-warm-50 p-4">
                  <p className="text-sm font-semibold text-warm-700">Caducidad</p>
                  <p className="text-lg font-bold text-warm-900">{formatDate(selectedItem.expiryDate)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block space-y-2">
                  <span className="text-base font-semibold text-warm-900">Movimiento</span>
                  <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={movementType} onChange={(event) => setMovementType(event.target.value as 'in' | 'out')}>
                    <option value="out">Salida</option>
                    <option value="in">Entrada</option>
                  </select>
                </label>
                <Input label="Cantidad" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <Input
                  label="Motivo"
                  value={customReason}
                  onChange={(event) => setCustomReason(event.target.value)}
                  placeholder={movementReasonForItem(selectedItem, movementType)}
                />
              </div>

              <Button
                isLoading={isSavingMovement}
                onClick={async () => {
                  if (!selectedItem) return
                  setIsSavingMovement(true)
                  try {
                    await updateInventory({
                      inventoryItemId: Number(selectedItem.id),
                      movementType,
                      quantity: Math.max(1, Number(quantity || 1)),
                      reason: customReason.trim() || movementReasonForItem(selectedItem, movementType),
                    })
                    setCustomReason('')
                  } finally {
                    setIsSavingMovement(false)
                  }
                }}
              >
                Guardar movimiento real
              </Button>
            </>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#950606]" />
            <h2 className="text-xl font-bold text-warm-900">Asignar apoyo por inventario</h2>
          </div>
          <p className="text-sm text-warm-600">
            Si hace falta apoyo para cocina, kits o limpieza, puedes asignar la tarea a voluntariado de la misma sede segun el tipo de insumo.
          </p>

          {selectedItem ? (
            <>
              <div className="rounded-2xl bg-warm-50 p-4">
                <p className="font-bold text-warm-900">{selectedItem.name}</p>
                <p className="text-sm text-warm-700">
                  {selectedItem.category === 'Kit'
                    ? 'Se asigna a recepción.'
                    : selectedItem.category === 'Cocina'
                      ? 'Se asigna a voluntariado de cocina.'
                      : selectedItem.category === 'Limpieza'
                        ? 'Se asigna a limpieza o lavandería.'
                        : 'Se puede asignar a voluntariado operativo.'}
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Voluntario de apoyo</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={selectedVolunteerUserId} onChange={(event) => setSelectedVolunteerUserId(Number(event.target.value))}>
                  {itemVolunteers.length === 0 ? <option value={0}>No hay voluntarios elegibles en esta sede</option> : null}
                  {itemVolunteers.map((volunteer) => (
                    <option key={volunteer.userId} value={volunteer.userId}>
                      {volunteer.fullName} · {volunteer.role}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Dia de apoyo" type="date" value={taskDay} onChange={(event) => setTaskDay(event.target.value)} />
                <label className="block space-y-2">
                  <span className="text-base font-semibold text-warm-900">Turno</span>
                  <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={shiftPeriod} onChange={(event) => setShiftPeriod(event.target.value as 'AM' | 'PM')}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </label>
              </div>

              <Button
                variant="secondary"
                disabled={!selectedVolunteerUserId}
                isLoading={isAssigningTask}
                onClick={async () => {
                  if (!selectedItem || !selectedVolunteerUserId) return
                  setIsAssigningTask(true)
                  try {
                    await createVolunteerTaskForUser({
                      volunteerUserId: selectedVolunteerUserId,
                      title:
                        selectedItem.category === 'Kit'
                          ? `Preparar ${selectedItem.name}`
                          : selectedItem.category === 'Cocina'
                            ? `Apoyo de cocina: ${selectedItem.name}`
                            : `Reposicion de limpieza: ${selectedItem.name}`,
                      taskType:
                        selectedItem.category === 'Kit'
                          ? 'recepcion'
                          : selectedItem.category === 'Cocina'
                            ? 'cocina'
                            : 'limpieza',
                      shiftPeriod,
                      taskDay,
                      notes: `Stock actual ${selectedItem.stock} ${selectedItem.unit}. ${selectedItem.lowStock ? 'Prioridad: stock bajo.' : 'Seguimiento preventivo.'}`,
                    })
                  } finally {
                    setIsAssigningTask(false)
                  }
                }}
              >
                Asignar apoyo real
              </Button>
            </>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-warm-900">Reportes operativos de voluntariado</h2>
            <p className="text-sm text-warm-600">Faltantes reales reportados por recepción, cocina, limpieza y lavandería en la sede actual.</p>
          </div>
          <span className="rounded-full bg-warm-100 px-3 py-1 text-sm font-bold text-warm-700">{pendingReports.length} pendientes</span>
        </div>

        {inventoryReports.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {inventoryReports.map((report) => (
              <div key={report.id} className="rounded-2xl bg-warm-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-warm-900">{report.title}</p>
                    <p className="text-sm text-warm-700">{report.category} · {report.volunteerName}</p>
                    <p className="mt-1 text-sm text-warm-600">{formatDateTime(report.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${report.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {report.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-warm-800">{report.detail}</p>
                {report.status === 'Pendiente' ? (
                  <div className="mt-4">
                    <Button variant="secondary" onClick={() => void resolveInventoryNeedReport(Number(report.id))}>
                      Marcar como atendido
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-warm-50 p-4 text-warm-700">Todavía no hay reportes operativos registrados para esta sede.</div>
        )}
      </Card>

      <div className="space-y-5">
        {[
          { title: 'Kits y bienvenida', items: groupedInventory.kits, open: showKits, toggle: () => setShowKits((value) => !value) },
          { title: 'Cocina y alimentos', items: groupedInventory.cocina, open: showCocina, toggle: () => setShowCocina((value) => !value) },
          { title: 'Limpieza e instrumentos', items: groupedInventory.limpieza, open: showLimpieza, toggle: () => setShowLimpieza((value) => !value) },
        ].map((group) => (
          <div key={group.title} className="space-y-3">
            <button type="button" onClick={group.toggle} className="flex w-full items-center justify-between rounded-2xl bg-warm-50 px-4 py-3 text-left">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-warm-900">{group.title}</h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-warm-700 shadow-soft">{group.items.length} items</span>
              </div>
              <ChevronDown className={`h-5 w-5 text-warm-600 transition-transform ${group.open ? 'rotate-180' : ''}`} />
            </button>
            {group.open ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {group.items.map((item) => (
                  <InventoryCard key={item.id} item={item} isSelected={selectedItem?.id === item.id} onSelect={() => setSelectedItemId(item.id)} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
