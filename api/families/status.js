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
        SELECT f.FamilyId
        FROM FamilyAccess fa
        INNER JOIN Families f ON f.FamilyId = fa.FamilyId
        WHERE fa.TicketCode = @code OR fa.QrCode = @code
        LIMIT 1
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
      FROM Families f
      INNER JOIN Sites s ON s.SiteId = f.SiteId
      LEFT JOIN Rooms r ON r.RoomId = f.RoomId
      WHERE f.FamilyId = @familyId;
    `)

  const requestsQuery = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT RequestId, Title, RequestType, Urgency, Status, PriorityScore, PriorityLabel, AssignedDisplayName, CreatedAt
      FROM Requests
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC
    `)

  const tripsQuery = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT TripId, Destination, Shift, Status, DurationMinutes, AssignedDisplayName, CreatedAt
      FROM Trips
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC
    `)

  const returnPassesQuery = await pool
    .request()
    .input('familyId', sql.Int, familyId)
    .query(`
      SELECT ReturnPassId, RequestedDate, CompanionCount, LogisticsNote, Status, CreatedAt
      FROM ReturnPasses
      WHERE FamilyId = @familyId
      ORDER BY CreatedAt DESC
      LIMIT 5
    `)

  return {
    family: familyQuery.recordset[0],
    requests: requestsQuery.recordset,
    trips: tripsQuery.recordset,
    returnPasses: returnPassesQuery.recordset,
  }
})
