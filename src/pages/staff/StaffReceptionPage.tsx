import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Input } from '../../components/ui/Input'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import { activateFamily, type ActivationResponse } from '../../lib/api'
import type { Referral } from '../../types'

type View = 'list' | 'create' | 'qr'

function formatArrivalDate(value?: string | null) {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX')
}

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

  // ── QR Credential view ──────────────────────────────────────────────────────
  if (view === 'qr' && activationResult) {
    const qrUrl = `${window.location.origin}/family/login?qr_token=${activationResult.access.QrCode}`
    return (
      <>
        <style>{`@media print { body > * { display: none !important; } #qr-credential { display: flex !important; } }`}</style>
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-xl font-bold text-gray-900">Familia registrada</h1>
            <p className="mt-1 text-sm text-gray-500">Entrega esta credencial a la familia para que pueda acceder al portal.</p>
          </div>

          <div
            id="qr-credential"
            className="mx-auto flex max-w-sm flex-col items-center gap-5 rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
          >
            {/* Header */}
            <div className="w-full border-b border-gray-100 pb-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Credencial de acceso</p>
              <p className="mt-1 text-base font-bold text-gray-900">Familia {activationResult.family.FamilyLastName}</p>
              <p className="text-sm text-gray-500">Cuidador: {activationResult.family.CaregiverName}</p>
            </div>

            {/* QR */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <QRCodeSVG value={qrUrl} size={200} level="M" />
            </div>

            {/* PIN */}
            <div className="w-full rounded-lg border border-warm-200 bg-warm-50 px-5 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">PIN de acceso</p>
              <p className="mt-2 text-4xl font-bold tracking-[0.3em] text-warm-900">{activationResult.generatedPin}</p>
              <p className="mt-2 text-xs text-warm-500">Solo se muestra una vez. Entrégalo a la familia.</p>
            </div>

            <p className="text-center text-xs text-gray-400">
              Escanea el QR con la cámara del teléfono e ingresa el PIN para acceder al portal familiar.
            </p>

            {/* Actions */}
            <div className="flex w-full flex-col gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="w-full rounded-md bg-warm-700 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800"
              >
                Imprimir credencial
              </button>
              <button
                onClick={() => { setActivationResult(null); setView('list') }}
                className="w-full rounded-md border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Volver a recepción
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Create referral view ────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold text-gray-900">Nueva referencia</h1>
          <p className="mt-1 text-sm text-gray-500">Registra los datos de la familia entrante.</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Datos de la referencia</p>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Sede</span>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
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
              <Input label="Fecha de llegada" type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} />
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

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-warm-700"
                checked={eligible}
                onChange={(event) => setEligible(event.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">Elegibilidad confirmada</span>
            </label>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                disabled={isCreating}
                onClick={handleCreateReferral}
                className="rounded-md bg-warm-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800 disabled:opacity-60"
              >
                {isCreating ? 'Guardando...' : 'Guardar referencia'}
              </button>
              <button
                onClick={() => { setView('list'); setError(null) }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recepción</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de referencias y activación de familias.</p>
        </div>
        <button
          onClick={() => { setView('create'); setError(null) }}
          className="inline-flex items-center gap-1.5 rounded-md bg-warm-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800"
        >
          <Plus className="h-4 w-4" />
          Nueva referencia
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Referrals table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="hidden border-b border-gray-100 bg-gray-50 px-6 py-3 lg:grid lg:grid-cols-[minmax(0,1.6fr)_160px_minmax(0,1fr)_160px_120px] lg:gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Familia</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Llegada</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Sede</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Estado</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Acción</span>
        </div>

        <div className="divide-y divide-gray-100">
          {referrals.map((referral) => (
            <div
              key={referral.id}
              className="grid gap-3 px-6 py-3.5 lg:grid-cols-[minmax(0,1.6fr)_160px_minmax(0,1fr)_160px_120px] lg:items-center lg:gap-4"
            >
              {/* Family name */}
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Familia {referral.familyLastName}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  #{referral.id} · {referral.companions} acompañante{referral.companions !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Arrival date */}
              <div className="text-sm text-gray-600">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:hidden">Llegada · </span>
                {formatArrivalDate(referral.arrivalDate)}
              </div>

              {/* Site */}
              <div className="text-sm text-gray-600">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:hidden">Sede · </span>
                {referral.site}
              </div>

              {/* Status */}
              <div>
                <StatusChip status={referral.status} />
              </div>

              {/* Action */}
              <div>
                {referral.status !== 'Aceptada' && (
                  <button
                    disabled={loadingId === referral.id}
                    onClick={() => handleAcceptReferral(referral)}
                    className="rounded-md bg-warm-700 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-warm-800 disabled:opacity-60"
                  >
                    {loadingId === referral.id ? 'Aceptando...' : 'Aceptar'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {referrals.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">No hay referencias registradas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
