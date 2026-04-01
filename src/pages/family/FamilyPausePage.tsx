import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

const breathingSteps = [
  'Inhala suave durante 4 segundos.',
  'Sostiene 4 segundos.',
  'Exhala lentamente durante 4 segundos.',
  'Repite el ciclo 3 veces.',
]

export function FamilyPausePage() {
  const { supportMessages } = useAppState()
  const [active, setActive] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeader
        title="Pausa 60s"
        subtitle="Microespacio de autocuidado no terapeutico para bajar incertidumbre y volver al flujo del dia."
      />
      <Card className="space-y-4">
        <p className="text-lg text-warm-800">
          {active ? 'Sigue el ciclo con calma. No necesitas hacerlo perfecto.' : 'Cuando lo necesites, inicia una pausa breve guiada.'}
        </p>
        <Button variant={active ? 'secondary' : 'primary'} onClick={() => setActive((value) => !value)}>
          {active ? 'Reiniciar pausa' : 'Iniciar pausa'}
        </Button>
        {active ? (
          <div className="grid gap-3">
            {breathingSteps.map((step) => (
              <div key={step} className="rounded-2xl bg-gold-100 p-4 text-warm-900">
                {step}
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {supportMessages.map((message) => (
          <Card key={message.id} className="space-y-2">
            <h2 className="text-xl font-bold text-warm-900">{message.title}</h2>
            <p className="text-warm-700">{message.body}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
