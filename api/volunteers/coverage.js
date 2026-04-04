import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)
  const dbReq = pool.request()
  let where = 'WHERE 1=1'
  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND SiteId = @siteId'
  }

  const result = await dbReq.query(`
      SELECT
        COUNT(*) AS totalShifts,
        SUM(CASE WHEN AvailabilityStatus = 'disponible' THEN 1 ELSE 0 END) AS coveredShifts,
        SUM(HoursLogged) AS totalHours
      FROM VolunteerShifts
      ${where}
    `)

  const row = result.recordset[0]
  const coveragePct = row.totalShifts ? Math.round((row.coveredShifts / row.totalShifts) * 100) : 0

  return {
    totalShifts: row.totalShifts,
    coveredShifts: row.coveredShifts,
    totalHours: Number(row.totalHours || 0),
    coveragePct,
  }
})
