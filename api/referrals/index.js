import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'
import { makeCode } from '../../src/lib/sql-helpers.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['hospital', 'staff'] }, async (req) => {
  const pool = await getPool()

  if (req.method === 'GET') {
    const status = req.query.status || null
    const siteId = req.query.siteId ? toInt(req.query.siteId, 'siteId') : req.auth.siteId

    const dbReq = pool.request().input('siteId', sql.Int, siteId)
    let where = 'WHERE r.SiteId = @siteId'

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

  required(req.body, ['siteId', 'arrivalDate', 'companionCount'])
  const referralCode = makeCode('REF')
  const familyCode = makeCode('FAM')

  const result = await pool
    .request()
    .input('siteId', sql.Int, toInt(req.body.siteId, 'siteId'))
    .input('createdByUserId', sql.Int, req.auth.sub)
    .input('referralCode', sql.NVarChar(30), referralCode)
    .input('familyCode', sql.NVarChar(30), familyCode)
    .input('status', sql.NVarChar(30), 'enviada')
    .input('arrivalDate', sql.Date, req.body.arrivalDate)
    .input('companionCount', sql.Int, toInt(req.body.companionCount, 'companionCount'))
    .input('logisticsNote', sql.NVarChar(500), req.body.logisticsNote || null)
    .input('eligibilityConfirmed', sql.Bit, Boolean(req.body.eligibilityConfirmed))
    .query(`
      INSERT INTO Referrals
        (SiteId, CreatedByUserId, ReferralCode, FamilyCode, Status, ArrivalDate, CompanionCount, LogisticsNote, EligibilityConfirmed)
      VALUES
        (@siteId, @createdByUserId, @referralCode, @familyCode, @status, @arrivalDate, @companionCount, @logisticsNote, @eligibilityConfirmed)
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
