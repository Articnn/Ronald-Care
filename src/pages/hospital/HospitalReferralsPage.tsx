import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function HospitalReferralsPage() {
  const { referrals, site, availableSites, setSite, createReferral } = useAppState()
  const [caregiverName, setCaregiverName] = useState('Maria')
  const [familyLastName, setFamilyLastName] = useState('Lopez')
  const [arrivalDate, setArrivalDate] = useState('2026-03-11')
  const [companions, setCompanions] = useState('2')
  const [logisticsNote, setLogisticsNote] = useState('')
  const [eligible, setEligible] = useState(true)
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="space-y-6">
      <SectionHeader title="Referencias hospitalarias" subtitle="Captura sede, llegada, acompañantes y nota logística." />

      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Sede</span>
            <select
              className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg"
              value={site}
              onChange={(event) => setSite(event.target.value)}
            >
              {availableSites.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Input label="Nombre cuidador" value={caregiverName} onChange={(event) => setCaregiverName(event.target.value)} />
          <Input label="Apellido familia" value={familyLastName} onChange={(event) => setFamilyLastName(event.target.value)} />
          <Input label="Fecha llegada" type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} />
          <Input
            label="Número de acompañantes"
            type="number"
            min="1"
            value={companions}
            onChange={(event) => setCompanions(event.target.value)}
          />
          <Input label="Nota logística" value={logisticsNote} onChange={(event) => setLogisticsNote(event.target.value)} placeholder="Traslado, horario o acceso" />
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-warm-200 p-4 text-lg font-semibold text-warm-900">
          <input type="checkbox" className="h-5 w-5" checked={eligible} onChange={(event) => setEligible(event.target.checked)} />
          Elegibilidad confirmada
        </label>
        <Button
          isLoading={isLoading}
          onClick={async () => {
            setIsLoading(true)
            try {
              const id = await createReferral({
                hospitalWorker: 'Trabajo Social',
                site,
                caregiverName,
                familyLastName,
                arrivalDate,
                companions: Number(companions),
                logisticsNote,
                eligible,
              })
              navigate(`/hospital/referrals/${id}`)
            } finally {
              setIsLoading(false)
            }
          }}
        >
          Crear referencia
        </Button>
      </Card>

      <div className="grid gap-4">
        {referrals.map((referral) => (
          <Card key={referral.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-warm-900">{referral.id}</h3>
              <p className="text-warm-700">{referral.site} · llegada {referral.arrivalDate} · acompañantes {referral.companions}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusChip status={referral.status} />
              <Link className="rounded-xl bg-warm-700 px-4 py-2 font-semibold text-white" to={`/hospital/referrals/${referral.id}`}>
                Ver detalle
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
