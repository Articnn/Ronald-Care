import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PriorityChip } from '../../components/ui/PriorityChip'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { Tabs } from '../../components/ui/Tabs'
import { useAppState } from '../../context/AppContext'
import type { RequestStatus, RequestType, RequestUrgency } from '../../types'
import { calculatePriority } from '../../utils/priority'

const tabs = ['Nueva', 'Asignada', 'En proceso', 'Resuelta'] as const
const requestTypes: RequestType[] = ['Transporte', 'Kit', 'Alimento', 'Recepcion']
const urgencyOptions: RequestUrgency[] = ['Baja', 'Media', 'Alta']

export function StaffRequestsPage() {
  const { requests, families, createRequest, updateRequestStatus } = useAppState()
  const [activeTab, setActiveTab] = useState<RequestStatus>('Nueva')
  const [ordered, setOrdered] = useState(false)
  const [familyId, setFamilyId] = useState(families[0]?.id || '')
  const [title, setTitle] = useState('Apoyo de recepcion')
  const [type, setType] = useState<RequestType>('Recepcion')
  const [urgency, setUrgency] = useState<RequestUrgency>('Media')
  const [optionalWindow, setOptionalWindow] = useState('')
  const filtered = requests
    .filter((request) => request.status === activeTab)
    .map((request) => ({ ...request, priority: calculatePriority(request) }))
  const list = ordered ? [...filtered].sort((a, b) => b.priority.score - a.priority.score) : filtered

  return (
    <div className="space-y-5">
      <SectionHeader title="Solicitudes" subtitle="Panel operativo con score 0-100, prioridad y razon visible." />
      <Card className="space-y-4">
        <h2 className="text-xl font-bold text-warm-900">Crear solicitud asistida</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Familia</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={familyId} onChange={(event) => setFamilyId(event.target.value)}>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.caregiverName} {family.familyLastName}
                </option>
              ))}
            </select>
          </label>
          <Input label="Titulo" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Tipo</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={type} onChange={(event) => setType(event.target.value as RequestType)}>
              {requestTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Urgencia</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={urgency} onChange={(event) => setUrgency(event.target.value as RequestUrgency)}>
              {urgencyOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Input label="Comentario (opcional)" value={optionalWindow} onChange={(event) => setOptionalWindow(event.target.value)} />
        </div>
        <Button
          onClick={async () => {
            const family = families.find((item) => item.id === familyId)
            if (!family) return
            await createRequest({
              site: family.site,
              familyId: family.id,
              title: title.trim() || `Solicitud de ${type.toLowerCase()}`,
              type,
              urgency,
              optionalWindow: optionalWindow.trim() || undefined,
              assignedRole: type === 'Transporte' ? 'volunteer' : 'staff',
              assignedTo: type === 'Transporte' ? 'Carlos R.' : 'Lucia P.',
            })
          }}
        >
          Crear solicitud para familia
        </Button>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs items={tabs} activeItem={activeTab} onChange={setActiveTab} />
        <button className="rounded-2xl bg-gold-300 px-4 py-2 font-bold text-warm-900" onClick={() => setOrdered((value) => !value)}>
          Ordenar por prioridad
        </button>
      </div>
      <div className="grid gap-4">
        {list.map((request) => (
          <Card key={request.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-warm-900">{request.title}</h2>
                <p className="text-warm-700">{request.type} · asignado a {request.assignedTo}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PriorityChip label={request.priority.label} score={request.priority.score} />
                <StatusChip status={request.status} />
              </div>
            </div>
            <p className="text-warm-700">{request.priority.reason}</p>
            <div className="flex flex-wrap gap-2">
              {request.status === 'Nueva' ? <button className="rounded-xl bg-warm-100 px-4 py-2 font-semibold text-warm-900" onClick={async () => updateRequestStatus(request.id, 'Asignada')}>Asignar</button> : null}
              {request.status === 'Asignada' ? <button className="rounded-xl bg-gold-300 px-4 py-2 font-semibold text-warm-900" onClick={async () => updateRequestStatus(request.id, 'En proceso')}>Iniciar</button> : null}
              {request.status !== 'Resuelta' ? <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={async () => updateRequestStatus(request.id, 'Resuelta')}>Resolver</button> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
