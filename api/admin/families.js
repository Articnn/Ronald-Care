import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { hashPassword } from '../../src/lib/security.js'
import { makeFamilyQr, makeFamilyTicket, makeNumericPin } from '../../src/lib/sql-helpers.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { automateFamilyStayAssignment, extendFamilyStay, listFamilyStayAutomation, syncExpiredFamilyStays } from '../../src/lib/family-stay-automation.js'
import { required, toInt } from '../../src/lib/validation.js'

export const pendingReferralsHandler = withApi({ methods: ['GET'], roles: ['superadmin', 'admin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const dbReq = pool.request()
  let where = 'WHERE f.FamilyId IS NULL'

  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND r.SiteId = @siteId'
  }

  const result = await dbReq.query(`
    SELECT
      r.ReferralId, r.SiteId, r.CaregiverName, r.FamilyLastName, r.ReferralCode, r.FamilyCode,
      r.Status, r.AdmissionStage, r.ArrivalDate, r.CompanionCount, r.LogisticsNote, r.EligibilityConfirmed,
      COALESCE(r.AssignedSiteId, r.SiteId) AS AssignedSiteId,
      COALESCE(ass.Name, s.Name) AS SiteName
    FROM Referrals r
    LEFT JOIN Families f ON f.ReferralId = r.ReferralId
    INNER JOIN Sites s ON s.SiteId = r.SiteId
    LEFT JOIN Sites ass ON ass.SiteId = r.AssignedSiteId
    ${where}
    ORDER BY r.CreatedAt DESC
  `)

  return result.recordset
})

export const activateFamilyHandler = withApi({ methods: ['POST'], roles: ['superadmin', 'admin', 'staff'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  required(req.body, ['referralId'])
  const pool = await getPool()
  const referralId = toInt(req.body.referralId, 'referralId')
  const stayDays = Math.max(1, Number(req.body.stayDays || 3))

  const referralResult = await pool
    .request()
    .input('referralId', sql.Int, referralId)
    .query(`
      SELECT r.*, s.Name AS SiteName
      FROM Referrals r
      INNER JOIN Sites s ON s.SiteId = COALESCE(r.AssignedSiteId, r.SiteId)
      WHERE r.ReferralId = @referralId
    `)

  const referral = referralResult.recordset[0]
  if (!referral) throw new ApiError(404, 'Referencia no encontrada')

  const existingFamily = await pool
    .request()
    .input('referralId', sql.Int, referralId)
    .query(`SELECT FamilyId FROM Families WHERE ReferralId = @referralId`)

  if (existingFamily.recordset[0]) throw new ApiError(400, 'La familia ya fue activada')

  const familyResult = await pool
    .request()
    .input('referralId', sql.Int, referral.ReferralId)
    .input('siteId', sql.Int, referral.AssignedSiteId || referral.SiteId)
    .input('caregiverName', sql.NVarChar(100), referral.CaregiverName)
    .input('familyLastName', sql.NVarChar(100), referral.FamilyLastName)
    .input('stayDays', sql.Int, stayDays)
    .input('plannedCheckoutDate', sql.Date, new Date(new Date(referral.ArrivalDate).getTime() + stayDays * 24 * 60 * 60 * 1000))
    .input('reservedRoomId', sql.Int, referral.ReservedRoomId || null)
    .query(`
      INSERT INTO Families (ReferralId, SiteId, RoomId, PlannedRoomId, CaregiverName, FamilyLastName, StayDays, PlannedCheckoutDate, AutomationStatus, AdmissionStatus, CreatedAt, UpdatedAt)
      VALUES (
        @referralId,
        @siteId,
        @reservedRoomId,
        @reservedRoomId,
        @caregiverName,
        @familyLastName,
        @stayDays,
        @plannedCheckoutDate,
        CASE WHEN @reservedRoomId IS NULL THEN 'pendiente' ELSE 'reservada' END,
        'pendiente',
        NOW(),
        NOW()
      )
      RETURNING *
    `)

  const family = familyResult.recordset[0]
  const pin = makeNumericPin(6)
  const ticketCode = makeFamilyTicket(referral.FamilyCode)
  const qrCode = makeFamilyQr(referral.FamilyCode)

  const accessResult = await pool
    .request()
    .input('familyId', sql.Int, family.FamilyId)
    .input('ticketCode', sql.NVarChar(40), ticketCode)
    .input('qrCode', sql.NVarChar(80), qrCode)
    .input('pinHash', sql.NVarChar(255), hashPassword(pin))
    .query(`
      INSERT INTO FamilyAccess (FamilyId, TicketCode, QrCode, PinHash, IsActive, CreatedAt, UpdatedAt)
      VALUES (@familyId, @ticketCode, @qrCode, @pinHash, TRUE, NOW(), NOW())
      RETURNING *
    `)

  const automation = await automateFamilyStayAssignment(pool, { familyId: family.FamilyId, actorUserId: req.auth.sub })

  await logAudit({
    siteId: referral.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'family.activated',
    entityType: 'family',
    entityId: family.FamilyId,
    metadata: { referralId, ticketCode, qrCode, stayDays },
  })

  return {
    family,
    access: accessResult.recordset[0],
    generatedPin: pin,
    automation,
  }
})

export const familyStayAutomationHandler = withApi({ methods: ['GET', 'PATCH'], roles: ['superadmin', 'admin', 'staff'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)

  if (req.method === 'GET') {
    await syncExpiredFamilyStays(pool, req.auth.sub)
    return listFamilyStayAutomation(pool, siteId)
  }

  required(req.body, ['familyId', 'action'])
  const familyId = toInt(req.body.familyId, 'familyId')
  const action = String(req.body.action)

  if (action === 'extend') {
    const extraDays = Math.max(1, Number(req.body.extraDays || 1))
    const updated = await extendFamilyStay(pool, { familyId, extraDays })
    if (!updated) throw new ApiError(404, 'Familia no encontrada')

    await logAudit({
      siteId: updated.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'family.stay_extended',
      entityType: 'family',
      entityId: familyId,
      metadata: { extraDays },
    })

    await syncExpiredFamilyStays(pool, req.auth.sub)
    return listFamilyStayAutomation(pool, siteId)
  }

  throw new ApiError(400, 'Accion no soportada')
})

export const familyAccessAdminHandler = withApi({ methods: ['PATCH'], roles: ['superadmin', 'admin', 'staff'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  required(req.body, ['familyId', 'action'])
  const familyId = toInt(req.body.familyId, 'familyId')
  const action = req.body.action
  const pool = await getPool()

  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT f.FamilyId, f.SiteId, fa.FamilyAccessId, fa.TicketCode, fa.QrCode
      FROM Families f
      INNER JOIN FamilyAccess fa ON fa.FamilyId = f.FamilyId
      WHERE f.FamilyId = @familyId
      ORDER BY fa.FamilyAccessId DESC
      LIMIT 1
    `)

  const family = familyResult.recordset[0]
  if (!family) throw new ApiError(404, 'Familia no encontrada')
  if (req.auth.role === 'staff' && Number(req.auth.siteId) !== Number(family.SiteId)) {
    throw new ApiError(403, 'Solo puedes operar familias de tu sede')
  }

  if (action === 'pause' || action === 'reactivate') {
    const isActive = action === 'reactivate'
    await pool
      .request()
      .input('familyAccessId', sql.Int, family.FamilyAccessId)
      .input('isActive', sql.Bit, isActive)
      .query(`UPDATE FamilyAccess SET IsActive = @isActive, UpdatedAt = NOW() WHERE FamilyAccessId = @familyAccessId`)

    await logAudit({
      siteId: family.SiteId,
      actorUserId: req.auth.sub,
      eventType: `family.${action}d`,
      entityType: 'family_access',
      entityId: family.FamilyAccessId,
      metadata: { familyId },
    })

    return { message: isActive ? 'Cuenta familiar reactivada' : 'Cuenta familiar pausada' }
  }

  if (action === 'reset-pin') {
    const newPin = makeNumericPin(6)
    await pool
      .request()
      .input('familyAccessId', sql.Int, family.FamilyAccessId)
      .input('pinHash', sql.NVarChar(255), hashPassword(newPin))
      .query(`UPDATE FamilyAccess SET PinHash = @pinHash, UpdatedAt = NOW() WHERE FamilyAccessId = @familyAccessId`)

    await logAudit({
      siteId: family.SiteId,
      actorUserId: req.auth.sub,
      eventType: 'family.pin_reset',
      entityType: 'family_access',
      entityId: family.FamilyAccessId,
      metadata: { familyId },
    })

    return { message: 'PIN reiniciado', newPin, ticketCode: family.TicketCode, qrCode: family.QrCode }
  }

  throw new ApiError(400, 'Accion no soportada')
})
