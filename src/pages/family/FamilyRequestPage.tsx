import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import type { RequestType, RequestUrgency } from '../../types'

const requestTypes: RequestType[] = ['Transporte', 'Kit', 'Alimento', 'Recepción']
const urgencyOptions: RequestUrgency[] = ['Baja', 'Media', 'Alta']

export function FamilyRequestPage() {
  const { currentFamily, createRequest } = useAppState()
  const navigate = useNavigate()
  const family = currentFamily
  const [type, setType] = useState<RequestType>('Transporte')
  const [urgency, setUrgency] = useState<RequestUrgency>('Media')
  const [optionalWindow, setOptionalWindow] = useState('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!family) {
    return <Card><p className="text-lg text-warm-700">No hay una familia activa en demo.</p></Card>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeader title="Solicitar apoyo" subtitle="Crea solicitudes básicas en pocos pasos." />
      <Card className="space-y-5">
        <div>
          <p className="mb-2 text-base font-semibold text-warm-900">Tipo de apoyo</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {requestTypes.map((item) => (
              <button
                key={item}
                onClick={() => setType(item)}
                className={`rounded-2xl px-4 py-3 text-lg font-bold ${type === item ? 'bg-warm-700 text-white' : 'bg-warm-100 text-warm-900'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-base font-semibold text-warm-900">Urgencia</p>
          <div className="flex flex-wrap gap-2">
            {urgencyOptions.map((item) => (
              <button
                key={item}
                onClick={() => setUrgency(item)}
                className={`rounded-2xl px-4 py-2 font-bold ${urgency === item ? 'bg-gold-500 text-warm-900' : 'bg-gold-100 text-warm-800'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Ventana u horario (opcional)"
            placeholder="Ejemplo: 07:30"
            value={optionalWindow}
            onChange={(event) => setOptionalWindow(event.target.value)}
          />
          <Input
            label="Nota breve"
            placeholder="Ejemplo: traslado a primera cita"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <Button
          isLoading={isLoading}
          onClick={async () => {
            setIsLoading(true)
            try {
              await createRequest({
                site: family.site,
                familyId: family.id,
                title: note.trim() || `Solicitud de ${type.toLowerCase()}`,
                type,
                urgency,
                optionalWindow: optionalWindow.trim() || undefined,
                assignedRole: type === 'Transporte' ? 'volunteer' : 'staff',
                assignedTo: type === 'Transporte' ? 'Carlos R.' : 'Lucia P.',
              })
              navigate('/family/status')
            } finally {
              setIsLoading(false)
            }
          }}
        >
          Enviar solicitud
        </Button>
      </Card>
    </div>
  )
}
