import { getPool, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['staff', 'hospital'] }, async (req) => {
  const pool = await getPool()
  const siteId = req.query.siteId ? Number(req.query.siteId) : req.auth.siteId

  const result = await pool
    .request()
    .input('siteId', sql.Int, siteId)
    .query(`
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
        s.Name AS SiteName
      FROM Families f
      INNER JOIN Sites s ON s.SiteId = f.SiteId
      LEFT JOIN FamilyAccess fa ON fa.FamilyId = f.FamilyId AND fa.IsActive = TRUE
      LEFT JOIN Rooms r ON r.RoomId = f.RoomId
      WHERE f.SiteId = @siteId
      ORDER BY f.CreatedAt DESC
    `)

  return result.recordset
})
