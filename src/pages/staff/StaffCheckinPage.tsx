import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'

export function StaffCheckinPage() {
  const { refId } = useParams()
  const { referrals, families, rooms, completeCheckIn } = useAppState()
  const referral = useMemo(() => referrals.find((item) => item.id === refId), [refId, referrals])
  const family = useMemo(() => families.find((item) => item.referralId === refId), [families, refId])
  const availableRooms = rooms.filter((room) => room.site === referral?.site)
  const [caregiverName, setCaregiverName] = useState('Ana')
  const [familyLastName, setFamilyLastName] = useState('Lopez')
  const [idVerified, setIdVerified] = useState(true)
  const [regulationAccepted, setRegulationAccepted] = useState(true)
  const [simpleSignature, setSimpleSignature] = useState('Ana Lopez')
  const [room, setRoom] = useState(availableRooms[0]?.label || '')
  const [done, setDone] = useState(false)

  if (!referral) {
    return <Card><p className="text-lg text-warm-700">Referencia no encontrada.</p></Card>
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={`Check-in ${referral.id}`} subtitle="Captura minima operativa y emision de ficha familia." />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombre cuidador" value={caregiverName} onChange={(event) => setCaregiverName(event.target.value)} />
          <Input label="Apellido familiar" value={familyLastName} onChange={(event) => setFamilyLastName(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Habitacion</span>
            <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={room} onChange={(event) => setRoom(event.target.value)}>
              {availableRooms.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label} · {item.occupied}/{item.capacity}
                </option>
              ))}
            </select>
          </label>
          <Input label="Firma simple" value={simpleSignature} onChange={(event) => setSimpleSignature(event.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-2xl border border-warm-200 p-4 text-lg font-semibold text-warm-900">
            <input type="checkbox" className="mr-3 h-5 w-5" checked={idVerified} onChange={(event) => setIdVerified(event.target.checked)} />
            ID verificada
          </label>
          <label className="rounded-2xl border border-warm-200 p-4 text-lg font-semibold text-warm-900">
            <input type="checkbox" className="mr-3 h-5 w-5" checked={regulationAccepted} onChange={(event) => setRegulationAccepted(event.target.checked)} />
            Reglamento aceptado
          </label>
        </div>
        <Button
          onClick={async () => {
            if (!family) return
            await completeCheckIn({
              referralId: family.id,
              caregiverName,
              familyLastName,
              site: referral.site,
              room,
              idVerified,
              regulationAccepted,
              simpleSignature,
              kioskCode: family.kioskCode,
              qrCode: family.qrCode,
              pin: '',
            })
            setDone(true)
          }}
          disabled={!family}
        >
          Generar ficha familia
        </Button>
        {!family ? <p className="text-sm font-semibold text-red-700">Primero un admin debe activar la familia desde la referencia.</p> : null}
        {done ? (
          <div className="rounded-2xl bg-gold-100 p-4 text-warm-900">
            <p className="font-bold">Ficha Familia generada</p>
            <p>Codigo : {referral.ticketCode}</p>
            <p>QR familia: QR-{referral.familyCode}</p>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
