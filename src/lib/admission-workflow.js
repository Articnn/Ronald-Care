import { calculatePriority } from './priority.js'
import { sql } from './db.js'
import { notifySiteStaff } from './room-automation.js'

const SITE_KEYWORDS = [
  { siteId: 1, keywords: ['cdmx', 'ciudad de mexico', 'mexico', 'benito juarez', 'cuauhtemoc', 'iztapalapa'] },
  { siteId: 2, keywords: ['puebla', 'cholula', 'tehuacan'] },
  { siteId: 3, keywords: ['tlalnepantla', 'naucalpan', 'atizapan', 'estado de mexico', 'edomex'] },
]

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function extractClinicalReference(payload = {}) {
  const fileName = String(payload.fileName || '').toLowerCase()
  const hint = normalizeText(payload.hintText || payload.fileName || '')

  const source = `${fileName} ${hint}`

  if (source.includes('puebla')) {
    return {
      childName: 'Sofía Ramírez',
      originHospital: 'Hospital del Niño Poblano',
      originCity: 'Puebla',
      diagnosis: 'Seguimiento oncológico pediátrico',
      caregiverName: 'Carlos',
      familyLastName: 'Ramírez',
      siteSuggestion: 'Casa Ronald McDonald Puebla',
    }
  }

  if (source.includes('tlalnepantla') || source.includes('tla')) {
    return {
      childName: 'Diego Soto',
      originHospital: 'Hospital General Tlalnepantla',
      originCity: 'Tlalnepantla',
      diagnosis: 'Control postoperatorio recurrente',
      caregiverName: 'Daniela',
      familyLastName: 'Soto',
      siteSuggestion: 'Casa Ronald McDonald Tlalnepantla',
    }
  }

  return {
    childName: 'Emilio López',
    originHospital: 'Hospital Infantil CDMX',
    originCity: 'Ciudad de México',
    diagnosis: 'Tratamiento prolongado de alta especialidad',
    caregiverName: 'María',
    familyLastName: 'López',
    siteSuggestion: 'Casa Ronald McDonald Ciudad de México',
  }
}

export function inferNearestSiteId({ originHospital, originCity, fallbackSiteId }) {
  const haystack = `${normalizeText(originHospital)} ${normalizeText(originCity)}`
  const match = SITE_KEYWORDS.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)))
  return match?.siteId || Number(fallbackSiteId || 1)
}

export function buildRequestTemplate(payload) {
  return {
    childName: payload.childName || '',
    diagnosis: payload.diagnosis || '',
    caregiverName: payload.caregiverName,
    familyLastName: payload.familyLastName,
    arrivalDate: payload.arrivalDate,
    companionCount: Number(payload.companionCount || 0),
    originHospital: payload.originHospital || '',
    originCity: payload.originCity || '',
    familyContactPhone: payload.familyContactPhone || '',
    logisticsNote: payload.logisticsNote || '',
    nextStep: 'contactar_familia_y_armar_expediente',
  }
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

export async function createExtractedDraftRequest(pool, {
  siteId,
  familyId = null,
  referralId,
  createdByUserId,
  childName,
  diagnosis,
  documentReferenceUrl,
}) {
  const priority = calculatePriority({ urgency: 'media', waitingMinutes: 0, requestType: 'recepcion', optionalWindow: null })

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('familyId', sql.Int, familyId)
    .input('referralId', sql.Int, referralId)
    .input('createdByUserId', sql.Int, createdByUserId)
    .input('title', sql.NVarChar(160), `Borrador extraído para ${childName || 'paciente por confirmar'}`)
    .input('requestType', sql.NVarChar(30), 'recepcion')
    .input('urgency', sql.NVarChar(20), 'media')
    .input('priorityScore', sql.Int, priority.score)
    .input('priorityLabel', sql.NVarChar(20), priority.label)
    .input('priorityReason', sql.NVarChar(255), `Borrador extraído desde referencia clínica${diagnosis ? `: ${diagnosis}` : ''}`)
    .input('documentReferenceUrl', sql.NVarChar(255), documentReferenceUrl || null)
    .query(`
      INSERT INTO Requests (
        SiteId, FamilyId, ReferralId, CreatedByUserId, CreatedBySource, Title, RequestType, Urgency,
        PriorityScore, PriorityLabel, PriorityReason, Status, DocumentReferenceUrl
      )
      VALUES (
        @siteId, @familyId, @referralId, @createdByUserId, 'system', @title, @requestType, @urgency,
        @priorityScore, @priorityLabel, @priorityReason, 'borrador_extraido', @documentReferenceUrl
      )
      RETURNING *
    `)

  return result.recordset[0]
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
    .input('title', sql.NVarChar(160), suggestedRoomCode ? `Preparar Habitación ${suggestedRoomCode} para ${familyDisplayName}` : `Onboarding de llegada para ${familyDisplayName}`)
    .input(
      'instructions',
      sql.NVarChar(sql.MAX),
      `Preparar ingreso de la familia ${familyDisplayName}.${suggestedRoomCode ? ` Habitacion sugerida: ${suggestedRoomCode}.` : ''} Verificar cama, kit de bienvenida, acceso asistido, y coordinar recepcion para llegada desde ${originHospital || 'clinica de origen'} el ${arrivalDate}.`,
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

// function sendTransportInstructions(payload) {
//   // Placeholder para futura integracion por WhatsApp.
//   // Aqui se dispararan instrucciones de transporte a la familia una vez aprobado el expediente.
// }

// function sendDepartureReminder(payload) {
//   // Placeholder para futura integracion por WhatsApp.
//   // Aqui se dispararan recordatorios previos a la salida estimada de la familia.
// }

// TODO: WhatsApp Trigger - instrucciones de llegada
// TODO: WhatsApp Trigger - recordatorio de salida
