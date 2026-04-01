import { getPool, sql } from '../../src/lib/db.js'
import { ApiError } from '../../src/lib/errors.js'
import { withApi } from '../../src/lib/http.js'

export default withApi({ methods: ['GET'], roles: ['family', 'staff', 'volunteer'] }, async (req) => {
  const pool = await getPool()
  let familyId = req.auth.familyId || null

  if (!familyId) {
    const code = req.query.code
    if (!code) throw new ApiError(400, 'Para staff/volunteer se requiere ?code=ticket_o_qr')
    const familyResult = await pool
      .request()
      .input('code', sql.NVarChar(80), code)
      .query(`
        SELECT TOP 1 f.FamilyId
        FROM dbo.FamilyAccess fa
        INNER JOIN dbo.Families f ON f.FamilyId = fa.FamilyId
        WHERE fa.TicketCode = @code OR fa.QrCode = @code
      `)

    familyId = familyResult.recordset[0]?.FamilyId
    if (!familyId) throw new ApiError(404, 'Familia no encontrada')
  }

  const familyQuery = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT
        f.FamilyId, f.CaregiverName, f.FamilyLastName, f.AdmissionStatus,
        s.Name AS SiteName, s.SiteCode,
        r.RoomCode
      FROM dbo.Families f
      INNER JOIN dbo.Sites s ON s.SiteId = f.SiteId
      LEFT JOIN dbo.Rooms r ON r.RoomId = f.RoomId
      WHERE f.FamilyId = @familyId;

      SELECT RequestId, Title, RequestType, Urgency, Status, PriorityScore, PriorityLabel, AssignedDisplayName, CreatedAt
      FROM dbo.Requests
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC;

      SELECT TripId, Destination, Shift, Status, DurationMinutes, AssignedDisplayName, CreatedAt
      FROM dbo.Trips
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC;

      SELECT TOP 5 ReturnPassId, RequestedDate, CompanionCount, LogisticsNote, Status, CreatedAt
      FROM dbo.ReturnPasses
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC;
    `)

  return {
    family: familyQuery.recordsets[0][0],
    requests: familyQuery.recordsets[1],
    trips: familyQuery.recordsets[2],
    returnPasses: familyQuery.recordsets[3],
  }
})
