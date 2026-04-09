import { useMemo, useState, type ReactNode } from 'react'
import { Check, FileUp, Sparkles, Upload } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Tesseract from 'tesseract.js'
import { Input } from '../../components/ui/Input'
import { StatusChip } from '../../components/ui/StatusChip'
import { useAppState } from '../../context/AppContext'
import { createAdmissionReferral } from '../../lib/api'

const steps = ['Documento logístico', 'Datos de familia', 'Confirmación'] as const

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function readFileAsText(file: File) {
  const buffer = await file.arrayBuffer()
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const latin1Text = new TextDecoder('latin1', { fatal: false }).decode(buffer)
  return `${utf8Text}\n${latin1Text}`
}

function cleanExtractedValue(value?: string) {
  return String(value || '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function cleanSummaryValue(value?: string | null) {
  const cleaned = cleanExtractedValue(value || '')
  if (!cleaned) return ''
  return cleaned.replace(/\s*[+/]\s*$/, '').trim()
}

function extractByPatterns(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return cleanExtractedValue(match[1])
  }
  return ''
}

function extractFieldsFromRawText(rawText: string) {
  const extractedAge = extractByPatterns(rawText, [
    /Edad(?: del Paciente| del menor)?:\s*([0-9]{1,2})/i,
    /\b([0-9]{1,2})\s*años?\b/i,
  ])
  const extractedName = extractByPatterns(rawText, [
    /Nombre del Paciente:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /Nombre:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedHospital = extractByPatterns(rawText, [
    /Hospital de origen:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /Hospital:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedDoctor = extractByPatterns(rawText, [
    /M[éeÉ]dico que refiere:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /M[éeÉ]dico referente:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedTutor = extractByPatterns(rawText, [
    /Tutor(?:a)?(?: legal)?:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /Responsable:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedTutorPhone = extractByPatterns(rawText, [
    /Tel[éeÉ]fono(?: del tutor| familiar| de contacto| tutor| celular tutor| celular familiar)?:\s*((?:\d{2,3}-\d{3,4}-\d{4})|[\d\s()+-]{7,})/i,
    /Celular(?: del tutor| familiar)?:\s*((?:\d{2,3}-\d{3,4}-\d{4})|[\d\s()+-]{7,})/i,
  ])
  const extractedOfficePhone = extractByPatterns(rawText, [
    /Tel[éeÉ]fono(?: de la oficina m[éeÉ]dica| oficina m[éeÉ]dica| oficina| oficina medica)?:\s*((?:\d{2,3}-\d{3,4}-\d{4})|[\d\s()+-]{7,})/i,
    /Conmutador:\s*((?:\d{2,3}-\d{3,4}-\d{4})|[\d\s()+-]{7,})/i,
  ])
  const extractedDate = extractByPatterns(rawText, [
    /Fecha programada(?: de cita| de ingreso)?:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
    /Fecha:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})/i,
  ])

  return {
    extractedAge,
    extractedName,
    extractedHospital,
    extractedDoctor,
    extractedTutor,
    extractedTutorPhone,
    extractedOfficePhone,
    extractedDate,
  }
}

function normalizeDate(value: string) {
  const cleaned = cleanExtractedValue(value)
  if (!cleaned) return ''

  const normalized = cleaned.replace(/\./g, '/').replace(/-/g, '/')
  const [a, b, c] = normalized.split('/')
  if (!a || !b || !c) return ''

  if (normalized.match(/^\d{4}\//)) {
    return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
  }

  const year = c.length === 2 ? `20${c}` : c
  return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
}

function formatReadableDate(value?: string | null) {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX')
}

function StepIndicator({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const completed = index < activeStep
        const active = index === activeStep
        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                  completed
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : active
                      ? 'border-warm-700 bg-warm-700 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {completed ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-semibold uppercase tracking-widest ${active ? 'text-warm-600' : completed ? 'text-emerald-600' : 'text-gray-400'}`}>
                  Paso {index + 1}
                </p>
                <p className={`text-xs font-medium ${active ? 'text-warm-900' : completed ? 'text-gray-600' : 'text-gray-400'}`}>{step}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`mx-3 h-0.5 flex-1 transition-all ${completed ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FormSection({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">{label}</p>
        <h3 className="mt-0.5 text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function StaffEntriesPage() {
  const { authToken, availableSites, referrals, refreshConnectedData, setSite, site, pushToast } = useAppState()
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState('')

  const [childFullName, setChildFullName] = useState('')
  const [age, setAge] = useState('')
  const [originHospital, setOriginHospital] = useState('')
  const [originDepartment, setOriginDepartment] = useState('')
  const [originCity, setOriginCity] = useState('')
  const [referringDoctorName, setReferringDoctorName] = useState('')
  const [doctorOfficePhone, setDoctorOfficePhone] = useState('')
  const [scheduledDate, setScheduledDate] = useState('2026-04-09')
  const [tutorFullName, setTutorFullName] = useState('')
  const [tutorPhone, setTutorPhone] = useState('')
  const [companions, setCompanions] = useState('2')
  const [logisticsNote, setLogisticsNote] = useState('')

  const recentEntries = useMemo(() => referrals.filter((item) => item.site === site).slice(0, 4), [referrals, site])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setDocumentName(file.name)
  }

  const handleExtraction = async () => {
    if (!selectedFile) {
      pushToast({ type: 'info', message: 'Selecciona primero un PDF o imagen para extraer la información.' })
      return
    }

    setIsExtracting(true)

    try {
      const rawText = isPdfFile(selectedFile)
        ? cleanExtractedValue(await readFileAsText(selectedFile))
        : cleanExtractedValue((await Tesseract.recognize(selectedFile, 'spa+eng')).data.text)

      const {
        extractedAge,
        extractedName,
        extractedHospital,
        extractedDoctor,
        extractedTutor,
        extractedTutorPhone,
        extractedOfficePhone,
        extractedDate,
      } = extractFieldsFromRawText(rawText)

      if (!extractedName && !extractedHospital && !extractedDoctor) {
        throw new Error('No se pudo leer el documento automáticamente. Por favor, ingresa los datos manualmente')
      }

      setAge((current) => current || cleanSummaryValue(extractedAge))
      setChildFullName((current) => current || cleanSummaryValue(extractedName))
      setOriginHospital((current) => current || cleanSummaryValue(extractedHospital))
      setReferringDoctorName((current) => current || cleanSummaryValue(extractedDoctor))
      setTutorFullName((current) => current || cleanSummaryValue(extractedTutor))
      setTutorPhone((current) => current || cleanSummaryValue(extractedTutorPhone))
      setDoctorOfficePhone((current) => current || cleanSummaryValue(extractedOfficePhone))
      setScheduledDate((current) => current || normalizeDate(extractedDate) || '2026-04-09')
      setLogisticsNote((current) => current || `Admisión precargada desde ${selectedFile.name}.`)
      pushToast({ type: 'success', message: 'Datos extraídos con éxito.' })
      setActiveStep(1)
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo leer el documento automáticamente. Por favor, ingresa los datos manualmente'
      pushToast({ type: 'error', message })
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!authToken) return
    setIsSaving(true)

    try {
      const siteId = availableSites.findIndex((item) => item === site) + 1
      const created = await createAdmissionReferral(authToken, {
        siteId,
        childFullName,
        age,
        originHospital,
        originDepartment,
        originCity,
        referringDoctorName,
        doctorOfficePhone,
        tutorFullName,
        tutorPhone,
        documentName: documentName || undefined,
        scheduledDate,
        arrivalDate: scheduledDate,
        companionCount: Number(companions),
        logisticsNote,
        eligibilityConfirmed: true,
        admissionStage: 'referencia',
      })

      await refreshConnectedData()

      if (created.AdmissionStage === 'lista_espera') {
        pushToast({ type: 'info', message: 'Sin cupo disponible. El caso se movió a Lista de Espera.' })
        navigate('/staff/waitlist')
        return
      }

      pushToast({ type: 'success', message: 'Expediente guardado.' })
      setActiveStep(0)
      setSelectedFile(null)
      setDocumentName('')
      setChildFullName('')
      setAge('')
      setOriginHospital('')
      setOriginDepartment('')
      setOriginCity('')
      setReferringDoctorName('')
      setDoctorOfficePhone('')
      setScheduledDate('2026-04-09')
      setTutorFullName('')
      setTutorPhone('')
      setCompanions('2')
      setLogisticsNote('')
    } catch (err) {
      pushToast({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo registrar la admisión.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Admisiones</h1>
        <p className="mt-1 text-sm text-gray-500">
          El staff centraliza la referencia logística, extrae solo datos no clínicos y crea expedientes en estado{' '}
          <span className="font-medium text-warm-700">REFERENCIA</span> sin saturar la operación.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <StepIndicator activeStep={activeStep} />
        </div>

        <div className="p-6">
          {activeStep === 0 && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-warm-300 hover:bg-warm-50/40"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  const file = event.dataTransfer.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <Upload className="h-5 w-5 text-warm-600" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Carga documental</p>
                <h2 className="mt-1 text-base font-semibold text-gray-900">Carga una referencia de gestión</h2>
                <p className="mt-1.5 max-w-xs text-xs text-gray-500">
                  Arrastra un PDF o imagen. Extraemos información automáticamente para prellenar solo datos logísticos.
                </p>

                {selectedFile ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <FileUp className="h-3.5 w-3.5" />
                    {selectedFile.name}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <label className="cursor-pointer rounded-md bg-warm-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-warm-800 focus-within:ring-2 focus-within:ring-warm-500 focus-within:ring-offset-1">
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
                  <button
                    onClick={handleExtraction}
                    disabled={isExtracting || !selectedFile}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isExtracting ? 'Extrayendo...' : 'Extraer datos'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <FormSection label="Identificación" title="Datos del menor">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input label="Nombre completo del menor" value={cleanSummaryValue(childFullName)} onChange={(event) => setChildFullName(event.target.value)} />
                    <Input label="Edad" value={age} onChange={(event) => setAge(event.target.value)} />
                  </div>
                </FormSection>

                <FormSection label="Procedencia y logística" title="Institución que refiere">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input label="Hospital de origen" value={cleanSummaryValue(originHospital)} onChange={(event) => setOriginHospital(event.target.value)} />
                    <Input label="Departamento / área" value={originDepartment} onChange={(event) => setOriginDepartment(event.target.value)} />
                    <Input label="Médico que refiere" value={cleanSummaryValue(referringDoctorName)} onChange={(event) => setReferringDoctorName(event.target.value)} />
                    <Input label="Teléfono oficina médica" value={cleanSummaryValue(doctorOfficePhone)} onChange={(event) => setDoctorOfficePhone(event.target.value)} />
                    <Input label="Fecha programada de cita o ingreso" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} />
                    <Input label="Motivo de estancia" value="Apoyo Logístico" disabled />
                  </div>
                </FormSection>

                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="rounded-md bg-warm-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <FormSection label="Datos de familia" title="Tutor y contacto">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input label="Nombre del tutor o tutora" value={cleanSummaryValue(tutorFullName)} onChange={(event) => setTutorFullName(event.target.value)} />
                    <Input label="Teléfono del tutor" value={cleanSummaryValue(tutorPhone)} onChange={(event) => setTutorPhone(event.target.value)} />
                    <Input label="Acompañantes" type="number" min="0" value={companions} onChange={(event) => setCompanions(event.target.value)} />
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-gray-700">Sede operativa</span>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
                        value={site}
                        onChange={(event) => setSite(event.target.value)}
                      >
                        {availableSites.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </FormSection>

                <FormSection label="Apoyo operativo" title="Notas de logística">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Observaciones</span>
                    <textarea
                      className="min-h-[148px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-100"
                      value={logisticsNote}
                      onChange={(event) => setLogisticsNote(event.target.value)}
                      placeholder="Barreras de llegada, horarios, necesidades de recepción o información útil de coordinación."
                    />
                  </label>
                </FormSection>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveStep(0)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Volver
                </button>
                <button
                  onClick={() => setActiveStep(2)}
                  className="rounded-md bg-warm-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800"
                >
                  Revisar y guardar
                </button>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-lg border border-gray-200 bg-gray-50">
                <div className="border-b border-gray-200 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Resumen de admisión</p>
                </div>
                <div className="grid gap-x-6 gap-y-3 p-5 text-sm md:grid-cols-2">
                  {[
                    ['Menor', cleanSummaryValue(childFullName) || 'Pendiente'],
                    ['Edad', age || 'Pendiente'],
                    ['Hospital', cleanSummaryValue(originHospital) || 'Pendiente'],
                    ['Área', cleanSummaryValue(originDepartment) || 'Pendiente'],
                    ['Médico referente', cleanSummaryValue(referringDoctorName) || 'Pendiente'],
                    ['Tel. oficina', cleanSummaryValue(doctorOfficePhone) || 'Pendiente'],
                    ['Tutor', cleanSummaryValue(tutorFullName) || 'Pendiente'],
                    ['Tel. tutor', cleanSummaryValue(tutorPhone) || 'Pendiente'],
                    ['Fecha programada', formatReadableDate(scheduledDate)],
                    ['Sede', site],
                    ['Documento', documentName || 'Captura manual'],
                    ['Motivo', 'Apoyo Logístico'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                      <p className="mt-0.5 font-medium text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Impacto operativo</p>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600">
                    Al guardar, se crea una referencia en estado{' '}
                    <span className="rounded bg-warm-100 px-1.5 py-0.5 font-semibold text-warm-700">REFERENCIA</span>{' '}
                    y un registro operativo en{' '}
                    <span className="font-semibold text-gray-800">solicitudes</span>{' '}
                    para alimentar el conteo de expedientes por completar.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="rounded-md bg-warm-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-warm-800 disabled:opacity-60"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar admisión'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">Admisiones recientes</p>
            <h2 className="mt-0.5 text-sm font-semibold text-gray-900">Referencias capturadas en {site}</h2>
          </div>
          <Link
            to="/staff/dashboard"
            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Ir a bandeja de casos
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {recentEntries.map((referral) => (
            <div key={referral.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {referral.caregiverName} {referral.familyLastName}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Llegada {formatReadableDate(referral.arrivalDate)} · {referral.companions} acompañantes
                </p>
              </div>
              <StatusChip status={referral.status} />
            </div>
          ))}
          {recentEntries.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Aún no hay admisiones registradas para esta sede.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
