import { getPool, sql } from '../../src/lib/db.js'
import { resolveScopedSiteId } from '../../src/lib/access.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'hospital', 'admin', 'superadmin'] }, async (req) => {
  const pool = await getPool()
  const siteId = resolveScopedSiteId(req, req.query.siteId)

  const dbReq = pool.request()
  let where = 'WHERE 1=1'
  if (siteId) {
    dbReq.input('siteId', sql.Int, siteId)
    where += ' AND f.SiteId = @siteId'
  }

  const result = await dbReq.query(`
      SELECT
        f.FamilyId,
        f.ReferralId,
        f.CaregiverName,
        f.FamilyLastName,
        f.AdmissionStatus,
        f.IdVerified,
        f.RegulationAccepted,
        f.SimpleSignature,
        fa.TicketCode,
        fa.QrCode,
        r.RoomCode,
        fa.IsActive,
        s.Name AS SiteName
      FROM Families f
      INNER JOIN Sites s ON s.SiteId = f.SiteId
      LEFT JOIN FamilyAccess fa ON fa.FamilyId = f.FamilyId AND fa.IsActive = TRUE
      LEFT JOIN Rooms r ON r.RoomId = f.RoomId
      ${where}
      ORDER BY f.CreatedAt DESC
    `)

  return result.recordset
})
