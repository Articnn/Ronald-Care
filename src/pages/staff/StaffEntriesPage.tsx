import { useMemo, useState } from 'react'
import { FileUp, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import { createAdmissionReferral, extractAdmissionReference } from '../../lib/api'

const steps = ['Referencia clínica', 'Datos de familia', 'Confirmar entrada'] as const

export function StaffEntriesPage() {
  const { authToken, availableSites, referrals, refreshConnectedData, setSite, site } = useAppState()
  const [activeStep, setActiveStep] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentReferenceUrl, setDocumentReferenceUrl] = useState('')
  const [childName, setChildName] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [originHospital, setOriginHospital] = useState('')
  const [originCity, setOriginCity] = useState('')
  const [caregiverName, setCaregiverName] = useState('')
  const [familyLastName, setFamilyLastName] = useState('')
  const [familyContactPhone, setFamilyContactPhone] = useState('')
  const [arrivalDate, setArrivalDate] = useState('2026-04-09')
  const [companions, setCompanions] = useState('2')
  const [logisticsNote, setLogisticsNote] = useState('')

  const recentEntries = useMemo(() => referrals.filter((item) => item.site === site).slice(0, 4), [referrals, site])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setDocumentReferenceUrl(`uploaded://references/${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`)
    setSuccess(null)
    setError(null)
  }

  const handleExtraction = async () => {
    if (!authToken) return
    if (!selectedFile) {
      setError('Selecciona primero un archivo para extraer datos.')
      return
    }

    setIsExtracting(true)
    setError(null)
    try {
      const extracted = await extractAdmissionReference(authToken, {
        fileName: selectedFile.name,
        hintText: `${selectedFile.name} ${site}`,
      })
      setChildName((current) => current || extracted.childName)
      setDiagnosis((current) => current || extracted.diagnosis)
      setOriginHospital((current) => current || extracted.originHospital)
      setOriginCity((current) => current || extracted.originCity)
      setCaregiverName((current) => current || extracted.caregiverName)
      setFamilyLastName((current) => current || extracted.familyLastName)
      setSite(extracted.siteSuggestion)
      setLogisticsNote((current) => current || `Referencia prellenada desde ${selectedFile.name}.`)
      setSuccess(extracted.message)
      setActiveStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo extraer la información del documento.')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!authToken) return
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const siteId = availableSites.findIndex((item) => item === site) + 1
      await createAdmissionReferral(authToken, {
        siteId,
        caregiverName,
        familyLastName,
        childName,
        diagnosis,
        arrivalDate,
        companionCount: Number(companions),
        logisticsNote,
        eligibilityConfirmed: true,
        originHospital,
        originCity,
        familyContactPhone,
        documentReferenceUrl: documentReferenceUrl || undefined,
        admissionStage: 'referencia',
      })
      await refreshConnectedData()
      setSuccess('Entrada registrada. El caso ya cuenta dentro de expedientes por completar.')
      setActiveStep(0)
      setSelectedFile(null)
      setDocumentReferenceUrl('')
      setChildName('')
      setDiagnosis('')
      setOriginHospital('')
      setOriginCity('')
      setCaregiverName('')
      setFamilyLastName('')
      setFamilyContactPhone('')
      setArrivalDate('2026-04-09')
      setCompanions('2')
      setLogisticsNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la entrada.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Entradas"
        subtitle="El staff centraliza la referencia clínica, usa extracción asistida y crea expedientes en estado REFERENCIA sin saturar la operación."
      />

      <Card className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => {
            const active = index === activeStep
            const completed = index < activeStep
            return (
              <div
                key={step}
                className={`rounded-2xl border px-4 py-4 transition ${completed ? 'border-emerald-200 bg-emerald-50' : active ? 'border-warm-300 bg-warm-50' : 'border-warm-200 bg-white'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Paso {index + 1}</p>
                <p className="mt-2 text-lg font-bold text-warm-900">{step}</p>
              </div>
            )
          })}
        </div>

        {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{success}</div> : null}
        {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

        {activeStep === 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div
              className="rounded-[28px] border-2 border-dashed border-warm-200 bg-warm-50/80 p-8 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (file) handleFileSelect(file)
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Parser de documentos</p>
              <h2 className="mt-3 text-2xl font-black text-warm-900">Carga una referencia clínica</h2>
              <p className="mt-2 text-sm text-warm-600">Arrastra un PDF o imagen. Después podemos extraer información del documento automáticamente para prellenar nombre del niño, hospital y diagnóstico.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <label className="rounded-2xl bg-warm-700 px-5 py-3 font-semibold text-white transition hover:bg-warm-800">
                  Seleccionar archivo
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />
                </label>
                <Button variant="ghost" onClick={handleExtraction} isLoading={isExtracting}>
                  <Sparkles className="h-4 w-4" />
                  Extraer datos
                </Button>
              </div>
              {selectedFile ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-warm-700 shadow-soft">
                  <FileUp className="h-4 w-4" />
                  {selectedFile.name}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <Input label="Nombre del niño" value={childName} onChange={(event) => setChildName(event.target.value)} />
              <Input label="Diagnóstico" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
              <Input label="Hospital de origen" value={originHospital} onChange={(event) => setOriginHospital(event.target.value)} />
              <Input label="Ciudad de origen" value={originCity} onChange={(event) => setOriginCity(event.target.value)} />
              <div className="flex justify-end">
                <Button onClick={() => setActiveStep(1)}>Continuar</Button>
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input label="Nombre cuidador" value={caregiverName} onChange={(event) => setCaregiverName(event.target.value)} />
              <Input label="Apellido familia" value={familyLastName} onChange={(event) => setFamilyLastName(event.target.value)} />
              <Input label="Teléfono familiar" value={familyContactPhone} onChange={(event) => setFamilyContactPhone(event.target.value)} />
              <Input label="Fecha de llegada" type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} />
              <Input label="Acompañantes" type="number" min="0" value={companions} onChange={(event) => setCompanions(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-base font-semibold text-warm-900">Sede operativa</span>
                <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={site} onChange={(event) => setSite(event.target.value)}>
                  {availableSites.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-base font-semibold text-warm-900">Observaciones logísticas</span>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-base text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                value={logisticsNote}
                onChange={(event) => setLogisticsNote(event.target.value)}
                placeholder="Transporte, horarios, barreras de llegada o contexto relevante para el expediente."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => setActiveStep(0)}>Volver</Button>
              <Button onClick={() => setActiveStep(2)}>Revisar y guardar</Button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-3xl bg-warm-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Resumen de entrada</p>
              <div className="mt-4 space-y-3 text-sm text-warm-700">
                <p><strong>Niño:</strong> {childName || 'Pendiente'}</p>
                <p><strong>Diagnóstico:</strong> {diagnosis || 'Pendiente'}</p>
                <p><strong>Hospital:</strong> {originHospital || 'Pendiente'}</p>
                <p><strong>Familia:</strong> {caregiverName} {familyLastName}</p>
                <p><strong>Llegada:</strong> {arrivalDate}</p>
                <p><strong>Sede:</strong> {site}</p>
                <p><strong>Documento:</strong> {selectedFile?.name || 'Captura manual'}</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Impacto operativo</p>
              <p className="mt-4 text-sm text-warm-700">
                Al guardar, se crea una referencia en estado <strong>REFERENCIA</strong>. Eso alimenta la card <strong>Expedientes por completar</strong> del dashboard y entra a la bandeja socioeconómica.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="ghost" onClick={() => setActiveStep(1)}>Editar</Button>
                <Button isLoading={isSaving} onClick={handleSave}>Guardar entrada</Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Entradas recientes</p>
            <h2 className="text-2xl font-bold text-warm-900">Referencias ya capturadas en {site}</h2>
          </div>
          <Link to="/staff/dashboard">
            <Button variant="secondary">Ir al inbox operativo</Button>
          </Link>
        </div>
        <div className="grid gap-4">
          {recentEntries.map((referral) => (
            <div key={referral.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
              <div className="space-y-1">
                <p className="font-bold text-warm-900">{referral.caregiverName} {referral.familyLastName}</p>
                <p className="text-sm text-warm-700">Llegada {referral.arrivalDate} · acompañantes {referral.companions}</p>
              </div>
              <StatusChip status={referral.status} />
            </div>
          ))}
          {recentEntries.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">Aún no hay entradas registradas para esta sede.</div> : null}
        </div>
      </Card>
    </div>
  )
}
