import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import { activateFamily, type ActivationResponse } from '../../lib/api'
import type { Referral } from '../../types'

type View = 'list' | 'create' | 'qr'

export function StaffReceptionPage() {
  const { referrals, site, availableSites, setSite, createReferral, updateReferralStatus, authToken } = useAppState()

  const [view, setView] = useState<View>('list')
  const [activationResult, setActivationResult] = useState<ActivationResponse | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [caregiverName, setCaregiverName] = useState('')
  const [familyLastName, setFamilyLastName] = useState('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [companions, setCompanions] = useState('1')
  const [logisticsNote, setLogisticsNote] = useState('')
  const [eligible, setEligible] = useState(true)

  async function handleAcceptReferral(referral: Referral) {
    if (!authToken) return
    setLoadingId(referral.id)
    setError(null)
    try {
      await updateReferralStatus(referral.id, 'Aceptada')
      const result = await activateFamily(authToken, Number(referral.id))
      setActivationResult(result)
      setView('qr')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aceptar la referencia')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleCreateReferral() {
    setIsCreating(true)
    setError(null)
    try {
      await createReferral({
        hospitalWorker: 'Recepción',
        site,
        caregiverName,
        familyLastName,
        arrivalDate,
        companions: Number(companions),
        logisticsNote,
        eligible,
      })
      setCaregiverName('')
      setFamilyLastName('')
      setArrivalDate('')
      setCompanions('1')
      setLogisticsNote('')
      setEligible(true)
      setView('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la referencia')
    } finally {
      setIsCreating(false)
    }
  }

  if (view === 'qr' && activationResult) {
    const qrUrl = `${window.location.origin}/family/login?qr_token=${activationResult.access.QrCode}`
    return (
      <>
        <style>{`@media print { body > * { display: none !important; } #qr-credential { display: flex !important; } }`}</style>
        <div className="space-y-5">
          <SectionHeader title="Familia registrada" subtitle="Entrega esta credencial a la familia para que pueda acceder al portal." />
          <div
            id="qr-credential"
            className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-3xl border border-warm-200 bg-white p-8 shadow-lg"
          >
            <div className="text-center">
              <p className="text-xl font-bold text-warm-900">Familia {activationResult.family.FamilyLastName}</p>
              <p className="mt-1 text-base text-warm-600">Cuidador: {activationResult.family.CaregiverName}</p>
            </div>

            <div className="rounded-2xl bg-warm-50 p-4">
              <QRCodeSVG value={qrUrl} size={220} level="M" />
            </div>

            <div className="w-full rounded-2xl border border-warm-200 bg-warm-50 p-4 text-center">
              <p className="text-sm font-semibold text-warm-700">PIN de acceso</p>
              <p className="mt-1 text-3xl font-bold tracking-widest text-warm-900">{activationResult.generatedPin}</p>
              <p className="mt-2 text-xs text-warm-500">Entrega este PIN a la familia. Solo se muestra una vez.</p>
            </div>

            <p className="max-w-xs text-center text-sm text-warm-500">
              Escanea el QR con la cámara del teléfono e ingresa el PIN para acceder al portal familiar.
            </p>

            <div className="flex w-full flex-col gap-3 print:hidden">
              <Button fullWidth onClick={() => window.print()}>Imprimir credencial</Button>
              <Button fullWidth variant="secondary" onClick={() => { setActivationResult(null); setView('list') }}>
                Volver a recepción
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (view === 'create') {
    return (
      <div className="space-y-5">
        <SectionHeader title="Nueva referencia" subtitle="Registra los datos de la familia entrante." />
        <Card className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-base font-semibold text-warm-900">Sede</span>
              <select
                className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg"
                value={site}
                onChange={(event) => setSite(event.target.value)}
              >
                {availableSites.map((s) => (
                  <option key={s} value={s}>{s}</option>
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
            <Input
              label="Nota logística"
              value={logisticsNote}
              onChange={(event) => setLogisticsNote(event.target.value)}
              placeholder="Traslado, horario o acceso"
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-warm-200 p-4 text-lg font-semibold text-warm-900">
            <input type="checkbox" className="h-5 w-5" checked={eligible} onChange={(event) => setEligible(event.target.checked)} />
            Elegibilidad confirmada
          </label>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          <div className="flex gap-3">
            <Button isLoading={isCreating} onClick={handleCreateReferral}>
              Guardar referencia
            </Button>
            <Button variant="secondary" onClick={() => { setView('list'); setError(null) }}>
              Cancelar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Recepción" subtitle="Gestión de referencias y activación de familias." />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => { setView('create'); setError(null) }}>+ Nueva referencia</Button>
      </div>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold text-warm-900">Referencias</h2>
        {referrals.length === 0 && (
          <p className="text-warm-600">No hay referencias registradas.</p>
        )}
        {referrals.map((referral) => (
          <div
            key={referral.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4"
          >
            <div className="space-y-1">
              <p className="font-semibold text-warm-900">
                {referral.id} · Familia {referral.familyLastName}
              </p>
              <p className="text-sm text-warm-600">
                {referral.site} · Llegada {referral.arrivalDate} · {referral.companions} acompañante{referral.companions !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusChip status={referral.status} />
              {referral.status !== 'Aceptada' && (
                <Button
                  isLoading={loadingId === referral.id}
                  onClick={() => handleAcceptReferral(referral)}
                >
                  Aceptar
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
