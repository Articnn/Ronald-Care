import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

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
        subtitle="Reingreso rapido con aviso logistico sin repetir todo el proceso desde cero."
      />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Fecha de regreso" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Input label="Acompanantes" type="number" min="1" value={companions} onChange={(event) => setCompanions(event.target.value)} />
          <Input label="Nota logistica" value={note} onChange={(event) => setNote(event.target.value)} />
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
        {ownPasses.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-warm-900">{item.date}</h2>
              <p className="text-warm-700">{item.note}</p>
            </div>
            <StatusChip status={item.status} />
          </Card>
        ))}
      </div>
    </div>
  )
}
