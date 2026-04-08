import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { makeCode } from '../../src/lib/sql-helpers.js'
import { logAudit } from '../../src/lib/audit.js'
import { buildRequestTemplate } from '../../src/lib/admission-workflow.js'
import { ensureVolunteerManagementSchema } from '../../src/lib/volunteer-management-schema.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['hospital', 'staff', 'admin', 'superadmin'] }, async (req) => {
  await ensureVolunteerManagementSchema()
  const pool = await getPool()

  if (req.method === 'GET') {
    const status = req.query.status || null
    const siteId = resolveScopedSiteId(req, req.query.siteId)
    const dbReq = pool.request()
    let where = 'WHERE 1=1'

    if (siteId) {
      dbReq.input('siteId', sql.Int, siteId)
      where += ' AND r.SiteId = @siteId'
    }

    if (status) {
      dbReq.input('status', sql.NVarChar(30), status)
      where += ' AND r.Status = @status'
    }

    const result = await dbReq.query(`
      SELECT r.*, u.FullName AS CreatedByName, s.Name AS SiteName, ass.Name AS AssignedSiteName
      FROM Referrals r
      INNER JOIN Users u ON u.UserId = r.CreatedByUserId
      INNER JOIN Sites s ON s.SiteId = r.SiteId
      LEFT JOIN Sites ass ON ass.SiteId = r.AssignedSiteId
      ${where}
      ORDER BY r.CreatedAt DESC
    `)

    return result.recordset
  }

  required(req.body, ['siteId', 'arrivalDate', 'companionCount', 'caregiverName', 'familyLastName'])
  const referralCode = makeCode('REF')
  const familyCode = makeCode('FAM')
  const siteId = resolveScopedSiteId(req, req.body.siteId || req.auth.siteId)
  const requestTemplate = buildRequestTemplate(req.body)

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('createdByUserId', sql.Int, req.auth.sub)
    .input('caregiverName', sql.NVarChar(100), req.body.caregiverName)
    .input('familyLastName', sql.NVarChar(100), req.body.familyLastName)
    .input('referralCode', sql.NVarChar(30), referralCode)
    .input('familyCode', sql.NVarChar(30), familyCode)
    .input('status', sql.NVarChar(30), 'enviada')
    .input('admissionStage', sql.NVarChar(30), 'referencia')
    .input('originHospital', sql.NVarChar(160), req.body.originHospital || null)
    .input('originCity', sql.NVarChar(100), req.body.originCity || null)
    .input('familyContactPhone', sql.NVarChar(40), req.body.familyContactPhone || null)
    .input('requestTemplateJson', sql.NVarChar(sql.MAX), JSON.stringify(requestTemplate))
    .input('arrivalDate', sql.Date, req.body.arrivalDate)
    .input('companionCount', sql.Int, toInt(req.body.companionCount, 'companionCount'))
    .input('logisticsNote', sql.NVarChar(500), req.body.logisticsNote || null)
    .input('eligibilityConfirmed', sql.Bit, Boolean(req.body.eligibilityConfirmed))
    .query(`
      INSERT INTO Referrals
        (SiteId, CreatedByUserId, CaregiverName, FamilyLastName, ReferralCode, FamilyCode, Status, AdmissionStage, OriginHospital, OriginCity, FamilyContactPhone, RequestTemplateJson, ArrivalDate, CompanionCount, LogisticsNote, EligibilityConfirmed)
      VALUES
        (@siteId, @createdByUserId, @caregiverName, @familyLastName, @referralCode, @familyCode, @status, @admissionStage, @originHospital, @originCity, @familyContactPhone, @requestTemplateJson, @arrivalDate, @companionCount, @logisticsNote, @eligibilityConfirmed)
      RETURNING *
    `)

  const referral = result.recordset[0]
  await logAudit({
    siteId: referral.SiteId,
    actorUserId: req.auth.sub,
    eventType: 'referral.created',
    entityType: 'referral',
    entityId: referral.ReferralId,
    metadata: { referralCode, familyCode },
  })

  return referral
})
