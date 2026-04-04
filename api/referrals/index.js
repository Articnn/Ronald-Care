import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'
import { makeCode } from '../../src/lib/sql-helpers.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['hospital', 'staff', 'admin', 'superadmin'] }, async (req) => {
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
      SELECT r.*, u.FullName AS CreatedByName, s.Name AS SiteName
      FROM Referrals r
      INNER JOIN Users u ON u.UserId = r.CreatedByUserId
      INNER JOIN Sites s ON s.SiteId = r.SiteId
      ${where}
      ORDER BY r.CreatedAt DESC
    `)

    return result.recordset
  }

  required(req.body, ['siteId', 'arrivalDate', 'companionCount', 'caregiverName', 'familyLastName'])
  const referralCode = makeCode('REF')
  const familyCode = makeCode('FAM')
  const siteId = resolveScopedSiteId(req, req.body.siteId || req.auth.siteId)

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .input('createdByUserId', sql.Int, req.auth.sub)
    .input('caregiverName', sql.NVarChar(100), req.body.caregiverName)
    .input('familyLastName', sql.NVarChar(100), req.body.familyLastName)
    .input('referralCode', sql.NVarChar(30), referralCode)
    .input('familyCode', sql.NVarChar(30), familyCode)
    .input('status', sql.NVarChar(30), 'enviada')
    .input('arrivalDate', sql.Date, req.body.arrivalDate)
    .input('companionCount', sql.Int, toInt(req.body.companionCount, 'companionCount'))
    .input('logisticsNote', sql.NVarChar(500), req.body.logisticsNote || null)
    .input('eligibilityConfirmed', sql.Bit, Boolean(req.body.eligibilityConfirmed))
    .query(`
      INSERT INTO Referrals
        (SiteId, CreatedByUserId, CaregiverName, FamilyLastName, ReferralCode, FamilyCode, Status, ArrivalDate, CompanionCount, LogisticsNote, EligibilityConfirmed)
      VALUES
        (@siteId, @createdByUserId, @caregiverName, @familyLastName, @referralCode, @familyCode, @status, @arrivalDate, @companionCount, @logisticsNote, @eligibilityConfirmed)
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
