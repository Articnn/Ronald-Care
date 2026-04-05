import { CalendarDays, Truck, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { ReturnPass } from '../../types'

const BRAND = '#950606'

const STATUS_BADGE: Record<ReturnPass['status'], { bg: string; text: string }> = {
  'Enviado':  { bg: 'bg-green-100', text: 'text-green-700' },
  'Borrador': { bg: 'bg-amber-100', text: 'text-amber-700' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function FamilyReturnPassPage() {
  const { currentFamily, returnPasses, createReturnPass } = useAppState()
  const [date, setDate] = useState('2026-04-06')
  const [companions, setCompanions] = useState('2')
  const [note, setNote] = useState('Regreso para continuidad de hospedaje.')

  if (!currentFamily) {
    return <Card><p className="text-lg text-warm-700">No hay familia activa para generar return pass.</p></Card>
  }

  const ownPasses = returnPasses.filter((item) => item.familyId === currentFamily.id)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Return Pass"
        subtitle="Solicita un pase de regreso para salir del hospital por un periodo corto sin perder tu lugar en la casa."
      />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Fecha de regreso" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Input label="Acompanantes" type="number" min="1" value={companions} onChange={(event) => setCompanions(event.target.value)} />
          <Input label="Nota logística" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button
          onClick={() =>
            createReturnPass({
              familyId: currentFamily.id,
              site: currentFamily.site,
              date,
              companions: Number(companions),
              note,
            })
          }
        >
          Enviar Return Pass
        </Button>
      </Card>
      <div className="grid gap-4">
        {ownPasses.map((item, index) => {
          const badge = STATUS_BADGE[item.status]
          return (
            <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-md">

              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-warm-400">Return pass</p>
                  <p className="text-lg font-bold text-warm-900">Pase #{index + 1}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                  {item.status}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-wrap gap-5 border-t border-warm-100 px-5 py-4">
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                  <div>
                    <p className="text-xs text-warm-400">Fecha de regreso</p>
                    <p className="font-semibold text-warm-900">{formatDate(item.date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                  <div>
                    <p className="text-xs text-warm-400">Acompañantes</p>
                    <p className="font-semibold text-warm-900">{item.companions}</p>
                  </div>
                </div>
              </div>

              {/* Footer — nota logística */}
              {item.note && (
                <div className="flex items-start gap-2 border-t border-orange-100 bg-orange-50/60 px-5 py-3">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-warm-400" />
                  <p className="text-sm text-warm-700">{item.note}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
