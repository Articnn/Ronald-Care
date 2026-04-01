import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff'] }, async (req) => {
  const pool = await getPool()
  const siteId = req.query.siteId ? Number(req.query.siteId) : req.auth.siteId

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
      SELECT
        COUNT(*) AS totalShifts,
        SUM(CASE WHEN AvailabilityStatus = 'disponible' THEN 1 ELSE 0 END) AS coveredShifts,
        SUM(HoursLogged) AS totalHours
      FROM dbo.VolunteerShifts
      WHERE SiteId = @siteId
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
