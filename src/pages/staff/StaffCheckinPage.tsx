import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { activateFamily, type ActivationResponse } from '../../lib/api'

export function StaffCheckinPage() {
  const { refId } = useParams()
  const { referrals, families, rooms, completeCheckIn, authToken } = useAppState()
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
  const [isLoading, setIsLoading] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [activationResult, setActivationResult] = useState<ActivationResponse | null>(null)
  const [activationError, setActivationError] = useState<string | null>(null)

  async function handleActivateFamily() {
    if (!authToken || !refId) return
    setIsActivating(true)
    setActivationError(null)
    try {
      const result = await activateFamily(authToken, Number(refId))
      setActivationResult(result)
      setDone(true)
    } catch (err) {
      setActivationError(err instanceof Error ? err.message : 'Error al generar credenciales')
    } finally {
      setIsActivating(false)
    }
  }

  if (!referral) {
    return <Card><p className="text-lg text-warm-700">Referencia no encontrada.</p></Card>
  }

  const qrUrl = activationResult
    ? `${window.location.origin}/family/login?qr_token=${activationResult.access.QrCode}`
    : family?.qrCode
      ? `${window.location.origin}/family/login?qr_token=${family.qrCode}`
      : null

  if (done) {
    return (
      <>
        <style>{`@media print { body > * { display: none !important; } #qr-credential { display: flex !important; } }`}</style>
        <div className="space-y-5">
          <SectionHeader title="Check-in completado" subtitle="Muestra esta pantalla a la familia o imprime la credencial." />
          <div
            id="qr-credential"
            className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-3xl border border-warm-200 bg-white p-8 shadow-lg"
          >
            <div className="text-center">
              <p className="text-xl font-bold text-warm-900">
                Familia {activationResult?.family.FamilyLastName ?? family?.familyLastName ?? familyLastName}
              </p>
              <p className="mt-1 text-base text-warm-600">
                Cuidador: {activationResult?.family.CaregiverName ?? family?.caregiverName ?? caregiverName}
              </p>
              {family?.room && (
                <p className="mt-1 text-base font-semibold text-warm-700">
                  Habitación: {family.room}
                </p>
              )}
            </div>

            {qrUrl ? (
              <>
                <div className="rounded-2xl bg-warm-50 p-4">
                  <QRCodeSVG value={qrUrl} size={220} level="M" />
                </div>
                {activationResult && (
                  <div className="w-full rounded-2xl border border-warm-200 bg-warm-50 p-4 text-center">
                    <p className="text-sm font-semibold text-warm-700">PIN de acceso</p>
                    <p className="mt-1 text-3xl font-bold tracking-widest text-warm-900">{activationResult.generatedPin}</p>
                    <p className="mt-2 text-xs text-warm-500">Entrega este PIN a la familia. Solo se muestra una vez.</p>
                  </div>
                )}
                <p className="max-w-xs text-center text-sm text-warm-500">
                  Escanea este código con la cámara de tu teléfono para acceder al portal familiar.
                </p>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm font-semibold text-amber-700">
                  No se recibió un código QR válido del servidor.
                </p>
                <button
                  className="mt-3 text-sm font-semibold text-amber-800 underline"
                  onClick={() => setDone(false)}
                >
                  Reintentar generación
                </button>
              </div>
            )}

            <div className="flex w-full flex-col gap-3 print:hidden">
              <Button fullWidth onClick={() => window.print()}>
                Imprimir credencial
              </Button>
              <Button fullWidth variant="secondary" onClick={() => setDone(false)}>
                Nuevo check-in
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={`Check-in ${referral.id}`} subtitle="Captura minima operativa y emision de ficha familia." />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombre cuidador" value={caregiverName} onChange={(event) => setCaregiverName(event.target.value)} />
          <Input label="Apellido familiar" value={familyLastName} onChange={(event) => setFamilyLastName(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-base font-semibold text-warm-900">Habitación</span>
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
        {family ? (
          <Button
            isLoading={isLoading}
            onClick={async () => {
              setIsLoading(true)
              try {
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
              } finally {
                setIsLoading(false)
              }
            }}
          >
            Generar ficha familia
          </Button>
        ) : (
          <>
            <Button isLoading={isActivating} onClick={handleActivateFamily}>
              Activar familia y generar QR
            </Button>
            {activationError && (
              <p className="text-sm font-semibold text-red-700">{activationError}</p>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
