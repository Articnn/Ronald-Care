import { AlertTriangle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function StaffInventoryPage() {
  const { inventory, updateInventory } = useAppState()

  return (
    <div className="space-y-5">
      <SectionHeader title="Inventario de kits" subtitle="Entradas, salidas, stock actual y alerta de stock bajo." />
      <div className="grid gap-4">
        {inventory.map((item) => {
          const low = item.stock <= item.minStock
          return (
            <Card key={item.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-warm-900">{item.name}</h2>
                  <p className="text-warm-700">{item.lastMovement}</p>
                </div>
                <p className="text-2xl font-extrabold text-warm-900">{item.stock}</p>
              </div>
              {low ? <p className="flex items-center gap-2 font-bold text-red-700"><AlertTriangle className="h-5 w-5" /> Stock bajo</p> : null}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => updateInventory(item.id, -1, 'Salida de 1 unidad')}>Salida</Button>
                <Button variant="secondary" onClick={() => updateInventory(item.id, 3, 'Entrada de 3 unidades')}>Entrada</Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
