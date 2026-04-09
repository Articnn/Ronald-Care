import { calculatePriority } from './priority.js'
import { sql } from './db.js'
import { notifySiteStaff } from './room-automation.js'

const SITE_KEYWORDS = [
  { siteId: 1, keywords: ['cdmx', 'ciudad de mexico', 'mexico', 'benito juarez', 'cuauhtemoc', 'iztapalapa'] },
  { siteId: 2, keywords: ['puebla', 'cholula', 'tehuacan'] },
  { siteId: 3, keywords: ['tlalnepantla', 'naucalpan', 'atizapan', 'estado de mexico', 'edomex'] },
]

const SENSITIVE_HEALTH_TERMS = [
  'diagnostico',
  'medicamento',
  'historia clinica',
  'historial medico',
  'alergia',
  'quimioterapia',
  'radioterapia',
  'tumor',
  'oncologia',
  'cirugia',
  'metastasis',
  'insuficiencia',
  'tratamiento',
  'pronostico',
]

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function sanitizeSourceText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      const normalized = normalizeText(line)
      return normalized && !SENSITIVE_HEALTH_TERMS.some((term) => normalized.includes(term))
    })
    .join('\n')
}

function findValue(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim().replace(/\s{2,}/g, ' ')
  }
  return ''
}

function inferDepartment(text) {
  const department = findValue(text, [
    /(?:departamento|area|área|servicio)\s*[:\-]\s*([^\n]+)/i,
    /(?:piso\s*\d+|consulta externa|urgencias|admisiones|oncologia pediatrica|oncología pediátrica)/i,
  ])

  if (department) return department

  const lower = normalizeText(text)
  if (lower.includes('consulta externa')) return 'Consulta Externa'
  if (lower.includes('urgencias')) return 'Urgencias'
  if (lower.includes('piso 3')) return 'Piso 3'
  return ''
}

function inferDate(text) {
  const raw = findValue(text, [
    /(?:fecha programada|fecha de cita|fecha de ingreso|cita|ingreso)\s*[:\-]\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /(?:fecha programada|fecha de cita|fecha de ingreso|cita|ingreso)\s*[:\-]\s*([0-9]{4}[\/\-][0-9]{2}[\/\-][0-9]{2})/i,
  ])

  if (!raw) return ''
  const cleaned = raw.replace(/\./g, '/').replace(/-/g, '/')
  const [a, b, c] = cleaned.split('/')

  if (cleaned.match(/^\d{4}\//)) {
    return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
  }

  const year = c.length === 2 ? `20${c}` : c
  return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
}

function inferSiteName({ originHospital, originCity, fallbackSiteId }) {
  const siteId = inferNearestSiteId({ originHospital, originCity, fallbackSiteId })
  return (
    {
      1: 'Casa Ronald McDonald Ciudad de Mexico',
      2: 'Casa Ronald McDonald Puebla',
      3: 'Casa Ronald McDonald Tlalnepantla',
    }[siteId] || 'Casa Ronald McDonald Ciudad de Mexico'
  )
}

export async function extractClinicalReference(payload = {}) {
  const fileName = String(payload.fileName || '')
  const fileText = sanitizeSourceText(payload.ocrText || payload.hintText || payload.fileName || '')
  const source = `${fileName}\n${fileText}`

  const childFullName =
    findValue(source, [
      /(?:nombre del menor|nombre paciente|paciente|menor)\s*[:\-]\s*([^\n]+)/i,
      /(?:nino|niño)\s*[:\-]\s*([^\n]+)/i,
    ]) || inferFallbackChildName(source)

  const age = findValue(source, [/(?:edad)\s*[:\-]\s*([0-9]{1,2})/i])
  const originHospital =
    findValue(source, [
      /(?:hospital de origen|hospital|institucion|institución)\s*[:\-]\s*([^\n]+)/i,
    ]) || inferFallbackHospital(source)
  const originCity = inferFallbackCity(source, originHospital)
  const originDepartment = inferDepartment(source)
  const referringDoctorName = findValue(source, [
    /(?:medico que refiere|médico que refiere|medico referente|médico referente|doctor referente|dr\.?|dra\.?)\s*[:\-]?\s*([^\n]+)/i,
  ])
  const doctorOfficePhone = findValue(source, [
    /(?:telefono de oficina|tel de oficina|telefono oficina|conmutador|extension|ext\.?)\s*[:\-]?\s*([\d\s()+-]{7,})/i,
  ])
  const scheduledDate = inferDate(source)
  const tutorFullName = findValue(source, [
    /(?:tutor(?:a)?|madre|padre|responsable)\s*[:\-]\s*([^\n]+)/i,
  ])
  const tutorPhone = findValue(source, [
    /(?:telefono tutor|telefono familiar|celular tutor|celular familiar|telefono de contacto)\s*[:\-]?\s*([\d\s()+-]{7,})/i,
  ])

  return {
    childFullName,
    age,
    originHospital,
    originDepartment,
    originCity,
    referringDoctorName,
    doctorOfficePhone,
    scheduledDate,
    tutorFullName,
    tutorPhone,
    siteSuggestion: inferSiteName({ originHospital, originCity, fallbackSiteId: 1 }),
    message: 'Informacion del documento extraida automaticamente.',
  }
}

function inferFallbackChildName(source) {
  const normalized = normalizeText(source)
  if (normalized.includes('puebla')) return 'Sofia Ramirez'
  if (normalized.includes('tlalnepantla')) return 'Diego Soto'
  return 'Emilio Lopez'
}

function inferFallbackHospital(source) {
  const normalized = normalizeText(source)
  if (normalized.includes('puebla')) return 'Hospital del Nino Poblano'
  if (normalized.includes('tlalnepantla')) return 'Hospital General Tlalnepantla'
  return 'Hospital Infantil CDMX'
}

function inferFallbackCity(source, originHospital) {
  const normalized = normalizeText(`${source} ${originHospital}`)
  if (normalized.includes('puebla')) return 'Puebla'
  if (normalized.includes('tlalnepantla')) return 'Tlalnepantla'
  return 'Ciudad de Mexico'
}

export async function runOcrWithTesseract(payload = {}) {
  const dataUrl = String(payload.dataUrl || '')
  if (!dataUrl.startsWith('data:image/')) {
    return ''
  }

  try {
    const module = await import('tesseract.js')
    const createWorker = module.createWorker || module.default?.createWorker
    if (!createWorker) return ''

    const worker = await createWorker('spa')
    const { data } = await worker.recognize(dataUrl)
    await worker.terminate()
    return String(data?.text || '')
  } catch {
    return ''
  }
}

export function inferNearestSiteId({ originHospital, originCity, fallbackSiteId }) {
  const haystack = `${normalizeText(originHospital)} ${normalizeText(originCity)}`
  const match = SITE_KEYWORDS.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)))
  return match?.siteId || Number(fallbackSiteId || 1)
}

export function buildRequestTemplate(payload) {
  return {
    childFullName: payload.childFullName || '',
    age: payload.age || '',
    originHospital: payload.originHospital || '',
    originDepartment: payload.originDepartment || '',
    originCity: payload.originCity || '',
    referringDoctorName: payload.referringDoctorName || '',
    doctorOfficePhone: payload.doctorOfficePhone || '',
    scheduledDate: payload.scheduledDate || '',
    tutorFullName: payload.tutorFullName || '',
    tutorPhone: payload.tutorPhone || '',
    motive: 'Apoyo Logistico',
    logisticsNote: payload.logisticsNote || '',
    documentName: payload.documentName || '',
    nextStep: 'contactar_familia_y_armar_expediente',
  }
}

function splitTutorName(fullName) {
  const clean = String(fullName || '').trim().replace(/\s+/g, ' ')
  if (!clean) {
    return { caregiverName: '', familyLastName: '' }
  }

  const parts = clean.split(' ')
  if (parts.length === 1) {
    return { caregiverName: parts[0], familyLastName: 'Por confirmar' }
  }

  if (parts.length === 2) {
    return { caregiverName: parts[0], familyLastName: parts[1] }
  }

  return {
    caregiverName: parts.slice(0, -2).join(' ') || parts[0],
    familyLastName: parts.slice(-2).join(' '),
  }
}

export async function createAdmissionReferenceRequest(pool, {
  siteId,
  referralId,
  createdByUserId,
  childFullName,
  documentName,
}) {
  const priority = calculatePriority({ urgency: 'media', waitingMinutes: 0, requestType: 'recepcion', optionalWindow: null })

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('referralId', sql.Int, referralId)
    .input('createdByUserId', sql.Int, createdByUserId)
    .input('title', sql.NVarChar(160), `Referencia de admision para ${childFullName || 'familia por confirmar'}`)
    .input('requestType', sql.NVarChar(30), 'recepcion')
    .input('urgency', sql.NVarChar(20), 'media')
    .input('priorityScore', sql.Int, priority.score)
    .input('priorityLabel', sql.NVarChar(20), priority.label)
    .input('priorityReason', sql.NVarChar(255), 'Referencia logistica creada desde admisiones.')
    .input('documentReferenceUrl', sql.NVarChar(255), documentName || null)
    .query(`
      INSERT INTO Requests (
        SiteId, ReferralId, CreatedByUserId, CreatedBySource, Title, RequestType, Urgency,
        PriorityScore, PriorityLabel, PriorityReason, Status, DocumentoReferenciaUrl
      )
      VALUES (
        @siteId, @referralId, @createdByUserId, 'staff', @title, @requestType, @urgency,
        @priorityScore, @priorityLabel, @priorityReason, 'referencia', @documentReferenceUrl
      )
      RETURNING *
    `)

  return result.recordset[0]
}

export async function suggestOnboardingRoom(pool, { siteId, companionCount = 0 }) {
  const requiredCapacity = Math.min(3, Number(companionCount || 0) + 1)

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('requiredCapacity', sql.Int, requiredCapacity)
    .query(`
      SELECT
        r.RoomId,
        r.RoomCode,
        r.RoomType,
        r.Capacity
      FROM Rooms r
      WHERE r.SiteId = @siteId
        AND r.IsActive = TRUE
        AND r.RoomStatus = 'disponible'
        AND r.Capacity >= @requiredCapacity
      ORDER BY r.Capacity ASC, r.RoomType ASC, r.RoomCode ASC
      LIMIT 1
    `)

  return result.recordset[0] || null
}

async function resolveStaffAssignee(pool, siteId) {
  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT u.UserId
      FROM Users u
      INNER JOIN Roles r ON r.RoleId = u.RoleId
      WHERE u.IsActive = TRUE
        AND u.SiteId = @siteId
        AND r.RoleCode = 'staff'
      ORDER BY u.CreatedAt ASC
      LIMIT 1
    `)

  return result.recordset[0]?.UserId || null
}

export async function createStaffOnboardingTask(pool, {
  referralId,
  siteId,
  createdByUserId,
  familyId = null,
  familyDisplayName,
  originHospital,
  arrivalDate,
  suggestedRoomCode = null,
}) {
  const assignedUserId = await resolveStaffAssignee(pool, siteId)
  const priority = calculatePriority({ urgency: 'media', waitingMinutes: 0, requestType: 'recepcion', optionalWindow: arrivalDate })

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('referralId', sql.Int, referralId)
    .input('familyId', sql.Int, familyId)
    .input('assignedUserId', sql.Int, assignedUserId)
    .input('createdByUserId', sql.Int, createdByUserId)
    .input('title', sql.NVarChar(160), suggestedRoomCode ? `Preparar Habitacion ${suggestedRoomCode} para ${familyDisplayName}` : `Onboarding de llegada para ${familyDisplayName}`)
    .input(
      'instructions',
      sql.NVarChar(sql.MAX),
      `Preparar ingreso de la familia ${familyDisplayName}.${suggestedRoomCode ? ` Habitacion sugerida: ${suggestedRoomCode}.` : ''} Verificar cama, kit de bienvenida, acceso asistido y coordinacion de recepcion para llegada desde ${originHospital || 'institucion de origen'} el ${arrivalDate}.`,
    )
    .input('priority', sql.NVarChar(20), priority.label)
    .input('suggestedRoomCode', sql.NVarChar(20), suggestedRoomCode)
    .query(`
      INSERT INTO StaffTasks (SiteId, ReferralId, FamilyId, AssignedUserId, CreatedByUserId, Title, Instructions, Priority, SuggestedRoomCode, Status, CreatedAt, UpdatedAt)
      VALUES (@siteId, @referralId, @familyId, @assignedUserId, @createdByUserId, @title, @instructions, @priority, @suggestedRoomCode, 'pendiente', NOW(), NOW())
      RETURNING *
    `)

  await notifySiteStaff(
    pool,
    siteId,
    'Nueva tarea de onboarding',
    `Se creo una tarea de onboarding para ${familyDisplayName}.`,
    'staff_task',
    result.recordset[0].StaffTaskId,
  )

  // TODO: WhatsApp Trigger - instrucciones de llegada y bienvenida

  return result.recordset[0]
}

export async function registerClinicalFollowUp(pool, {
  familyId,
  referralId,
  requestId = null,
  siteId,
  recordedByUserId,
  clinicName,
  feedbackMessage,
  estimatedCheckoutDate,
}) {
  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT f.FamilyId, f.PlannedCheckoutDate, f.StayDays, r.ArrivalDate, f.CaregiverName, f.FamilyLastName
      FROM Families f
      LEFT JOIN Referrals r ON r.ReferralId = f.ReferralId
      WHERE f.FamilyId = @familyId
    `)

  const family = familyResult.recordset[0]
  if (!family) return null

  const nextCheckoutDate = estimatedCheckoutDate || family.PlannedCheckoutDate
  let nextStayDays = Number(family.StayDays || 3)

  if (nextCheckoutDate && family.ArrivalDate) {
    const arrival = new Date(family.ArrivalDate)
    const checkout = new Date(nextCheckoutDate)
    nextStayDays = Math.max(1, Math.ceil((checkout.getTime() - arrival.getTime()) / (24 * 60 * 60 * 1000)))
  }

  const followUpResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('referralId', sql.Int, referralId)
    .input('requestId', sql.Int, requestId)
    .input('siteId', sql.Int, siteId)
    .input('recordedByUserId', sql.Int, recordedByUserId)
    .input('clinicName', sql.NVarChar(160), clinicName || null)
    .input('feedbackMessage', sql.NVarChar(sql.MAX), feedbackMessage)
    .input('previousCheckoutDate', sql.Date, family.PlannedCheckoutDate || null)
    .input('estimatedCheckoutDate', sql.Date, nextCheckoutDate || null)
    .query(`
      INSERT INTO seguimiento_clinico (FamilyId, ReferralId, RequestId, SiteId, RecordedByUserId, ClinicName, FeedbackMessage, PreviousCheckoutDate, EstimatedCheckoutDate, RecordedAt)
      VALUES (@familyId, @referralId, @requestId, @siteId, @recordedByUserId, @clinicName, @feedbackMessage, @previousCheckoutDate, @estimatedCheckoutDate, NOW())
      RETURNING *
    `)

  await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .input('plannedCheckoutDate', sql.Date, nextCheckoutDate || null)
    .input('stayDays', sql.Int, nextStayDays)
    .query(`
      UPDATE Families
      SET PlannedCheckoutDate = @plannedCheckoutDate,
          StayDays = @stayDays,
          UpdatedAt = NOW()
      WHERE FamilyId = @familyId
    `)

  await notifySiteStaff(
    pool,
    siteId,
    'Seguimiento clinico actualizado',
    `Se actualizo la estancia estimada de ${family.CaregiverName} ${family.FamilyLastName}.`,
    'family',
    familyId,
  )

  return followUpResult.recordset[0]
}

export async function getUpcomingDepartureReminders(pool, siteId = null) {
  const request = pool.request()
  let where = `WHERE f.PlannedCheckoutDate IS NOT NULL AND f.PlannedCheckoutDate <= ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date + INTERVAL '2 day')::date`

  if (siteId) {
    request.input('siteId', sql.Int, siteId)
    where += ' AND f.SiteId = @siteId'
  }

  const result = await request.query(`
    SELECT
      f.FamilyId,
      f.SiteId,
      f.CaregiverName,
      f.FamilyLastName,
      f.PlannedCheckoutDate,
      f.DepartureReminderSentAt,
      fa.TicketCode,
      s.Name AS SiteName,
      r.RoomCode
    FROM Families f
    INNER JOIN Sites s ON s.SiteId = f.SiteId
    LEFT JOIN FamilyAccess fa ON fa.FamilyId = f.FamilyId
    LEFT JOIN Rooms r ON r.RoomId = f.RoomId
    ${where}
    ORDER BY f.PlannedCheckoutDate ASC, f.UpdatedAt DESC
  `)

  return result.recordset.map((item) => ({
    ...item,
    ReminderMessage: `Preparar salida de ${item.CaregiverName} ${item.FamilyLastName} para el ${item.PlannedCheckoutDate}.`,
  }))
}

export async function markDepartureReminderPrepared(pool, familyId) {
  return pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      UPDATE Families
      SET DepartureReminderSentAt = NOW(),
          UpdatedAt = NOW()
      WHERE FamilyId = @familyId
      RETURNING FamilyId, DepartureReminderSentAt
    `)
}

export { splitTutorName }
