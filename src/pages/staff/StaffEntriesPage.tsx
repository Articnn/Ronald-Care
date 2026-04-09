import { useMemo, useState } from 'react'
import { FileUp, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Tesseract from 'tesseract.js'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { SectionHeader } from '../../components/ui/SectionHeader'
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
  return cleaned
    .replace(/\s*\+\s*$/g, '')
    .trim()
}

function extractByPatterns(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return cleanExtractedValue(match[1])
  }
  return ''
}

function extractFieldsFromRawText(rawText: string) {
  const extractedName = extractByPatterns(rawText, [
    /Nombre del Paciente:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /Nombre:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedHospital = extractByPatterns(rawText, [
    /Hospital de origen:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /Hospital:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedDoctor = extractByPatterns(rawText, [
    /M[eé]dico que refiere:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /M[eé]dico referente:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedTutor = extractByPatterns(rawText, [
    /Tutor(?:a)?(?: legal)?:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
    /Responsable:\s*(.+?)(?=\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]+:|$)/i,
  ])
  const extractedTutorPhone = extractByPatterns(rawText, [
    /Tel[eé]fono(?: del tutor| familiar| de contacto)?:\s*([\d\s()+-]{7,})/i,
  ])
  const extractedOfficePhone = extractByPatterns(rawText, [
    /Tel[eé]fono(?: de la oficina m[eé]dica| oficina m[eé]dica| oficina)?:\s*([\d\s()+-]{7,})/i,
  ])
  const extractedDate = extractByPatterns(rawText, [
    /Fecha programada(?: de cita| de ingreso)?:\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/i,
    /Fecha:\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{2,4})/i,
  ])

  return {
    extractedName,
    extractedHospital,
    extractedDoctor,
    extractedTutor,
    extractedTutorPhone,
    extractedOfficePhone,
    extractedDate,
  }
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
    <div className="space-y-8">
      <SectionHeader
        title="Admisiones"
        subtitle="El staff centraliza la referencia logística, extrae solo datos no clínicos y crea expedientes en estado REFERENCIA sin saturar la operación."
      />

      <Card className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const active = index === activeStep
            const completed = index < activeStep
            return (
              <div
                key={step}
                className={`rounded-2xl border px-5 py-4 transition ${
                  completed ? 'border-emerald-200 bg-emerald-50' : active ? 'border-warm-300 bg-warm-50' : 'border-warm-200 bg-white'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Paso {index + 1}</p>
                <p className="mt-2 text-lg font-bold text-warm-900">{step}</p>
              </div>
            )
          })}
        </div>

        {activeStep === 0 ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div
              className="rounded-[28px] border-2 border-dashed border-warm-200 bg-warm-50/80 p-6 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (file) handleFileSelect(file)
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Carga documental</p>
              <h2 className="mt-3 text-2xl font-black text-warm-900">Carga una referencia de gestión</h2>
              <p className="mt-2 text-sm text-warm-600">
                Arrastra un PDF o imagen. Después podemos extraer información del documento automáticamente para prellenar únicamente datos logísticos.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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
                <Button variant="ghost" onClick={handleExtraction} disabled={isExtracting || !selectedFile}>
                  <Sparkles className="h-4 w-4" />
                  {isExtracting ? 'Extrayendo...' : 'Extraer datos'}
                </Button>
              </div>
              {selectedFile ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-warm-700 shadow-soft">
                  <FileUp className="h-4 w-4" />
                  {selectedFile.name}
                </div>
              ) : null}
            </div>

            <div className="space-y-5">
              <div className="space-y-4 rounded-2xl border border-warm-200 bg-white p-5">
                <div className="border-b border-warm-200 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Identificación</p>
                  <h3 className="text-lg font-bold text-warm-900">Datos del menor</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Nombre completo del menor" value={cleanSummaryValue(childFullName)} onChange={(event) => setChildFullName(event.target.value)} />
                  <Input label="Edad" value={age} onChange={(event) => setAge(event.target.value)} />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-warm-200 bg-white p-5">
                <div className="border-b border-warm-200 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Procedencia y logística</p>
                  <h3 className="text-lg font-bold text-warm-900">Institución que refiere</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Hospital de origen" value={cleanSummaryValue(originHospital)} onChange={(event) => setOriginHospital(event.target.value)} />
                  <Input label="Departamento / área" value={originDepartment} onChange={(event) => setOriginDepartment(event.target.value)} />
                  <Input label="Médico que refiere" value={cleanSummaryValue(referringDoctorName)} onChange={(event) => setReferringDoctorName(event.target.value)} />
                  <Input label="Teléfono oficina médica" value={cleanSummaryValue(doctorOfficePhone)} onChange={(event) => setDoctorOfficePhone(event.target.value)} />
                  <Input label="Fecha programada de cita o ingreso" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} />
                  <Input label="Motivo de estancia" value="Apoyo Logístico" disabled />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setActiveStep(1)}>Continuar</Button>
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="space-y-5">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4 rounded-2xl border border-warm-200 bg-warm-50/70 p-5">
                <div className="border-b border-warm-200 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Datos de familia</p>
                  <h3 className="text-lg font-bold text-warm-900">Tutor y contacto</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Nombre del tutor o tutora" value={cleanSummaryValue(tutorFullName)} onChange={(event) => setTutorFullName(event.target.value)} />
                  <Input label="Teléfono del tutor" value={cleanSummaryValue(tutorPhone)} onChange={(event) => setTutorPhone(event.target.value)} />
                  <Input label="Acompañantes" type="number" min="0" value={companions} onChange={(event) => setCompanions(event.target.value)} />
                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-warm-900">Sede operativa</span>
                    <select className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-lg" value={site} onChange={(event) => setSite(event.target.value)}>
                      {availableSites.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-warm-200 bg-white p-5">
                <div className="border-b border-warm-200 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Apoyo operativo</p>
                  <h3 className="text-lg font-bold text-warm-900">Notas de logística</h3>
                </div>
                <label className="block space-y-2">
                  <span className="text-base font-semibold text-warm-900">Observaciones</span>
                  <textarea
                    className="min-h-[150px] w-full rounded-2xl border border-warm-200 bg-white px-4 py-3 text-base text-warm-900 placeholder:text-warm-400 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                    value={logisticsNote}
                    onChange={(event) => setLogisticsNote(event.target.value)}
                    placeholder="Barreras de llegada, horarios, necesidades de recepción o información útil de coordinación."
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => setActiveStep(0)}>
                Volver
              </Button>
              <Button onClick={() => setActiveStep(2)}>Revisar y guardar</Button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-3xl bg-warm-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Resumen de admisión</p>
              <div className="mt-4 grid gap-3 text-sm text-warm-700 md:grid-cols-2">
                <p><strong>Menor:</strong> {cleanSummaryValue(childFullName) || 'Pendiente'}</p>
                <p><strong>Edad:</strong> {age || 'Pendiente'}</p>
                <p><strong>Hospital:</strong> {cleanSummaryValue(originHospital) || 'Pendiente'}</p>
                <p><strong>Área:</strong> {cleanSummaryValue(originDepartment) || 'Pendiente'}</p>
                <p><strong>Médico referente:</strong> {cleanSummaryValue(referringDoctorName) || 'Pendiente'}</p>
                <p><strong>Tel. oficina:</strong> {cleanSummaryValue(doctorOfficePhone) || 'Pendiente'}</p>
                <p><strong>Tutor:</strong> {cleanSummaryValue(tutorFullName) || 'Pendiente'}</p>
                <p><strong>Tel. tutor:</strong> {cleanSummaryValue(tutorPhone) || 'Pendiente'}</p>
                <p><strong>Fecha programada:</strong> {scheduledDate}</p>
                <p><strong>Sede:</strong> {site}</p>
                <p><strong>Documento:</strong> {documentName || 'Captura manual'}</p>
                <p><strong>Motivo:</strong> Apoyo Logístico</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Impacto operativo</p>
              <p className="mt-4 text-sm text-warm-700">
                Al guardar, se crea una referencia en estado <strong>REFERENCIA</strong> y un registro operativo en <strong>solicitudes</strong> para alimentar el conteo de expedientes por completar.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="ghost" onClick={() => setActiveStep(1)}>
                  Editar
                </Button>
                <Button isLoading={isSaving} onClick={handleSave}>
                  Guardar admisión
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Admisiones recientes</p>
            <h2 className="text-2xl font-bold text-warm-900">Referencias ya capturadas en {site}</h2>
          </div>
          <Link to="/staff/dashboard">
            <Button variant="secondary">Ir a la bandeja de casos</Button>
          </Link>
        </div>
        <div className="grid gap-4">
          {recentEntries.map((referral) => (
            <div key={referral.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warm-50 p-4">
              <div className="space-y-1">
                <p className="font-bold text-warm-900">
                  {referral.caregiverName} {referral.familyLastName}
                </p>
                <p className="text-sm text-warm-700">Llegada {referral.arrivalDate} · acompañantes {referral.companions}</p>
              </div>
              <StatusChip status={referral.status} />
            </div>
          ))}
          {recentEntries.length === 0 ? <div className="rounded-2xl bg-warm-50 p-4 text-sm text-warm-700">Aún no hay admisiones registradas para esta sede.</div> : null}
        </div>
      </Card>
    </div>
  )
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
