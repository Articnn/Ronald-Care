import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'

export function HospitalReferralDetailPage() {
  const { id } = useParams()
  const { referrals, updateReferralStatus } = useAppState()
  const referral = useMemo(() => referrals.find((item) => item.id === id), [id, referrals])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (!referral) {
    return <Card><p className="text-lg text-warm-700">Referencia no encontrada.</p></Card>
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={`Detalle ${referral.id}`} subtitle="Gestión de referencia y generación de código para recepción." />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={referral.status} />
          <p className="text-warm-700">Sede {referral.site} · ticket {referral.ticketCode}</p>
        </div>
        <p className="text-lg text-warm-800">Nota: {referral.logisticsNote || 'Sin nota logística.'}</p>
        <div className="rounded-2xl bg-gold-100 p-4 text-warm-900">
          <p className="font-bold">QR/Código para recepción</p>
          <p className="text-lg">QR-{referral.ticketCode}</p>
          <p>Código familia: {referral.familyCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" isLoading={loadingId === 'revision'} onClick={async () => { setLoadingId('revision'); try { await updateReferralStatus(referral.id, 'En revision') } finally { setLoadingId(null) } }}>Marcar En revision</Button>
          <Button variant="secondary" isLoading={loadingId === 'aceptada'} onClick={async () => { setLoadingId('aceptada'); try { await updateReferralStatus(referral.id, 'Aceptada') } finally { setLoadingId(null) } }}>Marcar Aceptada</Button>
        </div>
      </Card>
    </div>
  )
}
