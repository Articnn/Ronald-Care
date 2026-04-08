import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import {
  buildRequestTemplate,
  createExtractedDraftRequest,
  createStaffOnboardingTask,
  inferNearestSiteId,
  registerClinicalFollowUp,
  suggestOnboardingRoom,
} from '../../src/lib/admission-workflow.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { required, toInt } from '../../src/lib/validation.js'

function mapAdmissionMessage(stage) {
  if (stage === 'expediente_armado') return 'Expediente armado y listo para aprobacion.'
  if (stage === 'aprobada') return 'Aprobada y enviada a automatizacion de estancia.'
  if (stage === 'borrador_extraido') return 'Documento recibido y datos extraidos en borrador.'
  return 'Referencia recibida y plantilla precargada.'
}

export default withApi({ methods: ['GET', 'POST', 'PATCH'], roles: ['hospital', 'staff', 'admin', 'superadmin'] }, async (req) => {
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
        r.TransportEventReady,
        r.ArrivalDate,
        r.CompanionCount,
        r.LogisticsNote,
        r.EligibilityConfirmed,
        f.FamilyId
      FROM Referrals r
      INNER JOIN Sites rs ON rs.SiteId = r.SiteId
      LEFT JOIN Sites ass ON ass.SiteId = r.AssignedSiteId
      LEFT JOIN Families f ON f.ReferralId = r.ReferralId
      ${where}
      ORDER BY r.CreatedAt DESC
    `)

    return result.recordset.map((item) => ({
      ...item,
      Message: mapAdmissionMessage(item.AdmissionStage),
    }))
  }

  if (req.method === 'POST') {
    required(req.body, ['caregiverName', 'familyLastName', 'arrivalDate', 'companionCount'])
    const siteId = resolveScopedSiteId(req, req.body.siteId || req.auth.siteId)
    const admissionStage = String(req.body.admissionStage || 'referencia')
    const shouldCreateDraftRequest = admissionStage === 'borrador_extraido'

    const referralCode = `REF-${Date.now().toString().slice(-6)}`
    const familyCode = `FAM-${Math.floor(1000 + Math.random() * 8999)}`
    const requestTemplate = buildRequestTemplate(req.body)

    const result = await pool
      .request()
      .input('siteId', sql.Int, siteId)
      .input('createdByUserId', sql.Int, req.auth.sub)
      .input('caregiverName', sql.NVarChar(100), req.body.caregiverName)
      .input('familyLastName', sql.NVarChar(100), req.body.familyLastName)
      .input('childName', sql.NVarChar(120), req.body.childName || null)
      .input('diagnosis', sql.NVarChar(255), req.body.diagnosis || null)
      .input('referralCode', sql.NVarChar(30), referralCode)
      .input('familyCode', sql.NVarChar(30), familyCode)
      .input('originHospital', sql.NVarChar(160), req.body.originHospital || null)
      .input('originCity', sql.NVarChar(100), req.body.originCity || null)
      .input('familyContactPhone', sql.NVarChar(40), req.body.familyContactPhone || null)
      .input('requestTemplateJson', sql.NVarChar(sql.MAX), JSON.stringify(requestTemplate))
      .input('arrivalDate', sql.Date, req.body.arrivalDate)
      .input('companionCount', sql.Int, toInt(req.body.companionCount, 'companionCount'))
      .input('logisticsNote', sql.NVarChar(500), req.body.logisticsNote || null)
      .input('eligibilityConfirmed', sql.Bit, Boolean(req.body.eligibilityConfirmed))
      .input('admissionStage', sql.NVarChar(30), admissionStage)
      .query(`
        INSERT INTO Referrals (
          SiteId, CreatedByUserId, CaregiverName, FamilyLastName, ChildName, Diagnosis, ReferralCode, FamilyCode, Status, AdmissionStage,
          OriginHospital, OriginCity, FamilyContactPhone, RequestTemplateJson, ArrivalDate, CompanionCount, LogisticsNote, EligibilityConfirmed, CreatedAt
        )
        VALUES (
          @siteId, @createdByUserId, @caregiverName, @familyLastName, @childName, @diagnosis, @referralCode, @familyCode, 'enviada', @admissionStage,
          @originHospital, @originCity, @familyContactPhone, @requestTemplateJson, @arrivalDate, @companionCount, @logisticsNote, @eligibilityConfirmed, NOW()
        )
        RETURNING *
      `)

    const referral = result.recordset[0]
    let draftRequest = null
    if (shouldCreateDraftRequest) {
      draftRequest = await createExtractedDraftRequest(pool, {
        siteId,
        referralId: referral.ReferralId,
        createdByUserId: req.auth.sub,
        childName: req.body.childName || req.body.caregiverName,
        diagnosis: req.body.diagnosis || '',
        documentReferenceUrl: req.body.documentReferenceUrl || null,
      })
    }

    await logAudit({
      siteId: referral.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'admission.referral_ingested',
      entityType: 'referral',
      entityId: referral.ReferralId,
      metadata: { referralCode, familyCode, admissionStage },
    })

    return {
      ...referral,
      DraftRequestId: draftRequest?.RequestId || null,
      Message: shouldCreateDraftRequest
        ? 'Referencia clinica extraida y guardada como borrador de solicitud.'
        : 'Referencia clinica registrada y lista para completar expediente.',
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
      .input('diagnosis', sql.NVarChar(255), req.body.diagnosis || referral.Diagnosis || null)
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
            TransportEventReady = TRUE
        WHERE ReferralId = @referralId
        RETURNING *
      `)

    const approvedReferral = approvalResult.recordset[0]
    const houseResult = await pool
      .request()
      .input('siteId', sql.Int, assignedSiteId)
      .query(`SELECT Name FROM Sites WHERE SiteId = @siteId`)
    const assignedSiteName = houseResult.recordset[0]?.Name || referral.SiteName

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
