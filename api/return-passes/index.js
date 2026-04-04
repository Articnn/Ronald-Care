import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { required, toInt } from '../../src/lib/validation.js'

export default withApi({ methods: ['GET', 'POST'], roles: ['family', 'staff'] }, async (req) => {
  const pool = await getPool()

  if (req.method === 'GET') {
    const familyId = req.auth.role === 'family' ? req.auth.familyId : toInt(req.query.familyId, 'familyId')
    const result = await pool
      .request()
      .input('familyId', sql.Int, familyId)
      .query(`
        SELECT ReturnPassId, FamilyId, SiteId, RequestedDate, CompanionCount, LogisticsNote, Status, CreatedAt
        FROM ReturnPasses
        WHERE FamilyId = @familyId
        ORDER BY CreatedAt DESC
      `)
    return result.recordset
  }

  required(req.body, ['familyId', 'requestedDate', 'companionCount'])
  const familyId = req.auth.role === 'family' ? req.auth.familyId : toInt(req.body.familyId, 'familyId')

  const familyResult = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`SELECT FamilyId, SiteId FROM Families WHERE FamilyId = @familyId`)
  const family = familyResult.recordset[0]

  const result = await pool
    .request()
    .input('familyId', sql.Int, family.FamilyId)
    .input('siteId', sql.Int, family.SiteId)
    .input('requestedDate', sql.Date, req.body.requestedDate)
    .input('companionCount', sql.Int, toInt(req.body.companionCount, 'companionCount'))
    .input('logisticsNote', sql.NVarChar(255), req.body.logisticsNote || null)
    .input('status', sql.NVarChar(20), 'enviado')
    .query(`
      INSERT INTO ReturnPasses (FamilyId, SiteId, RequestedDate, CompanionCount, LogisticsNote, Status)
      VALUES (@familyId, @siteId, @requestedDate, @companionCount, @logisticsNote, @status)
      RETURNING *
    `)

  const pass = result.recordset[0]
  await logAudit({
    siteId: pass.SiteId,
    actorUserId: req.auth.role === 'family' ? null : req.auth.sub,
    actorFamilyId: req.auth.role === 'family' ? req.auth.familyId : null,
    eventType: 'return_pass.sent',
    entityType: 'return_pass',
    entityId: pass.ReturnPassId,
    metadata: { requestedDate: pass.RequestedDate, companionCount: pass.CompanionCount },
  })

  return pass
})
