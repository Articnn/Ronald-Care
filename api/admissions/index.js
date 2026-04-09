import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { notifySiteStaff } from '../../src/lib/room-automation.js'
import {
  buildRequestTemplate,
  createAdmissionReferenceRequest,
  createStaffOnboardingTask,
  inferNearestSiteId,
  registerClinicalFollowUp,
  splitTutorName,
  suggestOnboardingRoom,
} from '../../src/lib/admission-workflow.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { required, toInt } from '../../src/lib/validation.js'

function mapAdmissionMessage(stage) {
  if (stage === 'expediente_armado') return 'Expediente armado y listo para aprobacion.'
  if (stage === 'aprobada') return 'Aprobada y enviada a automatizacion de estancia.'
  if (stage === 'lista_espera') return 'Sin cupo disponible en esta sede. El registro se movio a la Lista de Espera.'
  if (stage === 'borrador_extraido') return 'Documento recibido y prellenado para revision operativa.'
  return 'Referencia recibida y lista para completar expediente.'
}

export default withApi({ methods: ['GET', 'POST', 'PATCH'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()

  if (req.method === 'GET') {
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const dbReq = pool.request()
    let where = 'WHERE 1=1'

    if (siteId) {
      dbReq.input('siteId', sql.Int, siteId)
      where += ' AND COALESCE(r.AssignedSiteId, r.SiteId) = @siteId'
    }

    if (req.query.stage) {
      dbReq.input('stage', sql.NVarChar(30), String(req.query.stage))
      where += ' AND r.AdmissionStage = @stage'
    }

    const result = await dbReq.query(`
      SELECT
        r.ReferralId,
        r.SiteId,
        r.AssignedSiteId,
        rs.Name AS SiteName,
        ass.Name AS AssignedSiteName,
        r.CaregiverName,
        r.FamilyLastName,
        r.ChildName,
        r.Diagnosis,
        r.ReferralCode,
        r.FamilyCode,
        r.Status,
        r.AdmissionStage,
        r.OriginHospital,
        r.OriginCity,
        r.RequestTemplateJson,
        r.SocialWorkerName,
        r.FamilyContactPhone,
        r.DossierSummary,
        r.ApprovedAt,
        r.WaitlistEnteredAt,
        r.TransportEventReady,
        r.ReservedRoomId,
        r.ArrivalDate,
        r.CompanionCount,
        r.LogisticsNote,
        r.EligibilityConfirmed,
        f.FamilyId,
        rr.RoomCode AS ReservedRoomCode
      FROM Referrals r
      INNER JOIN Sites rs ON rs.SiteId = r.SiteId
      LEFT JOIN Sites ass ON ass.SiteId = r.AssignedSiteId
      LEFT JOIN Families f ON f.ReferralId = r.ReferralId
      LEFT JOIN Rooms rr ON rr.RoomId = r.ReservedRoomId
      ${where}
      ORDER BY COALESCE(r.WaitlistEnteredAt, r.CreatedAt) ASC, r.CreatedAt DESC
    `)

    return result.recordset.map((item) => ({
      ...item,
      Message: mapAdmissionMessage(item.AdmissionStage),
    }))
  }

  if (req.method === 'POST') {
    required(req.body, ['tutorFullName', 'arrivalDate'])
    const siteId = resolveScopedSiteId(req, req.body.siteId || req.auth.siteId)
    const admissionStage = String(req.body.admissionStage || 'referencia')
    const tutorNameParts = splitTutorName(req.body.tutorFullName)

    const referralCode = `REF-${Date.now().toString().slice(-6)}`
    const familyCode = `FAM-${Math.floor(1000 + Math.random() * 8999)}`
    const requestTemplate = buildRequestTemplate(req.body)
    const availableRoom = await suggestOnboardingRoom(pool, {
      siteId,
      companionCount: req.body.companionCount || 2,
    })
    const isWaitlistedOnCreate = !availableRoom

    const result = await pool
      .request()
      .input('siteId', sql.Int, siteId)
      .input('createdByUserId', sql.Int, req.auth.sub)
      .input('caregiverName', sql.NVarChar(100), tutorNameParts.caregiverName || req.body.tutorFullName)
      .input('familyLastName', sql.NVarChar(100), tutorNameParts.familyLastName || 'Por confirmar')
      .input('childName', sql.NVarChar(120), req.body.childFullName || null)
      .input('diagnosis', sql.NVarChar(255), 'Apoyo Logistico')
      .input('referralCode', sql.NVarChar(30), referralCode)
      .input('familyCode', sql.NVarChar(30), familyCode)
      .input('originHospital', sql.NVarChar(160), req.body.originHospital || null)
      .input('originCity', sql.NVarChar(100), req.body.originCity || null)
      .input('familyContactPhone', sql.NVarChar(40), req.body.tutorPhone || null)
      .input('requestTemplateJson', sql.NVarChar(sql.MAX), JSON.stringify(requestTemplate))
      .input('arrivalDate', sql.Date, req.body.scheduledDate || req.body.arrivalDate)
      .input('companionCount', sql.Int, toInt(req.body.companionCount || 2, 'companionCount'))
      .input('logisticsNote', sql.NVarChar(500), req.body.logisticsNote || `Motivo de estancia: Apoyo Logistico. Area de referencia: ${req.body.originDepartment || 'Por confirmar'}.`)
      .input('eligibilityConfirmed', sql.Bit, Boolean(req.body.eligibilityConfirmed ?? true))
      .input('admissionStage', sql.NVarChar(30), isWaitlistedOnCreate ? 'lista_espera' : admissionStage)
      .input('status', sql.NVarChar(30), isWaitlistedOnCreate ? 'aceptada' : 'enviada')
      .input('approvedAt', sql.DateTime2, isWaitlistedOnCreate ? new Date() : null)
      .input('waitlistEnteredAt', sql.DateTime2, isWaitlistedOnCreate ? new Date() : null)
      .query(`
        INSERT INTO Referrals (
          SiteId, CreatedByUserId, CaregiverName, FamilyLastName, ChildName, Diagnosis, ReferralCode, FamilyCode, Status, AdmissionStage,
          OriginHospital, OriginCity, FamilyContactPhone, RequestTemplateJson, ApprovedAt, WaitlistEnteredAt, ArrivalDate, CompanionCount, LogisticsNote, EligibilityConfirmed, CreatedAt
        )
        VALUES (
          @siteId, @createdByUserId, @caregiverName, @familyLastName, @childName, @diagnosis, @referralCode, @familyCode, @status, @admissionStage,
          @originHospital, @originCity, @familyContactPhone, @requestTemplateJson, @approvedAt, @waitlistEnteredAt, @arrivalDate, @companionCount, @logisticsNote, @eligibilityConfirmed, NOW()
        )
        RETURNING *
      `)

    const referral = result.recordset[0]
    const referenceRequest = await createAdmissionReferenceRequest(pool, {
      siteId,
      referralId: referral.ReferralId,
      createdByUserId: req.auth.sub,
      childFullName: req.body.childFullName || req.body.tutorFullName,
      documentName: req.body.documentName || req.body.documentReferenceUrl || null,
    })

    await logAudit({
      siteId: referral.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'admission.referral_ingested',
      entityType: 'referral',
      entityId: referral.ReferralId,
      metadata: { referralCode, familyCode, admissionStage: isWaitlistedOnCreate ? 'lista_espera' : admissionStage },
    })

    if (isWaitlistedOnCreate) {
      await notifySiteStaff(
        pool,
        siteId,
        'Sin cupo disponible',
        `Sin cupo disponible en esta sede. La familia ${referral.CaregiverName} ${referral.FamilyLastName} se movio a la Lista de Espera.`,
        'referral',
        referral.ReferralId,
      )
    }

    return {
      ...referral,
      DraftRequestId: referenceRequest?.RequestId || null,
      Message: isWaitlistedOnCreate
        ? 'Sin cupo disponible en esta sede. El registro se movio a la Lista de Espera.'
        : 'Admision registrada y enviada a expedientes por completar.',
    }
  }

  required(req.body, ['referralId', 'action'])
  const referralId = toInt(req.body.referralId, 'referralId')
  const referralResult = await pool
    .request()
    .input('referralId', sql.Int, referralId)
    .query(`
      SELECT r.*, s.Name AS SiteName, ass.Name AS AssignedSiteName
      FROM Referrals r
      INNER JOIN Sites s ON s.SiteId = r.SiteId
      LEFT JOIN Sites ass ON ass.SiteId = r.AssignedSiteId
      WHERE r.ReferralId = @referralId
    `)

  const referral = referralResult.recordset[0]
  if (!referral) throw new ApiError(404, 'Referencia no encontrada')

  if (req.body.action === 'enrich') {
    const result = await pool
      .request()
      .input('referralId', sql.Int, referralId)
      .input('socialWorkerName', sql.NVarChar(120), req.body.socialWorkerName || null)
      .input('familyContactPhone', sql.NVarChar(40), req.body.familyContactPhone || referral.FamilyContactPhone || null)
      .input('dossierSummary', sql.NVarChar(sql.MAX), req.body.dossierSummary || null)
      .input('originHospital', sql.NVarChar(160), req.body.originHospital || referral.OriginHospital || null)
      .input('originCity', sql.NVarChar(100), req.body.originCity || referral.OriginCity || null)
      .input('childName', sql.NVarChar(120), req.body.childName || referral.ChildName || null)
      .input('diagnosis', sql.NVarChar(255), 'Apoyo Logistico')
      .query(`
        UPDATE Referrals
        SET SocialWorkerName = @socialWorkerName,
            FamilyContactPhone = @familyContactPhone,
            DossierSummary = @dossierSummary,
            OriginHospital = @originHospital,
            OriginCity = @originCity,
            ChildName = @childName,
            Diagnosis = @diagnosis,
            AdmissionStage = 'expediente_armado',
            Status = CASE WHEN Status = 'enviada' THEN 'en_revision' ELSE Status END
        WHERE ReferralId = @referralId
        RETURNING *
      `)

    await logAudit({
      siteId: referral.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'admission.dossier_built',
      entityType: 'referral',
      entityId: referralId,
      metadata: { originHospital: req.body.originHospital || referral.OriginHospital || null },
    })

    return {
      ...result.recordset[0],
      Message: mapAdmissionMessage('expediente_armado'),
    }
  }

  if (req.body.action === 'approve') {
    const assignedSiteId = inferNearestSiteId({
      originHospital: req.body.originHospital || referral.OriginHospital,
      originCity: req.body.originCity || referral.OriginCity,
      fallbackSiteId: referral.SiteId,
    })
    const suggestedRoom = await suggestOnboardingRoom(pool, {
      siteId: assignedSiteId,
      companionCount: referral.CompanionCount,
    })

    const houseResult = await pool
      .request()
      .input('siteId', sql.Int, assignedSiteId)
      .query(`SELECT Name FROM Sites WHERE SiteId = @siteId`)
    const assignedSiteName = houseResult.recordset[0]?.Name || referral.SiteName

    if (!suggestedRoom) {
      const waitlistResult = await pool
        .request()
        .input('referralId', sql.Int, referralId)
        .input('assignedSiteId', sql.Int, assignedSiteId)
        .query(`
          UPDATE Referrals
          SET SiteId = @assignedSiteId,
              AssignedSiteId = @assignedSiteId,
              AdmissionStage = 'lista_espera',
              Status = 'aceptada',
              ApprovedAt = COALESCE(ApprovedAt, NOW()),
              WaitlistEnteredAt = NOW(),
              TransportEventReady = FALSE
          WHERE ReferralId = @referralId
          RETURNING *
        `)

      await logAudit({
        siteId: assignedSiteId,
        actorUserId: req.auth.sub,
        eventType: 'admission.waitlisted',
        entityType: 'referral',
        entityId: referralId,
        metadata: { assignedSiteId },
      })

      await notifySiteStaff(
        pool,
        assignedSiteId,
        'Sin cupo disponible',
        `Sin cupo disponible en esta sede. La familia ${waitlistResult.recordset[0].CaregiverName} ${waitlistResult.recordset[0].FamilyLastName} se movio a la Lista de Espera.`,
        'referral',
        referralId,
      )

      return {
        ...waitlistResult.recordset[0],
        AssignedSiteName: assignedSiteName,
        SuggestedRoomCode: null,
        OnboardingTask: null,
        Message: 'Sin cupo disponible en esta sede. El registro se movera a la Lista de Espera.',
      }
    }

    const approvalResult = await pool
      .request()
      .input('referralId', sql.Int, referralId)
      .input('assignedSiteId', sql.Int, assignedSiteId)
      .query(`
        UPDATE Referrals
        SET SiteId = @assignedSiteId,
            AssignedSiteId = @assignedSiteId,
            AdmissionStage = 'aprobada',
            Status = 'aceptada',
            ApprovedAt = NOW(),
            WaitlistEnteredAt = NULL,
            TransportEventReady = TRUE
        WHERE ReferralId = @referralId
        RETURNING *
      `)

    const approvedReferral = approvalResult.recordset[0]

    const onboardingTask = await createStaffOnboardingTask(pool, {
      referralId,
      siteId: assignedSiteId,
      createdByUserId: req.auth.sub,
      familyDisplayName: `${approvedReferral.CaregiverName} ${approvedReferral.FamilyLastName}`,
      originHospital: approvedReferral.OriginHospital,
      arrivalDate: approvedReferral.ArrivalDate,
      suggestedRoomCode: suggestedRoom?.RoomCode || null,
    })

    await logAudit({
      siteId: assignedSiteId,
      actorUserId: req.auth.sub,
      eventType: 'admission.approved',
      entityType: 'referral',
      entityId: referralId,
      metadata: { assignedSiteId, onboardingTaskId: onboardingTask.StaffTaskId, suggestedRoomCode: suggestedRoom?.RoomCode || null },
    })

    // TODO: WhatsApp Trigger - aprobacion de expediente y coordinacion de llegada

    return {
      ...approvedReferral,
      AssignedSiteName: assignedSiteName,
      SuggestedRoomCode: suggestedRoom?.RoomCode || null,
      OnboardingTask: onboardingTask,
      Message: `Casa Ronald asignada automaticamente: ${assignedSiteName}.${suggestedRoom?.RoomCode ? ` Habitacion sugerida: ${suggestedRoom.RoomCode}.` : ''} Tarea de onboarding creada para staff.`,
    }
  }

  if (req.body.action === 'assign-waitlist-room') {
    required(req.body, ['roomId'])
    const roomId = toInt(req.body.roomId, 'roomId')
    const assignedSiteId = referral.AssignedSiteId || referral.SiteId

    const roomResult = await pool
      .request()
      .input('roomId', sql.Int, roomId)
      .input('siteId', sql.Int, assignedSiteId)
      .query(`
        SELECT RoomId, RoomCode, RoomStatus, SiteId
        FROM Rooms
        WHERE RoomId = @roomId
          AND SiteId = @siteId
          AND IsActive = TRUE
          AND RoomStatus = 'disponible'
      `)

    const room = roomResult.recordset[0]
    if (!room) throw new ApiError(400, 'La habitacion seleccionada ya no esta disponible')

    await pool
      .request()
      .input('roomId', sql.Int, room.RoomId)
      .query(`
        UPDATE Rooms
        SET RoomStatus = 'reservada',
            OccupiedCount = 1,
            AvailableAt = NULL,
            RoomNote = NULL
        WHERE RoomId = @roomId
      `)

    const referralUpdate = await pool
      .request()
      .input('referralId', sql.Int, referralId)
      .input('roomId', sql.Int, room.RoomId)
      .query(`
        UPDATE Referrals
        SET ReservedRoomId = @roomId,
            AdmissionStage = 'aprobada',
            Status = 'aceptada',
            WaitlistEnteredAt = NULL,
            ApprovedAt = COALESCE(ApprovedAt, NOW()),
            TransportEventReady = TRUE
        WHERE ReferralId = @referralId
        RETURNING *
      `)

    const assignedReferral = referralUpdate.recordset[0]
    const onboardingTask = await createStaffOnboardingTask(pool, {
      referralId,
      siteId: assignedSiteId,
      createdByUserId: req.auth.sub,
      familyDisplayName: `${assignedReferral.CaregiverName} ${assignedReferral.FamilyLastName}`,
      originHospital: assignedReferral.OriginHospital,
      arrivalDate: assignedReferral.ArrivalDate,
      suggestedRoomCode: room.RoomCode,
    })

    await logAudit({
      siteId: assignedSiteId,
      actorUserId: req.auth.sub,
      eventType: 'admission.waitlist_assigned',
      entityType: 'referral',
      entityId: referralId,
      metadata: { roomId: room.RoomId, roomCode: room.RoomCode, onboardingTaskId: onboardingTask.StaffTaskId },
    })

    return {
      ...assignedReferral,
      ReservedRoomId: room.RoomId,
      ReservedRoomCode: room.RoomCode,
      OnboardingTask: onboardingTask,
      Message: `Habitacion ${room.RoomCode} asignada. El registro salio de Lista de Espera y quedo activo.`,
    }
  }

  if (req.body.action === 'clinical-feedback') {
    required(req.body, ['familyId', 'feedbackMessage'])
    const followUp = await registerClinicalFollowUp(pool, {
      familyId: toInt(req.body.familyId, 'familyId'),
      referralId,
      requestId: req.body.requestId ? toInt(req.body.requestId, 'requestId') : null,
      siteId: referral.AssignedSiteId || referral.SiteId,
      recordedByUserId: req.auth.sub,
      clinicName: req.body.clinicName || referral.OriginHospital || null,
      feedbackMessage: req.body.feedbackMessage,
      estimatedCheckoutDate: req.body.estimatedCheckoutDate || null,
    })
    if (!followUp) throw new ApiError(404, 'Familia no encontrada para seguimiento')

    await logAudit({
      siteId: referral.AssignedSiteId || referral.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'admission.clinical_feedback_registered',
      entityType: 'clinical_followup',
      entityId: followUp.FollowUpId,
      metadata: { familyId: req.body.familyId },
    })

    return followUp
  }

  throw new ApiError(400, 'Accion no soportada')
})
